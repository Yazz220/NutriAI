# External provider operations research

Date: 2026-09-02

This note audits Folio's external-service boundary and recommends a production setup sized for one Expo app and a Supabase backend. It is a recommendation, not an implementation plan.

## Executive recommendation

Use Sentry as Folio's first operational console. Add a small Folio-owned provider registry and one shared provider-call wrapper inside the Edge Functions. Do not build a custom dashboard first, run an OpenTelemetry collector, or add another AI proxy in front of OpenRouter.

The first useful version is:

1. Sentry React Native in the Expo app, with source maps and release context.
2. Sentry's Deno SDK around the external calls made by Supabase Edge Functions.
3. OpenRouter Broadcast to the same Sentry project with Privacy Mode enabled.
4. One authenticated `/ops/health` Edge Function backed by non-billable account and quota checks, monitored by Sentry Uptime.
5. A typed provider registry and error taxonomy used by OpenRouter, ElevenLabs, Supadata, RevenueCat, and future adapters.

This gives Folio one place to answer the important questions: which operation failed, which provider and model handled it, whether the cause was credentials, credits, a limit, provider availability, bad configuration, or Folio code, and which capture or generation request was affected.

Sentry has first-party Expo support, including its config plugin, Expo Router tracing, Expo Updates context, EAS integration, and source-map upload. [Sentry's Expo guide](https://docs.sentry.io/platforms/react-native/guides/expo/) Supabase documents the Sentry Deno SDK for Edge Function exceptions and performance data. [Supabase monitoring with Sentry](https://supabase.com/docs/guides/functions/examples/sentry-monitoring) OpenRouter can send its own traces directly to Sentry, and Privacy Mode removes prompts and completions while retaining model, cost, token, timing, and custom metadata. [OpenRouter Broadcast to Sentry](https://openrouter.ai/docs/guides/features/broadcast/sentry)

## Current Folio service map

| Service | Current responsibility | Current configuration |
| --- | --- | --- |
| Supabase | Auth, Postgres, Storage, Edge Functions, Cron, durable capture state | Project URL, anon key, service role, function deployments |
| OpenRouter | Recipe extraction, Folio chat, recipe-page image generation, default audio transcription route | `AI_API_BASE`, `AI_API_KEY`, `AI_MODEL`, `ART_MODEL`, `AUDIO_TRANSCRIPTION_MODEL` |
| OpenRouter upstream model providers | Actual Qwen and speech-to-text inference | Selected by OpenRouter routing and model availability |
| ElevenLabs | Direct-media speech-to-text for uploaded video | `VIDEO_TRANSCRIPTION_API_BASE`, key, and model |
| Supadata | Optional public social-video acquisition | Provider switch, API base, key, and platform allowlist |
| RevenueCat | Store entitlement synchronization and subscription webhooks | Public iOS SDK key plus server API and webhook secrets |

Folio already has several good pieces:

- `supabase/functions/_shared/log.ts` writes JSON logs.
- `recipe_captures` stores durable stage checkpoints, failure stage, failure code, and diagnostics.
- `generation_requests` stores idempotent page-generation state, a failure code, error text, and provider response metadata.
- The chat function is already written to store model, token counts, latency, and an error class in `nosh_agent_runs`, and a local migration defines that table. The production database does not currently contain the table or that migration, so chat trace writes are failing softly into logs rather than creating durable records.
- Model names and most endpoints already come from server-side environment variables.

The missing piece is a common operational contract. Chat and extraction use `_shared/openrouter.ts`, page art has a separate OpenRouter client, and transcription and acquisition each classify failures differently. `fetchRetry.ts` retries 429 and 5xx responses but does not honor `Retry-After`, preserve provider request IDs, or distinguish a transient provider failure from exhausted credits. The app-side analytics module is still a stub and Sentry is not installed.

The existing logs are JSON, but their metadata fields vary by call site. OpenTelemetry's logging guidance makes the relevant distinction: JSON alone does not make a log structurally reliable. Production logs need a stable field schema that downstream tools can filter without custom parsing. [OpenTelemetry logs](https://opentelemetry.io/docs/concepts/signals/logs/)

## The provider boundary Folio needs

### One registry, no runtime secrets in it

Create a server-only registry with one entry per provider and operation. It should describe configuration, never contain a secret value.

```ts
type ProviderOperation =
  | 'recipe_extraction'
  | 'assistant_chat'
  | 'page_art'
  | 'audio_transcription'
  | 'video_transcription'
  | 'social_video_acquisition'
  | 'subscription_sync';

type ProviderDefinition = {
  id: 'openrouter' | 'elevenlabs' | 'supadata' | 'revenuecat';
  operation: ProviderOperation;
  baseUrlEnv: string;
  credentialEnv: string;
  modelEnv?: string;
  timeoutMs: number;
  retryPolicy: 'none' | 'transient_only';
  statusUrl: string;
  consoleUrl: string;
};
```

Keep the registry in code and resolve values from Supabase secrets at function start. That makes changes reviewable and deployable. A remote admin switch for arbitrary models would bypass Folio's ingestion and art-quality evaluation gates, so it is the wrong first version. A later admin view can show registry state without editing it.

Separate production OpenRouter keys by workload, at minimum extraction and chat versus page art. OpenRouter keys support configured credit limits, and `GET /api/v1/key` reports usage, remaining limit, reset period, and expiry for the current key. [OpenRouter current-key API](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-key) Separate keys make a runaway workload visible and stop one workload from silently consuming every other workload's budget.

### One error taxonomy

Every adapter should return a Folio-owned error category while retaining the provider's code and request ID for debugging.

| Folio category | Typical evidence | Retry policy |
| --- | --- | --- |
| `configuration` | Missing model, endpoint, or secret | Never retry; alert immediately |
| `authentication` | 401, invalid or revoked key | Never retry; alert immediately |
| `quota` | 402, credit or plan limit exhausted | Never retry; alert immediately |
| `permission` | 403, key scope or policy rejection | Never retry automatically |
| `rate_limit` | 429 and provider limit code | Honor `Retry-After`, then bounded retry |
| `timeout` | Abort or 408 | Bounded retry if the operation is idempotent |
| `provider_unavailable` | 502, 503, upstream overload | Same-model provider fallback or bounded retry |
| `invalid_request` | 400, unsupported parameter, context limit | Fix configuration or request; do not retry unchanged |
| `invalid_response` | Empty image, malformed JSON, schema failure | Retry only under an operation-specific policy |
| `application` | Database, storage, publication, or invariant failure | Handle as Folio code, not a provider outage |

OpenRouter now exposes stable `error_type` values that distinguish authentication, payment, rate limiting, overload, unavailability, timeout, validation, and server failures. A request may also return HTTP 200 and carry an error body if the failure happens after headers have been committed, so Folio must inspect the body as well as `response.ok`. [OpenRouter errors and debugging](https://openrouter.ai/docs/api/reference/errors-and-debugging) ElevenLabs returns typed errors with a provider request ID and separates insufficient credits, authentication, rate limits, concurrency, and service availability. [ElevenLabs errors](https://elevenlabs.io/docs/eleven-api/resources/errors) Supadata publishes its own typed codes for unauthorized access, plan upgrades, limits, and internal errors. [Supadata error reference](https://docs.supadata.ai/errors/list)

Do not expose provider diagnostics directly to users. Store the stable Folio failure code on the capture, send provider detail to Sentry, and keep user copy actionable.

### One provider-call event

Emit one event when an external attempt finishes. The minimum fields are:

```text
event_name, environment, release, edge_function, edge_deployment_id
trace_id, folio_request_id, capture_id, generation_request_id
provider, operation, requested_model, actual_model, actual_upstream
attempt, outcome, http_status, error_category, provider_error_code
provider_request_id, retryable, latency_ms, input_units, output_units, cost_usd
```

Do not include recipe titles, source URLs, raw prompts, media, transcript text, authorization headers, email addresses, or raw user IDs. Use an internal request ID for correlation. Sentry recommends `beforeSend` and `beforeSendTransaction` when an app needs to remove sensitive fields before events leave the device. [Sentry sensitive-data guidance](https://docs.sentry.io/platforms/react-native/guides/expo/data-management/sensitive-data/)

For OpenRouter, send `X-OpenRouter-Metadata: enabled` and retain `X-Generation-Id`. Router metadata can report the requested and actual model, selected provider, region, eligible endpoints, attempt count, and fallback history. The generation endpoint can retrieve request, usage, cost, provider, model, and latency metadata by generation ID. [OpenRouter router metadata](https://openrouter.ai/docs/guides/features/router-metadata) [OpenRouter generation metadata](https://openrouter.ai/docs/api/api-reference/generations/get-generation)

## Sentry and Supabase setup

Use two Sentry projects under one organization:

- `folio-mobile` for Expo crashes, unhandled promise rejections, route performance, release, build, and OTA update context.
- `folio-backend` for Edge Function failures, provider-call spans, and OpenRouter Broadcast traces.

Keep `sendDefaultPii` off. Upload JavaScript source maps through the Expo config and Metro plugins, and store the Sentry auth token as an EAS secret rather than committing it. [Sentry Expo source maps](https://docs.sentry.io/platforms/react-native/guides/expo/sourcemaps/uploading/expo/) Use low trace sampling in production, with full sampling for failed provider calls and the capture-generation path.

Supabase's Sentry example has an Edge-specific warning. The Deno SDK does not provide request scope separation for `Deno.serve`, and reused isolates can share global breadcrumbs or context. Disable default integrations and use `withScope`, or pass context directly on every captured exception. Flush events before the function exits. [Supabase monitoring with Sentry](https://supabase.com/docs/guides/functions/examples/sentry-monitoring)

Supabase already exposes invocation status, response metadata, execution duration, uncaught exceptions, and custom logs in the Functions dashboard. [Supabase Edge Function logging](https://supabase.com/docs/guides/functions/logging) Use those logs as the platform-level source during the first phase. A Supabase Log Drain can later send Auth, Postgres, Storage, and Edge Function logs to Sentry, but it is a paid Pro, Team, or Enterprise add-on and currently carries a per-drain hourly charge plus event and egress charges. [Supabase log drains](https://supabase.com/docs/guides/monitoring-and-debugging/log-drains) [Supabase log-drain usage](https://supabase.com/docs/guides/platform/manage-your-usage/log-drains) That is useful after launch volume warrants centralized infrastructure logs, not a launch prerequisite.

Sentry supports issue, metric, cron, and uptime monitors, plus email, Slack, PagerDuty, and webhook actions. [Sentry monitors and alerts](https://docs.sentry.io/product/monitors-and-alerts/) Every plan includes one uptime monitor and one cron monitor, which is enough for the first health endpoint and scheduled quota audit. [Sentry pricing](https://docs.sentry.io/pricing/)

## Health and quota checks

Add one authenticated Edge Function that returns a redacted operational snapshot. It should not run paid inference.

```json
{
  "status": "degraded",
  "checkedAt": "2026-09-02T12:00:00Z",
  "services": [
    {
      "provider": "openrouter",
      "operation": "page_art",
      "configured": true,
      "model": "qwen/qwen-image-3-pro",
      "credential": "valid",
      "quota": "critical",
      "lastSuccessAt": "...",
      "lastFailureCategory": "quota"
    }
  ]
}
```

The scheduled check can use provider-owned, non-inference endpoints:

- OpenRouter `GET /api/v1/key` for current-key usage and remaining limit. [OpenRouter current-key API](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-key)
- Supadata `GET /me` for plan, maximum credits, and used credits. [Supadata account API](https://docs.supadata.ai/api-reference/endpoint/account/me)
- ElevenLabs `GET /v1/user/subscription` for subscription and usage state. [ElevenLabs subscription API](https://elevenlabs.io/docs/api-reference/user/subscription/get)
- RevenueCat's project and webhook configuration APIs for configuration checks. Product entitlement correctness should continue to come from Folio's signed webhook audit and sync records. [RevenueCat API v2](https://www.revenuecat.com/docs/api-v2/integration)

Run the quota audit hourly or daily through Supabase Cron. Supabase Cron can invoke an Edge Function and records each run in `cron.job_run_details`. [Supabase scheduled Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions) Send a Sentry Cron check-in for each run. Alert when a credential check fails, a quota crosses a warning threshold, or no check-in arrives.

The uptime monitor should call a cheap Folio endpoint that verifies Edge reachability and a trivial database read. It should not generate a recipe or image. Synthetic paid generation would spend money, create cleanup work, and can mask an application failure behind a provider success.

## Fallback policy

Provider fallback and model fallback are different decisions.

For extraction and chat, allow same-model provider fallback through OpenRouter. Cross-model fallback is acceptable only between models that pass Folio's relevant eval suite. OpenRouter's routing object supports provider order, fallback control, required-parameter filtering, retention restrictions, and latency or throughput preferences. [OpenRouter provider routing](https://openrouter.ai/docs/guides/routing/provider-selection) Its cross-model fallback can trigger for context errors and moderation as well as downtime, so Folio should not enable an unreviewed list globally. [OpenRouter model fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks)

For page art, keep quality and style consistency ahead of silent availability. As checked on 2026-09-02, OpenRouter lists only Alibaba Cloud International for `qwen/qwen-image-3-pro`, so same-model provider fallback cannot protect this operation. [OpenRouter Qwen Image 3 Pro endpoints](https://openrouter.ai/api/v1/images/models/qwen/qwen-image-3-pro/endpoints) Folio needs an eval-approved second image model and a recorded model version before it can offer real art fallback. Until then, fail with a retryable provider-unavailable state instead of silently generating a visually different page.

Never fall back for authentication, permission, quota, invalid-request, or deterministic Folio validation failures. Retrying those spends time and can duplicate billable work. Honor provider `Retry-After` where supplied, and avoid stacking Folio retries on top of OpenRouter's own provider retry unless the operation and idempotency record make the second request safe.

## Tool decision

| Option | What it adds | Decision for Folio now |
| --- | --- | --- |
| Sentry | Expo crashes and releases, Deno exceptions, spans, alerts, uptime, cron, OpenRouter OTLP traces | Adopt first |
| Supabase Logs Explorer | Edge invocation duration, response status, runtime logs, database and auth logs | Keep as the platform diagnostic source |
| Hosted Langfuse | LLM traces, prompt comparison, sessions, cost analysis, evaluations | Revisit when prompt and model evaluation needs outgrow Sentry |
| Helicone | AI gateway, proxy, retries, limits, caching, and LLM observability | Do not place it in front of OpenRouter now; that adds another gateway and failure point |
| OpenTelemetry collector | Vendor-neutral trace and metric export | Preserve compatible trace IDs and fields, but do not operate a collector yet |
| Better Stack or Checkly | External uptime and API checks | Unnecessary while Sentry's included uptime monitor covers the single launch endpoint |
| Custom admin dashboard | Product-specific operational summary | Add a read-only view later if Sentry plus the health JSON is insufficient |

OpenTelemetry JavaScript marks traces and metrics stable, but logs remain in development and browser instrumentation is experimental. [OpenTelemetry JavaScript status](https://opentelemetry.io/docs/languages/js/) A collector would add deployment, storage, export, and dashboard work without solving a launch problem that Sentry already covers.

Langfuse is a reasonable second tool. OpenRouter can broadcast traces to it without adding application instrumentation, and Langfuse focuses on LLM traces and evaluations. [OpenRouter Broadcast to Langfuse](https://openrouter.ai/docs/guides/features/broadcast/langfuse) Folio should add it only when model-quality analysis needs prompt-level traces. Metadata-only Sentry traces are enough for the stated operational problem.

## Suggested rollout

### Launch baseline

- Add Sentry to Expo and the Edge Function shared boundary.
- Replace the analytics stubs with Sentry capture and release tagging.
- Add the provider registry, typed errors, correlation IDs, OpenRouter metadata, and generation IDs.
- Split OpenRouter keys by workload and set limits.
- Enable OpenRouter Broadcast to Sentry in Privacy Mode.
- Add alerts for `configuration`, `authentication`, and `quota` immediately; alert on transient failures only after a short rate threshold.

### Before public launch

- Add the authenticated health endpoint and scheduled quota audit.
- Add one Sentry uptime monitor and one cron monitor.
- Add an operations runbook that links each category to the provider status, billing, key, and model pages.
- Verify telemetry redaction with real image, URL, audio, video, chat, purchase, and retry flows.
- Record provider, actual model, generation ID, latency, and cost on every paid AI operation.

### After usage justifies it

- Add a read-only admin screen over aggregate health snapshots, not raw traces.
- Add Supabase Log Drains if cross-service log search saves enough investigation time to justify the add-on.
- Add Langfuse for prompt, quality, and evaluation workflows.
- Promote a second image model only after the page-style corpus passes.

## Acceptance test for the incident that prompted this audit

The next exhausted-credit incident should produce all of the following within one request:

1. The capture stores `failed_stage = page_generation` and a stable user recovery code.
2. The provider event identifies `openrouter`, `page_art`, the requested model, HTTP 402, and `error_category = quota`.
3. Sentry groups and alerts the quota failure without storing the recipe title, prompt, or user source.
4. The event links to the Folio generation request and retains the OpenRouter generation ID when available.
5. The health snapshot shows page art as degraded and reports the affected key's remaining limit.
6. Retrying is disabled or delayed until quota health recovers, so the app does not make repeated requests that cannot succeed.

That is the operational standard Folio needs. The provider dashboard remains useful evidence, but it stops being the first place anyone has to guess.
