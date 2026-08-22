import { isNoshContextModelV2Enabled } from '@/constants/featureFlags';

describe('isNoshContextModelV2Enabled', () => {
  const originalValue = process.env.EXPO_PUBLIC_NOSH_CONTEXT_MODEL_V2;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.EXPO_PUBLIC_NOSH_CONTEXT_MODEL_V2;
    } else {
      process.env.EXPO_PUBLIC_NOSH_CONTEXT_MODEL_V2 = originalValue;
    }
  });

  it('keeps the context-aware model off by default', () => {
    delete process.env.EXPO_PUBLIC_NOSH_CONTEXT_MODEL_V2;

    expect(isNoshContextModelV2Enabled()).toBe(false);
  });

  it('enables the context-aware model only for the explicit true value', () => {
    process.env.EXPO_PUBLIC_NOSH_CONTEXT_MODEL_V2 = 'true';

    expect(isNoshContextModelV2Enabled()).toBe(true);
  });
});
