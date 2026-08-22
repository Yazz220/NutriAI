export interface GenerationAttempt {
  key: string;
  fingerprint: string;
}

export function createGenerationRequestKey(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2);
  return `generation-${timestamp}-${random}`;
}

export function getOrCreateGenerationAttempt(
  current: GenerationAttempt | null,
  payload: Record<string, unknown>,
  createKey: () => string = createGenerationRequestKey,
): GenerationAttempt {
  const fingerprint = JSON.stringify(payload);
  if (current?.fingerprint === fingerprint) return current;
  return { key: createKey(), fingerprint };
}
