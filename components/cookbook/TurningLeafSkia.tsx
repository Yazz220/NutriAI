/* eslint-disable react-hooks/immutability -- Reanimated shared values are read inside Skia derived values by design. */
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  Group,
  ImageShader,
  LinearGradient,
  Rect,
  Skia,
  Vertices,
  vec,
  type SkImage,
  type SkPoint,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { buildPageCurlCurve, clampPageTurnProgress, type PageTurnDirection } from '@/utils/cookbook/physicalBook';
import { Colors } from '@/constants/colors';

/**
 * Curling page leaf rendered as a deformed mesh. Shares the curl curve math
 * with the web scene (buildPageCurlCurve) so the paper bends identically on
 * every platform; the mesh projects the 3D fold into 2D via x-compression
 * from the curve plus a slight y-lift and a fold-tracking shadow.
 */

const SEGMENTS = 24;
const ROWS = 4;
const LIFT_PROJECTION = 0.08;
const SHADOW_WIDTH_RATIO = 0.32;
const SHADOW_MAX_OPACITY = 0.26;

interface TurningLeafSkiaProps {
  /** Image of the page being turned forward (current page). */
  forwardImage: SkImage | null;
  /** Image of the page being brought back (previous page). */
  backwardImage: SkImage | null;
  width: number;
  height: number;
  /** Left/top offset of the resting leaf within the stage, so the mesh
   *  lands pixel-aligned on top of the flat page it replaces. */
  offsetX: number;
  offsetY: number;
  /** Turn progress 0..1 in the active direction. */
  progress: SharedValue<number>;
  /** Active turn direction; 0 hides the leaf. */
  direction: SharedValue<PageTurnDirection>;
}

interface LeafMeshProps {
  image: SkImage | null;
  width: number;
  height: number;
  progress: SharedValue<number>;
  direction: SharedValue<PageTurnDirection>;
  leafDirection: 1 | -1;
  indices: number[];
}

function buildIndices(): number[] {
  const indices: number[] = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < SEGMENTS; column += 1) {
      const a = row * (SEGMENTS + 1) + column;
      const b = a + 1;
      const c = a + SEGMENTS + 1;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  return indices;
}

function LeafMesh({ image, width, height, progress, direction, leafDirection, indices }: LeafMeshProps) {
  const vertices = useDerivedValue<SkPoint[]>(() => {
    const turn = clampPageTurnProgress(progress.value);
    // pageProgress: 0 = flat on the right, 1 = fully turned to the left.
    const pageProgress = leafDirection === 1 ? turn : 1 - turn;
    const curve = buildPageCurlCurve(width, SEGMENTS, pageProgress);
    const points: SkPoint[] = [];
    for (let row = 0; row <= ROWS; row += 1) {
      for (let column = 0; column <= SEGMENTS; column += 1) {
        const point = curve[column];
        points.push({
          x: width + point.x,
          y: (height / ROWS) * row - point.z * LIFT_PROJECTION,
        });
      }
    }
    return points;
  }, [width, height]);

  const frontTextures = useMemo<SkPoint[]>(() => {
    const imageWidth = image?.width() ?? width;
    const imageHeight = image?.height() ?? height;
    const coords: SkPoint[] = [];
    for (let row = 0; row <= ROWS; row += 1) {
      for (let column = 0; column <= SEGMENTS; column += 1) {
        coords.push({ x: (column / SEGMENTS) * imageWidth, y: (row / ROWS) * imageHeight });
      }
    }
    return coords;
  }, [image, width, height]);

  const backTextures = useMemo<SkPoint[]>(
    () => frontTextures.map((coord) => ({ x: (image?.width() ?? width) - coord.x, y: coord.y })),
    [frontTextures, image, width],
  );

  const visibility = useDerivedValue(() => (direction.value === leafDirection ? 1 : 0), []);
  const frontFace = useDerivedValue(() => {
    const turn = clampPageTurnProgress(progress.value);
    const pageProgress = leafDirection === 1 ? turn : 1 - turn;
    // Swap faces at maximum compression, where the leaf is edge-on.
    return pageProgress <= 0.5 ? 1 : 0;
  }, []);
  const backFace = useDerivedValue(() => 1 - frontFace.value, []);

  return (
    <Group opacity={visibility}>
      <Group opacity={frontFace}>
        <Vertices vertices={vertices} textures={image ? frontTextures : undefined} indices={indices} color={Colors.book.page}>
          {image ? <ImageShader image={image} tx="clamp" ty="clamp" /> : null}
        </Vertices>
      </Group>
      <Group opacity={backFace}>
        <Vertices vertices={vertices} textures={image ? backTextures : undefined} indices={indices} color={Colors.book.pageAlt}>
          {image ? <ImageShader image={image} tx="clamp" ty="clamp" /> : null}
        </Vertices>
      </Group>
    </Group>
  );
}

export function TurningLeafSkia({
  forwardImage,
  backwardImage,
  width,
  height,
  offsetX,
  offsetY,
  progress,
  direction,
}: TurningLeafSkiaProps) {
  const indices = useMemo(() => buildIndices(), []);

  const overlayOpacity = useDerivedValue(
    () => (direction.value === 0 ? 0 : 1),
    [],
  );

  // Soft shadow cast onto the resting page just behind the fold line.
  const shadowX = useDerivedValue(() => {
    const turn = clampPageTurnProgress(progress.value);
    const activeDirection = direction.value === 0 ? 1 : direction.value;
    const pageProgress = activeDirection === 1 ? turn : 1 - turn;
    const curve = buildPageCurlCurve(width, SEGMENTS, pageProgress);
    return width + curve[curve.length - 1].x;
  }, [width]);
  const shadowOpacity = useDerivedValue(() => {
    if (direction.value === 0) return 0;
    const turn = clampPageTurnProgress(progress.value);
    const activeDirection = direction.value;
    const pageProgress = activeDirection === 1 ? turn : 1 - turn;
    return Math.sin(Math.PI * pageProgress) * SHADOW_MAX_OPACITY;
  }, []);
  const shadowTransform = useDerivedValue(() => [{ translateX: shadowX.value - width * SHADOW_WIDTH_RATIO }], []);

  return (
    <Canvas
      pointerEvents="none"
      style={[
        styles.canvas,
        { left: offsetX - width, top: offsetY, width: width * 2, height },
      ]}
    >
      <Group opacity={overlayOpacity}>
        <Group opacity={shadowOpacity} transform={shadowTransform}>
          <Rect x={0} y={0} width={width * SHADOW_WIDTH_RATIO} height={height}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(width * SHADOW_WIDTH_RATIO, 0)}
              colors={[Skia.Color('rgba(38,34,26,0)'), Skia.Color('rgba(38,34,26,1)')]}
            />
          </Rect>
        </Group>
        <LeafMesh
          image={forwardImage}
          width={width}
          height={height}
          progress={progress}
          direction={direction}
          leafDirection={1}
          indices={indices}
        />
        <LeafMesh
          image={backwardImage}
          width={width}
          height={height}
          progress={progress}
          direction={direction}
          leafDirection={-1}
          indices={indices}
        />
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    zIndex: 3,
  },
});
