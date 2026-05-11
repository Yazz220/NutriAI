import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';

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
      data: { full_name: fullName },
    });
  }

  return data;
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
