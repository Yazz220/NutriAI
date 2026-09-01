import {
  EXTERNAL_SOCIAL_VIDEO_PLATFORMS,
  normalizeAcquiredVideoEvidenceBundle,
  SOCIAL_VIDEO_EVIDENCE_BUNDLE_VERSION,
  type AcquiredVideoEvidenceBundle,
  type ExternalSocialVideoPlatform,
  type ExternalVideoAcquisitionResult,
  type ExternalVideoAcquisitionState,
  type ExternalVideoEvidenceAdapter,
} from './recipeEvidenceAcquisition.ts';
import type { SocialVideoPlatform } from './videoSource.ts';

type JsonRecord = Record<string, unknown>;
type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const SUPADATA_ADAPTER_VERSION = 'supadata-video-evidence-v1';
const DEFAULT_API_BASE = 'https://api.supadata.ai/v1';
const REQUEST_TIMEOUT_MS = 20_000;

const OBSERVATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    visibleText: {
      type: 'array',
      description: 'Readable captions, ingredient overlays, quantities, temperatures, and timers shown on screen.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          timestamp: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['timestamp', 'text'],
      },
    },
    spokenRecipeDetails: {
      type: 'array',
      description: 'Concise recipe facts explicitly heard in narration. This is not a full transcript.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          timestamp: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['timestamp', 'text'],
      },
    },
    ingredients: {
      type: 'array',
      description: 'Ingredients and quantities explicitly visible or heard.',
      items: { type: 'string' },
    },
    actions: {
      type: 'array',
      description: 'Cooking actions explicitly demonstrated or described.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          timestamp: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['timestamp', 'text'],
      },
    },
    timingsAndTemperatures: {
      type: 'array',
      description: 'Explicit cooking times, rest times, temperatures, and heat settings.',
      items: { type: 'string' },
    },
    conflicts: {
      type: 'array',
      description: 'Material disagreements between spoken, visible, or demonstrated evidence.',
      items: { type: 'string' },
    },
  },
  required: [
    'visibleText',
    'spokenRecipeDetails',
    'ingredients',
    'actions',
    'timingsAndTemperatures',
    'conflicts',
  ],
} as const;

const OBSERVATION_PROMPT = [
  'Observe this cooking video and report recipe evidence only.',
  'Do not assemble a recipe, fill gaps, estimate quantities, or infer unseen steps.',
  'Keep visible text and spoken recipe details separate. Spoken recipe details must be concise factual claims, not a full transcript.',
  'Record any material conflict between narration, on-screen text, and demonstrated actions.',
].join(' ');

export class SupadataVideoEvidenceError extends Error {
  constructor(
    message: string,
    readonly kind: 'configuration' | 'temporary' | 'rate_limited',
  ) {
    super(message);
    this.name = 'SupadataVideoEvidenceError';
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeMetadata(value: unknown): AcquiredVideoEvidenceBundle['metadata'] {
  const metadata = isRecord(value) ? value : {};
  const author = isRecord(metadata.author) ? metadata.author : {};
  const media = isRecord(metadata.media) ? metadata.media : {};
  return {
    ...(stringValue(metadata.title) ? { title: stringValue(metadata.title) } : {}),
    ...(stringValue(metadata.description) ? { description: stringValue(metadata.description) } : {}),
    ...(stringValue(author.displayName ?? author.username)
      ? { creator: stringValue(author.displayName ?? author.username) }
      : {}),
    ...(typeof media.duration === 'number' && Number.isFinite(media.duration)
      ? { durationSeconds: media.duration }
      : {}),
    ...(stringValue(metadata.createdAt) ? { publishedAt: stringValue(metadata.createdAt) } : {}),
  };
}

function errorMessage(value: unknown, fallback: string): string {
  const body = isRecord(value) ? value : {};
  const nested = isRecord(body.error) ? body.error : {};
  return stringValue(body.message ?? body.details ?? nested.message ?? nested.details) ?? fallback;
}

async function responseJson(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}));
}

function unavailableFromStatus(status: number, body: unknown): ExternalVideoAcquisitionResult | null {
  if (status === 400) {
    return {
      status: 'unavailable',
      reasonCode: 'video_source_unsupported',
      diagnostic: errorMessage(body, 'The social video URL was not supported by the acquisition provider.'),
    };
  }
  if (status === 403 || status === 404) {
    return {
      status: 'unavailable',
      reasonCode: 'video_unavailable',
      diagnostic: errorMessage(body, `The social video provider returned HTTP ${status}.`),
    };
  }
  return null;
}

function requestFailure(status: number, body: unknown): SupadataVideoEvidenceError {
  const message = errorMessage(body, `Supadata returned HTTP ${status}.`);
  if (status === 401 || status === 402) {
    return new SupadataVideoEvidenceError(message, 'configuration');
  }
  if (status === 429) return new SupadataVideoEvidenceError(message, 'rate_limited');
  return new SupadataVideoEvidenceError(message, 'temporary');
}

