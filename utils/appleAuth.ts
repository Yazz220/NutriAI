import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

/**
 * Check if Apple Sign-In is available (iOS 13+ only).
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

/**
 * Perform Apple Sign-In and exchange the identity token with Supabase.
 * Returns the Supabase auth response data.
 *
 * Apple only sends the user's name on the very first authorization,
 * so we capture it in user_metadata immediately.
 */
export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple Sign-In did not return an identity token.');
  }

  // Build display name from Apple's response (only provided on first auth)
  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) throw error;

  // Persist the user's name in Supabase metadata (Apple won't send it again)
  if (fullName && data.user) {
    await supabase.auth.updateUser({
      data: { full_name: fullName, apple_user_id: credential.user },
    });
  } else if (data.user) {
    await supabase.auth.updateUser({ data: { apple_user_id: credential.user } });
  }

  return data;
}

export function isAppleUser(user: User): boolean {
  const providers = user.app_metadata?.providers;
  return user.app_metadata?.provider === 'apple'
    || (Array.isArray(providers) && providers.includes('apple'))
    || Boolean(user.identities?.some((identity) => identity.provider === 'apple'));
}

function appleUserIdentifier(user: User): string | null {
  const metadataId = user.user_metadata?.apple_user_id;
  if (typeof metadataId === 'string' && metadataId.length > 0) return metadataId;
  const identity = user.identities?.find((candidate) => candidate.provider === 'apple');
  const identitySubject = identity?.identity_data?.sub ?? identity?.id;
  return typeof identitySubject === 'string' && identitySubject.length > 0
    ? identitySubject
    : null;
}

/** Gets a fresh, single-use code that the deletion function exchanges and revokes server-side. */
export async function getAppleDeletionAuthorizationCode(user: User): Promise<string | undefined> {
  if (!isAppleUser(user)) return undefined;
  const appleUserId = appleUserIdentifier(user);
  if (!appleUserId) throw new Error('Sign in with Apple must be refreshed before deleting this account.');
  const credential = await AppleAuthentication.refreshAsync({ user: appleUserId });
  if (!credential.authorizationCode) {
    throw new Error('Apple did not return an account-deletion authorization code.');
  }
  return credential.authorizationCode;
}

/**
 * Check whether an error is an Apple Sign-In cancellation (user dismissed the sheet).
 */
export function isAppleCancellation(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as Error & { code: string }).code === 'ERR_REQUEST_CANCELED'
  );
}
