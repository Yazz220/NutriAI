import { Shadows } from '@/constants/spacing';
import { Radii } from '@/constants/spacing';
import React from 'react';
import { View } from 'react-native';
import { Colors } from '@/constants/colors';

/**
 * Web fallback for the contact shadow — a CSS box-shadow ellipse so the web
 * shelf keeps depth without CanvasKit.
 */

interface ContactShadowProps {
  width: number;
  opacity?: number;
}

export const ContactShadow = React.memo(function ContactShadow({ width, opacity = 0.3 }: ContactShadowProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: -12,
        left: 6,
        width: width - 12,
        height: 10,
        borderRadius: Radii.numeric[999],
        boxShadow: Shadows.custom.contact(opacity),
        backgroundColor: Colors.charcoal,
        opacity: 0.001, // the boxShadow carries the visual; the fill just anchors it
      }}
    />
  );
});
