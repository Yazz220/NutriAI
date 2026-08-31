import {
  normalizeRecipeEvidenceDecision,
  type RecipeEvidenceDecision,
  type RecipeEvidenceOutcome,
  type RecipeEvidenceReasonCode,
} from './recipeEvidence.ts';
import {
  assessRecipeQuality,
  type RecipeQualityDecision,
} from './recipeQuality.ts';

export const INGESTION_EVAL_CORPUS_VERSION = 1;

export const INGESTION_EVAL_SOURCE_TYPES = [
  'url',
  'text',
  'image',
  'video',
  'audio',
] as const;

export type IngestionEvalSourceType = typeof INGESTION_EVAL_SOURCE_TYPES[number];
export type IngestionEvalGate = 'release' | 'diagnostic';
export type IngestionEvalExecutionMode = 'deterministic_url_fixture' | 'live_endpoint' | 'manual';
export type IngestionEvalVerificationStatus = 'human_verified' | 'fixture_required';

export interface IngestionEvalIngredientExpectation {
  nameIncludes: string[];
  quantity?: string;
  unit?: string;
  preparationIncludes?: string[];
  rawTextIncludes?: string[];
}

export interface IngestionEvalGraphExpectation {
  titleIncludes?: string[];
  minimumIngredientCount?: number;
  minimumStepCount?: number;
  ingredients?: IngestionEvalIngredientExpectation[];
  stepsInOrder?: string[];
  yieldText?: string;
  servings?: number | null;
  forbiddenGraphTerms?: string[];
}

export interface IngestionEvalExpectation {
  outcome: RecipeEvidenceOutcome;
  reasonCodes: RecipeEvidenceReasonCode[];
  graph?: IngestionEvalGraphExpectation;
  qualityDecisions?: RecipeQualityDecision[];
}

export interface IngestionEvalExecution {
  mode: IngestionEvalExecutionMode;
  request?: Record<string, unknown>;
  assetPath?: string;
  sourceUrl?: string;
  description?: string;
}

export interface IngestionEvalCase {
  id: string;
  sourceType: IngestionEvalSourceType;
  gate: IngestionEvalGate;
  tags: string[];
  sourceSummary: string;
  verification: {
    status: IngestionEvalVerificationStatus;
    note: string;
  };
  execution: IngestionEvalExecution;
  expected: IngestionEvalExpectation;
}

export interface IngestionEvalCorpus {
  version: number;
  name: string;
  description: string;
  cases: IngestionEvalCase[];
}

export interface IngestionEvalObservation {
  caseId: string;
  response?: unknown;
  error?: string;
  latencyMs?: number;
  model?: string;
  provider?: string;
  estimatedCostUsd?: number;
}

export interface IngestionEvalAssertion {
  key: string;
  passed: boolean;
  critical: boolean;
  detail: string;
}

export interface IngestionEvalCaseResult {
  caseId: string;
  sourceType: IngestionEvalSourceType;
  gate: IngestionEvalGate;
  passed: boolean;
  score: number;
  falseRecipeAcceptance: boolean;
  missedRecipe: boolean;
  assertions: IngestionEvalAssertion[];
  observation?: IngestionEvalObservation;
}

export interface IngestionEvalRunReport {
  corpusVersion: number;
  releaseGatePassed: boolean;
  releaseCaseCount: number;
  releaseCasesPassed: number;
  diagnosticCaseCount: number;
  diagnosticCasesPassed: number;
  falseRecipeAcceptanceCount: number;
  missedRecipeCount: number;
  executedSourceTypes: IngestionEvalSourceType[];
  missingReleaseCaseIds: string[];
  cases: IngestionEvalCaseResult[];
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function normalizedText(value: unknown): string {
  return typeof value === 'string'
    ? value.toLocaleLowerCase().replace(/\s+/g, ' ').trim()
    : '';
}

function includesEvery(value: unknown, fragments: string[]): boolean {
  const text = normalizedText(value);
  return fragments.every((fragment) => text.includes(normalizedText(fragment)));
}

function flattenGroupRecords(graph: JsonRecord, groupKey: 'ingredientGroups' | 'stepGroups', itemKey: 'ingredients' | 'steps'): JsonRecord[] {
  const groups = graph[groupKey];
  if (!Array.isArray(groups)) return [];
  const flattened: JsonRecord[] = [];
  for (const group of groups) {
    const groupRecord = record(group);
    const items = groupRecord?.[itemKey];
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      const itemRecord = record(item);
      if (itemRecord) flattened.push(itemRecord);
    }
  }
  return flattened;
}

