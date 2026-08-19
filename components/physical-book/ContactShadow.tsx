import React from 'react';
import { BlurMask, Canvas, Oval } from '@shopify/react-native-skia';
import { withAlpha } from '@/utils/cookbook/coverArt';
import { Colors } from '@/constants/colors';

/**
 * Soft contact shadow cast on the shelf board beneath a book. Static per
 * width; the shelf animates its opacity/scaleX from the carousel offset
 * (`resolveShelfShadow`).
 */

interface ContactShadowProps {
  width: number;
  opacity?: number;
}

const SHADOW_HEIGHT = 22;
const CANVAS_PAD = 24;

export const ContactShadow = React.memo(function ContactShadow({ width, opacity = 0.3 }: ContactShadowProps) {
  const canvasWidth = width + CANVAS_PAD * 2;
  return (
    <Canvas
      style={{
        position: 'absolute',
        bottom: -SHADOW_HEIGHT + 6,
        left: -CANVAS_PAD,
        width: canvasWidth,
        height: SHADOW_HEIGHT,
      }}
      pointerEvents="none"
    >
      <Oval
        x={CANVAS_PAD + 6}
        y={SHADOW_HEIGHT / 2 - 5}
        width={width - 12}
        height={10}
        color={withAlpha(Colors.charcoal, opacity)}
      >
        <BlurMask blur={6} style="normal" />
      </Oval>
    </Canvas>
  );
});
