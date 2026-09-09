---
status: accepted
---

# Separate cover finish from cover color

The canonical Folio book keeps one geometry, construction, reader, and physical behavior. Its surface appearance is modeled as two independent, curated choices: `cover_finish_id` selects Fine cloth or Natural linen, and `cover_color_id` selects one of six product-owned colors.

This decision refines ADR 0005. It supersedes only the statement that material categories are not exposed. The finishes are surface treatments, not separate book types: they change weave and grain parameters inside the shared cover renderer and do not change dimensions, boards, spine, page block, opening, physics, or page rendering.

`cover_style` remains persisted for compatibility with older clients and legacy books. New clients derive that value from `cover_color_id`, and a database trigger synchronizes either field when an older client writes only the legacy value. All active physical views resolve finish and color through the same cover-appearance module. Missing cached fields normalize to Fine cloth and infer color from the legacy style.

Recipe-page identity remains separate. `page_style_id`, its revision, and its visual references continue to condition complete-page generation. Cover finish and color are never sent to the recipe-page prompt.

## Consequences

- The Studio exposes title, two cover textures, six curated colors, and recipe-page style.
- There is no free-form color picker and no user-authored material configuration.
- Foil, band, and thread tones are derived from the curated color.
- Shelf, closed reader, back cover, and Studio preview consume one resolved appearance object.
- Existing books remain visually stable through legacy-style normalization.
- Adding another finish requires a renderer-supported surface treatment; it cannot introduce a new physical book architecture.
