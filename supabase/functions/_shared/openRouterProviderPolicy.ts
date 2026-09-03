export interface OpenRouterProviderPolicy {
  require_parameters?: boolean;
  allow_fallbacks?: boolean;
  data_collection?: 'allow' | 'deny';
  zdr?: boolean;
}

const PRIVATE_PROVIDER_DEFAULTS: OpenRouterProviderPolicy = {
  allow_fallbacks: true,
  data_collection: 'deny',
  zdr: true,
};

export function privateOpenRouterProviderPolicy(
  overrides: OpenRouterProviderPolicy = {},
): OpenRouterProviderPolicy {
  return { ...PRIVATE_PROVIDER_DEFAULTS, ...overrides };
}
