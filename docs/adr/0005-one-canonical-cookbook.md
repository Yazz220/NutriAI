---
status: accepted
---

# Make new cookbooks one canonical object

> The initial three-style catalog described here is superseded by ADR 0007. The canonical-book decision remains in force.

Folio will own one physical cookbook experience. Its architecture, dimensions, binding, opening behavior, page system, page flipping, shadows, and interaction model are product constants rather than creation choices.

Every cookbook uses one versioned 4:5 portrait leaf, an 8:5 open spread, and an 8 × 10 inch print mapping. Renderers, generation, Studio samples, and export derive from this geometry contract. Cover boards may add physical overhang, but they cannot introduce an independent book proportion.

The creation Studio exposes name and cover color as the physical book's personalization choices. It does not expose named physical variants or material categories. The same live Folio book updates directly as the user changes its title or color.

Recipe-page style is a separate, book-owned choice. The user selects Illustrated, Editorial, or Heritage and can switch the Studio preview from Cover to Inside to see a two-page sample. `page_style_id`, `style_revision`, and `page_style_references` persist that choice so generation uses one visual language throughout the cookbook.

## Consequences

- Every new cookbook enters the same reader and physical-book system.
- Every new generated page records the canonical geometry revision used to create it.
- Cover personalization remains limited to title and color.
- Recipe-page style remains a visible creation choice because it changes every generated page in the cookbook.
- New creation cannot introduce a different page-generation path or physical behavior.
- Legacy cover and page-style identifiers remain readable. Existing non-4:5 page images remain compatibility artifacts until regenerated and must never be stretched or text-cropped.
- Future surface treatments may be added only if they preserve the canonical book's geometry and behavior.
- `capture-recipe` and `generate-page-art` continue to read the persisted page identity from the cookbook row.
