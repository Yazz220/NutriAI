import {
  isSampleCookbookId,
  SAMPLE_COOKBOOK_ID,
  shouldShowSampleCookbook,
} from '@/utils/cookbook/sampleCookbook';

describe('shouldShowSampleCookbook', () => {
  const originalShowDemo = process.env.EXPO_PUBLIC_SHOW_DEMO_COOKBOOK;
  const originalBypassAuth = process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH;

  afterEach(() => {
    process.env.EXPO_PUBLIC_SHOW_DEMO_COOKBOOK = originalShowDemo;
    process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH = originalBypassAuth;
  });

  it('shows the sample without enabling the auth bypass', () => {
    process.env.EXPO_PUBLIC_SHOW_DEMO_COOKBOOK = 'true';
    process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH = 'false';

    expect(shouldShowSampleCookbook()).toBe(true);
    expect(shouldShowSampleCookbook(SAMPLE_COOKBOOK_ID)).toBe(true);
  });

  it('stays hidden when the sample flag is disabled', () => {
    process.env.EXPO_PUBLIC_SHOW_DEMO_COOKBOOK = 'false';
    process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH = 'true';

    expect(shouldShowSampleCookbook()).toBe(false);
  });

  it('does not treat a real cookbook as the sample', () => {
    process.env.EXPO_PUBLIC_SHOW_DEMO_COOKBOOK = 'true';

    expect(shouldShowSampleCookbook('real-cookbook')).toBe(false);
  });

  it('recognizes an explicit sample route independently of the shelf flag', () => {
    process.env.EXPO_PUBLIC_SHOW_DEMO_COOKBOOK = 'false';

    expect(isSampleCookbookId(SAMPLE_COOKBOOK_ID)).toBe(true);
    expect(isSampleCookbookId('real-cookbook')).toBe(false);
  });
});
