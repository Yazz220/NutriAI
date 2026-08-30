import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import corpusValue from '@/supabase/functions/extract-recipe/evals/corpus.v1.json';
import {
  INGESTION_EVAL_SOURCE_TYPES,
  scoreIngestionEvalCase,
  scoreIngestionEvalRun,
  validateIngestionEvalCorpus,
  type IngestionEvalCase,
  type IngestionEvalCorpus,
  type IngestionEvalObservation,
} from '@/supabase/functions/_shared/ingestionEval';
import { recipeJsonLdToDraft } from '@/supabase/functions/_shared/recipeGraphNormalization';
import { buildUrlRecipePrompt } from '@/supabase/functions/_shared/urlRecipeEvidence';

const projectRoot = resolve(__dirname, '..', '..', '..');
const corpus = validateIngestionEvalCorpus(corpusValue) as IngestionEvalCorpus;

function deterministicUrlObservation(evalCase: IngestionEvalCase): IngestionEvalObservation {
  const assetPath = evalCase.execution.assetPath!;
  const sourceUrl = evalCase.execution.sourceUrl!;
  const html = readFileSync(resolve(projectRoot, assetPath), 'utf8');
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
    response: graph
      ? {
        outcome: 'recipe',
        reasonCode: 'none',
        diagnostic: 'Structured fixture normalized deterministically.',
        recipeGraph: graph,
      }
      : {
        outcome: 'insufficient_evidence',
        reasonCode: evidence.recipeCandidateCount > 1 ? 'multiple_recipes' : 'unreadable_source',
        diagnostic: 'No deterministic recipe was available.',
        recipeGraph: null,
      },
  };
}

describe('ingestion evaluation corpus', () => {
  it('is versioned, uniquely identified, and covers every canonical source type', () => {
    expect(corpus.version).toBe(1);
    expect(corpus.cases.length).toBeGreaterThanOrEqual(20);
    expect(new Set(corpus.cases.map((evalCase) => evalCase.id)).size).toBe(corpus.cases.length);
    expect(new Set(corpus.cases.map((evalCase) => evalCase.sourceType))).toEqual(
      new Set(INGESTION_EVAL_SOURCE_TYPES),
    );

    for (const sourceType of INGESTION_EVAL_SOURCE_TYPES) {
      expect(corpus.cases.some((evalCase) => (
        evalCase.sourceType === sourceType && evalCase.gate === 'release'
      ))).toBe(true);
    }
    expect(corpus.cases.filter((evalCase) => evalCase.gate === 'release').every(
      (evalCase) => evalCase.verification.status === 'human_verified',
    )).toBe(true);
  });

  it('keeps known gaps visible as diagnostic cases instead of silently excluding them', () => {
    const diagnosticTags = new Set(corpus.cases
      .filter((evalCase) => evalCase.gate === 'diagnostic')
      .flatMap((evalCase) => evalCase.tags));

    expect(diagnosticTags.has('microdata')).toBe(true);
    expect(diagnosticTags.has('handwriting')).toBe(true);
    expect(diagnosticTags.has('manual-media')).toBe(true);
    expect(diagnosticTags.has('background-noise')).toBe(true);
    expect(corpus.cases.filter((evalCase) => evalCase.execution.mode === 'manual').every(
      (evalCase) => evalCase.gate === 'diagnostic',
    )).toBe(true);
  });

  it('tracks wrong-source, incomplete-source, ambiguity, and prompt-injection sentinels', () => {
    const tags = new Set(corpus.cases.flatMap((evalCase) => evalCase.tags));

    for (const requiredTag of [
      'false-positive-sentinel',
      'missing-ingredients',
      'missing-instructions',
      'multiple-recipes',
      'prompt-injection',
      'cropped',
      'low-resolution',
      'unsupported-social',
      'self-correction',
    ]) {
      expect(tags.has(requiredTag)).toBe(true);
    }
  });

  it('keeps all referenced fixtures present and all live cases executable', () => {
    for (const evalCase of corpus.cases) {
      if (evalCase.execution.assetPath) {
        expect(existsSync(resolve(projectRoot, evalCase.execution.assetPath))).toBe(true);
      }
      if (evalCase.execution.mode === 'live_endpoint') {
        expect(evalCase.execution.request).toEqual(expect.any(Object));
      }
    }
  });

  it('passes the release-gated deterministic URL golden cases', () => {
    const urlCases = corpus.cases.filter((evalCase) => (
      evalCase.execution.mode === 'deterministic_url_fixture'
    ));

    expect(urlCases.length).toBeGreaterThanOrEqual(2);
    for (const evalCase of urlCases) {
      const result = scoreIngestionEvalCase(evalCase, deterministicUrlObservation(evalCase));
      expect(result.assertions.filter((candidate) => !candidate.passed)).toEqual([]);
      expect(result.passed).toBe(true);
    }
  });
});

