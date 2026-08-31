# Nosh brand source of truth

This directory contains the official Nosh identity supplied on 29 August 2026 and the production vector reconstruction derived from it.

## Current status

The supplied package contains raster references rather than editable vector masters. The symbol and wordmark in `masters/` were reconstructed from the highest-quality transparent references without generative redrawing.

- Symbol geometry reference: `references/supplied/04-master-symbol-fine-paper-flat.png`
- Wordmark geometry reference: `references/supplied/07-wordmark-production-reference.png`
- Symbol reconstruction overlap: 99.8% at the source resolution
- Wordmark reconstruction overlap: 99.5% at the source resolution
- Difference source: edge antialiasing introduced by converting raster pixels into smooth paths

The brand owner approved the reconstructed production system on 29 August 2026. `manifest.json` is the machine-readable record of that approval.

## Directory map

```text
brand/
  README.md
  manifest.json
  tokens/
    brand.tokens.json
  masters/
    app-icon/
    character/
    lockups/
    symbol/
    wordmark/
  references/
    README.md
    supplied/
  exports/
    app-icons/
    previews/
```

Files in `masters/` are the editable production sources. Files in `references/supplied/` preserve the original brand package. Generated PNGs belong in `exports/` and must never become the source for a new master.

## Generating application assets

Run `npm run brand:generate` from the project root. The generator creates the platform PNG exports and synchronizes application-ready copies into `assets/brand/`.

The Expo configuration consumes only the generated files under `assets/brand/platform/`. Change a canonical SVG master first, then regenerate. Do not edit runtime copies or exported PNGs directly.

Application colors are exposed semantically through `constants/brandTheme.ts`; `constants/colors.ts` is the compatibility facade for existing screens. Typography is centralized in `constants/typography.ts` and loads Playfair Display with Inter through `utils/fonts.ts`.

## Core identity

Nosh is a personal cookbook that turns recipes from anywhere into a book people will enjoy reading, cooking from, and making their own.

The identity should feel personal, warm, thoughtful, and timeless. The character is an open book with a signature wink. Its geometry, proportions, and expression must not be casually altered.

## Product application status

The foundational product rollout currently covers platform icons, launch and authentication, the cookbook shelf, Nosh entry points, and recipe capture and share receipts.

Recipe capture uses the flat master symbol once at the source composer. Processing, destination, failure, and completion states use plain status icons, progress indicators, and direct copy. Native share receipts use the official horizontal lockup. Alternate character expressions are not part of these states.

Future product work should continue from the semantic tokens and production components already in the app. Do not copy colors or raster marks from the supplied reference boards into a screen.

## Usage rules

1. Use Nosh Plum as the main brand color.
2. Use Paper Ivory as the main light surface and reverse-mark color.
3. Keep the canonical symbol proportions at `1017:763`.
4. Do not stretch, skew, redraw, rotate, outline, or add effects to a master asset.
5. Keep paper texture separate from the flat symbol and wordmark masters.
6. Use the app icon masters for platform exports. Do not add rounded corners or platform shadows to the source image.
7. Use Playfair Display for branded display moments and Inter for body text and interface controls.
8. Keep the alternate character expressions out of the product UI during the foundational rollout. They remain approved source assets for future animation, campaigns, social content, and a later product-polish pass. Use the master symbol and official lockups for product identity in the meantime.

## Color resolution

The supplied boards vary slightly in their coral and peach labels. The source of truth resolves them as a small accent scale:

- Coral: `#FF8A5B`
- Peach: `#FFB185`
- Pale Peach: `#FFD9C2`

The stable colors across the package are Nosh Plum `#65436F`, Paper Ivory `#F7F2EA`, Sage `#A8B89A`, and Ink `#2B2B2B`.

## Visual verification

After changing a master, review the files in `exports/previews/` at full size and the regenerated icons at platform size. Confirm symbol proportions, wordmark letterforms, lockup spacing, character expressions, and light and dark app-icon treatments before release.
