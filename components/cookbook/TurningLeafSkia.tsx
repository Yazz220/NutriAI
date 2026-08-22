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
import { buildPageCurlCurve, clampPageTurnProgress, computeRowTurnProgress, findFoldPeakX, type PageTurnDirection } from '@/utils/cookbook/physicalBook';
import { Colors } from '@/constants/colors';

/**
 * Curling page leaf rendered as a deformed mesh. Shares the curl curve math
 * with the web scene (buildPageCurlCurve) so the paper bends identically on
 * every platform.
 *
 * Key design decisions:
 * - The forward leaf (leafDirection=1) curls right-to-left: the right page
 *   folds toward the spine. Vertices use x = width + point.x.
 * - The backward leaf (leafDirection=-1) curls left-to-right: the left page
 *   folds toward the spine. Vertices are mirrored: x = -point.x. The
 *   front/back texture sets are swapped so the image still reads correctly.
 * - 2D Conical Corner Peel: Grabbing near top/bottom corners modulates
 *   rowProgress across rows, peeling the corner diagonally before the rest
 *   of the page. The skew amplitude is kept small and the mesh resolution
 *   high (30x12) to minimize texture stretching.
 * - The canvas has vertical padding so the lifted curl never clips.
 */

const SEGMENTS = 30;
const ROWS = 12;
const LIFT_PROJECTION = 0.22;
const SHADOW_WIDTH_RATIO = 0.42;
const SHADOW_MAX_OPACITY = 0.38;
const CREST_WIDTH_RATIO = 0.12;
const CREST_MAX_OPACITY = 0.14;
/**
 * How much the fold axis tilts vertically for corner grabs. The diagonal
 * shift is applied to each row's y-position, proportional to the row's
 * distance from the grab point and the curl's z-lift. This makes the fold
 * line look diagonal (conical) rather than horizontal (cylindrical).
 */
const DIAGONAL_TILT_FACTOR = 0.14;
// Extra canvas height so the curl's y-lift never clips at the top or bottom.
const CANVAS_VERTICAL_PAD = 0.5;

interface TurningLeafSkiaProps {
  /** Front face image of the forward-turning page (current right page). */
  forwardImage: SkImage | null;
  /** Front face image of the backward-turning page (current left page). */
  backwardImage: SkImage | null;
  /** Back face image for forward turns (next spread's left page). */
  forwardBackImage?: SkImage | null;
  /** Back face image for backward turns (prev spread's right page). */
  backwardBackImage?: SkImage | null;
  width: number;
  height: number;
  forwardOffsetX: number;
  backwardOffsetX?: number;
  offsetY: number;
  progress: SharedValue<number>;
  direction: SharedValue<PageTurnDirection>;
  /** Vertical touch grab coordinate ratio (0=top, 0.5=center, 1=bottom). */
  grabYRatio?: SharedValue<number>;
  /**
   * When true (one-page reader mode), the backward leaf uses the SAME
   * geometry as the forward leaf (page on right, curling left toward the
   * fixed left spine) with inverted progress — the previous page uncurls
   * IN FROM the spine rather than folding right toward a right-side spine.
   */
  onePageMode?: boolean;
  /** Disable a direction until its full-page textures are available. */
  forwardEnabled?: boolean;
  backwardEnabled?: boolean;
}

