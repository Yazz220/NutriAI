---
status: accepted
---

# Preserve structured recipe source meaning

The canonical Recipe Graph preserves a structured website's exact ingredient lines, instruction sections, source yield, and versioned provenance alongside normalized fields. Numeric `servings` is optional. Folio sets it only when the source explicitly describes servings; yields such as "1 loaf" and "24 cookies" remain `yieldText` and cannot enter serving-based scaling.

The URL adapter considers every Schema.org Recipe node expressed as JSON-LD or Microdata. It selects an explicit `mainEntity`, a URL-matched candidate, or one candidate that is substantially more complete. It does not auto-publish when multiple candidates remain equally plausible. This keeps the deterministic fast path, but removes the old first-node, JSON-LD-only, and default-one assumptions.

We rejected flattening each ingredient into an opaque name because it prevents reliable scaling and loses the original evidence. We also rejected aggressive parsing that discards the source line. Conservative parsing may leave quantity or unit unset, while `rawText` retains the exact publisher value for debugging and later correction.

## Consequences

- The graph records the submitted and canonical URLs separately, plus source metadata, content hash, parser identity and version, candidate count, and selection reason.
- Schema.org `HowToSection` names become canonical step-group labels.
- Page generation and legacy rendering show `yieldText` before synthesized serving copy.
- Serving-based actions explain that they need a numeric serving count when a recipe has only a non-serving yield.
- The compatibility recipe row keeps nullable servings, and atomic page revision accepts graphs without numeric servings.
- See ADR 0007 for the recipe-evidence decision that runs before page creation.
