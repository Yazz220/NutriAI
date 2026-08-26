import * as AppleAuthentication from 'expo-apple-authentication';
import type { User } from '@supabase/supabase-js';
import { getAppleDeletionAuthorizationCode, isAppleUser } from '@/utils/appleAuth';

jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithIdToken: jest.fn(), updateUser: jest.fn() } },
}));

jest.mock('expo-apple-authentication', () => ({
  refreshAsync: jest.fn(),
  isAvailableAsync: jest.fn(),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

const appleUser = {
  id: 'user-1',
  app_metadata: { provider: 'apple', providers: ['apple'] },
  user_metadata: {},
  identities: [{ provider: 'apple', id: 'apple-subject', identity_data: { sub: 'apple-subject' } }],
} as unknown as User;

describe('Apple account deletion authorization', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requests a fresh authorization code for the matching Apple identity', async () => {
    jest.mocked(AppleAuthentication.refreshAsync).mockResolvedValue({
      authorizationCode: 'single-use-code',
    } as AppleAuthentication.AppleAuthenticationCredential);

    await expect(getAppleDeletionAuthorizationCode(appleUser)).resolves.toBe('single-use-code');
    expect(AppleAuthentication.refreshAsync).toHaveBeenCalledWith({ user: 'apple-subject' });
  });

  it('does not invoke Apple for a non-Apple account', async () => {
    const emailUser = {
      ...appleUser,
      app_metadata: { provider: 'email', providers: ['email'] },
      identities: [{ provider: 'email', id: 'email-subject', identity_data: {} }],
    } as unknown as User;

    expect(isAppleUser(emailUser)).toBe(false);
    await expect(getAppleDeletionAuthorizationCode(emailUser)).resolves.toBeUndefined();
    expect(AppleAuthentication.refreshAsync).not.toHaveBeenCalled();
  });
});
