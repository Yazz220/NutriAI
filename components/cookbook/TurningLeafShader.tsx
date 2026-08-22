/* eslint-disable react-hooks/immutability -- Reanimated shared values are read inside Skia derived values by design. */
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  Group,
  ImageShader,
  Rect,
  Shader,
  Skia,
  rect,
  type SkImage,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { PAGE_CURL_SHADER } from '@/utils/cookbook/pageCurlShader';
import { clampPageTurnProgress, type PageTurnDirection } from '@/utils/cookbook/physicalBook';
import { Colors } from '@/constants/colors';

/**
 * Curling page leaf rendered with a per-pixel fragment shader (RuntimeShader).
 *
 * Instead of deforming a vertex mesh (which stretches textures across sheared
 * triangles), this approach computes the source UV for every pixel
 * independently on the GPU. The curl is a 2D cylinder defined by a curl axis
 * and radius — no 3D projection, no z-depth, no texture stretching.
 *
 * The canvas is 2x the page width so the back face of the turning page can
 * extend beyond the page boundary (over the adjacent page) as the page curls
 * over. This matches the real-world behavior where the back of a turning page
 * is visible on the other side of the spine.
 *
 * Key design:
 * - The shader takes front and back page textures as `uniform shader` inputs,
 *   mapped to the page's area within the 2x-wide canvas via ImageShader rects.
 * - curlPos + curlDir define the fold line (perpendicular to curlDir).
 * - The radius peaks at mid-turn (sin(π·progress)) for a smooth lift/land.
 * - Corner grabs tilt the curl direction vertically, creating a diagonal peel.
 * - "Behind the curl" shows the flat front page (opaque).
 * - "On the curl" (0 < d < r) shows the curled front face with highlight.
 * - "Beyond the curl" (d > r) shows the back face, mirrored and darkened.
 * - Where the back face source is out of page bounds, a shadow fades out.
 */

const BASE_RADIUS = 0.15;
const TILT_STRENGTH = 0.28;
const BACK_OPACITY = 0.7;

interface TurningLeafShaderProps {
  forwardImage: SkImage | null;
  backwardImage: SkImage | null;
  forwardBackImage?: SkImage | null;
  backwardBackImage?: SkImage | null;
  width: number;
  height: number;
  forwardOffsetX: number;
  backwardOffsetX?: number;
  offsetY: number;
  progress: SharedValue<number>;
  direction: SharedValue<PageTurnDirection>;
  grabYRatio?: SharedValue<number>;
  onePageMode?: boolean;
}

interface DirectionalShaderLeafProps {
  image: SkImage | null;
  backImage: SkImage | null;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  progress: SharedValue<number>;
  direction: SharedValue<PageTurnDirection>;
  /** 1 = curl moves leftward (forward), -1 = curl moves rightward (backward spread). */
  curlSign: 1 | -1;
  /** Matches direction.value to control visibility. */
  targetDirection: 1 | -1;
  grabYRatio?: SharedValue<number>;
  invertProgress?: boolean;
  effect: ReturnType<typeof Skia.RuntimeEffect.Make>;
}

