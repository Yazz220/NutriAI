/* eslint-disable react/no-unknown-property, react-hooks/immutability -- R3F animates Three.js objects and uses renderer-specific JSX props. */
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';
import { Canvas, extend, useFrame, useLoader, useThree, type ThreeElement } from '@react-three/fiber';
import {
  BackSide,
  CanvasTexture,
  Color,
  DoubleSide,
  FrontSide,
  MathUtils,
  Mesh,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Group } from 'three';
import type { Cookbook3DSceneProps } from '@/components/cookbook/Cookbook3DScene.types';
import type { CookbookPage } from '@/types/cookbook';
import type { CookbookLeaf, CookbookSpread } from '@/utils/cookbook/reader';

extend({ RoundedBoxGeometry });

declare module '@react-three/fiber' {
  interface ThreeElements {
    roundedBoxGeometry: ThreeElement<typeof RoundedBoxGeometry>;
  }
}

const BOOK_WIDTH = 4.4;
const BOOK_HEIGHT = 6.2;
const COVER_THICKNESS = 0.14;
const PAGE_Y = 0.36;
const PAPER = '#f0ebe0';

// Camera framing is derived from these view directions plus a fit-to-viewport
// distance, so the whole book stays visible on any aspect ratio.
const CLOSED_TARGET = new Vector3(BOOK_WIDTH / 2, 0.3, 0);
const CLOSED_DIRECTION = new Vector3(3.3, 4.5, 10.8).normalize();
const OPEN_TARGET = new Vector3(0, -0.15, 0);
const OPEN_DIRECTION = new Vector3(0, 7.2, 9.8).normalize();
const TOPDOWN_TARGET = new Vector3(0, 0, 0);
const TOPDOWN_DIRECTION = new Vector3(0, 1, 0.12).normalize();
const CAMERA_PADDING = 1.12;
const TOPDOWN_PADDING = 1.04;

interface TurnTransition {
  from: number;
  to: number;
  direction: -1 | 1;
}

export function Cookbook3DScene({
  cookbook,
  pages,
  spreads,
  spreadIndex,
  isOpen,
  readingView = 'tilted',
  onOpen,
  onNext,
  onPrevious,
  style,
}: Cookbook3DSceneProps) {
  const coverUri = resolveImageUri(cookbook?.coverImageAsset) ?? makeFallbackImageUri(cookbook?.title ?? 'My Cookbook');
  const pageUris = pages.map(
    (page) => resolveImageUri(page.imageAsset) ?? page.imageUrl ?? makeFallbackImageUri(page.title),
  );
  const textureUris = [coverUri, ...pageUris];

  return (
    <View style={[styles.container, style]}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 32, near: 0.1, far: 100, position: [5.5, 4.8, 10.8] }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = PCFShadowMap;
          gl.setClearColor(new Color('#d8d3c8'), 1);
        }}
      >
        <Suspense fallback={null}>
          <BookScene
            title={cookbook?.title ?? 'My Cookbook'}
            pages={pages}
            spreads={spreads}
            spreadIndex={spreadIndex}
            isOpen={isOpen}
            readingView={readingView}
            textureUris={textureUris}
            onOpen={onOpen}
            onNext={onNext}
            onPrevious={onPrevious}
          />
        </Suspense>
      </Canvas>
    </View>
  );
}

