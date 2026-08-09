/* eslint-disable react/no-unknown-property, react-hooks/immutability -- R3F animates Three.js objects and uses renderer-specific JSX props. */
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';
import { Canvas, extend, useFrame, useLoader, useThree, type ThreeElement } from '@react-three/fiber';
import {
  BackSide,
  CanvasTexture,
  Color,
  DoubleSide,
  FrontSide,
  LinearFilter,
  MathUtils,
  Mesh,
  PCFSoftShadowMap,
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

const BOOK_WIDTH = 4.65;
const BOOK_HEIGHT = 6.35;
const COVER_THICKNESS = 0.18;
const PAGE_Y = 0.43;
const PAPER = '#eee9dc';

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
        camera={{ fov: 34, near: 0.1, far: 100, position: [9.4, 8.4, 13.4] }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = PCFSoftShadowMap;
          gl.setClearColor(new Color('#cbc8c0'), 1);
        }}
      >
        <Suspense fallback={null}>
          <BookScene
            title={cookbook?.title ?? 'My Cookbook'}
            pages={pages}
            spreads={spreads}
            spreadIndex={spreadIndex}
            isOpen={isOpen}
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
  const rootRef = useRef<Group>(null);
  const coverPivotRef = useRef<Group>(null);
  const leftContentRef = useRef<Group>(null);
  const openingRef = useRef(isOpen ? 1 : 0);
  const visualIndexRef = useRef(spreadIndex);
  const turnProgressRef = useRef(1);
  const [displayIndex, setDisplayIndex] = useState(spreadIndex);
  const [transition, setTransition] = useState<TurnTransition | null>(null);
  const lookTargetRef = useRef(new Vector3(BOOK_WIDTH / 2, 0, 0));
  const { camera } = useThree();

  useEffect(() => {
    loadedTextures.forEach((texture) => {
      texture.colorSpace = SRGBColorSpace;
      texture.minFilter = LinearFilter;
      texture.anisotropy = 8;
    });
  }, [loadedTextures]);

  useEffect(() => {
    if (spreadIndex === visualIndexRef.current) return;
    const direction = spreadIndex > visualIndexRef.current ? 1 : -1;
    setTransition({ from: visualIndexRef.current, to: spreadIndex, direction });
    turnProgressRef.current = 0;
  }, [spreadIndex]);

  useEffect(
    () => () => {
      bookplateTexture.dispose();
      contentsTexture.dispose();
      blankTexture.dispose();
    },
    [blankTexture, bookplateTexture, contentsTexture],
  );

  useFrame((_, delta) => {
    openingRef.current = MathUtils.damp(openingRef.current, isOpen ? 1 : 0, isOpen ? 3.4 : 4.6, delta);
    const open = smoothstep(openingRef.current);

    if (coverPivotRef.current) {
      coverPivotRef.current.rotation.z = -Math.PI * open;
    }
    if (leftContentRef.current) {
      leftContentRef.current.visible = open > 0.44;
      const reveal = MathUtils.clamp((open - 0.44) / 0.28, 0, 1);
      leftContentRef.current.scale.x = reveal;
      leftContentRef.current.position.y = 0.24 * reveal;
    }
    if (rootRef.current) {
      rootRef.current.rotation.y = MathUtils.lerp(-0.16, 0, open);
      rootRef.current.rotation.z = MathUtils.lerp(-0.055, 0, open);
    }

    const desiredPosition = isOpen ? new Vector3(0, 14.2, 12.8) : new Vector3(9.4, 8.4, 13.4);
    camera.position.x = MathUtils.damp(camera.position.x, desiredPosition.x, 3.2, delta);
    camera.position.y = MathUtils.damp(camera.position.y, desiredPosition.y, 3.2, delta);
    camera.position.z = MathUtils.damp(camera.position.z, desiredPosition.z, 3.2, delta);
    const desiredTarget = isOpen ? new Vector3(0, 0.18, 0) : new Vector3(BOOK_WIDTH / 2, 0.1, 0);
    lookTargetRef.current.lerp(desiredTarget, 1 - Math.exp(-3.2 * delta));
    camera.lookAt(lookTargetRef.current);

    if (transition) {
      turnProgressRef.current = MathUtils.damp(turnProgressRef.current, 1, 2.8, delta);
      if (turnProgressRef.current > 0.995) {
        visualIndexRef.current = transition.to;
        setDisplayIndex(transition.to);
        setTransition(null);
        turnProgressRef.current = 1;
      }
    }
  });

  const textureForLeaf = (leaf: CookbookLeaf): Texture => {
    if (leaf.type === 'bookplate') return bookplateTexture;
    if (leaf.type === 'contents') return contentsTexture;
    if (leaf.type === 'recipe') return recipeTextures[leaf.pageIndex] ?? blankTexture;
    return blankTexture;
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
      <ambientLight intensity={0.78} />
      <hemisphereLight args={['#fff9e9', '#514c43', 0.74]} />
      <directionalLight
        castShadow
        position={[5.5, 10, 6]}
        intensity={2.15}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={30}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
      />
      <pointLight position={[-6, 4, -4]} intensity={0.6} color="#c8bda8" />

      <group ref={rootRef} position={[0, 0.16, 0]}>
        <BookBody />

        <group ref={leftContentRef}>
          <PageLeaf texture={textureForLeaf(leftLeaf)} side="left" onPress={onPrevious} />
        </group>
        <PageLeaf texture={textureForLeaf(rightLeaf)} side="right" onPress={onNext} />

        {transition ? (
          <TurningLeaf
            frontTexture={textureForLeaf(turningFront)}
            backTexture={textureForLeaf(turningBack)}
            direction={transition.direction}
            progressRef={turnProgressRef}
          />
        ) : null}

        <group ref={coverPivotRef} position={[0, 0.51, 0]}>
          <mesh castShadow position={[BOOK_WIDTH / 2, 0, 0]} onClick={() => !isOpen && onOpen()}>
            <roundedBoxGeometry args={[BOOK_WIDTH, COVER_THICKNESS, BOOK_HEIGHT, 7, 0.13]} />
            <meshStandardMaterial color="#403f31" roughness={0.82} metalness={0.03} />
          </mesh>
          <mesh position={[BOOK_WIDTH / 2, COVER_THICKNESS / 2 + 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[BOOK_WIDTH - 0.12, BOOK_HEIGHT - 0.12]} />
            <meshStandardMaterial map={coverTexture} roughness={0.78} side={FrontSide} />
          </mesh>
          <mesh position={[BOOK_WIDTH / 2, -COVER_THICKNESS / 2 - 0.006, 0]} rotation={[Math.PI / 2, 0, Math.PI]}>
            <planeGeometry args={[BOOK_WIDTH - 0.16, BOOK_HEIGHT - 0.16]} />
            <meshStandardMaterial color="#4a493a" roughness={0.92} side={FrontSide} />
          </mesh>
          <mesh castShadow position={[BOOK_WIDTH * 0.82, 0.11, 0]}>
            <boxGeometry args={[0.055, 0.075, BOOK_HEIGHT + 0.12]} />
            <meshStandardMaterial color="#272922" roughness={0.72} />
          </mesh>
        </group>

        <mesh castShadow position={[-0.06, 0.08, BOOK_HEIGHT * 0.46]} rotation={[0.04, 0, 0.08]}>
          <boxGeometry args={[0.12, 0.025, 1.25]} />
          <meshStandardMaterial color="#a44738" roughness={0.78} />
        </mesh>
      </group>

      <mesh receiveShadow position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#b5b2aa" roughness={0.96} />
      </mesh>
    </>
  );
}