interface LeafMeshProps {
  image: SkImage | null;
  /** Image for the back face. If not provided, the front image is used. */
  backImage?: SkImage | null;
  width: number;
  height: number;
  progress: SharedValue<number>;
  direction: SharedValue<PageTurnDirection>;
  leafDirection: 1 | -1;
  /** Matches direction.value to control visibility. Defaults to leafDirection. */
  targetDirection?: 1 | -1;
  /** Vertical touch grab coordinate ratio (0=top, 0.5=center, 1=bottom). */
  grabYRatio?: SharedValue<number>;
  /**
   * When true, the curl curve uses (1 - progress) so the page starts fully
   * curled at the spine and uncurls to flat. Used for one-page backward turns
   * where the previous page comes IN FROM the left spine.
   */
  invertProgress?: boolean;
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

function LeafMesh({ image, backImage, width, height, progress, direction, leafDirection, targetDirection, grabYRatio, invertProgress, indices }: LeafMeshProps) {
  const pad = height * CANVAS_VERTICAL_PAD;
  const activeDir = targetDirection ?? leafDirection;

  const vertices = useDerivedValue<SkPoint[]>(() => {
    const turn = clampPageTurnProgress(progress.value);
    const pageProgress = invertProgress ? 1 - turn : turn;
    const grabY = grabYRatio ? grabYRatio.value : 0.5;
    const points: SkPoint[] = [];

    for (let row = 0; row <= ROWS; row += 1) {
      const rowRatio = row / ROWS;
      const rowProgress = computeRowTurnProgress(pageProgress, rowRatio, grabY);
      const curve = buildPageCurlCurve(width, SEGMENTS, rowProgress);
      const rowY = pad + (height / ROWS) * row;

      // Diagonal tilt: rows near the grab corner lift more, rows far from it
      // stay planted. Uses (grabY - 0.5) so the tilt is zero for mid-page
      // grabs (pure cylindrical curl) and (0.5 - rowRatio) so rows above the
      // grab shift down (stay planted) while rows below shift up (lift more).
      const grabDeviation = (grabY - 0.5) * 2;

      for (let column = 0; column <= SEGMENTS; column += 1) {
        const point = curve[column];
        // Forward: page starts at right (x=width) and curls left toward spine.
        // Backward: mirror — page starts at left (x=0) and curls right toward spine.
        const x = leafDirection === 1 ? width + point.x : width - point.x;
        const diagonalY = (0.5 - rowRatio) * grabDeviation * point.z * DIAGONAL_TILT_FACTOR;
        points.push({
          x,
          y: rowY - point.z * LIFT_PROJECTION + diagonalY,
        });
      }
    }
    return points;
  }, [width, height, pad, invertProgress, leafDirection]);

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

  // Back face textures: use the back image dimensions if available, and mirror x.
  const backFaceImage = backImage ?? image;
  const backFaceTextures = useMemo<SkPoint[]>(() => {
    const imgWidth = backFaceImage?.width() ?? width;
    const imgHeight = backFaceImage?.height() ?? height;
    const coords: SkPoint[] = [];
    for (let row = 0; row <= ROWS; row += 1) {
      for (let column = 0; column <= SEGMENTS; column += 1) {
        coords.push({ x: (column / SEGMENTS) * imgWidth, y: (row / ROWS) * imgHeight });
      }
    }
    return coords;
  }, [backFaceImage, width, height]);

  const backTexturesMirrored = useMemo<SkPoint[]>(
    () => backFaceTextures.map((coord) => ({ x: (backFaceImage?.width() ?? width) - coord.x, y: coord.y })),
    [backFaceTextures, backFaceImage, width],
  );

  // For the mirrored (backward) leaf, mirror the front texture coords too so
  // the front image reads correctly after the x-mirror (left page text would
  // otherwise be horizontally reversed during a backward turn).
  const frontTexturesMirrored = useMemo<SkPoint[]>(
    () => frontTextures.map((coord) => ({ x: (image?.width() ?? width) - coord.x, y: coord.y })),
    [frontTextures, image, width],
  );

  // For the mirrored (backward) leaf, swap front/back textures so the image
  // reads correctly after the x-mirror.
  const frontTex = leafDirection === 1 ? frontTextures : frontTexturesMirrored;
  const backTex = leafDirection === 1 ? backTexturesMirrored : backFaceTextures;

  const visibility = useDerivedValue(() => (direction.value === activeDir ? 1 : 0), [activeDir]);
  const frontFace = useDerivedValue(() => {
    const turn = clampPageTurnProgress(progress.value);
    const pageProgress = invertProgress ? 1 - turn : turn;
    return pageProgress <= 0.5 ? 1 : 0;
  }, [invertProgress]);
  const backFace = useDerivedValue(() => 1 - frontFace.value, []);

  return (
    <Group opacity={visibility}>
      <Group opacity={frontFace}>
        <Vertices vertices={vertices} textures={image ? frontTex : undefined} indices={indices} color={Colors.book.page}>
          {image ? <ImageShader image={image} tx="clamp" ty="clamp" /> : null}
        </Vertices>
      </Group>
      <Group opacity={backFace}>
        <Vertices vertices={vertices} textures={backFaceImage ? backTex : undefined} indices={indices} color={Colors.book.pageAlt}>
          {backFaceImage ? <ImageShader image={backFaceImage} tx="clamp" ty="clamp" /> : null}
        </Vertices>
      </Group>
    </Group>
  );
}

function DirectionalLeaf({
  image,
  backImage,
  width,
  height,
  offsetX,
  offsetY,
  progress,
  direction,
  leafDirection,
  targetDirection,
  grabYRatio,
  invertProgress,
  indices,
}: {
  image: SkImage | null;
  backImage?: SkImage | null;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  progress: SharedValue<number>;
  direction: SharedValue<PageTurnDirection>;
  leafDirection: 1 | -1;
  targetDirection?: 1 | -1;
  grabYRatio?: SharedValue<number>;
  invertProgress?: boolean;
  indices: number[];
}) {
  const pad = height * CANVAS_VERTICAL_PAD;
  const canvasHeight = height + pad * 2;
  const activeDir = targetDirection ?? leafDirection;

  const dirOpacity = useDerivedValue(
    () => (direction.value === activeDir ? 1 : 0),
    [activeDir],
  );

  // Shadow and crest track the fold peak (curl apex) — the point where the
  // paper bends most sharply — weighted by the grab row.
  const foldPeakX = useDerivedValue(() => {
    const turn = clampPageTurnProgress(progress.value);
    const pageProgress = invertProgress ? 1 - turn : turn;
    const grabY = grabYRatio ? grabYRatio.value : 0.5;
    const grabRowProgress = computeRowTurnProgress(pageProgress, grabY, grabY);
    const curve = buildPageCurlCurve(width, SEGMENTS, grabRowProgress);
    const peakX = findFoldPeakX(curve);
    return leafDirection === 1 ? width + peakX : width - peakX;
  }, [width, invertProgress, leafDirection]);
  const shadowOpacity = useDerivedValue(() => {
    if (direction.value !== activeDir) return 0;
    const turn = clampPageTurnProgress(progress.value);
    const pageProgress = invertProgress ? 1 - turn : turn;
    return Math.sin(Math.PI * pageProgress) * SHADOW_MAX_OPACITY;
  }, [invertProgress, activeDir]);
  // Shadow sits on the resting page beneath the fold peak. For forward turns
  // the shadow is to the left of the peak; for backward turns it's to the right.
  const shadowTransform = useDerivedValue(() => {
    if (leafDirection === 1) {
      return [{ translateX: foldPeakX.value - width * SHADOW_WIDTH_RATIO }];
    }
    return [{ translateX: foldPeakX.value }];
  }, [foldPeakX, leafDirection, width]);

  // Crest highlight follows the fold peak.
  const crestOpacity = useDerivedValue(() => {
    if (direction.value !== activeDir) return 0;
    const turn = clampPageTurnProgress(progress.value);
    const pageProgress = invertProgress ? 1 - turn : turn;
    return Math.sin(Math.PI * pageProgress) * CREST_MAX_OPACITY;
  }, [invertProgress, activeDir]);
  const crestTransform = useDerivedValue(() => {
    if (leafDirection === 1) {
      return [{ translateX: foldPeakX.value - width * CREST_WIDTH_RATIO }];
    }
    return [{ translateX: foldPeakX.value }];
  }, [foldPeakX, leafDirection, width]);

  return (
    <Canvas
      pointerEvents="none"
      style={[
        styles.canvas,
        {
          // Forward leaf: canvas left = offsetX - width (so x=width maps to
          //   the resting page at offsetX). Vertices span 0..2*width.
          // Backward leaf: canvas left = offsetX (so x=0 maps to the resting
          //   page at offsetX). Vertices also span 0..2*width but mirrored.
          left: leafDirection === 1 ? offsetX - width : offsetX,
          top: offsetY - pad,
          width: width * 2,
          height: canvasHeight,
        },
      ]}
    >
      <Group opacity={dirOpacity}>
        <Group opacity={shadowOpacity} transform={shadowTransform}>
          <Rect x={0} y={pad} width={width * SHADOW_WIDTH_RATIO} height={height}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(width * SHADOW_WIDTH_RATIO, 0)}
              colors={[Skia.Color('rgba(28,24,18,0)'), Skia.Color('rgba(28,24,18,0.85)')]}
            />
          </Rect>
        </Group>
        <Group opacity={crestOpacity} transform={crestTransform}>
          <Rect x={0} y={pad} width={width * CREST_WIDTH_RATIO} height={height}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(width * CREST_WIDTH_RATIO, 0)}
              colors={[Skia.Color('rgba(255,252,240,0)'), Skia.Color('rgba(255,252,240,0.7)'), Skia.Color('rgba(255,252,240,0)')]}
            />
          </Rect>
        </Group>
        <LeafMesh
          image={image}
          backImage={backImage}
          width={width}
          height={height}
          progress={progress}
          direction={direction}
          leafDirection={leafDirection}
          targetDirection={targetDirection}
          grabYRatio={grabYRatio}
          invertProgress={invertProgress}
          indices={indices}
        />
      </Group>
    </Canvas>
  );
}

