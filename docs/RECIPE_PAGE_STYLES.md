# Recipe page styles

Folio has one canonical recipe, one 4:5 page geometry, and one complete-page generation pipeline. A recipe-page style changes only art direction and visual composition. It never changes extraction, recipe data, page dimensions, publication, or reader behavior.

## Version contract

`constants/recipePageStyles.ts` is the shared registry used by the Expo creation Studio and Supabase page generator. Every persisted identity resolves by the exact pair `(style_id, style_revision)`. Shipped definitions are immutable: improving a style means adding a revision and moving the active Studio pointer, not editing an old definition in place.

The database mirrors valid identity pairs in `nutriai.recipe_page_style_versions`. Existing books remain on their stored revisions. The active creation family is:

| Studio label | Persisted identity | Thumbnail signature |
|---|---|---|
| Studio | `studio@1` | Neutral modern grid and small natural-light photograph |
| Editorial | `editorial@2` | Dramatic crop, oversized display serif, image-led asymmetry |
| Illustrated | `illustrated@2` | Painted gouache/watercolor dish and ingredient vignettes; no photography |
| Heritage | `heritage@2` | Engraved dish, formal symmetry, small caps, restrained printer language |
| Journal | `journal@1` | Dot-grid notebook, candid snapshot, typed body, useful handwritten marks |
| Bold | `bold@1` | Condensed type, saturated ink blocks, risograph/halftone food image |

Each definition owns paper, typography, image medium, palette, graphic language, one signature cue, composition for sparse/standard/dense recipes, explicit exclusions, and optional visual references. `_shared/artGeneration.ts` compiles those fields with the exact canonical recipe copy. The provider request remains downstream of that provider-neutral prompt payload.

## Studio samples

Every active style has a brownie and cookie page under `assets/cookbook/style-previews/`. They use the same fixed recipes and an exact 1120 × 1400 canvas, making the style—not content or geometry—the comparison variable. The selector shows the brownie thumbnail; the Inside preview shows the brownie and cookie as a spread.

Assets are versioned in their filenames:

- `studio-v1-{brownies,cookies}.png`
- `editorial-v2-{brownies,cookies}.png`
- `illustrated-v2-{brownies,cookies}.png`
- `heritage-v2-{brownies,cookies}.png`
- `journal-v1-{brownies,cookies}.png`
- `bold-v1-{brownies,cookies}.png`

The samples are Studio previews, not runtime recipe data and not automatic provider references. If visual anchors are later approved and hosted, add their immutable HTTPS URLs to the matching registry version instead of accepting caller-defined per-recipe references.

## Adding a style or revision

One contained change should add the registry definition, active pointer if applicable, two fixed-recipe preview assets, the database catalog row, and contract tests. Extraction and `capture-recipe` must not branch on style. The generator must continue resolving the cookbook-owned identity from the database and must reject unknown revisions rather than silently falling back.

Quality review uses the same recipe across all styles at thumbnail size, plus sparse, standard, and dense recipes. Check copy accuracy, 4:5 geometry, image-medium compliance, exclusions, and whether every style remains recognizable without reading its label.
