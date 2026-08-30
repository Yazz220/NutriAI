import {
  scoreIngestionEvalRun,
  validateIngestionEvalCorpus,
  type IngestionEvalCase,
  type IngestionEvalObservation,
} from '../../_shared/ingestionEval.ts';
import { recipeJsonLdToDraft } from '../../_shared/recipeGraphNormalization.ts';
import { buildUrlRecipePrompt } from '../../_shared/urlRecipeEvidence.ts';

const projectRoot = new URL('../../../../', import.meta.url);
const corpusUrl = new URL('./corpus.v1.json', import.meta.url);
const endpoint = Deno.env.get('INGESTION_EVAL_ENDPOINT')?.trim();
const token = Deno.env.get('INGESTION_EVAL_TOKEN')?.trim();
const outputPath = Deno.env.get('INGESTION_EVAL_OUTPUT')?.trim();
const model = Deno.env.get('INGESTION_EVAL_MODEL')?.trim();
const provider = Deno.env.get('INGESTION_EVAL_PROVIDER')?.trim();

const corpus = validateIngestionEvalCorpus(JSON.parse(await Deno.readTextFile(corpusUrl)));

function absoluteAssetUrl(path: string): URL {
  return new URL(path.replaceAll('\\', '/'), projectRoot);
}

function toBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function runDeterministicUrlFixture(evalCase: IngestionEvalCase): Promise<IngestionEvalObservation> {
  const startedAt = performance.now();
  const assetPath = evalCase.execution.assetPath;
  const sourceUrl = evalCase.execution.sourceUrl;
  if (!assetPath || !sourceUrl) {
    return { caseId: evalCase.id, error: 'URL fixture is missing assetPath or sourceUrl' };
  }
  try {
    const html = await Deno.readTextFile(absoluteAssetUrl(assetPath));
    const evidence = buildUrlRecipePrompt(sourceUrl, html);
    const graph = recipeJsonLdToDraft(evidence.recipeJsonLd, sourceUrl, {
      canonicalUrl: evidence.canonicalUrl,
      sourceTitle: evidence.sourceTitle,
      sourceLanguage: evidence.sourceLanguage,
      candidateCount: evidence.recipeCandidateCount,
      selectionReason: evidence.recipeSelectionReason,
    });
    return {
      caseId: evalCase.id,
      latencyMs: performance.now() - startedAt,
      response: graph
        ? {
          outcome: 'recipe',
          reasonCode: 'none',
          diagnostic: 'Complete schema.org Recipe data was normalized deterministically.',
          recipeGraph: graph,
        }
        : {
          outcome: 'insufficient_evidence',
          reasonCode: evidence.recipeCandidateCount > 1 ? 'multiple_recipes' : 'unreadable_source',
          diagnostic: 'The deterministic URL fixture did not produce one complete recipe.',
          recipeGraph: null,
        },
    };
  } catch (error) {
    return {
      caseId: evalCase.id,
      error: error instanceof Error ? error.message : 'Could not evaluate URL fixture',
      latencyMs: performance.now() - startedAt,
    };
  }
}

async function runLiveEndpointCase(evalCase: IngestionEvalCase): Promise<IngestionEvalObservation> {
  const startedAt = performance.now();
  if (!endpoint || !token) {
    return {
      caseId: evalCase.id,
      error: 'INGESTION_EVAL_ENDPOINT and INGESTION_EVAL_TOKEN are required for live cases',
    };
  }
  const request = { ...(evalCase.execution.request ?? {}) };
  if (evalCase.execution.assetPath) {
    const bytes = await Deno.readFile(absoluteAssetUrl(evalCase.execution.assetPath));
    request.imageBase64 = toBase64(bytes);
  }
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    const body = await response.json().catch(() => null);
    return {
      caseId: evalCase.id,
      response: response.ok ? body : undefined,
      error: response.ok ? undefined : `extract-recipe returned HTTP ${response.status}`,
      latencyMs: performance.now() - startedAt,
      ...(model ? { model } : {}),
      ...(provider ? { provider } : {}),
    };
  } catch (error) {
    return {
      caseId: evalCase.id,
      error: error instanceof Error ? error.message : 'Live extraction request failed',
      latencyMs: performance.now() - startedAt,
      ...(model ? { model } : {}),
      ...(provider ? { provider } : {}),
    };
  }
}

const observations: IngestionEvalObservation[] = [];
for (const evalCase of corpus.cases) {
  if (evalCase.execution.mode === 'deterministic_url_fixture') {
    observations.push(await runDeterministicUrlFixture(evalCase));
  } else if (evalCase.execution.mode === 'live_endpoint') {
    observations.push(await runLiveEndpointCase(evalCase));
  }
}

const report = scoreIngestionEvalRun(corpus, observations);
const artifact = {
  corpusVersion: corpus.version,
  recordedAt: new Date().toISOString(),
  model: model ?? null,
  provider: provider ?? null,
  observations,
  report,
};

if (outputPath) {
  const outputUrl = absoluteAssetUrl(outputPath);
  await Deno.mkdir(new URL('.', outputUrl), { recursive: true });
  await Deno.writeTextFile(outputUrl, `${JSON.stringify(artifact, null, 2)}\n`);
}

console.log(JSON.stringify(artifact, null, 2));
if (!report.releaseGatePassed) Deno.exit(1);