function DirectionalShaderLeaf({
  image,
  backImage,
  width,
  height,
  offsetX,
  offsetY,
  progress,
  direction,
  curlSign,
  targetDirection,
  grabYRatio,
  invertProgress,
  effect,
}: DirectionalShaderLeafProps) {
  // The canvas is 2x the page width. The page occupies one half:
  //   Forward (curlSign=1): page in the RIGHT half [width, 2*width]
  //   Backward (curlSign=-1): page in the LEFT half [0, width]
  const pageOffsetX = curlSign === 1 ? width : 0;
  const canvasWidth = width * 2;
  // ImageShader rect: maps the image to the page's area within the canvas
  const imageRect = useMemo(
    () => rect(pageOffsetX, 0, width, height),
    [pageOffsetX, width, height],
  );
  // Canvas left edge: for forward, canvas starts one page width to the LEFT
  // of the page (so the back face can extend leftward). For backward, canvas
  // starts at the page (so the back face can extend rightward).
  const canvasLeft = curlSign === 1 ? offsetX - width : offsetX;

  const opacity = useDerivedValue(() => (direction.value === targetDirection ? 1 : 0), [targetDirection]);

  const uniforms = useDerivedValue(() => {
    const turn = clampPageTurnProgress(progress.value);
    const pageProgress = invertProgress ? 1 - turn : turn;
    const grabY = grabYRatio ? grabYRatio.value : 0.5;
    const radius = BASE_RADIUS * Math.sin(Math.PI * pageProgress) * width;
    const tiltY = (grabY - 0.5) * 2 * TILT_STRENGTH;

    // curlPos in page-local pixels:
    // Forward: starts at right edge (width), moves to spine (0)
    // Backward: starts at left edge (0), moves to spine (width)
    const curlPosX = curlSign === 1 ? (1 - pageProgress) * width : pageProgress * width;
    const curlPosY = grabY * height;

    // curlDir: direction the curl is traveling.
    // Horizontal: -curlSign (leftward for forward, rightward for backward)
    // Vertical: tilt for diagonal peel on corner grabs
    const curlDirX = -curlSign;
    const curlDirY = tiltY;

    return {
      u_canvasSize: [canvasWidth, height],
      u_pageOffset: [pageOffsetX, 0],
      u_pageSize: [width, height],
      u_curlPos: [curlPosX, curlPosY],
      u_curlDir: [curlDirX, curlDirY],
      u_radius: radius,
      u_progress: pageProgress,
      u_backOpacity: BACK_OPACITY,
    };
  }, [width, height, canvasWidth, curlSign, invertProgress]);

  if (!effect) return null;

  const resolvedBackImage = backImage ?? image;

  return (
    <Canvas
      pointerEvents="none"
      style={[
        styles.canvas,
        { left: canvasLeft, top: offsetY, width: canvasWidth, height },
      ]}
    >
      <Group opacity={opacity}>
        {image ? (
          <Rect x={0} y={0} width={canvasWidth} height={height}>
            <Shader source={effect} uniforms={uniforms}>
              <ImageShader
                image={image}
                tx="clamp"
                ty="clamp"
                fit="fill"
                rect={imageRect}
              />
              <ImageShader
                image={resolvedBackImage}
                tx="clamp"
                ty="clamp"
                fit="fill"
                rect={imageRect}
              />
            </Shader>
          </Rect>
        ) : (
          <Rect x={pageOffsetX} y={0} width={width} height={height} color={Colors.book.page} />
        )}
      </Group>
    </Canvas>
  );
}

export function TurningLeafShader({
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
}: TurningLeafShaderProps) {
  const effect = useMemo(() => Skia.RuntimeEffect.Make(PAGE_CURL_SHADER), []);
  const backOffset = backwardOffsetX ?? forwardOffsetX;

  // In one-page mode, the backward leaf uses the same geometry as the forward
  // leaf (curlSign=1) with inverted progress. The previous page uncurls IN
  // FROM the left spine over the current page.
  const backwardCurlSign = onePageMode ? 1 : -1;
  const backwardOffset = onePageMode ? forwardOffsetX : backOffset;

  return (
    <>
      <DirectionalShaderLeaf
        image={forwardImage}
        backImage={forwardBackImage ?? null}
        width={width}
        height={height}
        offsetX={forwardOffsetX}
        offsetY={offsetY}
        progress={progress}
        direction={direction}
        curlSign={1}
        targetDirection={1}
        grabYRatio={grabYRatio}
        effect={effect}
      />
      <DirectionalShaderLeaf
        image={backwardImage}
        backImage={backwardBackImage ?? null}
        width={width}
        height={height}
        offsetX={backwardOffset}
        offsetY={offsetY}
        progress={progress}
        direction={direction}
        curlSign={backwardCurlSign}
        targetDirection={-1}
        grabYRatio={grabYRatio}
        invertProgress={onePageMode}
        effect={effect}
      />
    </>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    zIndex: 3,
  },
});