function BookBody() {
  return (
    <>
      <mesh castShadow receiveShadow position={[BOOK_WIDTH / 2, 0, 0]}>
        <roundedBoxGeometry args={[BOOK_WIDTH + 0.14, 0.2, BOOK_HEIGHT + 0.14, 7, 0.15]} />
        <meshStandardMaterial color="#393a31" roughness={0.84} />
      </mesh>
      <mesh castShadow receiveShadow position={[BOOK_WIDTH / 2, 0.23, 0]}>
        <roundedBoxGeometry args={[BOOK_WIDTH - 0.14, 0.32, BOOK_HEIGHT - 0.18, 5, 0.1]} />
        <meshStandardMaterial color={PAPER} roughness={0.95} />
      </mesh>
      {[-0.11, -0.04, 0.04, 0.11].map((offset) => (
        <mesh key={offset} position={[BOOK_WIDTH + 0.01, 0.25 + offset * 0.35, offset]}>
          <boxGeometry args={[0.018, 0.015, BOOK_HEIGHT - 0.34]} />
          <meshStandardMaterial color="#c8c1b2" roughness={1} />
        </mesh>
      ))}
      <mesh castShadow position={[-0.08, 0.23, 0]}>
        <roundedBoxGeometry args={[0.2, 0.5, BOOK_HEIGHT + 0.06, 5, 0.08]} />
        <meshStandardMaterial color="#34362f" roughness={0.9} />
      </mesh>
    </>
  );
}

