import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Link, router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { LockKeyhole, Mail } from 'lucide-react-native';
import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { supabase } from '@/lib/supabase';
import { isAppleCancellation, isAppleSignInAvailable, signInWithApple } from '@/utils/appleAuth';
import { getUserFriendlyErrorMessage, withTimeout } from '@/utils/networkTimeout';
import { useNoshNativeShare } from '@/contexts/NoshNativeShareContext';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
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
        setError('Sign-in did not return a session. Try again or use a magic link.');
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

  const onMagicLink = async () => {
    setError(null);
    if (!email) {
      setError('Enter your email to receive a magic link.');
      return;
    }
    setLoading(true);
    try {
      const redirectTo = process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL;
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (authError) throw authError;
      Alert.alert('Check your email', 'We sent you a magic sign-in link.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send magic link.';
      setError(msg);
      Alert.alert('Magic link error', msg);
    } finally {
      setLoading(false);
    }
  };

  const onOAuthGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const redirectTo = process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL;
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: false },
      });
      if (authError) throw authError;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setError(msg);
      Alert.alert('OAuth error', msg);
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

  return (
    <AuthScaffold
      title="Return to your cookbook shelf"
      subtitle="Sign in to keep reading, adding pages, and asking Nosh inside your recipes."
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
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        leftIcon={<Mail size={18} color={Colors.textMuted} />}
      />
      <Input
        label="Password"
        secureTextEntry
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
      <Button title="Send magic link" variant="secondary" onPress={onMagicLink} disabled={loading} />
      <Button title="Continue with Google" variant="secondary" onPress={onOAuthGoogle} disabled={loading} />

      {appleAvailable ? (
        loading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={8}
            style={styles.appleButton}
            onPress={onAppleSignIn}
          />
        )
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
    height: 44,
    width: '100%',
    borderRadius: Radii.sm,
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
    backgroundColor: Colors.errorLight,
    borderRadius: Radii.sm,
    padding: Spacing.sm,
  },
  shareNotice: { gap: Spacing.xs, borderRadius: Radii.sm, backgroundColor: Colors.parchment, padding: Spacing.md },
  shareNoticeTitle: { color: Colors.text, fontWeight: '600' },
  shareNoticeCopy: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
});
