import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onResetPassword = async () => {
    setError(null);
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const redirectTo = process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset email.';
      setError(msg);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      title={sent ? 'Check your email' : 'Reset your password'}
      subtitle={
        sent
          ? 'Use the reset link to choose a new password, then return to your cookbook shelf.'
          : "Enter your email and we'll send you a reset link."
      }
      compactHeader={sent}
    >
      {sent ? (
        <View style={styles.sentContainer}>
          <Text style={styles.sentText}>
            We sent a password reset link to <Text style={styles.sentEmail}>{email}</Text>.
          </Text>
          <Button title="Back to sign in" onPress={() => router.replace('/(auth)/sign-in')} />
          <Button
            title="Resend email"
            variant="secondary"
            onPress={onResetPassword}
            loading={loading}
            disabled={loading}
          />
        </View>
      ) : (
        <>
          <Input
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            leftIcon={<Mail size={18} color={Colors.textMuted} />}
            autoFocus
          />

          {error ? <Text style={styles.error} selectable>{error}</Text> : null}

          <Button
            title="Send reset link"
            onPress={onResetPassword}
            loading={loading}
            disabled={loading}
          />

          <Pressable style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.link}>Back to sign in</Text>
          </Pressable>
        </>
      )}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  sentContainer: {
    gap: Spacing.md,
  },
  sentText: {
    fontSize: Typography.sizes.md,
    color: Colors.slate,
    lineHeight: Typography.metrics.lineHeight24,
  },
  sentEmail: {
    color: Colors.text,
    fontWeight: '600',
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
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