function BookScene({
  title,
  pages,
  spreads,
  spreadIndex,
  isOpen,
  readingView,
  textureUris,
  onOpen,
  onNext,
  onPrevious,
}: {
  title: string;
  pages: CookbookPage[];
  spreads: CookbookSpread[];
  spreadIndex: number;
  isOpen: boolean;
  readingView: 'tilted' | 'topdown';
  textureUris: string[];
  onOpen: () => void;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const loadedTextures = useLoader(TextureLoader, textureUris);
  const coverTexture = loadedTextures[0];
  const recipeTextures = loadedTextures.slice(1);
  const bookplateTexture = useMemo(() => createBookplateTexture(title, pages.length), [pages.length, title]);
  const contentsTexture = useMemo(() => createContentsTexture(title, pages), [pages, title]);
  const blankTexture = useMemo(() => createBlankTexture(), []);
  const gutterShadowTexture = useMemo(() => createGutterShadowTexture(), []);
  const contactShadowTexture = useMemo(() => createContactShadowTexture(), []);
  const rootRef = useRef<Group>(null);
  const contactShadowRef = useRef<Mesh>(null);
  const coverPivotRef = useRef<Group>(null);
  const leftContentRef = useRef<Group>(null);
  const rightStackRef = useRef<Mesh>(null);
  const leftStackRef = useRef<Mesh>(null);
  const rightStackHeightRef = useRef(0.26);
  const leftStackHeightRef = useRef(0.04);
  const openingRef = useRef(isOpen ? 1 : 0);
  const visualIndexRef = useRef(spreadIndex);
  const requestedIndexRef = useRef(spreadIndex);
  const turnProgressRef = useRef(1);
  const turnTargetRef = useRef(1);
  const transitionRef = useRef<TurnTransition | null>(null);
  const isDraggingRef = useRef(false);
  const dragOccurredRef = useRef(false);
  const dragStateRef = useRef<{
    active: boolean;
    started: boolean;
    startX: number;
    startY: number;
    direction: 1 | -1;
    pointerId: number;
    lastX: number;
    lastTime: number;
    velocity: number;
  } | null>(null);
  const [displayIndex, setDisplayIndex] = useState(spreadIndex);
  const [transition, setTransitionState] = useState<TurnTransition | null>(null);
  const lookTargetRef = useRef(new Vector3(BOOK_WIDTH / 2, 0, 0));
  const desiredCameraPosition = useRef(new Vector3());
  const { camera, size, gl } = useThree();

  const setTransition = useCallback((next: TurnTransition | null) => {
    transitionRef.current = next;
    setTransitionState(next);
  }, []);

  // Turns are owned by the scene: the parent's spreadIndex is a request, and
  // only one turn runs at a time. Requests made mid-turn are picked up when
  // the current turn lands, so rapid input produces sequential turns instead
  // of resetting the animation with mismatched textures.
  const maybeStartTurn = useCallback(() => {
    if (transitionRef.current) return;
    const target = requestedIndexRef.current;
    if (target === visualIndexRef.current) return;
    const direction = target > visualIndexRef.current ? 1 : -1;
    turnProgressRef.current = 0;
    turnTargetRef.current = 1;
    setTransition({ from: visualIndexRef.current, to: target, direction });
  }, [setTransition]);

  useEffect(() => {
    requestedIndexRef.current = spreadIndex;
    maybeStartTurn();
  }, [maybeStartTurn, spreadIndex]);

  // Drag-to-turn: pointer events on the canvas drive the turn progress
  // directly while dragging. A tap (no significant move) falls through to
  // the mesh onClick handler. A flick past the midpoint completes the turn;
  // releasing before the midpoint cancels it.
  const handleDragStart = useCallback(
    (clientX: number, clientY: number, direction: 1 | -1, pointerId: number) => {
      if (!isOpen || transitionRef.current) return;
      dragStateRef.current = {
        active: true,
        started: false,
        startX: clientX,
        startY: clientY,
        direction,
        pointerId,
        lastX: clientX,
        lastTime: performance.now(),
        velocity: 0,
      };
      try {
        gl.domElement.setPointerCapture(pointerId);
      } catch {
        // setPointerCapture can throw if the pointer is already released
      }
    },
    [gl, isOpen],
  );

  useEffect(() => {
    const canvas = gl.domElement;
    const DRAG_THRESHOLD = 10;
    const TURN_THRESHOLD = Math.max(80, size.width * 0.14);
    const FLICK_VELOCITY = 450;

    const onPointerMove = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag || !drag.active) return;

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (!drag.started) {
        if (distance < DRAG_THRESHOLD) return;
        const targetIndex = visualIndexRef.current + drag.direction;
        if (targetIndex < 0 || targetIndex >= spreads.length) {
          dragStateRef.current = null;
          return;
        }
        drag.started = true;
        isDraggingRef.current = true;
        dragOccurredRef.current = true;
        turnProgressRef.current = 0;
        turnTargetRef.current = 1;
        setTransition({ from: visualIndexRef.current, to: targetIndex, direction: drag.direction });
      }

      const now = performance.now();
      const dt = (now - drag.lastTime) / 1000;
      const dragDelta = drag.direction === 1 ? -deltaX : deltaX;
      if (dt > 0.001) {
        const instantaneous = (drag.direction === 1 ? -(event.clientX - drag.lastX) : event.clientX - drag.lastX) / dt;
        drag.velocity = drag.velocity * 0.6 + instantaneous * 0.4;
      }
      drag.lastX = event.clientX;
      drag.lastTime = now;
      turnProgressRef.current = MathUtils.clamp(dragDelta / TURN_THRESHOLD, 0, 1);
    };

    const onPointerUp = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag || !drag.active) return;
      try {
        canvas.releasePointerCapture(drag.pointerId);
      } catch {
        // releasePointerCapture can throw if not captured
      }
      dragStateRef.current = null;

      if (!drag.started) {
        // No drag occurred — let the mesh onClick handle it as a tap
        return;
      }

      isDraggingRef.current = false;
      const velocity = drag.velocity;
      const progress = turnProgressRef.current;

      if (progress > 0.5 || velocity > FLICK_VELOCITY) {
        turnTargetRef.current = 1;
        if (drag.direction === 1) onNext();
        else onPrevious();
      } else {
        turnTargetRef.current = 0;
      }
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, [gl, onNext, onPrevious, setTransition, size.width, spreads.length]);

  useEffect(() => {
    loadedTextures.forEach((texture) => {
      // Keep mipmaps enabled so page text stays crisp at glancing angles.
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 8;
    });
  }, [loadedTextures]);

  useEffect(
    () => () => {
      bookplateTexture.dispose();
      contentsTexture.dispose();
      blankTexture.dispose();
      gutterShadowTexture.dispose();
      contactShadowTexture.dispose();
    },
    [blankTexture, bookplateTexture, contentsTexture, contactShadowTexture, gutterShadowTexture],
  );

  useFrame((_, delta) => {
    openingRef.current = MathUtils.damp(openingRef.current, isOpen ? 1 : 0, isOpen ? 2.8 : 4.2, delta);
    const open = smoothstep(openingRef.current);

    if (coverPivotRef.current) {
      coverPivotRef.current.rotation.z = -Math.PI * open;
    }
    if (leftContentRef.current) {
      leftContentRef.current.visible = open > 0.38;
      const reveal = MathUtils.clamp((open - 0.38) / 0.32, 0, 1);
      leftContentRef.current.scale.x = reveal;
      leftContentRef.current.position.y = 0.2 * reveal;
    }
    if (rootRef.current) {
      rootRef.current.rotation.y = MathUtils.lerp(-0.12, 0, open);
      rootRef.current.rotation.z = MathUtils.lerp(-0.04, 0, open);
    }
    if (contactShadowRef.current) {
      contactShadowRef.current.scale.x = MathUtils.lerp(5.4, 10.6, open);
      contactShadowRef.current.position.x = MathUtils.lerp(BOOK_WIDTH / 2, 0, open);
    }

    const perspective = camera as PerspectiveCamera;
    const tanHalfFov = Math.tan(MathUtils.degToRad(perspective.fov) / 2);
    const aspect = size.width / size.height;
    const isTopdown = isOpen && readingView === 'topdown';
    const halfWidth = isTopdown ? BOOK_WIDTH + 0.2 : isOpen ? BOOK_WIDTH + 0.35 : BOOK_WIDTH * 0.92;
    const halfHeight = isTopdown ? BOOK_HEIGHT * 0.52 : isOpen ? BOOK_HEIGHT * 0.5 : BOOK_HEIGHT * 0.58;
    const padding = isTopdown ? TOPDOWN_PADDING : CAMERA_PADDING;
    const fitDistance =
      Math.max(halfWidth / (tanHalfFov * aspect), halfHeight / tanHalfFov) * padding;
    const desiredTarget = !isOpen ? CLOSED_TARGET : isTopdown ? TOPDOWN_TARGET : OPEN_TARGET;
    const desiredDirection = !isOpen ? CLOSED_DIRECTION : isTopdown ? TOPDOWN_DIRECTION : OPEN_DIRECTION;
    desiredCameraPosition.current.copy(desiredDirection).multiplyScalar(fitDistance).add(desiredTarget);
    camera.position.x = MathUtils.damp(camera.position.x, desiredCameraPosition.current.x, 2.2, delta);
    camera.position.y = MathUtils.damp(camera.position.y, desiredCameraPosition.current.y, 2.2, delta);
    camera.position.z = MathUtils.damp(camera.position.z, desiredCameraPosition.current.z, 2.2, delta);
    lookTargetRef.current.lerp(desiredTarget, 1 - Math.exp(-2.2 * delta));
    camera.lookAt(lookTargetRef.current);

    const activeTransition = transitionRef.current;
    if (activeTransition) {
      // While dragging, the turn progress is driven directly by the pointer
      // handler — skip damping so the page follows the finger 1:1.
      if (!isDraggingRef.current) {
        // Slower damping for a deliberate, weighted page turn (~900ms).
        // Canceling a turn uses a slightly faster spring so the page snaps
        // back without lingering.
        const cancelSpeed = turnTargetRef.current === 0 ? 4.5 : 2.0;
        turnProgressRef.current = MathUtils.damp(
          turnProgressRef.current,
          turnTargetRef.current,
          cancelSpeed,
          delta,
        );
      }
      if (turnTargetRef.current === 1 && turnProgressRef.current > 0.995) {
        visualIndexRef.current = activeTransition.to;
        setDisplayIndex(activeTransition.to);
        setTransition(null);
        turnProgressRef.current = 1;
        maybeStartTurn();
      } else if (turnTargetRef.current === 0 && turnProgressRef.current < 0.005) {
        setTransition(null);
        turnProgressRef.current = 0;
        maybeStartTurn();
      }
    }

    // Dynamic page stack: the right stack thins as you read forward, the
    // left stack grows. Heights are damped for smooth transitions on turn.
    const totalSpreads = spreads.length;
    const ratio = totalSpreads > 1 ? displayIndex / (totalSpreads - 1) : 0;
    const targetRightHeight = 0.04 + 0.22 * (1 - ratio);
    const targetLeftHeight = 0.04 + 0.22 * ratio;
    rightStackHeightRef.current = MathUtils.damp(rightStackHeightRef.current, targetRightHeight, 3, delta);
    leftStackHeightRef.current = MathUtils.damp(leftStackHeightRef.current, targetLeftHeight, 3, delta);

    if (rightStackRef.current) {
      const h = rightStackHeightRef.current;
      rightStackRef.current.scale.y = h / 0.26;
      rightStackRef.current.position.y = PAGE_Y - h / 2 - 0.015;
    }
    if (leftStackRef.current) {
      const h = leftStackHeightRef.current;
      leftStackRef.current.scale.y = h / 0.26;
      leftStackRef.current.position.y = PAGE_Y - h / 2 - 0.015;
    }
  });

  const textureForLeaf = (leaf: CookbookLeaf): Texture => {
    if (leaf.type === 'bookplate') return bookplateTexture;
    if (leaf.type === 'contents') return contentsTexture;
    if (leaf.type === 'recipe') return recipeTextures[leaf.pageIndex] ?? blankTexture;
    return blankTexture;
  };

  // Page leaves are raycast even while invisible or mid-turn, so gate the
  // callbacks here instead of relying on pointer-events visibility.
  const turnOrIgnore = (action: () => void) => {
    if (isOpen && !transition) action();
  };

  const stableSpread = spreads[displayIndex] ?? spreads[0];
  const fromSpread = transition ? spreads[transition.from] : stableSpread;
  const toSpread = transition ? spreads[transition.to] : stableSpread;
  const leftLeaf = transition?.direction === 1 ? fromSpread.left : toSpread.left;
  const rightLeaf = transition?.direction === 1 ? toSpread.right : fromSpread.right;
  const turningFront = transition?.direction === 1 ? fromSpread.right : toSpread.right;
  const turningBack = transition?.direction === 1 ? toSpread.left : fromSpread.left;

  return (
    <>
      <ambientLight intensity={0.68} />
      <hemisphereLight args={['#fff8ee', '#4a4538', 0.6]} />
      <directionalLight
        castShadow
        position={[-6, 10, 6]}
        intensity={2.1}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={30}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0002}
      />
      <pointLight position={[-3, 5, 4]} intensity={0.35} color="#e8d8be" />
      <directionalLight position={[0, 6, -3]} intensity={0.3} color="#f5ede0" />

      <group ref={rootRef} position={[0, 0.14, 0]}>
        {/* Base board — the rigid cover material underneath the pages */}
        <mesh castShadow receiveShadow position={[BOOK_WIDTH / 2, 0, 0]}>
          <roundedBoxGeometry args={[BOOK_WIDTH + 0.12, 0.16, BOOK_HEIGHT + 0.12, 7, 0.12]} />
          <meshStandardMaterial color="#36351f" roughness={0.86} />
        </mesh>

        {/* Right page stack — thins as you read forward */}
        <mesh ref={rightStackRef} castShadow receiveShadow position={[BOOK_WIDTH / 2, 0.19, 0]}>
          <roundedBoxGeometry args={[BOOK_WIDTH - 0.12, 0.26, BOOK_HEIGHT - 0.16, 5, 0.08]} />
          <meshStandardMaterial color={PAPER} roughness={0.95} />
        </mesh>

        {/* Page lines at the fore-edge — decorative ridges on the right stack */}
        {[-0.09, -0.03, 0.03, 0.09].map((offset) => (
          <mesh key={offset} position={[BOOK_WIDTH + 0.01, 0.21 + offset * 0.3, offset]}>
            <boxGeometry args={[0.014, 0.012, BOOK_HEIGHT - 0.3]} />
            <meshStandardMaterial color="#cac3b4" roughness={1} />
          </mesh>
        ))}

        {/* Sculpted spine — slightly taller than the page block, dark */}
        <mesh castShadow position={[-0.07, 0.19, 0]}>
          <roundedBoxGeometry args={[0.16, 0.42, BOOK_HEIGHT + 0.04, 5, 0.06]} />
          <meshStandardMaterial color="#313229" roughness={0.9} />
        </mesh>

        <group ref={leftContentRef}>
          {/* Left page stack — grows as you read forward, revealed with the cover */}
          <mesh ref={leftStackRef} castShadow receiveShadow position={[-BOOK_WIDTH / 2, 0.19, 0]}>
            <roundedBoxGeometry args={[BOOK_WIDTH - 0.12, 0.26, BOOK_HEIGHT - 0.16, 5, 0.08]} />
            <meshStandardMaterial color={PAPER} roughness={0.95} />
          </mesh>
          <PageLeaf
            texture={textureForLeaf(leftLeaf)}
            side="left"
            onPress={() => turnOrIgnore(onPrevious)}
            onDragStart={handleDragStart}
            dragOccurredRef={dragOccurredRef}
          />
        </group>
        <PageLeaf
          texture={textureForLeaf(rightLeaf)}
          side="right"
          onPress={() => turnOrIgnore(onNext)}
          onDragStart={handleDragStart}
          dragOccurredRef={dragOccurredRef}
        />

        {transition ? (
          <TurningLeaf
            frontTexture={textureForLeaf(turningFront)}
            backTexture={textureForLeaf(turningBack)}
            direction={transition.direction}
            progressRef={turnProgressRef}
            isDraggingRef={isDraggingRef}
          />
        ) : null}

        <group ref={coverPivotRef} position={[0, 0.42, 0]}>
          <mesh
            castShadow
            position={[BOOK_WIDTH / 2, 0, 0]}
            onClick={(event) => {
              // Stop the ray from also hitting the page leaf beneath the
              // cover, which would fire onNext on the same tap.
              event.stopPropagation();
              if (!isOpen) onOpen();
            }}
          >
            <roundedBoxGeometry args={[BOOK_WIDTH, COVER_THICKNESS, BOOK_HEIGHT, 7, 0.1]} />
            <meshStandardMaterial color="#3a3828" roughness={0.85} metalness={0.02} />
          </mesh>
          <mesh position={[BOOK_WIDTH / 2, COVER_THICKNESS / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[BOOK_WIDTH - 0.1, BOOK_HEIGHT - 0.1]} />
            <meshStandardMaterial map={coverTexture} roughness={0.8} side={FrontSide} />
          </mesh>
          <mesh position={[BOOK_WIDTH / 2, -COVER_THICKNESS / 2 - 0.005, 0]} rotation={[Math.PI / 2, 0, Math.PI]}>
            <planeGeometry args={[BOOK_WIDTH - 0.14, BOOK_HEIGHT - 0.14]} />
            <meshStandardMaterial color="#3e3d2c" roughness={0.9} side={FrontSide} />
          </mesh>
          <mesh castShadow position={[BOOK_WIDTH * 0.82, 0.085, 0]}>
            <boxGeometry args={[0.038, 0.05, BOOK_HEIGHT + 0.1]} />
            <meshStandardMaterial color="#33342a" roughness={0.78} />
          </mesh>
        </group>

        {/* Bookmark ribbon: sandwiched in the page block, tail draping past the fore-edge.
            Keep the droop slight so the inner end never lifts through the page leaf. */}
        <mesh castShadow position={[0.55, 0.318, BOOK_HEIGHT / 2 - 0.1]} rotation={[0.025, 0, 0]}>
          <boxGeometry args={[0.09, 0.016, 1.3]} />
          <meshStandardMaterial color="#9a3f32" roughness={0.8} />
        </mesh>

        {/* Soft shadow pooling in the gutter where the spread meets the spine */}
        <mesh position={[0, PAGE_Y + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.15, BOOK_HEIGHT - 0.2]} />
          <meshBasicMaterial map={gutterShadowTexture} transparent depthWrite={false} />
        </mesh>
      </group>

      <mesh receiveShadow position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#c4bdb0" roughness={0.97} />
      </mesh>

      {/* Soft contact shadow grounding the book, widening as the spread opens */}
      <mesh ref={contactShadowRef} position={[BOOK_WIDTH / 2, -0.05, 0.2]} rotation={[-Math.PI / 2, 0, 0]} scale={[5.4, 7.6, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={contactShadowTexture} transparent depthWrite={false} />
      </mesh>
    </>
  );
}

function PageLeaf({
  texture,
  side,
  onPress,
  onDragStart,
  dragOccurredRef,
}: {
  texture: Texture;
  side: 'left' | 'right';
  onPress: () => void;
  onDragStart: (clientX: number, clientY: number, direction: 1 | -1, pointerId: number) => void;
  dragOccurredRef: React.MutableRefObject<boolean>;
}) {
  const x = side === 'left' ? -BOOK_WIDTH / 2 : BOOK_WIDTH / 2;
  const direction = side === 'right' ? 1 : -1;
  return (
    <mesh
      receiveShadow
      position={[x, PAGE_Y, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={(event) => {
        event.stopPropagation();
        dragOccurredRef.current = false;
        onDragStart(event.clientX, event.clientY, direction, event.pointerId);
      }}
      onClick={(event) => {
        event.stopPropagation();
        // If a drag occurred, suppress the tap — the drag handler already
        // completed or canceled the turn.
        if (dragOccurredRef.current) {
          dragOccurredRef.current = false;
          return;
        }
        onPress();
      }}
    >
      <planeGeometry args={[BOOK_WIDTH - 0.08, BOOK_HEIGHT - 0.14]} />
      <meshStandardMaterial map={texture} roughness={0.96} side={DoubleSide} />
    </mesh>
  );
}

function TurningLeaf({
  frontTexture,
  backTexture,
  direction,
  progressRef,
  isDraggingRef,
}: {
  frontTexture: Texture;
  backTexture: Texture;
  direction: -1 | 1;
  progressRef: React.MutableRefObject<number>;
  isDraggingRef: React.MutableRefObject<boolean>;
}) {
  const geometry = useMemo(() => new PlaneGeometry(BOOK_WIDTH - 0.08, BOOK_HEIGHT - 0.14, 40, 4), []);
  const basePositions = useMemo(
    () => Float32Array.from(geometry.attributes.position.array as ArrayLike<number>),
    [geometry],
  );
  const meshRef = useRef<Mesh>(null);
  const shadowRef = useRef<Mesh>(null);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    const rawProgress = progressRef.current;
    // During drag, map progress linearly so the page follows the finger 1:1.
    // During animation, use material-style easing for a deliberate, weighted feel.
    const easedRaw = isDraggingRef.current ? rawProgress : easeMaterial(rawProgress);
    const progress = isDraggingRef.current ? easedRaw : settleOvershoot(easedRaw);
    const pageProgress = direction === 1 ? progress : 1 - progress;
    const positions = geometry.attributes.position;

    // Ease the rotation: slow start, sustained middle, gentle settle.
    // Using the same material ease for the rotation gives a cohesive feel.
    const easedTurn = easeMaterial(pageProgress);

    for (let index = 0; index < positions.count; index += 1) {
      const baseIndex = index * 3;
      const originalX = basePositions[baseIndex] + (BOOK_WIDTH - 0.08) / 2;
      const originalY = basePositions[baseIndex + 1];
      const normalizedX = originalX / (BOOK_WIDTH - 0.08);
      // Pronounced curl that builds gradually, peaks mid-turn, and settles.
      // The primary curl follows the page edge; the secondary adds paper ripple.
      // Increased from 0.14/0.06 to 0.22/0.09 for more visible deformation.
      const curlEnvelope = Math.sin(Math.PI * pageProgress);
      const curlStrength = 0.22 * Math.sin(Math.PI * normalizedX) * curlEnvelope;
      const secondaryCurl = 0.09 * Math.sin(Math.PI * normalizedX * 2) * curlEnvelope;
      // Asymmetric curl: the leading edge curls more than the trailing edge,
      // mimicking how a real page lifts from the fore-edge first.
      const edgeBias = 0.04 * normalizedX * curlEnvelope;
      const totalCurl = curlStrength + secondaryCurl + edgeBias;
      const theta = -Math.PI * easedTurn - totalCurl;
      positions.setXYZ(index, Math.cos(theta) * originalX, originalY, -Math.sin(theta) * originalX);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    if (meshRef.current) {
      // Higher lift mid-turn so the page physically rises off the stack.
      // Increased from 0.03 to 0.06 for more visible weight. The settle
      // overshoot adds a tiny bounce when the page lands.
      const liftCurve = Math.sin(Math.PI * pageProgress);
      const settle = progress > 0.85 ? 0.004 * Math.sin((progress - 0.85) / 0.15 * Math.PI * 2) * (1 - (progress - 0.85) / 0.15) : 0;
      meshRef.current.position.y = PAGE_Y + 0.012 + liftCurve * 0.06 + settle;
    }

    // Dynamic shadow: fades in as the page lifts, tracks the page's
    // horizontal position so it appears cast on the stack below.
    if (shadowRef.current && shadowRef.current.material) {
      const mat = shadowRef.current.material as { opacity: number };
      const liftCurve = Math.sin(Math.PI * pageProgress);
      mat.opacity = liftCurve * 0.12;
      // Shadow shifts toward the destination as the page turns
      const shadowX = (direction === 1 ? -1 : 1) * liftCurve * (BOOK_WIDTH - 0.08) * 0.3;
      shadowRef.current.position.x = shadowX;
      shadowRef.current.position.y = -0.02 - liftCurve * 0.01;
      // Shadow grows slightly as the page lifts higher
      const scale = 1 + liftCurve * 0.08;
      shadowRef.current.scale.set(scale, 1, 1);
    }
  });

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial map={frontTexture} roughness={0.93} side={FrontSide} />
      </mesh>
      <mesh geometry={geometry} position={[0, 0, -0.008]}>
        <meshStandardMaterial map={backTexture} roughness={0.93} side={BackSide} />
      </mesh>
      {/* Dynamic shadow that follows the turning page, projected on the
          stack below. Fades in as the page lifts, out as it settles. */}
      <mesh ref={shadowRef} position={[0, -0.02, 0]}>
        <planeGeometry args={[BOOK_WIDTH - 0.08, BOOK_HEIGHT - 0.14]} />
        <meshBasicMaterial color="#000000" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function resolveImageUri(source: CookbookPage['imageAsset'] | undefined): string | null {
  if (!source) return null;
  if (typeof source === 'number') return Asset.fromModule(source).uri;
  if (Array.isArray(source)) return resolveImageUri(source[0]);
  if (typeof source === 'object' && typeof source.uri === 'string') return source.uri;
  return null;
}

function makeFallbackImageUri(title: string): string {
  const safeTitle = escapeXml(title);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1240"><rect width="100%" height="100%" fill="#e8e0cf"/><rect x="38" y="38" width="824" height="1164" rx="24" fill="none" stroke="#97866a" stroke-width="4"/><text x="450" y="590" text-anchor="middle" font-family="Georgia" font-size="54" fill="#2d2923">${safeTitle}</text><text x="450" y="654" text-anchor="middle" font-family="Georgia" font-size="20" letter-spacing="7" fill="#786e61">COOKBOOK</text></svg>`,
  )}`;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      "'": '&apos;',
      '"': '&quot;',
    };
    return entities[character];
  });
}

function createBookplateTexture(title: string, count: number): CanvasTexture {
  return createPaperTexture((context, width, height) => {
    // Decorative border with double line
    context.strokeStyle = '#b39762';
    context.lineWidth = 2.5;
    context.strokeRect(80, 80, width - 160, height - 160);
    context.strokeStyle = '#c4ac7a';
    context.lineWidth = 1;
    context.strokeRect(92, 92, width - 184, height - 184);

    // Small ornament at top
    context.fillStyle = '#b39762';
    context.font = '28px Georgia';
    context.textAlign = 'center';
    context.fillText('✦', width / 2, height * 0.28);

    // Subtitle
    context.fillStyle = '#8a7d6b';
    context.font = 'italic 20px Georgia';
    context.fillText('A Personal Cookbook', width / 2, height * 0.36);

    // Title
    context.fillStyle = '#29251f';
    context.font = 'bold 52px Georgia';
    drawWrappedText(context, title, width / 2, height * 0.47, width * 0.68, 62);

    // Divider line
    context.strokeStyle = '#b39762';
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(width * 0.35, height * 0.62);
    context.lineTo(width * 0.65, height * 0.62);
    context.stroke();

    // Recipe count
    context.fillStyle = '#8a7d6b';
    context.font = '16px Georgia';
    context.fillText(`${count} ${count === 1 ? 'Recipe' : 'Recipes'}`, width / 2, height * 0.67);

    // Bottom ornament
    context.fillStyle = '#b39762';
    context.font = '20px Georgia';
    context.fillText('✦', width / 2, height * 0.82);
  });
}

function createContentsTexture(title: string, pages: CookbookPage[]): CanvasTexture {
  return createPaperTexture((context, width) => {
    // Header
    context.fillStyle = '#9a8d7a';
    context.font = 'italic 16px Georgia';
    context.fillText(title, 80, 100);

    // Title
    context.fillStyle = '#29251f';
    context.font = 'bold 42px Georgia';
    context.fillText('Contents', 80, 160);

    // Decorative underline
    context.strokeStyle = '#b39762';
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(80, 178);
    context.lineTo(240, 178);
    context.stroke();

    // Entries
    pages.slice(0, 8).forEach((page, index) => {
      const y = 240 + index * 95;
      // Dotted leader line
      context.strokeStyle = '#d4c9b5';
      context.lineWidth = 1;
      context.setLineDash([2, 4]);
      context.beginPath();
      context.moveTo(80, y + 28);
      context.lineTo(width - 80, y + 28);
      context.stroke();
      context.setLineDash([]);

      // Page number
      context.fillStyle = '#9a8d7a';
      context.font = '18px Georgia';
      context.fillText(String(page.pageNumber).padStart(2, '0'), 80, y);

      // Recipe title
      context.fillStyle = '#29251f';
      context.font = '26px Georgia';
      context.fillText(page.title, 130, y);
    });
  });
}

function createContactShadowTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create contact shadow texture');
  const gradient = context.createRadialGradient(128, 128, 16, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(45, 38, 28, 0.34)');
  gradient.addColorStop(0.6, 'rgba(45, 38, 28, 0.16)');
  gradient.addColorStop(1, 'rgba(45, 38, 28, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function createGutterShadowTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create gutter shadow texture');
  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, 'rgba(56, 48, 36, 0)');
  gradient.addColorStop(0.5, 'rgba(56, 48, 36, 0.32)');
  gradient.addColorStop(1, 'rgba(56, 48, 36, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function createBlankTexture(): CanvasTexture {
  return createPaperTexture((context, width, height) => {
    context.textAlign = 'center';
    context.fillStyle = '#c9bda8';
    context.font = '32px Georgia';
    context.fillText('✦', width / 2, height / 2 - 30);
    context.fillStyle = '#b5a98f';
    context.font = 'italic 24px Georgia';
    context.fillText('This page is waiting for a recipe', width / 2, height / 2 + 24);
  });
}

function createPaperTexture(
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void,
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1240;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create cookbook page texture');
  context.fillStyle = '#f4efe4';
  context.fillRect(0, 0, canvas.width, canvas.height);
  draw(context, canvas.width, canvas.height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  lines.forEach((value, index) => context.fillText(value, x, y + index * lineHeight));
}

function smoothstep(value: number): number {
  const clamped = MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

// Material-style "standard" easing: cubic-bezier(0.4, 0.0, 0.2, 1).
// Slower start than smoothstep, sustained middle, gentle deceleration.
function easeMaterial(value: number): number {
  const t = MathUtils.clamp(value, 0, 1);
  // Approximate the cubic-bezier with a polynomial blend
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Subtle settle overshoot: the page lands with a tiny bounce past 1.0.
// Only active in the last 15% of the progress range.
function settleOvershoot(progress: number): number {
  if (progress <= 0.85) return progress;
  const t = (progress - 0.85) / 0.15;
  // Damped sine wave that oscillates and settles
  const overshoot = 0.015 * Math.sin(t * Math.PI * 2) * (1 - t);
  return progress + overshoot;
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
