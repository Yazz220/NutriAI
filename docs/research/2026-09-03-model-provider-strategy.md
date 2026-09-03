# AI model and provider strategy

Date: 2026-09-03

This note reviews Folio's current AI workloads and recommends a launch model lineup. It uses provider documentation and live provider catalogs as primary sources. Prices and live routing measurements are a point-in-time snapshot; Folio's own evaluation corpus must decide quality.

## Executive recommendation

Do not consolidate Folio onto one universal model. Consolidate the interfaces and configuration, not the workloads themselves.

The smallest credible launch stack is:

| Workload | Recommended launch model and provider | Decision |
| --- | --- | --- |
| Recipe extraction from unstructured text, images, frames, and video evidence | `qwen/qwen3.6-35b-a3b` through OpenRouter | Keep. It already supports Folio's text, image, and video inputs, tool calling, and strict JSON Schema output. OpenRouter currently lists ten upstream providers for the model. |
| Chat with Folio and tool calling | `qwen/qwen3.6-35b-a3b` through OpenRouter | Keep for launch, but configure it separately from extraction. It is inexpensive, already integrated, and currently has broad upstream availability. Evaluate `z-ai/glm-5.3-flash` as the first challenger, not as an immediate replacement. |
| Audio and video speech-to-text | `mistralai/voxtral-small-24b-2507-stt` through OpenRouter | Consolidate speech on the same gateway as extraction, chat, and page art. Keep the durable transcript checkpoint and video frame evidence; monitor the single current Voxtral route closely. |
| Recipe-page image generation | `qwen/qwen-image-3-pro` through OpenRouter | Keep. It is unusually well matched to complex page layouts, small text, 2K output, and multiple visual references. Test `google/gemini-3.1-flash-image` as the first alternate. |
| Public social-video acquisition | Supadata, only when enabled | Keep separate. This is content acquisition, not model inference; a smarter multimodal model cannot replace platform access. |

In practical terms, this is one model gateway, OpenRouter, plus one optional acquisition service, Supadata. OpenRouter hides most upstream-provider churn while Folio retains separate workload contracts and models instead of forcing every job through one universal model.

The first implementation change should be configuration separation rather than a model swap:

- `EXTRACTION_MODEL=qwen/qwen3.6-35b-a3b`
- `CHAT_MODEL=qwen/qwen3.6-35b-a3b`
- `VIDEO_UNDERSTANDING_MODEL=qwen/qwen3.6-35b-a3b`
- `TRANSCRIPTION_MODEL=mistralai/voxtral-small-24b-2507-stt`
- `ART_MODEL=qwen/qwen-image-3-pro`

Today both extraction and chat read the server secret `AI_MODEL`. That couples a strict-schema batch-like workload to a streamed tool-using conversation. If `AI_MODEL` is present, it also overrides chat's default `:exacto` suffix. Independent settings let Folio test or roll back one workload without changing the other.

## Current implementation

Folio already has a sensible workload boundary:

- Structured recipe pages with schema.org Recipe JSON-LD or Microdata are normalized deterministically and do not consume a model call.
- `extract-recipe` sends unstructured text, images, sampled video frames, transcripts, or whole-video evidence to OpenRouter. It requests a strict JSON Schema, uses `temperature: 0.1`, and currently defaults to `qwen/qwen3.6-35b-a3b`.
- `nosh-chat` streams tool calls through OpenRouter and defaults to `qwen/qwen3.6-35b-a3b:exacto` only when the shared `AI_MODEL` secret is absent.
- `capture-recipe` sends both ordinary audio and the audio track of bounded video sources to OpenRouter's transcription endpoint with `mistralai/voxtral-small-24b-2507-stt`; successful transcripts remain durable checkpoints for extraction retries.
- `generate-page-art` sends the complete recipe page, including its visible recipe copy, to `qwen/qwen-image-3-pro` through OpenRouter's image endpoint. It can attach four visual references and allows up to 140 seconds for generation.
- Model and parser changes already have the right release gate: the versioned extraction corpus under `supabase/functions/extract-recipe/evals/`.

The main problems are therefore not excessive model count. They are configuration coupling, inconsistent provider policies, a split speech path, and an image artifact that asks a generative image model to reproduce safety-critical quantities and instructions exactly.

## Workload 1: recipe understanding and strict extraction

### Launch choice: keep Qwen3.6 35B A3B

