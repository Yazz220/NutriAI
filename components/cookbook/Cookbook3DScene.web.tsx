import { Colors } from '@/constants/colors';
/* eslint-disable react/no-unknown-property, react-hooks/immutability -- R3F animates Three.js objects and uses renderer-specific JSX props. */
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, extend, useFrame, useLoader, useThree, type ThreeElement } from '@react-three/fiber';
import {
  ACESFilmicToneMapping,
  BackSide,
  CatmullRomCurve3,
  CanvasTexture,
  Color,
  DoubleSide,
  FrontSide,
  MathUtils,
  Mesh,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Group } from 'three';
import type { Cookbook3DSceneProps } from '@/components/cookbook/Cookbook3DScene.types';
import { resolveCookbookBinding } from '@/constants/cookbookBindings';
import {
  normalizeCoverTitlePlacementId,
  resolveCoverTitleCenterRatio,
  resolveCoverTitleFoil,
  type CoverTitleFoil,
} from '@/constants/cookbookCoverTypography';
import { COOKBOOK_GEOMETRY } from '@/constants/cookbookGeometry';
import { NOSH_SYMBOL_PATH, NOSH_SYMBOL_VIEWBOX } from '@/constants/noshSymbol';
import type { CookbookCoverTitlePlacementId, CookbookPage } from '@/types/cookbook';
import { shiftColor } from '@/utils/cookbook/coverArt';
import {
  buildPageCurlCurve,
  estimateTurnSettleDuration,
  resolveTurnProgress,
  resolveTurnRelease,
} from '@/utils/cookbook/physicalBook';
import {
  type CookbookLeaf,
  type CookbookSpread,
} from '@/utils/cookbook/reader';
import { resolveImageAssetUri } from '@/utils/cookbook/imageAsset';

extend({ RoundedBoxGeometry });

declare module '@react-three/fiber' {
  interface ThreeElements {
    roundedBoxGeometry: ThreeElement<typeof RoundedBoxGeometry>;
  }
}

const BOOK_WIDTH = 4.25;
const BOOK_HEIGHT = BOOK_WIDTH * COOKBOOK_GEOMETRY.page.heightRatio;
const COVER_THICKNESS = 0.09;
const PAGE_Y = 0.25;
const PAPER = Colors.legacySurface.v37;
const COVER_GREEN = Colors.legacySurface.v04;

// Camera framing is derived from these view directions plus a fit-to-viewport
// distance, so the whole book stays visible on any aspect ratio.
const CLOSED_TARGET = new Vector3(BOOK_WIDTH / 2, 0.3, 0);
const CLOSED_DIRECTION = new Vector3(3.1, 5.4, 12.8).normalize();
const OPEN_TARGET = new Vector3(0, -0.15, 0);
const OPEN_DIRECTION = new Vector3(0, 7.2, 9.8).normalize();
const TOPDOWN_TARGET = new Vector3(0, 0, 0);
const TOPDOWN_DIRECTION = new Vector3(0, 1, 0.12).normalize();
const CLOSED_PADDING = 1.48;
const OPEN_PADDING = 1.18;
const TOPDOWN_PADDING = 1.04;
const AUTOMATIC_TURN_DURATION = 0.72;
const WEB_CURL_LIFT = 0.28;
const MIN_TURN_TRAVEL = 60;

interface TurnTransition {
  from: number;
  to: number;
  direction: -1 | 1;
}

interface TurnSettle {
  from: number;
  to: 0 | 1;
  elapsed: number;
  duration: number;
}