describe('ingestion evaluation release gate', () => {
  const sentinelCase: IngestionEvalCase = {
    id: 'sentinel-not-recipe',
    sourceType: 'text',
    gate: 'release',
    tags: ['false-positive-sentinel'],
    sourceSummary: 'Not a recipe.',
    verification: { status: 'human_verified', note: 'Explicit negative.' },
    execution: { mode: 'live_endpoint', request: { type: 'text', input: 'Package shipped.' } },
    expected: { outcome: 'not_recipe', reasonCodes: ['not_a_recipe'] },
  };

  it('treats an invented recipe from a negative source as a release blocker', () => {
    const result = scoreIngestionEvalCase(sentinelCase, {
      caseId: sentinelCase.id,
      response: {
        outcome: 'recipe',
        reasonCode: 'none',
        diagnostic: 'Invented from food words.',
        recipeGraph: { title: 'Imaginary Soup' },
      },
    });

    expect(result.passed).toBe(false);
    expect(result.falseRecipeAcceptance).toBe(true);
  });

  it('fails closed when a release case has no observation', () => {
    const report = scoreIngestionEvalRun({
      version: 1,
      name: 'Missing result',
      description: '',
      cases: [sentinelCase],
    }, []);

    expect(report.releaseGatePassed).toBe(false);
    expect(report.missingReleaseCaseIds).toEqual([sentinelCase.id]);
  });

  it('requires an executed release case for every source type', () => {
    const cases = INGESTION_EVAL_SOURCE_TYPES.map((sourceType): IngestionEvalCase => ({
      ...sentinelCase,
      id: `${sourceType}-negative`,
      sourceType,
    }));
    const observations = cases.map((evalCase): IngestionEvalObservation => ({
      caseId: evalCase.id,
      response: {
        outcome: 'not_recipe',
        reasonCode: 'not_a_recipe',
        diagnostic: 'No recipe evidence.',
        recipeGraph: null,
      },
    }));
    const complete = scoreIngestionEvalRun({
      version: 1,
      name: 'Complete coverage',
      description: '',
      cases,
    }, observations);
    const missingAudio = scoreIngestionEvalRun({
      version: 1,
      name: 'Missing audio',
      description: '',
      cases,
    }, observations.filter((observation) => !observation.caseId.startsWith('audio-')));

    expect(complete.releaseGatePassed).toBe(true);
    expect(missingAudio.releaseGatePassed).toBe(false);
  });

  it('reports diagnostic failures without letting them redefine the release gate', () => {
    const releaseCases = INGESTION_EVAL_SOURCE_TYPES.map((sourceType): IngestionEvalCase => ({
      ...sentinelCase,
      id: `${sourceType}-release-negative`,
      sourceType,
    }));
    const diagnosticCase: IngestionEvalCase = {
      ...sentinelCase,
      id: 'diagnostic-hard-case',
      gate: 'diagnostic',
      verification: { status: 'fixture_required', note: 'Not calibrated yet.' },
    };
    const observations: IngestionEvalObservation[] = [
      ...releaseCases.map((evalCase) => ({
        caseId: evalCase.id,
        response: {
          outcome: 'not_recipe',
          reasonCode: 'not_a_recipe',
          diagnostic: 'No recipe evidence.',
          recipeGraph: null,
        },
      })),
      {
        caseId: diagnosticCase.id,
        response: {
          outcome: 'recipe',
          reasonCode: 'none',
          diagnostic: 'Diagnostic false acceptance.',
          recipeGraph: { title: 'Invented recipe' },
        },
      },
    ];
    const report = scoreIngestionEvalRun({
      version: 1,
      name: 'Diagnostic observation',
      description: '',
      cases: [...releaseCases, diagnosticCase],
    }, observations);

    expect(report.releaseGatePassed).toBe(true);
    expect(report.falseRecipeAcceptanceCount).toBe(1);
    expect(report.diagnosticCasesPassed).toBe(0);
  });
});
