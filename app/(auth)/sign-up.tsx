import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { resetOnboarding } from '@/components/onboarding';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useUserProfile } from '@/hooks/useUserProfile';
import { OnboardingPersistenceManager } from '@/utils/onboardingPersistence';
import { OnboardingProfileIntegration } from '@/utils/onboardingProfileIntegration';
import { withTimeout, getUserFriendlyErrorMessage } from '@/utils/networkTimeout';
import { isAppleSignInAvailable, signInWithApple, isAppleCancellation } from '@/utils/appleAuth';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const { saveProfile } = useUserProfile();

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const onSignUp = async () => {
    setError(null);
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      // Add timeout to auth request
      const { data, error: authError } = await withTimeout(
        supabase.auth.signUp({ email, password }),
        30000
      );
      if (authError) throw authError;
      
      // Check if we have onboarding data to sync
      const onboardingData = await OnboardingPersistenceManager.loadOnboardingData();
      
      if (data?.user && !data.session) {
        // Email confirmation required - user will sign in later
        Alert.alert('Verify your email', 'We sent you a confirmation link. Please verify, then sign in.');
        // Navigate to sign-in with email prefilled
        router.replace({ pathname: '/(auth)/sign-in', params: { email } });
      } else if (data?.user && data?.session) {
        // Session created immediately - sync onboarding data now
        if (onboardingData) {
          try {
            console.log('[SignUp] Syncing onboarding data to profile...');
            const profileData = OnboardingProfileIntegration.mapOnboardingToProfile(onboardingData);
            
            // Retry logic for profile save with timeout
            let retries = 3;
            let lastError: Error | null = null;
            while (retries > 0) {
              try {
                await withTimeout(saveProfile(profileData), 15000);
                await OnboardingPersistenceManager.clearOnboardingData();
                console.log('[SignUp] Onboarding data synced successfully');
                break;
              } catch (retryError) {
                lastError = retryError as Error;
                retries--;
                if (retries > 0) {
                  console.log(`[SignUp] Retry ${3 - retries}/3 after error:`, retryError);
                  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
                }
              }
            }
            
            if (retries === 0 && lastError) {
              throw lastError;
            }
          } catch (syncError) {
            console.error('[SignUp] Failed to sync onboarding data after retries:', syncError);
            
            // Offer retry option
            return new Promise<void>((resolve) => {
              Alert.alert(
                'Profile Sync Issue',
                'We couldn\'t save your health preferences. Would you like to retry?',
                [
                  {
                    text: 'Retry',
                    onPress: async () => {
                      setLoading(true);
                      try {
                        const profileData = OnboardingProfileIntegration.mapOnboardingToProfile(onboardingData);
                        // Wrap saveProfile in Promise
                        await new Promise<void>((resolveProfile, rejectProfile) => {
                          const timeoutId = setTimeout(() => rejectProfile(new Error('Profile save timeout')), 15000);
                          try {
                            void saveProfile(profileData).then(() => {
                              clearTimeout(timeoutId);
                              resolveProfile();
                            }).catch((err) => {
                              clearTimeout(timeoutId);
                              rejectProfile(err);
                            });
                          } catch (err) {
                            clearTimeout(timeoutId);
                            rejectProfile(err);
                          }
                        });
                        await OnboardingPersistenceManager.clearOnboardingData();
                        Alert.alert('Success', 'Your preferences have been saved!');
                      } catch (retryError) {
                        Alert.alert('Still having issues?', 'Your account is ready. You can update preferences later in Settings.');
                      } finally {
                        setLoading(false);
                        resolve();
                      }
                    }
                  },
                  {
                    text: 'Continue',
                    onPress: () => resolve()
                  }
                ]
              );
            });
          }
        }
        // RootLayout will switch to the cookbook automatically
      }
    } catch (err) {
      const msg = getUserFriendlyErrorMessage(err);
      setError(msg);
      Alert.alert('Sign up failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const onAppleSignUp = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithApple();

      const onboardingData = await OnboardingPersistenceManager.loadOnboardingData();
      if (onboardingData) {
        try {
          const profileData = OnboardingProfileIntegration.mapOnboardingToProfile(onboardingData);
          await withTimeout(saveProfile(profileData), 15000);
          await OnboardingPersistenceManager.clearOnboardingData();
          console.log('[SignUp] Apple: onboarding data synced');
        } catch (syncError) {
          console.error('[SignUp] Apple: failed to sync onboarding data', syncError);
        }
      }
      // RootLayout will switch to the cookbook automatically
    } catch (err) {
      if (isAppleCancellation(err)) return;
      const msg = err instanceof Error ? err.message : 'Apple sign-up failed';
      setError(msg);
      Alert.alert('Apple Sign-In error', msg);
    } finally {
      setLoading(false);
    }
  };

  const devResetEnabled = process.env.EXPO_PUBLIC_DEV_RESET_ONBOARDING === 'true';

  const onDevResetOnboarding = async () => {
    try {
      await resetOnboarding();
      Alert.alert('Onboarding Reset', 'Onboarding data cleared. Launching onboarding…');
      router.replace('/(onboarding)');
    } catch (e) {
      Alert.alert('Reset Failed', 'Could not reset onboarding. Check logs.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Your AI kitchen buddy awaits</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={Colors.lightText}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={Colors.lightText}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          placeholder="••••••••"
          placeholderTextColor={Colors.lightText}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={onSignUp} disabled={loading}>
        {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.buttonText}>Create Account</Text>}
      </TouchableOpacity>

      {appleAvailable && (
        <>
          <Text style={styles.orDivider}>Or sign up with</Text>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={10}
            style={styles.appleButton}
            onPress={onAppleSignUp}
          />
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Link href="/(auth)/sign-in" asChild>
          <TouchableOpacity>
            <Text style={styles.link}>Sign In</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {devResetEnabled && (
        <TouchableOpacity style={styles.devResetLink} onPress={onDevResetOnboarding} accessibilityRole="button" accessibilityLabel="Reset onboarding (developer)">
          <Text style={styles.devResetText}>Reset onboarding (dev)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: Spacing.lg,
    color: Colors.lightText,
  },
  field: {
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: 6,
    color: Colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    color: Colors.text,
    backgroundColor: Colors.card,
  },
  button: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.lightText,
  },
  link: {
    color: Colors.primary,
    fontWeight: '600',
  },
  devResetLink: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  devResetText: {
    color: Colors.lightText,
    textDecorationLine: 'underline',
  },
  orDivider: {
    textAlign: 'center',
    color: Colors.lightText,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    fontSize: 14,
  },
  appleButton: {
    height: 44,
    width: '100%',
  },
  error: {
    color: Colors.error,
    marginTop: 6,
  },
});
