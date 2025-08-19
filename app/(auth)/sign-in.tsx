import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/utils/supabaseClient';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { User, Mail, Lock, LogIn } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';

export default function SignInScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  // Prefill email if provided via navigation params (e.g., after sign-up)
  useEffect(() => {
    if (typeof params.email === 'string' && params.email) {
      setEmail(params.email);
    }
  }, [params.email]);

  const onSignIn = async () => {
    setError(null);
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      // Clear any stale session first (safety in dev)
      try { await supabase.auth.signOut(); } catch {}

      console.log('[Auth] Signing in with password', { email });
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        console.warn('[Auth] signInWithPassword error', authError);
        throw authError;
      }
      if (!data?.session) {
        console.warn('[Auth] signInWithPassword returned no session', data);
        setError('Sign-in did not return a session. Please try again or use Magic Link.');
        Alert.alert('Sign-in issue', 'We could not establish a session. Try again or use Magic Link.');
        return;
      }
      console.log('[Auth] Signed in, session received');
      // Force navigation to tabs (especially helpful on web)
      router.replace('/(tabs)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to sign in';
      setError(msg);
      Alert.alert('Sign in failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const onMagicLink = async () => {
    setError(null);
    if (!email) {
      setError('Please enter your email to receive a magic link');
      return;
    }
    setLoading(true);
    try {
      const redirectTo = process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL;
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });
      if (authError) throw authError;
      Alert.alert('Check your email', 'We sent you a magic sign-in link.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send magic link';
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
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      });
      if (authError) throw authError;
      // On native, this will open the browser to complete OAuth; session change handled on return
      if (data?.url) {
        // No-op; Supabase handles the URL opening in-app when necessary
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(msg);
      Alert.alert('OAuth error', msg);
    } finally {
      setLoading(false);
    }
  };

  const onGuest = async () => {
    setError(null);
    setLoading(true);
    try {
      // Requires Anonymous provider to be enabled in Supabase Auth settings
      const { error: authError } = await supabase.auth.signInAnonymously();
      if (authError) throw authError;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to sign in as guest';
      setError(msg);
      Alert.alert('Guest sign-in failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Enhanced Header with Gradient */}
      <ExpoLinearGradient
        colors={['#4facfe', '#00f2fe']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.statusBarSpacer} />
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <User size={32} color={Colors.white} />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue your nutrition journey</Text>
        </View>
      </ExpoLinearGradient>

      <View style={styles.formContainer}>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <Mail size={20} color={Colors.lightText} />
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
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <Lock size={20} color={Colors.lightText} />
            <TextInput
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.lightText}
            />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={onSignIn} disabled={loading}>
        {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={onMagicLink} disabled={loading}>
        <Text style={styles.secondaryText}>Send magic link</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.oauthButton} onPress={onOAuthGoogle} disabled={loading}>
        <Text style={styles.oauthText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.guestButton} onPress={onGuest} disabled={loading}>
        <Text style={styles.guestText}>Continue as guest (dev)</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don’t have an account?</Text>
          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>

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
    minHeight: 280,
  },
  statusBarSpacer: {
    height: Platform.OS === 'ios' ? 44 : 24,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
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
    fontWeight: '500',
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
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    shadowColor: '#000',
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
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    fontWeight: '700',
    fontSize: 16,
  },
  guestButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.lightGray,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  guestText: {
    color: Colors.text,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.card,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryText: {
    color: Colors.text,
    fontWeight: '600',
  },
  oauthButton: {
    marginTop: Spacing.md,
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  oauthText: {
    color: Colors.white,
    fontWeight: '600',
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
  error: {
    color: Colors.error,
    marginTop: 6,
  },
});