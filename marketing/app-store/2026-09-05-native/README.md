# Folio native App Store screenshot set

This folder contains a seven-panel campaign assembled from the native iOS captures supplied on 2026-09-05. The source screenshots remain untouched in Downloads; selected copies live in `sources/` for reproducible rendering.

## Selected launch concept

The selected set is the second, high-contrast “midnight editorial” concept:

- Upload-ready PNGs: `final-contrast/`
- Upload-ready archive: `folio-app-store-midnight-contrast-1290x2796.zip`
- Review contact sheet: `preview/folio-app-store-contrast-contact-sheet.png`

The lighter files in `final/` are the earlier concept and are retained only as a design reference.

## Editorial sequence

1. Recipes become cookbooks — `IMG_5753.PNG`
2. From link to finished page — `IMG_5755.PNG` plus `IMG_5748.PNG`
3. Every page feels made for you — `IMG_5748.PNG`
4. Ask Folio as you cook — `IMG_5748.PNG`, using only the real Ask Folio entry point
5. A style for every book — `IMG_5750.PNG` plus `IMG_5751.PNG`
6. Set the scene your way — `IMG_5752.PNG`
7. Your recipes. Your cookbooks. — `IMG_5754.PNG`

## Excluded captures

- `IMG_5749.PNG`: assistant response was still loading and the sheet title was truncated.
- `IMG_5746.PNG`: weaker duplicate of `IMG_5755.PNG`.
- `IMG_5747.PNG`: good spread, but redundant once `IMG_5754.PNG` was selected.
- `IMG_5755.PNG` is preferred over `IMG_5746.PNG` because it has the cleaner, more complete lower-page composition.

Nothing in Downloads was deleted.

## Output

Both exported sets contain 1290 × 2796 RGB PNGs with no alpha channel. This is an accepted Apple 6.9-inch portrait screenshot size.

`final-contrast/` contains the selected high-contrast “midnight editorial” concept using the same verified native screens.

## Generated background

`backgrounds/folio-editorial-paper-v1.png` was generated with the built-in image generation tool using Folio's brand board, herb-sprig wallpaper, and onboarding illustration as style references. It was requested as a quiet paper-ivory editorial plate with sparse plum, sage, and peach botanicals, generous negative space, and no text, logos, UI, devices, books, food, people, or watermarks.

`backgrounds/folio-midnight-editorial-v1.png` was generated from the same references as a contrasting deep aubergine book-cloth plate with sparse copper and botanical edge detail. It contains no generated UI or marketing text.

## Rebuild

Run:

```powershell
python .\marketing\app-store\2026-09-05-native\render_campaign.py
```
