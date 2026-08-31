---
status: accepted
---

# Gate page creation on semantic recipe quality

Every accepted Recipe Graph receives one provider-neutral semantic assessment before Nosh creates a cookbook page or requests page art. Complete and warning-only graphs continue automatically. A graph with an open cooking-critical issue remains on the durable capture and enters focused recipe correction. Saving corrections reassesses and resumes that same capture.

We rejected trusting the extractor's confidence score because schema compliance and model confidence do not establish that quantities, temperatures, yields, and timings agree. We also rejected a review screen for every recipe because strong imports should still assemble the cookbook without interruption. Missing optional metadata never blocks. Only deterministic, actionable issues do.

## Consequences

- The assessment and issue paths live in Recipe Graph provenance, not in provider response types.
- No pending cookbook page or generated art exists while an issue remains open.
- Missing and contradictory source facts must be corrected. A user may confirm an inferred critical value after reviewing it.
- `needs_recipe_correction` reuses `needs_attention`; it does not add another capture lifecycle state.
- Changing a model or extraction provider does not change the assessment or correction contract.
