# Recipe ingestion evaluations

Nosh uses one versioned evaluation corpus to protect the path from source evidence to a canonical Recipe Graph. The corpus is intentionally provider-neutral: model and provider names are recorded on a run, but they do not change the expected recipe facts or the release gates.

The source of truth is `supabase/functions/extract-recipe/evals/corpus.v1.json`. Every case records:

- the source modality and risk tags;
- a verification state showing whether the golden facts are human-verified or still need a stable fixture;
- whether it is an automated release gate or a diagnostic hard case;
- how it can be executed;
- the expected evidence decision and allowed reason codes;
- critical graph facts such as quantities, units, preparation notes, step order, yield, servings, and forbidden inventions;
- the allowed deterministic quality decisions.

## Gates

A live run passes only when:

1. every release case has an observation;
2. every critical assertion in every release case passes;
3. no non-recipe or insufficient source is accepted as a recipe;
4. no verified recipe is rejected;
5. URL, text, image, video, and audio each have executed release coverage.

Diagnostic cases do not silently become passes. They remain in the report and document work that needs a stable, owned, or consented fixture before it can become a release gate. The initial diagnostic set includes Microdata-only pages, handwriting, positive recipe video, conflicting video evidence, and noisy audio transcription.

## Commands

Validate the corpus, deterministic URL fixtures, scorer, assets, and release-gate behavior:

```bash
npm run eval:ingestion
```

Regenerate the synthetic image fixtures after intentionally changing their source script:

```bash
npm run eval:ingestion:fixtures
```

Run every automated case against a deployed `extract-recipe` function:

```bash
INGESTION_EVAL_ENDPOINT=https://<project-ref>.supabase.co/functions/v1/extract-recipe
INGESTION_EVAL_TOKEN=<short-lived-test-user-access-token>
INGESTION_EVAL_MODEL=<model-slug>
INGESTION_EVAL_PROVIDER=<provider-name>
INGESTION_EVAL_OUTPUT=output/ingestion-evals/<run-name>.json
npm run eval:ingestion:live
```

Use a dedicated test account and a short-lived access token. Never commit the token or result artifacts containing provider diagnostics. The output directory is ignored by Git.

The live runner evaluates local JSON-LD fixtures without network access, injects local image assets into image requests, and sends text, audio-transcript, image, and adapter cases to the configured endpoint. The audio cases in this runner measure interpretation after transcription. End-to-end speech-to-text cases must enter `capture-recipe` and should be promoted from the diagnostic lane only when Nosh owns a stable audio fixture. Positive video cases likewise require stable, owned media rather than a third-party URL that can disappear or change.

## Comparing a model, prompt, or provider

Run the current production configuration first, then run the candidate configuration against the unchanged corpus. Compare:

- release gate status and failed assertion keys;
- false recipe acceptances and missed recipes;
- ingredient quantity, unit, preparation, yield, temperature, and step-order failures;
- quality-routing changes;
- latency and estimated cost by source type;
- model and provider metadata recorded on the artifact.

Do not weaken a golden expectation in the same change that modifies the model or prompt unless the source evidence itself was incorrectly transcribed. If the expected answer changes, review that corpus change independently.

## Adding production regressions

When a real import fails:

1. remove personal information and obtain the necessary rights before retaining source media;
2. minimize the source to the smallest fixture that still reproduces the failure;
3. write the human-verified expected evidence decision and critical facts;
4. add it as a diagnostic case first;
5. fix the adapter, extractor, normalizer, or quality gate;
6. promote the case to `release` once it is stable and automated.

Recipe source text and media can be sensitive user content. Never copy production assets into the repository without explicit permission and sanitization.
