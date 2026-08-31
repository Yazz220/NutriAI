import { Colors } from '@/constants/colors';
import React, { useMemo } from 'react';
import {
  Canvas,
  Group,
  LinearGradient,
  Path,
  Rect,
  RoundedRect,
  Shader,
  Skia,
  vec,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';
import type { CookbookBinding } from '@/constants/cookbookBindings';
import { NOSH_BOOK_MATERIAL, resolveNoshBookMaterialGeometry } from '@/constants/cookbookMaterial';
import { shiftColor, withAlpha } from '@/utils/cookbook/coverArt';

/**
 * Skia-drawn front cover for a physically bound cookbook: cloth gradient,
 * material weave, procedural grain, a soft hinge, and a restrained board
 * edge. Static per
 * (binding, size) — the canvas only re-renders when the binding or
 * dimensions change, so carousel motion never touches it.
 *
 * Title typography is a separate RN overlay (`FoilStampedTitle`) so it can
 * use the app's display serif and update live while typing.
 */

interface SkiaBookCoverProps {
  binding: CookbookBinding;
  width: number;
  height: number;
  spineWidth: number;
  presentation?: 'book' | 'swatch';
}

// Luminance grain: 0.5-centered noise drawn in overlay blend mode modulates
// the cloth without recoloring it. Frequency/amplitude come from the binding.
const GRAIN_SKSL = `
uniform float2 size;
uniform float frequency;
uniform float amplitude;
uniform float seed;

float hash(float2 p) {
  return fract(sin(dot(p, float2(12.9898, 78.233))) * 43758.5453);
}

half4 main(float2 xy) {
  float2 p = (xy / size) * frequency * 40.0 + seed;
  float n = hash(floor(p));
  float n2 = hash(floor(p * 3.1) + 17.0);
  float v = (n * 0.6 + n2 * 0.4 - 0.5) * 2.0 * amplitude;
  return half4(half3(0.5 + v), 1.0);
}
`;

let grainEffect: SkRuntimeEffect | null | undefined;

function getGrainEffect(): SkRuntimeEffect | null {
  if (grainEffect === undefined) {
    try {
      grainEffect = Skia.RuntimeEffect.Make(GRAIN_SKSL);
    } catch {
      grainEffect = null;
    }
  }
  return grainEffect ?? null;
}

/** Material weave comes from the finish; geometry remains unchanged. */
function buildWeavePath(binding: CookbookBinding, width: number, height: number) {
  const path = Skia.Path.Make();
  const pattern = binding.weavePattern;
  const verticalGap = Math.max(pattern.verticalGapMin, width / pattern.verticalGapRatio);
  const horizontalGap = Math.max(pattern.horizontalGapMin, width / pattern.horizontalGapRatio);
  const isLinen = binding.material === 'linen';
  const spacing = [0.76, 1.22, 0.9, 1.34, 0.84, 1.08];

  for (let x = 0, index = 0; x <= width; index += 1, x += verticalGap * (isLinen ? spacing[index % spacing.length] : 1)) {
    path.moveTo(x, 0);
    if (isLinen) {
      for (let y = 6; y <= height; y += 6) {
        path.lineTo(x + Math.sin(index * 1.7 + y * 0.095) * 0.7, y);
      }
    } else {
      path.lineTo(x, height);
    }
  }

  for (let y = 0, index = 0; y <= height; index += 1, y += horizontalGap * (isLinen ? spacing[(index + 2) % spacing.length] : 1)) {
    path.moveTo(0, y);
    if (isLinen) {
      for (let x = 6; x <= width; x += 6) {
        path.lineTo(x, y + Math.cos(index * 1.35 + x * 0.08) * 0.55);
      }
    } else {
      path.lineTo(width, y);
    }
  }
  return path;
}

function buildLinenSlubPath(binding: CookbookBinding, width: number, height: number) {
  const path = Skia.Path.Make();
  if (binding.material !== 'linen') return path;

  const gap = Math.max(binding.weavePattern.verticalGapMin, width / binding.weavePattern.verticalGapRatio);
  for (let x = gap * 2.4, index = 0; x < width; index += 1, x += gap * (3.6 + (index % 3) * 0.55)) {
    path.moveTo(x, 0);
    for (let y = 8; y <= height; y += 8) {
      path.lineTo(x + Math.sin(index * 2.1 + y * 0.07) * 1.05, y);
    }
  }
  return path;
}

export const SkiaBookCover = React.memo(function SkiaBookCover({
  binding,
  width,
  height,
  spineWidth,
  presentation = 'book',
}: SkiaBookCoverProps) {
  const { cloth, weave, grain } = binding;
  const effect = getGrainEffect();
  const materialGeometry = resolveNoshBookMaterialGeometry(width);
  const isSwatch = presentation === 'swatch';
  const boardRadius = isSwatch ? Math.min(10, width * 0.16) : materialGeometry.boardCornerRadius;

  const weavePath = useMemo(
    () => buildWeavePath(binding, width, height),
    [binding, width, height],
  );
  const linenSlubPath = useMemo(
    () => buildLinenSlubPath(binding, width, height),
    [binding, width, height],
  );
  const boardClip = useMemo(() => {
    const path = Skia.Path.Make();
    path.addRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, width, height), boardRadius, boardRadius));
    return path;
  }, [boardRadius, height, width]);

  return (
    <Canvas style={{ width, height }}>
      {/* Cloth base */}
      <RoundedRect x={0} y={0} width={width} height={height} r={boardRadius}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={[shiftColor(cloth, 11), cloth, shiftColor(cloth, -15)]}
          positions={[0, 0.56, 1]}
        />
      </RoundedRect>

      {/* Material weave, clipped to the board shape by the group clip */}
      <Group clip={boardClip}>
        <Path
          path={weavePath}
          style="stroke"
          strokeWidth={binding.weavePattern.strokeWidth}
          color={withAlpha(weave, binding.weavePattern.opacity)}
        />
        {binding.material === 'linen' ? (
          <Path
            path={linenSlubPath}
            style="stroke"
            strokeWidth={binding.weavePattern.strokeWidth * 1.75}
            color={withAlpha(shiftColor(weave, 16), binding.weavePattern.opacity * 0.72)}
          />
        ) : null}

        {/* Procedural grain */}
        {effect ? (
          <Rect x={0} y={0} width={width} height={height} blendMode="overlay">
            <Shader
              source={effect}
              uniforms={{
                size: [width, height],
                frequency: grain.frequency,
                amplitude: grain.amplitude,
                seed: 7.3,
              }}
            />
          </Rect>
        ) : null}

        {/* Top-down library light */}
        <Rect x={0} y={0} width={width} height={height * 0.42}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, height * 0.42)}
            colors={[NOSH_BOOK_MATERIAL.light.coverHighlight, Colors.legacySurface.v83]}
          />
        </Rect>

        {!isSwatch ? (
          <>
            {/* Soft shoulder beside the fixed hinge. The physical shelf spine is
                a separate plane, so page count never changes this composition. */}
            <Rect x={0} y={0} width={spineWidth} height={height}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(spineWidth, 0)}
                colors={[shiftColor(cloth, -18), shiftColor(cloth, 10), cloth]}
                positions={[0, 0.44, 1]}
              />
            </Rect>

            {/* Hinge groove and its board-side catchlight. */}
            <Rect
              x={spineWidth - 1.2}
              y={boardRadius}
              width={1.2}
              height={height - boardRadius * 2}
              color={withAlpha(shiftColor(cloth, -32), 0.58)}
            />
            <Rect
              x={spineWidth + 0.7}
              y={boardRadius}
              width={0.8}
              height={height - boardRadius * 2}
              color={withAlpha(shiftColor(cloth, 24), 0.24)}
            />

            {/* Board bevels keep the cloth matte while making its thickness legible. */}
            <Rect
              x={0}
              y={0}
              width={width}
              height={materialGeometry.boardDepth + 1}
              color={withAlpha(shiftColor(cloth, 28), 0.22)}
            />
            <Rect
              x={width - materialGeometry.boardDepth}
              y={0}
              width={materialGeometry.boardDepth}
              height={height}
              color={withAlpha(shiftColor(cloth, -24), 0.24)}
            />
            <Rect x={0} y={height - materialGeometry.boardDepth - 1} width={width} height={materialGeometry.boardDepth + 1}>
              <LinearGradient
                start={vec(0, height - materialGeometry.boardDepth - 1)}
                end={vec(0, height)}
                colors={[Colors.legacySurface.v45, NOSH_BOOK_MATERIAL.light.coverShade]}
              />
            </Rect>
          </>
        ) : null}
      </Group>

      {/* Board edge */}
      <RoundedRect
        x={0.5}
        y={0.5}
        width={width - 1}
        height={height - 1}
        r={boardRadius}
        style="stroke"
        strokeWidth={0.9}
        color={withAlpha(shiftColor(cloth, -26), isSwatch ? 0.3 : 0.46)}
      />
    </Canvas>
  );
});
