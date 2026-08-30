import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { Link, router } from 'expo-router';
import { LockKeyhole, Mail } from 'lucide-react-native';
import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import { supabase } from '@/lib/supabase';
import { isAppleCancellation, isAppleSignInAvailable, signInWithApple } from '@/utils/appleAuth';
import { getUserFriendlyErrorMessage, withTimeout } from '@/utils/networkTimeout';
import { useNoshNativeShare } from '@/contexts/NoshNativeShareContext';
import { requestFirstRunOnboardingReset } from '@/utils/cookbook/firstRunOnboarding';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [resettingOnboarding, setResettingOnboarding] = useState(false);
  const { receipt } = useNoshNativeShare();

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const onSignIn = async () => {
    setError(null);
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await withTimeout(supabase.auth.signOut(), 5000).catch(() => {});

      const { data, error: authError } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        30000,
      );
      if (authError) throw authError;
      if (!data?.session) {
        setError('Sign-in did not return a session. Please try again.');
        return;
      }
      router.replace('/(book)');
    } catch (err) {
      const msg = getUserFriendlyErrorMessage(err);
      setError(msg);
      Alert.alert('Sign in failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const onAppleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithApple();
      router.replace('/(book)');
    } catch (err) {
      if (isAppleCancellation(err)) return;
      const msg = err instanceof Error ? err.message : 'Apple sign-in failed.';
      setError(msg);
      Alert.alert('Apple Sign-In error', msg);
    } finally {
      setLoading(false);
    }
  };

  const onResetOnboarding = async () => {
    setResettingOnboarding(true);
    try {
      await requestFirstRunOnboardingReset();
      Alert.alert(
        'Onboarding reset is ready',
        'Sign in with any account to replay first-run onboarding. Your cookbooks will not be changed.',
      );
    } catch {
      Alert.alert('Could not reset onboarding', 'Please try again.');
    } finally {
      setResettingOnboarding(false);
    }
  };

  return (
    <AuthScaffold
      title="Return to your cookbook shelf"
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>New to Nosh?</Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable>
              <Text style={styles.link}>Create an account</Text>
            </Pressable>
          </Link>
        </View>
      }
    >
      {receipt.status === 'waiting_for_sign_in' ? (
        <View style={styles.shareNotice} accessibilityRole="alert">
          <Text style={styles.shareNoticeTitle}>Sign in to save your shared recipe</Text>
          <Text style={styles.shareNoticeCopy}>The private handoff is waiting on this device. Nosh will save it after authentication.</Text>
        </View>
      ) : null}
      <Input
        label="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        spellCheck={false}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        leftIcon={<Mail size={18} color={Colors.textMuted} />}
      />
      <Input
        label="Password"
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        leftIcon={<LockKeyhole size={18} color={Colors.textMuted} />}
      />

      <Link href="/(auth)/forgot-password" asChild>
        <Pressable style={styles.forgotPassword}>
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>
      </Link>

      {error ? <Text style={styles.error} selectable>{error}</Text> : null}

      <Button title="Sign in" onPress={onSignIn} loading={loading} disabled={loading} />

      {appleAvailable ? (
        loading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with Apple"
            onPress={onAppleSignIn}
            style={({ pressed }) => [styles.appleButton, pressed && styles.appleButtonPressed]}
          >
            <Image
              source={require('../../assets/auth/apple-sign-in-logo-black.png')}
              style={styles.appleButtonImage}
              accessible={false}
            />
          </Pressable>
        )
      ) : null}

      {__DEV__ ? (
        <Button
          title="Reset onboarding after sign-in"
          variant="ghost"
          size="sm"
          onPress={onResetOnboarding}
          loading={resettingOnboarding}
          disabled={loading || resettingOnboarding}
          accessibilityHint="Replays first-run onboarding for the next account that signs in without changing its cookbooks"
          testID="reset-onboarding-button"
        />
      ) : null}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  forgotPassword: {
    alignSelf: 'flex-end',
    paddingVertical: Spacing.xs,
  },
  appleButton: {
    alignSelf: 'center',
    height: 44,
    width: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  appleButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  appleButtonImage: {
    height: 44,
    width: 44,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textMuted,
  },
  link: {
    color: Colors.deepOcean,
    fontWeight: '500',
  },
  error: {
    color: Colors.error,
    paddingVertical: Spacing.xs,
  },
  shareNotice: { gap: Spacing.xs, borderRadius: Radii.sm, backgroundColor: Colors.parchment, padding: Spacing.md },
  shareNoticeTitle: { color: Colors.text, fontWeight: '600' },
  shareNoticeCopy: { color: Colors.textSecondary, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight18 },
});