function assertion(
  key: string,
  passed: boolean,
  detail: string,
  critical = true,
): IngestionEvalAssertion {
  return { key, passed, detail, critical };
}

function graphAssertions(
  graph: JsonRecord,
  expected: IngestionEvalGraphExpectation,
  qualityDecisions: RecipeQualityDecision[] | undefined,
): IngestionEvalAssertion[] {
  const assertions: IngestionEvalAssertion[] = [];
  const ingredients = flattenGroupRecords(graph, 'ingredientGroups', 'ingredients');
  const steps = flattenGroupRecords(graph, 'stepGroups', 'steps');

  if (expected.titleIncludes) {
    assertions.push(assertion(
      'graph.title',
      includesEvery(graph.title, expected.titleIncludes),
      `title must contain: ${expected.titleIncludes.join(', ')}`,
    ));
  }
  if (expected.minimumIngredientCount !== undefined) {
    assertions.push(assertion(
      'graph.ingredient_count',
      ingredients.length >= expected.minimumIngredientCount,
      `expected at least ${expected.minimumIngredientCount} ingredients; received ${ingredients.length}`,
    ));
  }
  if (expected.minimumStepCount !== undefined) {
    assertions.push(assertion(
      'graph.step_count',
      steps.length >= expected.minimumStepCount,
      `expected at least ${expected.minimumStepCount} steps; received ${steps.length}`,
    ));
  }

  for (const [index, ingredientExpectation] of (expected.ingredients ?? []).entries()) {
    const ingredient = ingredients.find((candidate) => includesEvery(candidate.name, ingredientExpectation.nameIncludes));
    assertions.push(assertion(
      `graph.ingredient.${index}.present`,
      Boolean(ingredient),
      `ingredient must contain: ${ingredientExpectation.nameIncludes.join(', ')}`,
    ));
    if (!ingredient) continue;
    if (ingredientExpectation.quantity !== undefined) {
      assertions.push(assertion(
        `graph.ingredient.${index}.quantity`,
        normalizedText(ingredient.quantity) === normalizedText(ingredientExpectation.quantity),
        `expected quantity ${ingredientExpectation.quantity}; received ${String(ingredient.quantity ?? 'missing')}`,
      ));
    }
    if (ingredientExpectation.unit !== undefined) {
      assertions.push(assertion(
        `graph.ingredient.${index}.unit`,
        normalizedText(ingredient.unit) === normalizedText(ingredientExpectation.unit),
        `expected unit ${ingredientExpectation.unit}; received ${String(ingredient.unit ?? 'missing')}`,
      ));
    }
    if (ingredientExpectation.preparationIncludes) {
      assertions.push(assertion(
        `graph.ingredient.${index}.preparation`,
        includesEvery(ingredient.preparation, ingredientExpectation.preparationIncludes),
        `preparation must contain: ${ingredientExpectation.preparationIncludes.join(', ')}`,
      ));
    }
    if (ingredientExpectation.rawTextIncludes) {
      assertions.push(assertion(
        `graph.ingredient.${index}.raw_text`,
        includesEvery(ingredient.rawText, ingredientExpectation.rawTextIncludes),
        `raw text must contain: ${ingredientExpectation.rawTextIncludes.join(', ')}`,
      ));
    }
  }

  if (expected.stepsInOrder) {
    let cursor = -1;
    for (const [index, fragment] of expected.stepsInOrder.entries()) {
      const next = steps.findIndex((step, stepIndex) => (
        stepIndex > cursor && normalizedText(step.text).includes(normalizedText(fragment))
      ));
      assertions.push(assertion(
        `graph.step_order.${index}`,
        next >= 0,
        `a later step must contain: ${fragment}`,
      ));
      if (next >= 0) cursor = next;
    }
  }
  if (expected.yieldText !== undefined) {
    assertions.push(assertion(
      'graph.yield_text',
      normalizedText(graph.yieldText) === normalizedText(expected.yieldText),
      `expected yield ${expected.yieldText}; received ${String(graph.yieldText ?? 'missing')}`,
    ));
  }
  if (expected.servings !== undefined) {
    const matches = expected.servings === null
      ? graph.servings === undefined || graph.servings === null
      : graph.servings === expected.servings;
    assertions.push(assertion(
      'graph.servings',
      matches,
      expected.servings === null
        ? 'numeric servings must remain unknown'
        : `expected ${expected.servings} servings; received ${String(graph.servings ?? 'missing')}`,
    ));
  }
  if (expected.forbiddenGraphTerms) {
    const serialized = normalizedText(JSON.stringify(graph));
    for (const [index, term] of expected.forbiddenGraphTerms.entries()) {
      assertions.push(assertion(
        `graph.forbidden_term.${index}`,
        !serialized.includes(normalizedText(term)),
        `graph must not contain invented term: ${term}`,
      ));
    }
  }
  if (qualityDecisions?.length) {
    const quality = assessRecipeQuality(graph);
    assertions.push(assertion(
      'quality.decision',
      qualityDecisions.includes(quality.decision),
      `expected quality decision ${qualityDecisions.join(' or ')}; received ${quality.decision}`,
    ));
  }
  return assertions;
}

