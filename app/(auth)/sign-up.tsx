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

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const onSignUp = async () => {
    setError(null);
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { data, error: authError } = await withTimeout(
        supabase.auth.signUp({ email, password }),
        30000,
      );
      if (authError) throw authError;

      if (data?.user && !data.session) {
        Alert.alert('Verify your email', 'We sent you a confirmation link. Verify it, then sign in.');
        router.replace({ pathname: '/(auth)/sign-in', params: { email } });
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
    } catch (err) {
      if (isAppleCancellation(err)) return;
      const msg = err instanceof Error ? err.message : 'Apple sign-up failed.';
      setError(msg);
      Alert.alert('Apple Sign-In error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      title="Start your personal cookbook"
      subtitle="Create a calm place for recipes, notes, and Nosh's help inside each page."
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable>
              <Text style={styles.link}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
      }
    >
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
      <Input
        label="Confirm password"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Confirm password"
        leftIcon={<LockKeyhole size={18} color={Colors.textMuted} />}
      />

      {error ? <Text style={styles.error} selectable>{error}</Text> : null}

      <Button title="Create account" onPress={onSignUp} loading={loading} disabled={loading} />

      {appleAvailable ? (
        loading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={8}
            style={styles.appleButton}
            onPress={onAppleSignUp}
          />
        )
      ) : null}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
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
});
