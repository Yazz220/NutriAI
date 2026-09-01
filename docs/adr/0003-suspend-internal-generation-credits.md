---
status: accepted
---

# Suspend internal generation-credit enforcement during product development

Folio does not currently charge or gate users with an internal generation-credit balance. The credit system predates the book-first product model and has no settled product policy, entitlement model, purchase flow, or recovery experience. Blocking a valid recipe capture on that unfinished system prevents testing the core recipe-to-book experience.

The active `generate-page-art` path therefore calls the configured image provider directly, records new page versions with `credit_cost = 0`, and can complete a generation request without a credit-ledger spend. Settings and Folio tool language do not expose a credit balance or one-credit cost.

## Consequences

- Provider usage still incurs the real cost charged to the configured OpenRouter account.
- The existing ledger, reservation RPC, historical rows, and legacy `credits` Edge Function are preserved as dormant infrastructure; they are not the active source of entitlement.
- Completion still links a historical spend row when one already exists, so old in-flight data remains coherent.
- A production credit or subscription system requires a new product decision covering entitlement, pricing, abuse controls, purchase and restore flows, failure compensation, and user-facing states. It must supersede this ADR instead of silently re-enabling the old gate.
