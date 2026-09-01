import React from 'react';
import { Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import SymbolIvory from '@/assets/brand/marks/symbol/nosh-symbol-ivory.svg';
import SymbolPlum from '@/assets/brand/marks/symbol/nosh-symbol-plum.svg';
import CharacterIdle from '@/assets/brand/characters/nosh-character-idle.svg';
import CharacterOops from '@/assets/brand/characters/nosh-character-oops.svg';
import CharacterSignature from '@/assets/brand/characters/nosh-character-signature.svg';
import CharacterWelcoming from '@/assets/brand/characters/nosh-character-welcoming.svg';

const folioHorizontalLockup = require('../../assets/brand/marks/lockups/folio-lockup-horizontal-plum.png');
const folioWordmark = require('../../assets/brand/marks/wordmark/folio-wordmark-plum.png');

type BrandTone = 'plum' | 'ivory';
type CharacterState = 'signature' | 'idle' | 'oops' | 'welcoming';

const symbolByTone = {
  plum: SymbolPlum,
  ivory: SymbolIvory,
} satisfies Record<BrandTone, React.ComponentType<SvgProps>>;

const characterByState = {
  signature: CharacterSignature,
  idle: CharacterIdle,
  oops: CharacterOops,
  welcoming: CharacterWelcoming,
} satisfies Record<CharacterState, React.ComponentType<SvgProps>>;

interface BrandAssetProps {
  tone?: BrandTone;
  accessibilityLabel?: string;
}

interface RasterCrop {
  sourceWidth: number;
  sourceHeight: number;
  contentLeft: number;
  contentTop: number;
  contentWidth: number;
  contentHeight: number;
}

const FOLIO_LOCKUP_CROP: RasterCrop = {
  sourceWidth: 2172,
  sourceHeight: 724,
  contentLeft: 119,
  contentTop: 121,
  contentWidth: 1952,
  contentHeight: 485,
};

const FOLIO_WORDMARK_CROP: RasterCrop = {
  sourceWidth: 2172,
  sourceHeight: 724,
  contentLeft: 226,
  contentTop: 51,
  contentWidth: 1728,
  contentHeight: 600,
};

function CroppedBrandAsset({
  source,
  crop,
  width,
  tone,
  accessibilityLabel,
}: {
  source: ImageSourcePropType;
  crop: RasterCrop;
  width: number;
  tone: BrandTone;
  accessibilityLabel: string;
}) {
  const scale = width / crop.contentWidth;
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessible
      style={[styles.rasterCrop, { width, height: crop.contentHeight * scale }]}
    >
      <Image
        accessible={false}
        fadeDuration={0}
        resizeMode="stretch"
        source={source}
        style={{
          position: 'absolute',
          width: crop.sourceWidth * scale,
          height: crop.sourceHeight * scale,
          left: -crop.contentLeft * scale,
          top: -crop.contentTop * scale,
          tintColor: tone === 'ivory' ? '#F7F2EA' : undefined,
        }}
      />
    </View>
  );
}

export function NoshSymbol({ size = 40, tone = 'plum', accessibilityLabel }: BrandAssetProps & { size?: number }) {
  const Symbol = symbolByTone[tone];
  return (
    <Symbol
      width={size}
      height={size * 0.75}
      accessibilityLabel={accessibilityLabel}
      accessible={Boolean(accessibilityLabel)}
    />
  );
}

export function FolioHorizontalLockup({
  width = 160,
  tone = 'plum',
  accessibilityLabel = 'Folio',
}: BrandAssetProps & { width?: number }) {
  return (
    <CroppedBrandAsset
      accessibilityLabel={accessibilityLabel}
      crop={FOLIO_LOCKUP_CROP}
      source={folioHorizontalLockup}
      tone={tone}
      width={width}
    />
  );
}

export function FolioWordmark({
  width = 128,
  tone = 'plum',
  accessibilityLabel = 'Folio',
}: BrandAssetProps & { width?: number }) {
  return (
    <CroppedBrandAsset
      accessibilityLabel={accessibilityLabel}
      crop={FOLIO_WORDMARK_CROP}
      source={folioWordmark}
      tone={tone}
      width={width}
    />
  );
}

export function NoshCharacter({
  state,
  size = 112,
  accessibilityLabel,
}: {
  state: CharacterState;
  size?: number;
  accessibilityLabel?: string;
}) {
  const Character = characterByState[state];
  return (
    <Character
      width={size}
      height={size * 0.75}
      accessibilityLabel={accessibilityLabel}
      accessible={Boolean(accessibilityLabel)}
    />
  );
}

const styles = StyleSheet.create({
  rasterCrop: {
    overflow: 'hidden',
  },
});