export function TurningLeafSkia({
  forwardImage,
  backwardImage,
  forwardBackImage,
  backwardBackImage,
  width,
  height,
  forwardOffsetX,
  backwardOffsetX,
  offsetY,
  progress,
  direction,
  grabYRatio,
  onePageMode,
  forwardEnabled = true,
  backwardEnabled = true,
}: TurningLeafSkiaProps) {
  const indices = useMemo(() => buildIndices(), []);
  const backOffset = backwardOffsetX ?? forwardOffsetX;

  // In one-page mode, the backward leaf uses the same geometry as the forward
  // leaf (leafDirection=1, page on right, curling left toward the fixed left
  // spine) with inverted progress. The previous page (N-1) uncurls IN FROM
  // the spine over the current page (N), instead of folding right toward a
  // right-side spine. This keeps the spine locked to the left in all
  // one-page operations, matching a real book held in one-page mode.
  const backwardLeafDirection = onePageMode ? 1 : -1;
  const backwardOffset = onePageMode ? forwardOffsetX : backOffset;

  return (
    <>
      {forwardEnabled ? (
        <DirectionalLeaf
          image={forwardImage}
          backImage={forwardBackImage}
          width={width}
          height={height}
          offsetX={forwardOffsetX}
          offsetY={offsetY}
          progress={progress}
          direction={direction}
          leafDirection={1}
          targetDirection={1}
          grabYRatio={grabYRatio}
          indices={indices}
        />
      ) : null}
      {backwardEnabled ? (
        <DirectionalLeaf
          image={backwardImage}
          backImage={backwardBackImage}
          width={width}
          height={height}
          offsetX={backwardOffset}
          offsetY={offsetY}
          progress={progress}
          direction={direction}
          leafDirection={backwardLeafDirection}
          targetDirection={-1}
          grabYRatio={grabYRatio}
          invertProgress={onePageMode}
          indices={indices}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    zIndex: 3,
  },
});
