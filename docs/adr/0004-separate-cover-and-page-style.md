---
status: accepted
---

# Separate physical cover finish from recipe-page style

> The initial three-style catalog described here is superseded by ADR 0007. The cover/page separation remains in force.

Nosh cookbook creation is a customization experience for one book, not a choice among products. A user names one cookbook, chooses how its physical cover looks, and separately chooses the visual language shared by the recipe pages inside it.

`nutriai.cookbooks.cover_style` therefore owns only the physical binding, material, color, and foil treatment. `page_style_id` owns complete-page generation. `style_revision` and `page_style_references` version and anchor that page identity. The database remains authoritative during generation, so an individual recipe cannot silently select a different style.

New books choose one of three initial page languages: Illustrated, Editorial, or Heritage. Existing books are migrated with `page_style_id = cover_style`, preserving the visual identity they already used. Legacy IDs remain valid generation profiles for that reason.

## Consequences

- Cover finishes and page styles can grow independently.
- The creation Studio previews one live book and can change its cover or inside pages without implying separate products.
- The layout still adapts automatically to recipe density; page style is not a layout template.
- The current inline choices remain intentionally small. Expanded pickers and cover stickers can be added later without changing the persisted page-style contract.
- `capture-recipe` and `generate-page-art` must read `page_style_id` from the cookbook row. Caller-provided style values are validation hints only.
