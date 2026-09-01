# Folio brand source of truth

Folio is the current product and assistant name. The open-book symbol, character, palette, and typography began under the working name Nosh and carry forward unchanged. Old Nosh wordmarks remain only as source history and must not appear in the product.

## Current status

The open-book symbol and retired Nosh wordmark were reconstructed from the original raster package without generative redrawing. The Folio wordmark and horizontal lockup are the transparent PNG masters supplied by the brand owner on 1 September 2026.

- Symbol geometry reference: `references/supplied/04-master-symbol-fine-paper-flat.png`
- Retired wordmark geometry reference: `references/supplied/07-wordmark-production-reference.png`
- Symbol reconstruction overlap: 99.8% at the source resolution
- Retired wordmark reconstruction overlap: 99.5% at the source resolution
- Difference source: edge antialiasing introduced by converting raster pixels into smooth paths
- Folio wordmark master: `masters/wordmark/folio-wordmark-plum.png`
- Folio horizontal lockup master: `masters/lockups/folio-lockup-horizontal-plum.png`

The brand owner approved the reconstructed visual system on 29 August 2026, renamed the product Folio on 31 August, and supplied the final Folio name assets on 1 September. `manifest.json` records the active and retired assets.

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

Files in `masters/` are production sources. The Folio PNG masters must stay byte-for-byte identical to the supplied files. Files whose names contain `nosh-wordmark` or `nosh-lockup` are retired name assets, not Folio production marks. Files in `references/supplied/` preserve the original package. Generated PNGs belong in `exports/` and must never become the source for a new master.

## Generating application assets

Run `npm run brand:generate` from the project root. The generator creates the platform PNG exports and synchronizes application-ready copies into `assets/brand/`.

The Expo configuration consumes generated symbol files under `assets/brand/platform/`. Branded name moments use the supplied Folio wordmark or horizontal lockup copied into `assets/brand/marks/`. Change a canonical master first, then regenerate. Do not edit runtime copies or exported PNGs directly.

Application colors are exposed semantically through `constants/brandTheme.ts`; `constants/colors.ts` is the compatibility facade for existing screens. Typography is centralized in `constants/typography.ts` and loads Playfair Display with Inter through `utils/fonts.ts`.

## Core identity

Folio is a personal cookbook that turns recipes from anywhere into a book people will enjoy reading, cooking from, and making their own.

The identity should feel personal, warm, thoughtful, and timeless. The character is an open book with a signature wink. Its geometry, proportions, and expression must not be casually altered.

## Product application status

The foundational product rollout covers platform icons, launch and authentication, the cookbook shelf, Folio entry points, and recipe capture and share receipts.

Recipe capture uses the flat master symbol once at the source composer. Processing, destination, failure, and completion states use plain status icons, progress indicators, and direct copy. Native share receipts use the runtime Folio lockup. Alternate character expressions are not part of these states.

Future product work should continue from the semantic tokens and production components already in the app. Do not copy colors or raster marks from the supplied reference boards into a screen.

## Usage rules

1. Use Folio Plum as the main brand color.
2. Use Paper Ivory as the main light surface and reverse-mark color.
3. Keep the canonical symbol proportions at `1017:763`.
4. Do not stretch, skew, redraw, rotate, outline, or add effects to a master asset.
5. Keep paper texture separate from the flat symbol and wordmark masters.
6. Use the app icon masters for platform exports. Do not add rounded corners or platform shadows to the source image.
7. Use Playfair Display for branded display moments and Inter for body text and interface controls.
8. Keep the alternate character expressions out of the product UI during the foundational rollout. They remain approved source assets for future animation, campaigns, social content, and a later product-polish pass. Use the master symbol, supplied Folio wordmark, and supplied Folio lockup for product identity.
9. Never ship a retired Nosh wordmark or lockup. Stable technical identifiers may keep the old name until a compatibility migration is justified.

## Color resolution

The supplied boards vary slightly in their coral and peach labels. The source of truth resolves them as a small accent scale:

- Coral: `#FF8A5B`
- Peach: `#FFB185`
- Pale Peach: `#FFD9C2`

The stable colors across the package are Folio Plum `#65436F`, Paper Ivory `#F7F2EA`, Sage `#A8B89A`, and Ink `#2B2B2B`.

## Visual verification

After changing a master, review the files in `exports/previews/` at full size and the regenerated icons at platform size. Confirm symbol proportions, Folio wordmark and lockup fidelity, character expressions, and light and dark app-icon treatments before release.
