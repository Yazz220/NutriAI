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
import { shiftColor, withAlpha } from '@/utils/cookbook/coverArt';

/**
 * Skia-drawn front cover for a physically bound cookbook: cloth gradient,
 * material weave, procedural grain, a curved spine face with headbands and
 * hub bands and a restrained board edge. Static per
 * (binding, size) — the canvas only re-renders when the binding or
 * dimensions change, so carousel motion never touches it.
 *
 * Title typography is a separate RN overlay (`FoilStampedTitle`) so it can
 * use the app's display serif and update live while typing.
 */

export const COVER_CORNER_RADIUS = 10;

interface SkiaBookCoverProps {
  binding: CookbookBinding;
  width: number;
  height: number;
  spineWidth: number;
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

/** Diagonal crosshatch for linen; fine vertical/horizontal threads for cloth. */
function buildWeavePath(material: CookbookBinding['material'], width: number, height: number) {
  const path = Skia.Path.Make();
  if (material === 'linen') {
    const spacing = 7;
    const run = height * 0.9; // tan(~42deg)
    for (let x = -height; x < width + height; x += spacing) {
      path.moveTo(x, -10);
      path.lineTo(x + run, height + 10);
      path.moveTo(x, -10);
      path.lineTo(x - run, height + 10);
    }
  } else if (material === 'cloth') {
    for (let x = 0; x <= width; x += 4) {
      path.moveTo(x, 0);
      path.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += 7) {
      path.moveTo(0, y);
      path.lineTo(width, y);
    }
  }
  return path;
}

export const SkiaBookCover = React.memo(function SkiaBookCover({
  binding,
  width,
  height,
  spineWidth,
}: SkiaBookCoverProps) {
  const { cloth, weave, band, material, grain } = binding;
  const effect = getGrainEffect();

  const weavePath = useMemo(() => buildWeavePath(material, width, height), [material, width, height]);
  const hubY = [height * 0.16, height * 0.84];
  const weaveOpacity = material === 'linen' ? 0.16 : 0.1;

  return (
    <Canvas style={{ width, height }}>
      {/* Cloth base */}
      <RoundedRect x={0} y={0} width={width} height={height} r={COVER_CORNER_RADIUS}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={[shiftColor(cloth, 12), cloth, shiftColor(cloth, -16)]}
        />
      </RoundedRect>

      {/* Material weave, clipped to the board shape by the group clip */}
      <Group clip={Skia.Path.Make().addRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, width, height), COVER_CORNER_RADIUS, COVER_CORNER_RADIUS))}>
        {material !== 'leather' ? (
          <Path path={weavePath} style="stroke" strokeWidth={0.6} color={withAlpha(weave, weaveOpacity)} />
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
            colors={[Colors.legacySurface.v77, Colors.legacySurface.v83]}
          />
        </Rect>

        {/* Curved spine face: highlight sits off-center to fake the round */}
        <Rect x={0} y={0} width={spineWidth} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(spineWidth, 0)}
            colors={[shiftColor(cloth, -28), shiftColor(cloth, 18), shiftColor(cloth, -22)]}
            positions={[0, 0.38, 1]}
          />
        </Rect>

        {/* Headbands */}
        <Rect x={1} y={4} width={spineWidth - 3} height={5} color={withAlpha(band, 0.95)} />
        <Rect x={1} y={height - 9} width={spineWidth - 3} height={5} color={withAlpha(band, 0.95)} />

        {/* Hub bands with their cast shadow */}
        {hubY.map((y) => (
          <React.Fragment key={y}>
            <Rect x={0} y={y + 6} width={spineWidth} height={1.2} color={withAlpha(shiftColor(cloth, -34), 0.5)} />
            <RoundedRect x={-1} y={y} width={spineWidth + 1} height={6} r={3} color={shiftColor(cloth, 8)} />
          </React.Fragment>
        ))}

        {/* Hinge groove + bevel highlight */}
        <Rect x={spineWidth - 1} y={6} width={1.2} height={height - 12} color={withAlpha(shiftColor(cloth, -34), 0.7)} />
        <Rect x={spineWidth + 0.5} y={6} width={1} height={height - 12} color={withAlpha(shiftColor(cloth, 22), 0.35)} />

        {/* Board bottom edge shade */}
        <Rect x={0} y={height - 5} width={width} height={5}>
          <LinearGradient
            start={vec(0, height - 5)}
            end={vec(0, height)}
            colors={[Colors.legacySurface.v45, Colors.legacySurface.v44]}
          />
        </Rect>
      </Group>

      {/* Board edge */}
      <RoundedRect
        x={0.5}
        y={0.5}
        width={width - 1}
        height={height - 1}
        r={COVER_CORNER_RADIUS}
        style="stroke"
        strokeWidth={1}
        color={withAlpha(shiftColor(cloth, -24), 0.55)}
      />
    </Canvas>
  );
});