function PageLeaf({ texture, side, onPress }: { texture: Texture; side: 'left' | 'right'; onPress: () => void }) {
  const x = side === 'left' ? -BOOK_WIDTH / 2 : BOOK_WIDTH / 2;
  return (
    <mesh
      receiveShadow
      position={[x, PAGE_Y, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onPress();
      }}
    >
      <planeGeometry args={[BOOK_WIDTH - 0.09, BOOK_HEIGHT - 0.16]} />
      <meshStandardMaterial map={texture} roughness={0.96} side={DoubleSide} />
    </mesh>
  );
}

function TurningLeaf({
  frontTexture,
  backTexture,
  direction,
  progressRef,
}: {
  frontTexture: Texture;
  backTexture: Texture;
  direction: -1 | 1;
  progressRef: React.MutableRefObject<number>;
}) {
  const geometry = useMemo(() => new PlaneGeometry(BOOK_WIDTH - 0.09, BOOK_HEIGHT - 0.16, 32, 3), []);
  const basePositions = useMemo(
    () => Float32Array.from(geometry.attributes.position.array as ArrayLike<number>),
    [geometry],
  );
  const meshRef = useRef<Mesh>(null);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    const progress = smoothstep(progressRef.current);
    const pageProgress = direction === 1 ? progress : 1 - progress;
    const positions = geometry.attributes.position;

    for (let index = 0; index < positions.count; index += 1) {
      const baseIndex = index * 3;
      const originalX = basePositions[baseIndex] + (BOOK_WIDTH - 0.09) / 2;
      const originalY = basePositions[baseIndex + 1];
      const normalizedX = originalX / (BOOK_WIDTH - 0.09);
      const curl = 0.24 * Math.sin(Math.PI * normalizedX) * Math.sin(Math.PI * pageProgress);
      const theta = -Math.PI * pageProgress - curl;
      positions.setXYZ(index, Math.cos(theta) * originalX, originalY, -Math.sin(theta) * originalX);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    if (meshRef.current) {
      meshRef.current.position.y = PAGE_Y + 0.018 + Math.sin(Math.PI * pageProgress) * 0.045;
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
    context.strokeStyle = '#b39762';
    context.lineWidth = 3;
    context.strokeRect(70, 70, width - 140, height - 140);
    context.fillStyle = '#756d61';
    context.font = '22px Georgia';
    context.textAlign = 'center';
    context.fillText('A PERSONAL COOKBOOK', width / 2, height * 0.4);
    context.fillStyle = '#29251f';
    context.font = 'bold 58px Georgia';
    drawWrappedText(context, title, width / 2, height * 0.49, width * 0.7, 68);
    context.fillStyle = '#8a7d6b';
    context.font = '18px Georgia';
    context.fillText(`${count} RECIPES`, width / 2, height * 0.66);
  });
}

function createContentsTexture(title: string, pages: CookbookPage[]): CanvasTexture {
  return createPaperTexture((context, width) => {
    context.fillStyle = '#81786a';
    context.font = '18px Georgia';
    context.fillText(title.toUpperCase(), 72, 112);
    context.fillStyle = '#29251f';
    context.font = 'bold 50px Georgia';
    context.fillText('Table of Contents', 72, 178);
    context.strokeStyle = '#c7bdaa';
    context.lineWidth = 2;
    pages.slice(0, 7).forEach((page, index) => {
      const y = 270 + index * 105;
      context.beginPath();
      context.moveTo(72, y + 34);
      context.lineTo(width - 72, y + 34);
      context.stroke();
      context.fillStyle = '#8b8173';
      context.font = '20px Georgia';
      context.fillText(String(page.pageNumber).padStart(2, '0'), 72, y);
      context.fillStyle = '#29251f';
      context.font = '28px Georgia';
      context.fillText(page.title, 132, y);
    });
  });
}

function createBlankTexture(): CanvasTexture {
  return createPaperTexture((context, width, height) => {
    context.fillStyle = '#b7aa92';
    context.font = '38px Georgia';
    context.textAlign = 'center';
    context.fillText('✦', width / 2, height / 2);
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
  context.fillStyle = '#f2ede2';
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

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
