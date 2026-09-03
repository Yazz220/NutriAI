import { privateOpenRouterProviderPolicy } from '@/supabase/functions/_shared/openRouterProviderPolicy';

describe('OpenRouter provider policy', () => {
  it('requires private routed endpoints while preserving workload requirements', () => {
    expect(privateOpenRouterProviderPolicy({ require_parameters: true })).toEqual({
      allow_fallbacks: true,
      data_collection: 'deny',
      zdr: true,
      require_parameters: true,
    });
  });
});
