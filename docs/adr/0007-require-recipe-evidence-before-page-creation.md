---
status: accepted
---

# Require recipe evidence before page creation

Every recipe extractor must return one provider-neutral evidence decision before capture orchestration can create a Recipe Graph or cookbook page. The outcomes are `recipe`, `not_recipe`, and `insufficient_evidence`. Only `recipe` may include a Recipe Graph, and it must contain evidence for both a usable ingredient list and a usable cooking method for one recipe.

`not_recipe` covers unrelated, blank, and empty sources. `insufficient_evidence` covers unreadable sources, missing ingredients, missing instructions, and multiple recipes that cannot be separated reliably. Both stop the durable capture in `needs_attention` with a stable reason code and deterministic Nosh feedback. They never enter `create_capture_page` or complete-page generation. Technical provider and generation errors also use `needs_attention`, but remain retryable.

The active model may classify evidence and provide a short internal diagnostic. It does not own user-facing failure copy or recovery behavior. A model or provider replacement must adapt its output to the same decision envelope, and capture orchestration validates the envelope again before using it. Provider selection for unstructured extraction requires support for the declared structured-output parameters.

We rejected forcing every model response into a Recipe Graph because it encourages invented ingredients and instructions for wrong or incomplete sources. We also rejected exposing provider-specific errors directly to the user because wording and error shapes change when models or providers change. We kept the existing four capture states because the distinction belongs in failure reason and recovery behavior, not in another parallel lifecycle.

## Consequences

- A wrong, black, blank, unreadable, incomplete, or multi-recipe source cannot create a cookbook page.
- The Composer shows `Check source` and `Choose another source` for evidence failures.
- Provider outages, malformed provider responses, and downstream page failures continue to show a retry action.
- `failure_code` is the durable debugging seam; the internal extraction diagnostic is logged with the outcome and reason code.
- Deterministic schema.org Recipe data remains the preferred URL path, but it must contain both ingredients and instructions.
- Audio and future source adapters must return the same evidence decision when they are added.
- See ADR 0002 for the single durable capture and complete-page generation pipeline.
