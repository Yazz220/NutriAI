# Recipe chat loading and Sentry triage — 2026-09-05

The reported iPhone screenshot shows a pending “Make this for two” turn. The screenshot alone does not identify which asynchronous operation is pending. No new model run was recorded during this investigation; that does not prove an older device build never sent a request.

## Changes verified in regression tests

- Session acquisition is now inside the streaming request deadline.
- Session, fetch, response-body, and stream-read promises settle on cancellation even if the underlying native operation ignores AbortSignal. Two regression tests failed before this fix and passed afterward.
- Stop also cancels pending consent and context waits in the chat adapter.
- AI consent is hosted inside the active conversation modal instead of attempting to present a sibling root modal over it. The host test verifies the disclosure is inside the conversation and appears once. This addresses a presentation risk; the exact screenshot still needs an iPhone retest.
- Thread-state upserts include the authenticated owner ID. A transaction under the authenticated database role reproduced rejection without an owner and verified a successful owner-scoped insert. The transaction was rolled back; no test state remains.

## Sentry issues inspected

| Issue | Finding | Disposition |
| --- | --- | --- |
| [FOLIO-BACKEND-8](https://all-ot.sentry.io/issues/7710602754/) | 21 thread-state RLS failures; inserts omitted required user_id | Fixed in chat function without changing RLS |
| [FOLIO-MOBILE-3](https://all-ot.sentry.io/issues/7712717654/) | Two 401 errors from earlier browser checks | Supabase Auth logs report session_not_found after logout; requires fresh sign-in |
| [FOLIO-MOBILE-1](https://all-ot.sentry.io/issues/7708477300/) and [FOLIO-MOBILE-2](https://all-ot.sentry.io/issues/7712110389/) | Five native view-unmount crashes across two groups | Unresolved; latest inspected event is development build 13 on iPhone 15 Pro Max, iOS 27.0. Stack includes Reanimated operations. Missing Folio/React debug symbols prevent reliable source attribution. Do not infer that this is the chat dots issue. |
| [FOLIO-BACKEND-3](https://all-ot.sentry.io/issues/7708473878/) | Seven Recipe page not found errors | Needs a current reproduction and request-stage correlation; do not regenerate deleted recipes as a repair |
| [FOLIO-BACKEND-7](https://all-ot.sentry.io/issues/7709960092/) | One malformed model tool-argument JSON event | Existing validation rejects invalid tool arguments; monitor current prompt version for recurrence |
| [FOLIO-BACKEND-4](https://all-ot.sentry.io/issues/7708621136/), [5](https://all-ot.sentry.io/issues/7708621156/), [6](https://all-ot.sentry.io/issues/7708621224/) | Older missing-table schema-cache errors | Tables are present now; historical events are not proof of a current migration failure |

No Sentry issues were marked resolved. No replay, screenshots, or broader sensitive telemetry were enabled.

## Device verification still required

Reload the current development bundle (or install a build containing these client changes). On a device without AI consent, open recipe chat and submit a question: the consent disclosure must appear above chat. Declining must end the pending turn. Allowing must send one chat request. Then verify “Make this for two”, “What do I do first?”, “Done, next”, and “All the steps”; Stop must work even while waiting for the network.

For the native crashes, upload matching build-13 debug symbols if available, or reproduce on a new build with symbol upload confirmed. Preserve the exact navigation/animation trigger before changing Reanimated or reader view structure.