function invalidObservationResult(
  evalCase: IngestionEvalCase,
  observation: IngestionEvalObservation | undefined,
  detail: string,
): IngestionEvalCaseResult {
  return {
    caseId: evalCase.id,
    sourceType: evalCase.sourceType,
    gate: evalCase.gate,
    passed: false,
    score: 0,
    falseRecipeAcceptance: false,
    missedRecipe: false,
    assertions: [assertion('execution', false, detail)],
    observation,
  };
}

export function scoreIngestionEvalCase(
  evalCase: IngestionEvalCase,
  observation: IngestionEvalObservation | undefined,
): IngestionEvalCaseResult {
  if (!observation) return invalidObservationResult(evalCase, observation, 'no observation was recorded');
  if (observation.error) return invalidObservationResult(evalCase, observation, observation.error);

  let decision: RecipeEvidenceDecision;
  try {
    decision = normalizeRecipeEvidenceDecision(observation.response);
  } catch (error) {
    return invalidObservationResult(
      evalCase,
      observation,
      error instanceof Error ? error.message : 'invalid evidence decision',
    );
  }

  const assertions = [
    assertion(
      'evidence.outcome',
      decision.outcome === evalCase.expected.outcome,
      `expected ${evalCase.expected.outcome}; received ${decision.outcome}`,
    ),
    assertion(
      'evidence.reason_code',
      evalCase.expected.reasonCodes.includes(decision.reasonCode),
      `expected ${evalCase.expected.reasonCodes.join(' or ')}; received ${decision.reasonCode}`,
    ),
  ];

  if (decision.outcome === 'recipe' && (evalCase.expected.graph || evalCase.expected.qualityDecisions)) {
    assertions.push(...graphAssertions(
      decision.recipeGraph,
      evalCase.expected.graph ?? {},
      evalCase.expected.qualityDecisions,
    ));
  }

  const criticalAssertions = assertions.filter((candidate) => candidate.critical);
  const score = assertions.length === 0
    ? 0
    : assertions.filter((candidate) => candidate.passed).length / assertions.length;
  const expectedRecipe = evalCase.expected.outcome === 'recipe';
  const actualRecipe = decision.outcome === 'recipe';

  return {
    caseId: evalCase.id,
    sourceType: evalCase.sourceType,
    gate: evalCase.gate,
    passed: criticalAssertions.every((candidate) => candidate.passed),
    score,
    falseRecipeAcceptance: !expectedRecipe && actualRecipe,
    missedRecipe: expectedRecipe && !actualRecipe,
    assertions,
    observation,
  };
}