export function Cookbook3DScene({
  cookbook,
  pages,
  spreads,
  spreadIndex,
  isOpen,
  reduceMotion = false,
  readingView = 'spread',
  onOpen,
  onNext,
  onPrevious,
  onEnterReadingView,
  onOpenRecipe,
  style,
}: Cookbook3DSceneProps) {
  const coverBinding = resolveCookbookBinding({
    finishId: cookbook?.coverFinishId,
    colorId: cookbook?.coverColorId,
    legacyStyleId: cookbook?.coverStyle,
  });
  const coverTitleFoil = resolveCoverTitleFoil(cookbook?.coverTitleColorId, coverBinding.foil);
  const coverTitlePlacementId = normalizeCoverTitlePlacementId(cookbook?.coverTitlePlacementId);
  const coverUri = resolveImageAssetUri(cookbook?.coverImageAsset) ?? makeFallbackCoverImageUri();
  const pageUris = pages.map(
    (page) => resolveImageAssetUri(page.imageAsset) ?? page.imageUrl ?? makeFallbackImageUri(page.title),
  );
  const textureUris = [coverUri, ...pageUris];

  return (
    <View style={[styles.container, style]}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 28, near: 0.1, far: 100, position: [5.5, 6.5, 13.5] }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = PCFShadowMap;
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.92;
          gl.setClearColor(new Color(Colors.legacySurface.v32), 0);
        }}
      >
        <SceneLights />
        <Suspense fallback={<FallbackBook />}>
          <BookScene
            title={cookbook?.title ?? 'My Cookbook'}
            coverTitleFoil={coverTitleFoil}
            coverTitlePlacementId={coverTitlePlacementId}
            coverClothColor={coverBinding.cloth}
            pages={pages}
            spreads={spreads}
            spreadIndex={spreadIndex}
            isOpen={isOpen}
            reduceMotion={reduceMotion}
            readingView={readingView}
            textureUris={textureUris}
            onOpen={onOpen}
            onNext={onNext}
            onPrevious={onPrevious}
            onEnterReadingView={onEnterReadingView}
            onOpenRecipe={onOpenRecipe}
          />
        </Suspense>
      </Canvas>
    </View>
  );
}

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.24} />
      <hemisphereLight args={[Colors.legacySurface.v43, Colors.legacySurface.v07, 0.34]} />
      <directionalLight
        castShadow
        position={[-7, 11, 7]}
        intensity={1.65}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={30}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0002}
        shadow-radius={5}
      />
      <directionalLight position={[5, 7, -4]} intensity={0.22} color={Colors.legacySurface.v38} />
    </>
  );
}

// Shown while page textures stream in: the closed book in plain materials so
// the stage is never blank.
function FallbackBook() {
  return (
    <group position={[0, 0.14, 0]}>
      <mesh position={[BOOK_WIDTH / 2, 0, 0]}>
        <roundedBoxGeometry args={[BOOK_WIDTH + 0.1, 0.1, BOOK_HEIGHT + 0.1, 7, 0.1]} />
        <meshStandardMaterial color={COVER_GREEN} roughness={0.85} />
      </mesh>
      <mesh position={[BOOK_WIDTH / 2, 0.13, 0]}>
        <roundedBoxGeometry args={[BOOK_WIDTH - 0.16, 0.16, BOOK_HEIGHT - 0.2, 4, 0.045]} />
        <meshStandardMaterial color={PAPER} roughness={0.9} />
      </mesh>
      <mesh position={[-0.055, 0.12, 0]}>
        <roundedBoxGeometry args={[0.12, 0.25, BOOK_HEIGHT + 0.02, 5, 0.05]} />
        <meshStandardMaterial color={Colors.legacySurface.v02} roughness={0.78} />
      </mesh>
    </group>
  );
}