async function fetchJson(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<{ response: Response; body: unknown }> {
  const controller = new AbortController();
  let timedOut = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const request = (async () => {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    return { response, body: await responseJson(response) };
  })();
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new SupadataVideoEvidenceError('Supadata request timed out.', 'temporary'));
    }, timeoutMs);
  });
  try {
    return await Promise.race([request, deadline]);
  } catch (error) {
    if (error instanceof SupadataVideoEvidenceError) throw error;
    if (timedOut) throw new SupadataVideoEvidenceError('Supadata request timed out.', 'temporary');
    const diagnostic = error instanceof Error ? error.message : 'Supadata request failed';
    throw new SupadataVideoEvidenceError(diagnostic, 'temporary');
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function createSupadataVideoEvidenceAdapter(config: {
  apiKey: string;
  apiBase?: string;
  fetchImpl?: FetchLike;
  now?: () => Date;
  requestTimeoutMs?: number;
}): ExternalVideoEvidenceAdapter {
  const apiKey = config.apiKey.trim();
  if (!apiKey) throw new SupadataVideoEvidenceError('SUPADATA_API_KEY is missing.', 'configuration');
  const apiBase = (config.apiBase?.trim() || DEFAULT_API_BASE).replace(/\/+$/, '');
  const fetchImpl = config.fetchImpl ?? fetch;
  const now = config.now ?? (() => new Date());
  const requestTimeoutMs = config.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
  const headers = { 'Content-Type': 'application/json', 'x-api-key': apiKey };

  async function metadata(canonicalUrl: string): Promise<AcquiredVideoEvidenceBundle['metadata']> {
    const { response, body } = await fetchJson(
      fetchImpl,
      `${apiBase}/metadata?url=${encodeURIComponent(canonicalUrl)}`,
      { method: 'GET', headers },
      requestTimeoutMs,
    );
    if (!response.ok) throw requestFailure(response.status, body);
    return normalizeMetadata(body);
  }

  return {
    id: 'supadata',
    version: SUPADATA_ADAPTER_VERSION,
    supports(platform: SocialVideoPlatform): platform is ExternalSocialVideoPlatform {
      return (EXTERNAL_SOCIAL_VIDEO_PLATFORMS as readonly string[]).includes(platform);
    },
    async start(input): Promise<ExternalVideoAcquisitionResult> {
      const [jobResult, metadataResult] = await Promise.allSettled([
        fetchJson(fetchImpl, `${apiBase}/extract`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: input.canonicalUrl,
            prompt: OBSERVATION_PROMPT,
            schema: OBSERVATION_SCHEMA,
          }),
        }, requestTimeoutMs),
        metadata(input.canonicalUrl),
      ]);
      if (jobResult.status === 'rejected') throw jobResult.reason;
      const unavailable = unavailableFromStatus(jobResult.value.response.status, jobResult.value.body);
      if (unavailable) return unavailable;
      if (!jobResult.value.response.ok) {
        throw requestFailure(jobResult.value.response.status, jobResult.value.body);
      }
      const jobBody = isRecord(jobResult.value.body) ? jobResult.value.body : {};
      const jobId = stringValue(jobBody.jobId);
      if (!jobId) throw new SupadataVideoEvidenceError('Supadata returned no extraction job ID.', 'temporary');
      return {
        status: 'pending',
        state: {
          provider: 'supadata',
          adapterVersion: SUPADATA_ADAPTER_VERSION,
          jobId,
          platform: input.platform,
          canonicalUrl: input.canonicalUrl,
          startedAt: now().toISOString(),
          pollCount: 0,
          ...(metadataResult.status === 'fulfilled' ? { metadata: metadataResult.value } : {}),
        },
      };
    },
    async poll(state): Promise<ExternalVideoAcquisitionResult> {
      if (state.provider !== 'supadata' || state.adapterVersion !== SUPADATA_ADAPTER_VERSION) {
        throw new SupadataVideoEvidenceError('The saved acquisition job is incompatible.', 'configuration');
      }
      const { response, body } = await fetchJson(fetchImpl, `${apiBase}/extract/${encodeURIComponent(state.jobId)}`, {
        method: 'GET',
        headers,
      }, requestTimeoutMs);
      const unavailable = unavailableFromStatus(response.status, body);
      if (unavailable) return unavailable;
      if (!response.ok) throw requestFailure(response.status, body);
      const result = isRecord(body) ? body : {};
      const status = stringValue(result.status);
      const nextState: ExternalVideoAcquisitionState = {
        ...state,
        pollCount: state.pollCount + 1,
      };
      if (status === 'queued' || status === 'active') {
        return { status: 'pending', state: nextState };
      }
      if (status === 'failed') {
        const diagnostic = errorMessage(result, 'Supadata could not analyze this social video.');
        if (/\b(private|forbidden|restricted|unavailable|not found|deleted|login|required)\b/i.test(diagnostic)) {
          return { status: 'unavailable', reasonCode: 'video_unavailable', diagnostic };
        }
        throw new SupadataVideoEvidenceError(diagnostic, 'temporary');
      }
      if (status !== 'completed' || !isRecord(result.data)) {
        throw new SupadataVideoEvidenceError('Supadata returned an invalid extraction job result.', 'temporary');
      }
      const evidence = normalizeAcquiredVideoEvidenceBundle({
        version: SOCIAL_VIDEO_EVIDENCE_BUNDLE_VERSION,
        source: {
          kind: 'social_video',
          platform: state.platform,
          canonicalUrl: state.canonicalUrl,
        },
        metadata: state.metadata ?? {},
        observations: result.data,
      });
      return { status: 'ready', evidence, state: nextState };
    },
  };
}
