import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { EnvelopeSimple, ArrowLeft } from 'phosphor-react-native';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onResetPassword = async () => {
    setError(null);
    if (!email) {
      setError('Please enter your email address');
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
      const msg = err instanceof Error ? err.message : 'Failed to send reset email';
      setError(msg);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ExpoLinearGradient
        colors={Colors.chart.gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.statusBarSpacer} />
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {sent
              ? 'Check your inbox for a reset link'
              : "Enter your email and we'll send you a reset link"}
          </Text>
        </View>
      </ExpoLinearGradient>

      <View style={styles.formContainer}>
        {sent ? (
          <View style={styles.sentContainer}>
            <Text style={styles.sentText}>
              We sent a password reset link to <Text style={styles.sentEmail}>{email}</Text>.
              Check your inbox (and spam folder).
            </Text>
            <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/sign-in')}>
              <Text style={styles.buttonText}>Back to Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resendButton} onPress={onResetPassword} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Text style={styles.resendText}>Resend email</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <EnvelopeSimple size={20} color={Colors.lightText} />
                <TextInput
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.lightText}
                  autoFocus
                />
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity style={styles.button} onPress={onResetPassword} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.buttonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
              <Text style={styles.backLinkText}>Back to Sign In</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    minHeight: 240,
  },
  statusBarSpacer: {
    height: Platform.OS === 'ios' ? 44 : 24,
  },
  backButton: {
    marginTop: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontWeight: Typography.weights.medium,
    paddingHorizontal: 20,
  },
  formContainer: {
    flex: 1,
    padding: 20,
    marginTop: -20,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    color: Colors.text,
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingLeft: 12,
    color: Colors.text,
    fontSize: 16,
  },
  button: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
    fontSize: 16,
  },
  backLink: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  backLinkText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: Typography.weights.medium,
  },
  error: {
    color: Colors.error,
    marginTop: 6,
  },
  sentContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  sentText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  sentEmail: {
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },
  resendButton: {
    marginTop: Spacing.lg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resendText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: Typography.weights.medium,
  },
});