function BookScene({
  title,
  coverTitleFoil,
  coverTitlePlacementId,
  coverClothColor,
  pages,
  spreads,
  spreadIndex,
  isOpen,
  reduceMotion,
  readingView,
  textureUris,
  onOpen,
  onNext,
  onPrevious,
  onEnterReadingView,
  onOpenRecipe,
}: {
  title: string;
  coverTitleFoil: CoverTitleFoil;
  coverTitlePlacementId: CookbookCoverTitlePlacementId;
  coverClothColor: string;
  pages: CookbookPage[];
  spreads: CookbookSpread[];
  spreadIndex: number;
  isOpen: boolean;
  reduceMotion: boolean;
  readingView: 'spread' | 'page';
  textureUris: string[];
  onOpen: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onEnterReadingView: (page?: CookbookPage) => void;
  onOpenRecipe: (page: CookbookPage) => void;
}) {
  const loadedTextures = useLoader(TextureLoader, textureUris);
  const coverTexture = loadedTextures[0];
  const recipeTextures = loadedTextures.slice(1);
  const coverTitleTexture = useMemo(
    () => createCoverTitleTexture(title, coverTitleFoil, coverTitlePlacementId, coverClothColor),
    [coverClothColor, coverTitleFoil, coverTitlePlacementId, title],
  );
  const bookplateTexture = useMemo(() => createBookplateTexture(title, pages.length), [pages.length, title]);
  const blankTexture = useMemo(() => createBlankTexture(), []);
  const gutterShadowTexture = useMemo(() => createGutterShadowTexture(), []);
  const rootRef = useRef<Group>(null);
  const coverPivotRef = useRef<Group>(null);
  const leftContentRef = useRef<Group>(null);
  const rightStackRef = useRef<Mesh>(null);
  const leftStackRef = useRef<Mesh>(null);
  const rightStackHeightRef = useRef(0.16);
  const leftStackHeightRef = useRef(0.04);
  const openingRef = useRef(isOpen ? 1 : 0);
  const visualIndexRef = useRef(spreadIndex);
  const requestedIndexRef = useRef(spreadIndex);
  const turnProgressRef = useRef(1);
  const turnTargetRef = useRef(1);
  const turnSettleRef = useRef<TurnSettle | null>(null);
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
    /** Pointer travel (px) from grab point to the position where the turn completes. */
    travel: number;
  } | null>(null);
  const [displayIndex, setDisplayIndex] = useState(spreadIndex);
  const [transition, setTransitionState] = useState<TurnTransition | null>(null);
  const lookTargetRef = useRef(new Vector3(BOOK_WIDTH / 2, 0, 0));
  const desiredCameraPosition = useRef(new Vector3());
  const { camera, size, gl, scene } = useThree();
  const elasticCurve = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(BOOK_WIDTH * 0.82, -0.035, -BOOK_HEIGHT / 2 - 0.035),
        new Vector3(BOOK_WIDTH * 0.82, 0.06, -BOOK_HEIGHT / 2 + 0.12),
        new Vector3(BOOK_WIDTH * 0.82, 0.06, BOOK_HEIGHT / 2 - 0.12),
        new Vector3(BOOK_WIDTH * 0.82, -0.035, BOOK_HEIGHT / 2 + 0.035),
      ]),
    [],
  );

  const setTransition = useCallback((next: TurnTransition | null) => {
    transitionRef.current = next;
    setTransitionState(next);
  }, []);

  useEffect(() => {
    const environment = new RoomEnvironment();
    const generator = new PMREMGenerator(gl);
    const environmentMap = generator.fromScene(environment, 0.035).texture;
    scene.environment = environmentMap;
    return () => {
      scene.environment = null;
      environmentMap.dispose();
      generator.dispose();
      environment.dispose();
    };
  }, [gl, scene]);

  // Turns are owned by the scene: the parent's spreadIndex is a request, and
  // only one turn runs at a time. Requests made mid-turn are picked up when
  // the current turn lands, so rapid input produces sequential turns instead
  // of resetting the animation with mismatched textures.
  const maybeStartTurn = useCallback(() => {
    if (transitionRef.current) return;
    const target = requestedIndexRef.current;
    if (target === visualIndexRef.current) return;
    if (reduceMotion) {
      visualIndexRef.current = target;
      setDisplayIndex(target);
      return;
    }
    // Long jumps from restored state snap to the marked page; short jumps
    // animate the leaf turn.
    if (Math.abs(target - visualIndexRef.current) > 2) {
      visualIndexRef.current = target;
      setDisplayIndex(target);
      return;
    }
    const direction = target > visualIndexRef.current ? 1 : -1;
    turnProgressRef.current = 0;
    turnTargetRef.current = 1;
    turnSettleRef.current = {
      from: 0,
      to: 1,
      elapsed: 0,
      duration: AUTOMATIC_TURN_DURATION,
    };
    setTransition({ from: visualIndexRef.current, to: target, direction });
  }, [reduceMotion, setTransition]);

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
        travel: MIN_TURN_TRAVEL,
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
    // The book's spine sits at world x=0, which projects to the canvas
    // center in every reading view, so pointer travel is measured against
    // the spine rather than the window. This keeps the corner glued to the
    // cursor regardless of how wide the screen is.
    const spineX = size.width / 2;

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
        drag.travel = Math.max(
          MIN_TURN_TRAVEL,
          drag.direction === 1 ? 2 * (drag.startX - spineX) : 2 * (spineX - drag.startX),
        );
        isDraggingRef.current = true;
        dragOccurredRef.current = true;
        turnProgressRef.current = 0;
        turnTargetRef.current = 1;
        turnSettleRef.current = null;
        setTransition({ from: visualIndexRef.current, to: targetIndex, direction: drag.direction });
      }

      const now = performance.now();
      const dt = (now - drag.lastTime) / 1000;
      if (dt > 0.001) {
        const instantaneous = (drag.direction === 1 ? -(event.clientX - drag.lastX) : event.clientX - drag.lastX) / dt;
        drag.velocity = drag.velocity * 0.6 + instantaneous * 0.4;
      }
      drag.lastX = event.clientX;
      drag.lastTime = now;
      turnProgressRef.current = resolveTurnProgress({
        grabX: drag.startX,
        pointerX: event.clientX,
        pageWidth: size.width,
        direction: drag.direction,
        canTurn: true,
        targetX: drag.direction === 1 ? drag.startX - drag.travel : drag.startX + drag.travel,
      });
    };

    const onPointerUp = (_event: PointerEvent) => {
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
      const progress = turnProgressRef.current;
      const release = resolveTurnRelease({
        progress,
        velocityX: drag.direction === 1 ? -drag.velocity : drag.velocity,
        direction: drag.direction,
        pageWidth: drag.travel,
      });

      if (release.commit) {
        turnTargetRef.current = 1;
        turnSettleRef.current = {
          from: progress,
          to: 1,
          elapsed: 0,
          duration: estimateTurnSettleDuration(progress, 1, release.settleVelocity),
        };
        if (drag.direction === 1) onNext();
        else onPrevious();
      } else {
        turnTargetRef.current = 0;
        turnSettleRef.current = {
          from: progress,
          to: 0,
          elapsed: 0,
          duration: estimateTurnSettleDuration(progress, 0, release.settleVelocity),
        };
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
      coverTitleTexture.dispose();
      bookplateTexture.dispose();
      blankTexture.dispose();
      gutterShadowTexture.dispose();
    },
    [blankTexture, bookplateTexture, coverTitleTexture, gutterShadowTexture],
  );

  useFrame((_, delta) => {
    openingRef.current = reduceMotion
      ? isOpen ? 1 : 0
      : MathUtils.damp(openingRef.current, isOpen ? 1 : 0, isOpen ? 2.8 : 4.2, delta);
    const open = smoothstep(openingRef.current);

    if (coverPivotRef.current) {
      coverPivotRef.current.rotation.z = -Math.PI * open;
      coverPivotRef.current.position.y = MathUtils.lerp(0.3, 0.015, open);
    }
    if (leftContentRef.current) {
      leftContentRef.current.visible = open > 0.38;
      const reveal = MathUtils.clamp((open - 0.38) / 0.32, 0, 1);
      leftContentRef.current.scale.x = reveal;
      leftContentRef.current.position.y = 0.02 * reveal;
    }
    if (rootRef.current) {
      rootRef.current.rotation.y = MathUtils.lerp(-0.12, 0, open);
      rootRef.current.rotation.z = MathUtils.lerp(-0.04, 0, open);
    }
    const perspective = camera as PerspectiveCamera;
    const tanHalfFov = Math.tan(MathUtils.degToRad(perspective.fov) / 2);
    const aspect = size.width / size.height;
    const isTopdown = isOpen && readingView === 'page';
    const halfWidth = isTopdown ? BOOK_WIDTH + 0.2 : isOpen ? BOOK_WIDTH + 0.35 : BOOK_WIDTH * 0.92;
    const halfHeight = isTopdown ? BOOK_HEIGHT * 0.52 : isOpen ? BOOK_HEIGHT * 0.5 : BOOK_HEIGHT * 0.58;
    const padding = isTopdown ? TOPDOWN_PADDING : isOpen ? OPEN_PADDING : CLOSED_PADDING;
    const fitDistance =
      Math.max(halfWidth / (tanHalfFov * aspect), halfHeight / tanHalfFov) * padding;
    const desiredTarget = !isOpen ? CLOSED_TARGET : isTopdown ? TOPDOWN_TARGET : OPEN_TARGET;
    const desiredDirection = !isOpen ? CLOSED_DIRECTION : isTopdown ? TOPDOWN_DIRECTION : OPEN_DIRECTION;
    desiredCameraPosition.current.copy(desiredDirection).multiplyScalar(fitDistance).add(desiredTarget);
    if (reduceMotion) {
      camera.position.copy(desiredCameraPosition.current);
      lookTargetRef.current.copy(desiredTarget);
    } else {
      camera.position.x = MathUtils.damp(camera.position.x, desiredCameraPosition.current.x, 2.2, delta);
      camera.position.y = MathUtils.damp(camera.position.y, desiredCameraPosition.current.y, 2.2, delta);
      camera.position.z = MathUtils.damp(camera.position.z, desiredCameraPosition.current.z, 2.2, delta);
      lookTargetRef.current.lerp(desiredTarget, 1 - Math.exp(-2.2 * delta));
    }
    camera.lookAt(lookTargetRef.current);

    const activeTransition = transitionRef.current;
    if (activeTransition) {
      // While dragging, the turn progress is driven directly by the pointer
      // handler — skip damping so the page follows the finger 1:1.
      if (!isDraggingRef.current) {
        const settle = turnSettleRef.current;
        if (settle) {
          settle.elapsed += Math.min(delta, 0.05);
          const elapsedRatio = MathUtils.clamp(settle.elapsed / settle.duration, 0, 1);
          turnProgressRef.current = MathUtils.lerp(settle.from, settle.to, elapsedRatio);
        }
      }
      if (turnTargetRef.current === 1 && turnProgressRef.current >= 1) {
        // Land on an exact frame before swapping the stable spread. This
        // keeps the turning leaf and the destination page visually identical
        // during React's state handoff.
        turnProgressRef.current = 1;
        visualIndexRef.current = activeTransition.to;
        setDisplayIndex(activeTransition.to);
        setTransition(null);
        turnSettleRef.current = null;
        maybeStartTurn();
      } else if (turnTargetRef.current === 0 && turnProgressRef.current <= 0) {
        turnProgressRef.current = 0;
        setTransition(null);
        turnSettleRef.current = null;
        maybeStartTurn();
      }
    }

    // Dynamic page stack: the right stack thins as you read forward, the
    // left stack grows. Heights are damped for smooth transitions on turn.
    const totalSpreads = spreads.length;
    const ratio = totalSpreads > 1 ? displayIndex / (totalSpreads - 1) : 0;
    const targetRightHeight = 0.035 + 0.125 * (1 - ratio);
    const targetLeftHeight = 0.035 + 0.125 * ratio;
    rightStackHeightRef.current = MathUtils.damp(rightStackHeightRef.current, targetRightHeight, 3, delta);
    leftStackHeightRef.current = MathUtils.damp(leftStackHeightRef.current, targetLeftHeight, 3, delta);

    if (rightStackRef.current) {
      const h = rightStackHeightRef.current;
      rightStackRef.current.scale.y = h / 0.16;
      rightStackRef.current.position.y = PAGE_Y - h / 2 - 0.015;
    }
    if (leftStackRef.current) {
      const h = leftStackHeightRef.current;
      leftStackRef.current.scale.y = h / 0.16;
      leftStackRef.current.position.y = PAGE_Y - h / 2 - 0.015;
    }
  });

  const textureForLeaf = (leaf: CookbookLeaf): Texture => {
    if (leaf.type === 'bookplate') return bookplateTexture;
    if (leaf.type === 'recipe') return recipeTextures[leaf.pageIndex] ?? blankTexture;
    return blankTexture;
  };

  // Page leaves are raycast even while invisible or mid-turn, so gate the
  // callbacks here instead of relying on pointer-events visibility.
  const turnOrIgnore = (action: () => void) => {
    if (isOpen && !transition) action();
  };

  const openLeafOrTurn = (leaf: CookbookLeaf, turn: () => void) => {
    if (leaf.type !== 'recipe') {
      turnOrIgnore(turn);
      return;
    }
    const page = pages[leaf.pageIndex];
    if (readingView === 'spread') {
      onEnterReadingView(page);
      return;
    }
    if (page) onOpenRecipe(page);
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
      <group ref={rootRef} position={[0, 0.14, 0]}>
        {/* Base board — the rigid cover material underneath the pages */}
        <mesh castShadow receiveShadow position={[BOOK_WIDTH / 2, 0, 0]}>
          <roundedBoxGeometry args={[BOOK_WIDTH + 0.1, 0.1, BOOK_HEIGHT + 0.1, 7, 0.1]} />
          <meshPhysicalMaterial color={coverClothColor} roughness={0.82} sheen={0.18} sheenColor={Colors.legacySurface.v13} specularIntensity={0.22} />
        </mesh>

        {/* Right page stack — thins as you read forward */}
        <mesh ref={rightStackRef} castShadow receiveShadow position={[BOOK_WIDTH / 2, 0.13, 0]}>
          <roundedBoxGeometry args={[BOOK_WIDTH - 0.16, 0.16, BOOK_HEIGHT - 0.2, 4, 0.045]} />
          <meshPhysicalMaterial color={PAPER} roughness={0.9} specularIntensity={0.12} />
        </mesh>

        {/* Page lines at the fore-edge — decorative ridges on the right stack */}
        {[-0.045, 0, 0.045].map((offset) => (
          <mesh key={offset} position={[BOOK_WIDTH - 0.02, 0.13 + offset, 0]}>
            <boxGeometry args={[0.012, 0.004, BOOK_HEIGHT - 0.32]} />
            <meshStandardMaterial color={Colors.legacySurface.v28} roughness={1} />
          </mesh>
        ))}

        {/* Sculpted spine — slightly taller than the page block, dark */}
        <mesh castShadow position={[-0.055, 0.12, 0]}>
          <roundedBoxGeometry args={[0.12, 0.25, BOOK_HEIGHT + 0.02, 5, 0.05]} />
          <meshPhysicalMaterial color={Colors.legacySurface.v02} roughness={0.78} sheen={0.16} sheenColor={Colors.legacySurface.v12} specularIntensity={0.2} />
        </mesh>

        <group ref={leftContentRef}>
          {/* Left page stack — grows as you read forward, revealed with the cover */}
          <mesh ref={leftStackRef} castShadow receiveShadow position={[-BOOK_WIDTH / 2, 0.13, 0]}>
            <roundedBoxGeometry args={[BOOK_WIDTH - 0.16, 0.16, BOOK_HEIGHT - 0.2, 4, 0.045]} />
            <meshPhysicalMaterial color={PAPER} roughness={0.9} specularIntensity={0.12} />
          </mesh>
          <PageLeaf
            texture={textureForLeaf(leftLeaf)}
            side="left"
            onPress={() => openLeafOrTurn(leftLeaf, onPrevious)}
            onDragStart={handleDragStart}
            dragOccurredRef={dragOccurredRef}
          />
        </group>
        <PageLeaf
          texture={textureForLeaf(rightLeaf)}
          side="right"
          onPress={() => openLeafOrTurn(rightLeaf, onNext)}
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

        <group ref={coverPivotRef} position={[0, 0.3, 0]}>
          <mesh
            castShadow
            position={[BOOK_WIDTH / 2, 0, 0]}
            onClick={(event) => {
              // Stop the ray from also hitting the page leaf beneath the
              // cover, which would fire onNext on the same tap.
              event.stopPropagation();
              if (!isOpen) {
                gl.domElement.style.cursor = 'default';
                onOpen();
              }
            }}
            onPointerOver={() => {
              if (!isOpen) gl.domElement.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              gl.domElement.style.cursor = 'default';
            }}
          >
            <roundedBoxGeometry args={[BOOK_WIDTH, COVER_THICKNESS, BOOK_HEIGHT, 7, 0.085]} />
            <meshPhysicalMaterial color={coverClothColor} roughness={0.8} sheen={0.2} sheenColor={Colors.legacySurface.v14} specularIntensity={0.24} />
          </mesh>
          <mesh position={[BOOK_WIDTH / 2, COVER_THICKNESS / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[BOOK_WIDTH - 0.075, BOOK_HEIGHT - 0.075]} />
            <meshPhysicalMaterial map={coverTexture} roughness={0.8} sheen={0.2} sheenColor={Colors.legacySurface.v14} specularIntensity={0.22} side={FrontSide} />
          </mesh>
          <mesh position={[BOOK_WIDTH / 2, COVER_THICKNESS / 2 + 0.009, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[BOOK_WIDTH - 0.075, BOOK_HEIGHT - 0.075]} />
            <meshBasicMaterial map={coverTitleTexture} transparent depthWrite={false} toneMapped={false} side={FrontSide} />
          </mesh>
          <mesh position={[BOOK_WIDTH / 2, -COVER_THICKNESS / 2 - 0.005, 0]} rotation={[Math.PI / 2, 0, Math.PI]}>
            <planeGeometry args={[BOOK_WIDTH - 0.12, BOOK_HEIGHT - 0.12]} />
            <meshPhysicalMaterial color={Colors.legacySurface.v02} roughness={0.84} sheen={0.12} sheenColor={Colors.legacySurface.v10} specularIntensity={0.18} side={FrontSide} />
          </mesh>
          <mesh castShadow>
            <tubeGeometry args={[elasticCurve, 48, 0.018, 8, false]} />
            <meshPhysicalMaterial color={Colors.legacySurface.v01} roughness={0.72} sheen={0.18} sheenColor={Colors.legacySurface.v09} specularIntensity={0.24} />
          </mesh>
        </group>

        {/* Bookmark ribbon: sandwiched in the page block, tail draping past the fore-edge.
            Keep the droop slight so the inner end never lifts through the page leaf. */}
        <mesh castShadow position={[0.52, 0.205, BOOK_HEIGHT / 2 + 0.08]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.075, 1.08]} />
          <meshPhysicalMaterial color={Colors.legacySurface.v21} roughness={0.76} sheen={0.18} sheenColor={Colors.legacySurface.v30} specularIntensity={0.18} side={DoubleSide} />
        </mesh>

        {/* Soft shadow pooling in the gutter where the spread meets the spine */}
        <mesh position={[0, PAGE_Y + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.15, BOOK_HEIGHT - 0.2]} />
          <meshBasicMaterial map={gutterShadowTexture} transparent depthWrite={false} />
        </mesh>
      </group>

      <mesh receiveShadow position={[0, -0.055, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <shadowMaterial color={Colors.legacySurface.v03} transparent opacity={0.18} />
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
  const geometry = useMemo(() => createRestingPageGeometry(side), [side]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      geometry={geometry}
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
      <meshPhysicalMaterial map={texture} roughness={0.9} specularIntensity={0.1} side={DoubleSide} />
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
  const readableBackTexture = useMemo(() => {
    const texture = backTexture.clone();
    // A texture seen through the BackSide of a plane is mirrored by default.
    // Reverse its U axis so recipe typography stays readable throughout the
    // turn instead of correcting itself only when the resting leaf appears.
    texture.repeat.x = -1;
    texture.offset.x = 1;
    texture.needsUpdate = true;
    return texture;
  }, [backTexture]);
  const leafRef = useRef<Group>(null);

  useEffect(
    () => () => {
      geometry.dispose();
      readableBackTexture.dispose();
    },
    [geometry, readableBackTexture],
  );

  useFrame(() => {
    const rawProgress = MathUtils.clamp(progressRef.current, 0, 1);
    // The pointer stays 1:1 while dragging. Automated turns use exactly one
    // easing pass here; applying easing to both the clock and the geometry
    // made the leaf rush through the middle and visibly pop at the landing.
    const progress = isDraggingRef.current ? rawProgress : easePageTurn(rawProgress);
    const pageProgress = direction === 1 ? progress : 1 - progress;
    const positions = geometry.attributes.position;
    const pageWidth = BOOK_WIDTH - 0.08;
    const curve = buildPageCurlCurve(pageWidth, 40, pageProgress);

    for (let index = 0; index < positions.count; index += 1) {
      const segmentIndex = index % 41;
      const point = curve[segmentIndex];
      positions.setXYZ(index, point.x, positions.getY(index), point.z * WEB_CURL_LIFT);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    if (leafRef.current) {
      // Keep the lift continuous through the exact landing frame. A synthetic
      // bounce read as a texture glitch on a large page.
      const liftCurve = Math.sin(Math.PI * pageProgress);
      leafRef.current.position.y = PAGE_Y + 0.012 + liftCurve * 0.045;
    }
  });

  return (
    <group ref={leafRef} position={[0, PAGE_Y + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial map={frontTexture} roughness={0.88} specularIntensity={0.12} side={FrontSide} />
      </mesh>
      <mesh geometry={geometry} position={[0, 0, -0.008]}>
        <meshPhysicalMaterial map={readableBackTexture} roughness={0.88} specularIntensity={0.12} side={BackSide} />
      </mesh>
    </group>
  );
}

function createRestingPageGeometry(side: 'left' | 'right'): PlaneGeometry {
  const width = BOOK_WIDTH - 0.11;
  const geometry = new PlaneGeometry(width, BOOK_HEIGHT - 0.18, 24, 3);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    const normalizedX = (positions.getX(index) + width / 2) / width;
    const distanceFromGutter = side === 'right' ? normalizedX : 1 - normalizedX;
    const gutterCrown = 0.065 * Math.exp(-distanceFromGutter * 5.5);
    const paperCamber = 0.008 * Math.sin(Math.PI * normalizedX);
    positions.setZ(index, gutterCrown + paperCamber);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createCoverTitleTexture(
  title: string,
  foil: CoverTitleFoil,
  placementId: CookbookCoverTitlePlacementId,
  clothColor: string,
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = COOKBOOK_GEOMETRY.page.designWidth;
  canvas.height = COOKBOOK_GEOMETRY.page.designHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create cover title texture');

  const centerY = canvas.height * resolveCoverTitleCenterRatio(placementId);
  const lineHeight = canvas.height * 0.067;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `bold ${Math.round(canvas.width * 0.09)}px Georgia`;
  drawCenteredWrappedText(context, title, canvas.width / 2, centerY - 1.5, canvas.width * 0.7, lineHeight, foil[2]);
  drawCenteredWrappedText(context, title, canvas.width / 2, centerY + 1.8, canvas.width * 0.7, lineHeight, foil[0]);
  drawCenteredWrappedText(context, title, canvas.width / 2, centerY, canvas.width * 0.7, lineHeight, foil[1]);

  drawEmbossedNoshMark(context, canvas.width, canvas.height, clothColor);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeFallbackImageUri(title: string): string {
  const safeTitle = escapeXml(title);
  const width = COOKBOOK_GEOMETRY.page.designWidth;
  const height = COOKBOOK_GEOMETRY.page.designHeight;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${Colors.legacySurface.v36}"/><rect x="38" y="38" width="${width - 76}" height="${height - 76}" rx="24" fill="none" stroke="${Colors.legacySurface.v20}" stroke-width="4"/><text x="${width / 2}" y="${height * 0.48}" text-anchor="middle" font-family="Georgia" font-size="54" fill="${Colors.legacySurface.v06}">${safeTitle}</text><text x="${width / 2}" y="${height * 0.54}" text-anchor="middle" font-family="Georgia" font-size="20" letter-spacing="7" fill="${Colors.legacySurface.v15}">COOKBOOK</text></svg>`,
  )}`;
}

function makeFallbackCoverImageUri(): string {
  const width = COOKBOOK_GEOMETRY.page.designWidth;
  const height = COOKBOOK_GEOMETRY.page.designHeight;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#ffffff"/><path d="M0 64H${width}M0 128H${width}M0 192H${width}M0 256H${width}M0 320H${width}M0 384H${width}M0 448H${width}M0 512H${width}M0 576H${width}" stroke="#1f171f" stroke-opacity="0.035" stroke-width="1"/></svg>`,
  )}`;
}

function drawCenteredWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  centerY: number,
  maxWidth: number,
  lineHeight: number,
  color: string,
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

  context.fillStyle = color;
  const firstLineY = centerY - ((lines.length - 1) * lineHeight) / 2;
  lines.slice(0, 3).forEach((value, index) => {
    context.fillText(value, x, firstLineY + index * lineHeight);
  });
}

function drawEmbossedNoshMark(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  clothColor: string,
) {
  const markWidth = width * 0.13;
  const markHeight = markWidth * (NOSH_SYMBOL_VIEWBOX.height / NOSH_SYMBOL_VIEWBOX.width);
  const inset = width * 0.065;
  const x = width - inset - markWidth;
  const y = height - inset - markHeight;
  const path = new Path2D(NOSH_SYMBOL_PATH);
  const scale = markWidth / NOSH_SYMBOL_VIEWBOX.width;

  context.save();
  context.translate(x, y);
  context.scale(scale, scale);

  context.save();
  context.translate(-9, -9);
  context.globalAlpha = 0.26;
  context.fillStyle = shiftColor(clothColor, 34);
  context.fill(path);
  context.restore();

  context.save();
  context.translate(10, 11);
  context.globalAlpha = 0.34;
  context.fillStyle = shiftColor(clothColor, -30);
  context.fill(path);
  context.restore();

  context.globalAlpha = 0.16;
  context.fillStyle = shiftColor(clothColor, -12);
  context.fill(path);
  context.globalAlpha = 0.62;
  context.lineWidth = 18;
  context.lineJoin = 'round';
  context.strokeStyle = shiftColor(clothColor, -34);
  context.stroke(path);
  context.restore();
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
    context.strokeStyle = Colors.legacySurface.v23;
    context.lineWidth = 2.5;
    context.strokeRect(80, 80, width - 160, height - 160);
    context.strokeStyle = Colors.legacySurface.v27;
    context.lineWidth = 1;
    context.strokeRect(92, 92, width - 184, height - 184);

    // Small ornament at top
    context.fillStyle = Colors.legacySurface.v23;
    context.font = '28px Georgia';
    context.textAlign = 'center';
    context.fillText('✦', width / 2, height * 0.28);

    // Subtitle
    context.fillStyle = Colors.legacySurface.v18;
    context.font = 'italic 20px Georgia';
    context.fillText('A Personal Cookbook', width / 2, height * 0.36);

    // Title
    context.fillStyle = Colors.legacySurface.v05;
    context.font = 'bold 52px Georgia';
    drawWrappedText(context, title, width / 2, height * 0.47, width * 0.68, 62);

    // Divider line
    context.strokeStyle = Colors.legacySurface.v23;
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(width * 0.35, height * 0.62);
    context.lineTo(width * 0.65, height * 0.62);
    context.stroke();

    // Recipe count
    context.fillStyle = Colors.legacySurface.v18;
    context.font = '16px Georgia';
    context.fillText(`${count} ${count === 1 ? 'Recipe' : 'Recipes'}`, width / 2, height * 0.67);

    // Bottom ornament
    context.fillStyle = Colors.legacySurface.v23;
    context.font = '20px Georgia';
    context.fillText('✦', width / 2, height * 0.82);
  });
}

function createGutterShadowTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create gutter shadow texture');
  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, Colors.legacySurface.v91);
  gradient.addColorStop(0.5, Colors.legacySurface.v90);
  gradient.addColorStop(1, Colors.legacySurface.v91);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function createBlankTexture(): CanvasTexture {
  return createPaperTexture((context, width, height) => {
    context.textAlign = 'center';
    context.fillStyle = Colors.legacySurface.v29;
    context.font = '32px Georgia';
    context.fillText('✦', width / 2, height / 2 - 30);
    context.fillStyle = Colors.legacySurface.v24;
    context.font = 'italic 24px Georgia';
    context.fillText('This page is waiting for a recipe', width / 2, height / 2 + 24);
  });
}

function createPaperTexture(
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void,
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = COOKBOOK_GEOMETRY.page.designWidth;
  canvas.height = COOKBOOK_GEOMETRY.page.designHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create cookbook page texture');
  context.fillStyle = Colors.legacySurface.v41;
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

// One monotonic ease for the entire automated leaf turn. Smoothstep has zero
// velocity at both covers, but retains enough motion through the center to
// feel like a sheet of paper rather than a carousel slide.
function easePageTurn(value: number): number {
  const t = MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
