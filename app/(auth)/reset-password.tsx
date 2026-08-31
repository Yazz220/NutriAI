import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LockKeyhole } from 'lucide-react-native';
import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setHasSession(!!data.session);
      })
      .catch(() => {
        if (!mounted) return;
        setHasSession(false);
      })
      .finally(() => {
        if (!mounted) return;
        setCheckingSession(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function updatePassword() {
    setError(null);

    if (!hasSession) {
      setError('Open the password reset link from your email again.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      Alert.alert('Password updated', 'Sign in with your new password to return to your cookbooks.', [
        {
          text: 'OK',
          onPress: () => router.replace('/(auth)/sign-in'),
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update password.';
      setError(message);
      Alert.alert('Reset failed', message);
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <View style={[styles.container, styles.centered]}>
        <LoadingSpinner text="Opening reset link…" />
      </View>
    );
  }

  return (
    <AuthScaffold
      title="Set a new password"
      subtitle="Choose a new password, then sign back in to your cookbook shelf."
      compactHeader
    >
      {!hasSession ? (
        <Text style={styles.notice}>Open the password reset link from your email again.</Text>
      ) : null}

      <Input
        label="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="New password"
        editable={!loading && hasSession}
        leftIcon={<LockKeyhole size={18} color={Colors.textMuted} />}
      />
      <Input
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="Confirm password"
        editable={!loading && hasSession}
        leftIcon={<LockKeyhole size={18} color={Colors.textMuted} />}
      />

      {error ? <Text style={styles.error} selectable>{error}</Text> : null}

      <Button
        title="Update password"
        onPress={updatePassword}
        loading={loading}
        disabled={!hasSession || loading}
      />

      <Pressable
        style={styles.backLink}
        onPress={() => router.replace('/(auth)/sign-in')}
        disabled={loading}
      >
        <Text style={styles.link}>Back to sign in</Text>
      </Pressable>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    color: Colors.textSecondary,
    paddingVertical: Spacing.xs,
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
    paddingVertical: Spacing.xs,
  },
});
