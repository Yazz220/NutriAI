import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { Link, router } from 'expo-router';
import { LockKeyhole, Mail } from 'lucide-react-native';
import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
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
        autoComplete="new-password"
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        leftIcon={<LockKeyhole size={18} color={Colors.textMuted} />}
      />
      <Input
        label="Confirm password"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign up with Apple"
            onPress={onAppleSignUp}
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
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
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
});
