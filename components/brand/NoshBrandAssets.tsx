import React from 'react';
import type { SvgProps } from 'react-native-svg';
import SymbolIvory from '@/assets/brand/marks/symbol/nosh-symbol-ivory.svg';
import SymbolPlum from '@/assets/brand/marks/symbol/nosh-symbol-plum.svg';
import HorizontalIvory from '@/assets/brand/marks/lockups/nosh-lockup-horizontal-ivory.svg';
import HorizontalPlum from '@/assets/brand/marks/lockups/nosh-lockup-horizontal-plum.svg';
import CharacterIdle from '@/assets/brand/characters/nosh-character-idle.svg';
import CharacterOops from '@/assets/brand/characters/nosh-character-oops.svg';
import CharacterSignature from '@/assets/brand/characters/nosh-character-signature.svg';
import CharacterWelcoming from '@/assets/brand/characters/nosh-character-welcoming.svg';

type BrandTone = 'plum' | 'ivory';
type CharacterState = 'signature' | 'idle' | 'oops' | 'welcoming';

const symbolByTone = {
  plum: SymbolPlum,
  ivory: SymbolIvory,
} satisfies Record<BrandTone, React.ComponentType<SvgProps>>;

const horizontalByTone = {
  plum: HorizontalPlum,
  ivory: HorizontalIvory,
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

export function NoshSymbol({
  size = 40,
  tone = 'plum',
  accessibilityLabel,
}: BrandAssetProps & { size?: number }) {
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

export function NoshHorizontalLockup({
  width = 160,
  tone = 'plum',
  accessibilityLabel = 'Nosh',
}: BrandAssetProps & { width?: number }) {
  const Lockup = horizontalByTone[tone];
  return (
    <Lockup
      width={width}
      height={width * (763 / 3594)}
      accessibilityLabel={accessibilityLabel}
      accessible={Boolean(accessibilityLabel)}
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