export function scoreIngestionEvalRun(
  corpus: IngestionEvalCorpus,
  observations: IngestionEvalObservation[],
): IngestionEvalRunReport {
  if (corpus.version !== INGESTION_EVAL_CORPUS_VERSION) {
    throw new Error(`Unsupported ingestion corpus version: ${corpus.version}`);
  }
  const observationByCase = new Map(observations.map((observation) => [observation.caseId, observation]));
  const cases = corpus.cases.map((evalCase) => scoreIngestionEvalCase(
    evalCase,
    observationByCase.get(evalCase.id),
  ));
  const releaseCases = cases.filter((evalCase) => evalCase.gate === 'release');
  const diagnosticCases = cases.filter((evalCase) => evalCase.gate === 'diagnostic');
  const executedSourceTypes = INGESTION_EVAL_SOURCE_TYPES.filter((sourceType) => (
    observations.some((observation) => (
      corpus.cases.find((evalCase) => evalCase.id === observation.caseId)?.sourceType === sourceType
    ))
  ));
  const missingReleaseCaseIds = releaseCases
    .filter((evalCase) => !evalCase.observation)
    .map((evalCase) => evalCase.caseId);
  const falseRecipeAcceptanceCount = cases.filter((evalCase) => evalCase.falseRecipeAcceptance).length;
  const missedRecipeCount = cases.filter((evalCase) => evalCase.missedRecipe).length;
  const releaseFalseRecipeAcceptanceCount = releaseCases
    .filter((evalCase) => evalCase.falseRecipeAcceptance).length;
  const releaseMissedRecipeCount = releaseCases.filter((evalCase) => evalCase.missedRecipe).length;
  const hasReleaseCoverageForEverySource = INGESTION_EVAL_SOURCE_TYPES.every((sourceType) => (
    releaseCases.some((evalCase) => evalCase.sourceType === sourceType && Boolean(evalCase.observation))
  ));

  return {
    corpusVersion: corpus.version,
    releaseGatePassed: releaseCases.length > 0
      && releaseCases.every((evalCase) => evalCase.passed)
      && releaseFalseRecipeAcceptanceCount === 0
      && releaseMissedRecipeCount === 0
      && hasReleaseCoverageForEverySource,
    releaseCaseCount: releaseCases.length,
    releaseCasesPassed: releaseCases.filter((evalCase) => evalCase.passed).length,
    diagnosticCaseCount: diagnosticCases.length,
    diagnosticCasesPassed: diagnosticCases.filter((evalCase) => evalCase.passed).length,
    falseRecipeAcceptanceCount,
    missedRecipeCount,
    executedSourceTypes,
    missingReleaseCaseIds,
    cases,
  };
}

export function validateIngestionEvalCorpus(value: unknown): IngestionEvalCorpus {
  const corpus = record(value);
  if (corpus?.version !== INGESTION_EVAL_CORPUS_VERSION || !Array.isArray(corpus.cases)) {
    throw new Error('Invalid ingestion evaluation corpus');
  }
  const cases = corpus.cases as unknown[];
  const ids = new Set<string>();
  for (const candidate of cases) {
    const evalCase = record(candidate);
    const id = typeof evalCase?.id === 'string' ? evalCase.id.trim() : '';
    if (!id || ids.has(id)) throw new Error('Ingestion evaluation case ids must be unique');
    ids.add(id);
    if (!INGESTION_EVAL_SOURCE_TYPES.includes(evalCase?.sourceType as IngestionEvalSourceType)) {
      throw new Error(`Invalid source type for ingestion evaluation case ${id}`);
    }
    if (evalCase?.gate !== 'release' && evalCase?.gate !== 'diagnostic') {
      throw new Error(`Invalid gate for ingestion evaluation case ${id}`);
    }
    const verification = record(evalCase?.verification);
    if (verification?.status !== 'human_verified' && verification?.status !== 'fixture_required') {
      throw new Error(`Invalid verification status for ingestion evaluation case ${id}`);
    }
    if (evalCase?.gate === 'release' && verification.status !== 'human_verified') {
      throw new Error(`Release ingestion evaluation case ${id} must be human verified`);
    }
    const expected = record(evalCase?.expected);
    if (!expected || !Array.isArray(expected.reasonCodes)) {
      throw new Error(`Missing expectation for ingestion evaluation case ${id}`);
    }
  }
  return value as IngestionEvalCorpus;
}