Alibaba describes `qwen3.6-35b-a3b` as a native vision-language model accepting text, images, and video, with function calling and structured outputs. Its direct service exposes a 262,144-token context window and 65,536-token maximum output. [Alibaba model card](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-6-35b-a3b)

OpenRouter currently exposes the same model as `qwen/qwen3.6-35b-a3b`. It advertises JSON-schema structured output, tool calling, ten upstream providers, and automatic failover. Listed provider prices currently range from about $0.05-$0.25 per million input tokens and $0.70-$1.60 per million output tokens. The fastest listed provider snapshot shows 0.40-second median time to first token and 156 tokens per second, but these are rolling observations, not an SLA. [OpenRouter Qwen3.6 35B A3B](https://openrouter.ai/qwen/qwen3.6-35b-a3b)

This model fits Folio better than its benchmark marketing suggests because the deciding capabilities are concrete:

- it accepts every non-audio evidence type already used by the extraction function;
- OpenRouter exposes server-enforced JSON Schema support for it;
- ten upstream implementations give same-model failover without changing extraction behavior;
- it is already integrated and has been exercised against Folio's corpus;
- its context limit is far above Folio's bounded recipe evidence.

There is no evidence that Folio needs a larger reasoning model for routine normalization. The difficult part is faithful evidence handling: not inventing missing quantities, preserving steps, distinguishing a recipe from commentary, and returning exactly the expected schema. General reasoning or coding leaderboards do not measure those failure modes.

### Closest alternatives

| Model | Relevant capabilities | Current standard price | Provider/routing position | Folio assessment |
| --- | --- | --- | --- | --- |
| Qwen3.6 35B A3B | Text, image, video; tools; strict JSON Schema; 262K context | OpenRouter providers currently start near $0.05/M input and $0.70/M output | Ten OpenRouter providers | Best launch default. |
| GLM-5.3-Flash | Text, image, video, files; tools; JSON output; 1M context; always-on thinking | $0.15/M input, $0.03/M cached input, $0.50/M output; 50% promotion ends September 9, 2026 | 23 OpenRouter providers | Strong low-cost challenger, but OpenRouter currently states that its `response_format` does not enforce a JSON schema. That is a material regression for extraction. |
| Gemini 3.5 Flash-Lite | Text, image, video, audio, PDF; tools; structured output; 1M context | $0.30/M input, $2.50/M output; batch/flex $0.15/$1.25 | Google-operated service; available through OpenRouter as well | Best one-model consolidation candidate, but materially more expensive and does not remove the value of a reusable speech checkpoint. |
| Gemini 3.8 Flash | Text, image, video, audio, PDF; tools; structured output; 1M context; adjustable thinking | Promotional $0.75/M input and $3.75/M output through 2026, then $1.50/$7.50 | Google-operated service; released September 2, 2026 | The newest high-capability Flash option, but Google positions it for long-horizon software engineering, agents, and complex enterprise work. It is new and unnecessarily expensive for routine recipe extraction. Reserve it as a quality fallback candidate. |
| GPT-5.4 nano | Text and image; tools; structured output; 400K context | $0.20/M input, $1.25/M output | OpenAI direct and gateways | Plausible text/image fallback, but no audio or video input and no clear advantage over the current model for Folio. |
| Claude Haiku 4.5 | Text and image; tools; 200K context | $1/M input, $5/M output | Anthropic direct and gateways | Fast, but much more expensive and does not cover video or audio. Not justified without a decisive corpus win. |

Sources: [Z.AI GLM-5.3-Flash](https://docs.z.ai/guides/vlm/glm-5.3-flash), [Z.AI pricing](https://docs.z.ai/guides/overview/pricing), [OpenRouter GLM-5.3-Flash](https://openrouter.ai/z-ai/glm-5.3-flash), [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), [Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [GPT-5.4 nano](https://developers.openai.com/api/docs/models/gpt-5.4-nano), [Claude model overview](https://platform.claude.com/docs/en/models/overview).

### GLM naming and decision

The exact official name is **GLM-5.3-Flash**, model code `glm-5.3-flash`, and OpenRouter slug `z-ai/glm-5.3-flash`. It is not “GLM Flash 5.3.” Z.AI released it on August 26, 2026. It accepts video, image, text, and files, returns text, exposes a 1M context window and 128K output, and supports function calling, JSON output, streaming, and context caching. Its thinking mode cannot be disabled; Z.AI recommends maximum reasoning effort. [Z.AI model documentation](https://docs.z.ai/guides/vlm/glm-5.3-flash)

The economics are real but easy to overstate. The current $0.075/M input and $0.25/M output prices are a temporary 50% promotion ending September 9, 2026. List pricing is $0.15/M input and $0.50/M output. [Z.AI pricing](https://docs.z.ai/guides/overview/pricing)

OpenRouter lists 23 providers and currently shows a best-provider median time to first token of roughly 0.40 seconds and 91 tokens per second. It also explicitly says that GLM's `response_format` supports JSON output without JSON-schema enforcement. [OpenRouter model page](https://openrouter.ai/z-ai/glm-5.3-flash)

Recommendation: add GLM-5.3-Flash to the extraction corpus and chat tool suite, but do not promote it directly to extraction while strict schema enforcement is absent. Its 1M context is not useful for bounded recipe evidence, and always-on thinking may add needless latency and output tokens. Its official benchmarks are dominated by coding, software agents, and office automation, so they do not settle recipe fidelity.

### Cost perspective

At illustrative traffic of 10,000 input tokens and 1,000 output tokens per extraction, using current list or lowest listed rates:

| Model | Approximate model cost per extraction |
| --- | ---: |
| Qwen3.6 35B A3B | $0.0012 |
| GLM-5.3-Flash, list price | $0.0020 |
| GLM-5.3-Flash, temporary promotion | $0.0010 |
| GPT-5.4 nano | $0.00325 |
| Gemini 3.5 Flash-Lite | $0.0055 |

These are examples, not measured Folio costs. Image inputs may be billed differently, gateway/provider prices vary, and reasoning tokens may increase output charges. They show the useful strategic point: changing the extraction model saves fractions of a cent, while one generated page image costs several cents. Cost work should prioritize first-pass page generation success, retries, and media acquisition before chasing tiny text-token savings.

## Workload 2: Chat with Folio and tool calling

### Launch choice: keep Qwen, separate the configuration

Chat is not the same workload as extraction. It needs low time to first token, reliable tool selection, concise natural language, conversation context, and stable streaming. It does not need schema-perfect RecipeGraph output because tool parameters already provide the action boundary.

Keep Qwen3.6 35B A3B for launch because it is already integrated, inexpensive, supports tools, and has broad same-model failover. Give chat its own `CHAT_MODEL` and provider policy so it can evolve without changing extraction.

Evaluate GLM-5.3-Flash as the first challenger. Its 23 OpenRouter providers and $0.50/M list output price are attractive, and the official model supports function calling. The concerns are its very recent release, always-on thinking, lower currently observed best-provider throughput than Qwen, and the absence of a Folio-specific tool-use evaluation. The temporary discount should not influence a launch architecture.

OpenRouter now applies Auto Exacto routing by default to tool-calling traffic, using provider throughput and tool-call success signals. That makes the explicit `:exacto` model suffix less important than it was. Folio should configure tool-capable routing on the request and log the actual provider/model, rather than rely on a hidden default that disappears when `AI_MODEL` is set. [OpenRouter Auto Exacto](https://openrouter.ai/docs/guides/routing/auto-exacto)

An illustrative context-rich chat turn with 6,000 input tokens and 800 output tokens costs about $0.00086 on Qwen at the currently listed floor, $0.00130 on GLM at list price, $0.00220 on GPT-5.4 nano, or $0.00380 on Gemini 3.5 Flash-Lite. The difference is operationally small. Tool correctness and latency should decide.

### Chat promotion gate

Before switching, run a focused conversation suite covering:

- `start_recipe_capture` with explicit and inferred cookbook destination;
- collection retrieval and page navigation;
- organization, move, regenerate, and edit actions;
- timer and walkthrough behavior;
- ambiguous user intent where the assistant must ask rather than act;
- long conversations with active cookbook and page context;
- cancellation and streamed tool-call argument assembly.

Record tool-name accuracy, argument validity, unnecessary-tool rate, user-visible response quality, median and p95 first-token latency, total latency, and total cost. Run each case more than once because routed open models and sampling introduce variance.

## Workload 3: audio, video, and multimodal input

### Launch choice: Voxtral Small STT through OpenRouter

Folio should keep speech-to-text as a separate checkpoint. A transcript is reusable across extraction retries and lets the multimodal model reason over speech, sampled frames, and whole-video evidence without retranscribing every attempt.

Use `mistralai/voxtral-small-24b-2507-stt` through OpenRouter's dedicated `/audio/transcriptions` endpoint for both ordinary audio and bounded video uploads. The model is priced by audio duration at $0.00005 per second, or $0.18 per hour. The endpoint supports base64 JSON for ordinary audio and multipart uploads for larger media, so Folio can preserve its bounded-memory contracts. [OpenRouter audio transcription](https://openrouter.ai/docs/api/reference/audio-transcriptions) [Voxtral Small STT](https://openrouter.ai/mistralai/voxtral-small-24b-2507-stt)

This is cheaper than the previously proposed specialist route and removes a credential and provider contract. A live Folio fixture successfully returned a correct transcript through both the standard route and OpenRouter's zero-data-retention policy. The current catalog exposes only one upstream Voxtral route, however, so Sentry must distinguish provider unavailability and quota errors and the release corpus must remain the quality gate.

This is a small but clean simplification:

- previous audio: OpenRouter-compatible Whisper adapter;
- previous video: direct ElevenLabs adapter;
- implemented audio and video: one OpenRouter transcription contract and one Voxtral model setting.

The adapter remains model-configurable through `TRANSCRIPTION_MODEL`, `TRANSCRIPTION_API_BASE`, and `TRANSCRIPTION_API_KEY`. That is the rollback seam: changing the deployed setting can select another compatible transcription model or endpoint without changing capture orchestration.

### Speech alternatives

| Service | Price | Strengths | Why it is not the launch default |
| --- | ---: | --- | --- |
| OpenRouter Voxtral Small STT | $0.003/min | One gateway and credential, JSON and multipart transcription contracts, ZDR-capable current route | Implemented default; monitor single-route availability and validate video containers. |
| ElevenLabs Scribe v2 | $0.00367/min | Major audio/video containers, 90+ languages, timestamps, diarization, keyterms | Viable specialist fallback, but adds another provider and credential. |
| OpenAI GPT-Transcribe | $0.0045/min | High-accuracy recorded speech, multilingual/code-switching, hints, MP4/M4A/WebM and common audio containers | Good fallback if OpenAI becomes a core provider, but slightly higher cost and another direct provider contract. [Model](https://developers.openai.com/api/docs/models/gpt-transcribe) [Speech guide](https://developers.openai.com/api/docs/guides/speech-to-text) |
| Gemini 3.5 Transcribe | About $0.005/min blended | 85+ locales, code switching, 1,000-term vocabulary, timestamps, diarization, smart formatting | Its documented upload formats are audio types rather than Folio's full video-container set, so it does not simplify the current video adapter. [Gemini transcription](https://ai.google.dev/gemini-api/docs/transcribe) [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Groq Whisper Large v3 Turbo | $0.00067/min | Officially reports 216x real-time and 99+ languages | Excellent cost floor, but adds a provider and must prove culinary vocabulary and multilingual accuracy on Folio's corpus. [Groq speech-to-text](https://console.groq.com/docs/speech-to-text) |
| Deepgram Nova-3 | $0.0043/min monolingual, $0.0052/min multilingual | Mature streaming and prerecorded STT, keyterms and formatting | No clear advantage for Folio's bounded uploads; revisit only if live voice becomes a core interaction. [Deepgram pricing](https://deepgram.com/pricing) |

Accepting a video container for speech-to-text does not mean visual video understanding. Folio should retain sampled frames and whole-video evidence for on-screen quantities, ingredient labels, and silent cooking steps.

Gemini 3.5 Flash-Lite can accept audio and video directly in the extraction call, but using it as both transcription and reasoning would make every retry pay to reinterpret the media and would discard the durable transcript checkpoint. Provider consolidation is not worth that reliability regression.

Provider-reported speech benchmarks are not directly comparable. Folio should compare services on the same recordings and track numeric/measurement errors and culinary-term errors separately from ordinary word error rate.

## Workload 4: complete recipe-page image generation

### Launch choice: keep Qwen Image 3 Pro

Alibaba's direct model ID is `qwen-image-3.0-pro`; OpenRouter exposes it as `qwen/qwen-image-3-pro`. Alibaba specifically recommends it for complex layouts such as newspapers, storyboards, menus, and exam papers, and claims accurate small-text rendering down to 10 pixels, multilingual fonts, and up to 2048x2048 output. [Alibaba image-model guide](https://www.alibabacloud.com/help/en/model-studio/image-model)

On OpenRouter it costs $0.04 for 1K output or $0.075 for 2K output, plus $0.003 per input image. It accepts up to four reference images. A 2K Folio page with four style references is therefore about $0.087 before retry effects. [OpenRouter Qwen Image 3 Pro](https://openrouter.ai/qwen/qwen-image-3-pro)

The current operational weakness is availability: OpenRouter presently lists one upstream route, Alibaba Cloud International, for this image model. The current page reports a rolling median end-to-end latency near 64 seconds and rolling availability below the text-model routes. Those values change over time and are not an SLA, but they explain why page generation dominates perceived latency and why same-model failover is unavailable.

Alibaba's direct API says thinking improves image quality but increases generation time. Folio should measure whether the OpenRouter route exposes a controllable equivalent and whether disabling it preserves page quality; do not assume a faster setting is free. [Qwen Image 3.0 API reference](https://www.alibabacloud.com/help/en/model-studio/qwen-image-generation-and-editing-api-reference)

### Image challengers

| Model | Price and capability | Folio assessment |
| --- | --- | --- |
| Gemini 3.1 Flash Image (`gemini-3.1-flash-image`) | $0.067 at 1K, $0.101 at 2K, $0.151 at 4K; 1K/2K/4K output; advanced text rendering and substantial reference-image support | Best first alternate. More expensive than Qwen at 2K but offers another model/provider path. Test layout, exact copy, style anchors, and p95 latency. [Gemini image guide](https://ai.google.dev/gemini-api/docs/image-generation) [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Ideogram 4.0 Quality | $0.10 for 2K; typography-oriented generation and structured JSON layouts | Promising for headers and short labels, but Ideogram's own guidance recommends short literal strings and reports lower accuracy for small text. A full recipe page is a much harder target. [Ideogram 4.0](https://ideogram.ai/models/4.0) [Ideogram text guidance](https://ideogram.ai/blog/ideogram-4-json-prompting/) |
| OpenAI GPT Image 2 | Generation and editing with high-fidelity input support and Folio-compatible portrait sizes | Worth testing only if OpenAI becomes a core provider. OpenAI documents that complex prompts can take up to two minutes and that precise text placement and layout-sensitive composition can still fail. [GPT Image 2](https://developers.openai.com/api/docs/models/gpt-image-2) [Image guide](https://developers.openai.com/api/docs/guides/image-generation) |
| FLUX.2 Flex | Typography-oriented generation, up to ten references, up to 4MP; family advertises sub-10-second generation | Interesting latency challenger, but there is no official dense-copy accuracy result strong enough to displace Qwen. [FLUX.2](https://bfl.ai/models/flux-2) [BFL pricing](https://docs.bfl.ai/quick_start/pricing) |

### The model-independent correctness issue

No image generator offers a contractual guarantee that hundreds of words, temperatures, times, fractions, and units will be reproduced exactly. This matters more than which image model wins an aesthetics benchmark.

The canonical `RecipeGraph` should remain the authority. The safest long-term architecture is to generate the visual composition and illustration, then lay out exact recipe text deterministically. If Folio retains fully rasterized generated pages, publication should at least OCR-check title, ingredient quantities and units, temperatures, times, and step order against the canonical graph. A page with a critical mismatch should retry or require attention rather than publish.

The page-art bakeoff should measure:

- character accuracy for all visible recipe copy;
- exact quantity, unit, temperature, and time accuracy;
- omitted, duplicated, or reordered ingredients and steps;
- reference-style fidelity and 4:5 composition;
- first-pass success, retry rate, p50/p95 generation time, and total ready-page cost.

General image preference leaderboards are not enough for this product.

## Provider and routing policy

Keep OpenRouter as the gateway for chat, extraction, and page art. It lets Folio change models without changing endpoint contracts and provides same-model provider failover for widely hosted models. Its default router load-balances across providers; `allow_fallbacks`, `require_parameters`, `data_collection`, `zdr`, provider order, and latency/throughput preferences are configurable. [OpenRouter provider routing](https://openrouter.ai/docs/guides/routing/provider-selection)

For private recipe inputs, the target request policy should be:

```json
{
  "provider": {
    "require_parameters": true,
    "allow_fallbacks": true,
    "data_collection": "deny",
    "zdr": true
  }
}
```

Folio currently sends only `require_parameters: true`. The shared request type does not expose the remaining routing fields. Adding them would prevent a routed provider from silently dropping structured-output or tool parameters and would restrict traffic to providers that do not retain user data. OpenRouter documents prompt retention as opt-in at its own layer, but upstream provider policies differ, so explicit routing constraints are still necessary. [OpenRouter data collection](https://openrouter.ai/docs/guides/privacy/data-collection) [OpenRouter zero data retention](https://openrouter.ai/docs/guides/features/zdr)

Use provider failover before model failover:

1. Same model, another healthy upstream provider.
2. Bounded retry for a transient timeout, rate limit, or provider-unavailable error.
3. Cross-model fallback only to a model that passed the same Folio workload gate.

Do not silently cross-model fallback on a semantic rejection, incomplete recipe, schema-quality failure, or safety decision. A different model can change user-visible behavior and may convert a valid needs-attention result into an invented recipe. OpenRouter's model fallback can trigger on rate limits, downtime, moderation, and other errors, so Folio should classify errors before deciding whether a cross-model retry is safe. [OpenRouter model fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks)

Maintain a healthy OpenRouter balance and separate key limits by workload. OpenRouter states that low balances and keys close to their credit limit cause more billing checks and added latency, and recommends a $10-$20 minimum balance. That is directly relevant to Folio's recent provider-credit incident. [OpenRouter latency guidance](https://openrouter.ai/docs/guides/best-practices/latency-and-performance)

## Configuration and release plan

### Phase 1: make current choices explicit

1. Split `AI_MODEL` into workload-specific server secrets while preserving old values as deployment migration defaults.
2. Add a provider registry containing requested model, fallback model, capabilities required, timeout, retention policy, and expected cost unit for each workload.
3. Extend the OpenRouter provider request policy with `data_collection: "deny"`, `zdr: true`, and explicit fallback behavior.
4. Record requested model, actual model, upstream provider, latency, token/image/audio units, cost, and fallback attempt through the Sentry/provider observability layer.
5. Keep model selection server-side. The `EXPO_PUBLIC_*_MODEL` variables should not be the authority for production inference.

### Phase 2: remove one unnecessary split

1. Point ordinary audio and bounded video transcription at OpenRouter's transcription endpoint and `mistralai/voxtral-small-24b-2507-stt`.
2. Run the audio and video fixture set, including Arabic/English code switching, noisy kitchen audio, ingredient names, fractions, temperatures, and silent on-screen instructions.
3. Keep the model/base/key settings provider-neutral so another OpenAI-compatible transcription route can be selected without changing the capture state machine.

### Phase 3: evaluate challengers without destabilizing launch

1. Run Qwen3.6 and GLM-5.3-Flash through the extraction corpus at least three times per non-deterministic case.
2. Add a dedicated chat/tool suite and compare Qwen3.6 with GLM-5.3-Flash.
3. Run Qwen Image 3 Pro against Gemini 3.1 Flash Image on the page-art corpus.
4. Promote only one workload at a time. Store the model and prompt version on every output so rollback and comparison remain possible.

Suggested promotion requirements:

- 100% valid output schema for extraction;
- no increase in fabricated critical fields or false acceptance of incomplete sources;
- no regression in quantity, unit, temperature, allergen, or step fidelity;
- equal or better tool-call accuracy with no increase in unnecessary actions;
- equal or better first-pass page-art correctness;
- acceptable p95 latency and lower total successful-operation cost, including retries.

## Final decision

Folio does not need a frontier reasoning model, and it does not benefit from a single provider handling every modality. The existing OpenRouter/Qwen direction is already close to the right shape.

For launch:

- keep Qwen3.6 35B A3B for extraction and chat, but decouple their configuration;
- use OpenRouter's provider routing deliberately and with strict privacy/capability filters;
- consolidate both audio and video speech-to-text on Voxtral Small STT through OpenRouter;
- keep Qwen Image 3 Pro as the page renderer and test Gemini 3.1 Flash Image as the alternate;
- keep Supadata as an acquisition adapter, not part of the model strategy;
- treat GLM-5.3-Flash as a high-priority challenger after Folio-specific evaluation, not as a launch-day leap based on price or coding benchmarks.

That gives Folio a small, replaceable stack without sacrificing the pipeline checkpoints that make failures diagnosable and retries safe.
