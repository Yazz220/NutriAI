import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Mail, 
  Lock, 
  User, 
  Shield, 
  ExternalLink,
  Eye,
  EyeOff 
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, Shadows } from '@/constants/spacing';
import { OnboardingLayout } from '../OnboardingLayout';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '../../../supabase/functions/_shared/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '../OnboardingProvider';
import { useOnboardingNavigation } from '@/hooks/useOnboardingNavigation';
import { useOnboardingAnalytics } from '@/hooks/useOnboardingAnalytics';
import { ONBOARDING_STEPS } from '@/constants/onboarding';

interface AuthMethod {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  action: () => Promise<void>;
}

export const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { session } = useAuth();
  const { updateUserData } = useOnboarding();
  const { navigateNext } = useOnboardingNavigation();
  const { trackUserChoice, trackError } = useOnboardingAnalytics();

  // Navigate to next step if already authenticated
  useEffect(() => {
    if (session) {
      updateUserData({ 
        authMethod: session.user.is_anonymous ? 'guest' : 'email' 
      });
      navigateNext();
    }
  }, [session, updateUserData, navigateNext]);

  const handleEmailAuth = async () => {
    setError(null);
    
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (isSignUp && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    
    try {
      let authError;
      
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL,
          },
        });
        authError = error;
        
        if (!authError) {
          Alert.alert(
            'Check your email',
            'We sent you a confirmation link to complete your registration.'
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        authError = error;
      }

      if (authError) throw authError;

      trackUserChoice({
        step: 1, // OnboardingStep.AUTH
        choiceType: 'auth_method',
        choiceValue: 'email',
        context: { isSignUp },
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
      trackError({
        step: 1, // OnboardingStep.AUTH
        errorType: 'auth_error',
        errorMessage: msg,
        context: { method: 'email', isSignUp },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const redirectTo = process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      });
      
      if (error) throw error;

      trackUserChoice({
        step: 1, // OnboardingStep.AUTH
        choiceType: 'auth_method',
        choiceValue: 'google',
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(msg);
      trackError({
        step: 1, // OnboardingStep.AUTH
        errorType: 'auth_error',
        errorMessage: msg,
        context: { method: 'google' },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const redirectTo = process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      });
      
      if (error) throw error;

      trackUserChoice({
        step: 1, // OnboardingStep.AUTH
        choiceType: 'auth_method',
        choiceValue: 'apple',
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Apple sign-in failed';
      setError(msg);
      trackError({
        step: 1, // OnboardingStep.AUTH
        errorType: 'auth_error',
        errorMessage: msg,
        context: { method: 'apple' },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAuth = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;

      trackUserChoice({
        step: 1, // OnboardingStep.AUTH
        choiceType: 'auth_method',
        choiceValue: 'guest',
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Guest sign-in failed';
      setError(msg);
      trackError({
        step: 1, // OnboardingStep.AUTH
        errorType: 'auth_error',
        errorMessage: msg,
        context: { method: 'guest' },
      });
    } finally {
      setLoading(false);
    }
  };

  const authMethods: AuthMethod[] = [
    {
      id: 'google',
      label: 'Continue with Google',
      icon: <Text style={styles.googleIcon}>G</Text>,
      color: '#4285F4',
      action: handleGoogleAuth,
    },
    ...(Platform.OS === 'ios' ? [{
      id: 'apple',
      label: 'Continue with Apple',
      icon: <Text style={styles.appleIcon}>🍎</Text>,
      color: '#000000',
      action: handleAppleAuth,
    }] : []),
    {
      id: 'guest',
      label: 'Continue as Guest',
      icon: <User size={20} color={Colors.lightText} />,
      color: Colors.card,
      action: handleGuestAuth,
    },
  ];

  const renderEmailForm = () => (
    <View style={styles.emailForm}>
      <View style={styles.formToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, !isSignUp && styles.toggleButtonActive]}
          onPress={() => setIsSignUp(false)}
        >
          <Text style={[styles.toggleText, !isSignUp && styles.toggleTextActive]}>
            Sign In
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, isSignUp && styles.toggleButtonActive]}
          onPress={() => setIsSignUp(true)}
        >
          <Text style={[styles.toggleText, isSignUp && styles.toggleTextActive]}>
            Sign Up
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email</Text>
        <View style={styles.inputContainer}>
          <Mail size={20} color={Colors.lightText} />
          <TextInput
            style={styles.textInput}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={Colors.lightText}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.inputContainer}>
          <Lock size={20} color={Colors.lightText} />
          <TextInput
            style={styles.textInput}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={Colors.lightText}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
          >
            {showPassword ? (
              <EyeOff size={20} color={Colors.lightText} />
            ) : (
              <Eye size={20} color={Colors.lightText} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {isSignUp && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Confirm Password</Text>
          <View style={styles.inputContainer}>
            <Lock size={20} color={Colors.lightText} />
            <TextInput
              style={styles.textInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.lightText}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeButton}
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color={Colors.lightText} />
              ) : (
                <Eye size={20} color={Colors.lightText} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Button
        title={isSignUp ? 'Create Account' : 'Sign In'}
        onPress={handleEmailAuth}
        variant="primary"
        size="lg"
        fullWidth={true}
        loading={loading}
        disabled={loading}
        style={styles.emailButton}
      />
    </View>
  );

  const renderSocialAuth = () => (
    <View style={styles.socialAuth}>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {authMethods.map((method) => (
        <TouchableOpacity
          key={method.id}
          style={[
            styles.socialButton,
            { backgroundColor: method.color },
            method.id === 'guest' && styles.guestButton,
          ]}
          onPress={method.action}
          disabled={loading}
        >
          {loading ? (
            <LoadingSpinner size="small" color={Colors.white} />
          ) : (
            <>
              {method.icon}
              <Text style={[
                styles.socialButtonText,
                method.id === 'guest' && styles.guestButtonText,
              ]}>
                {method.label}
              </Text>
            </>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPrivacyNote = () => (
    <View style={styles.privacySection}>
      <View style={styles.privacyHeader}>
        <Shield size={16} color={Colors.success} />
        <Text style={styles.privacyTitle}>Your data is secure</Text>
      </View>
      <Text style={styles.privacyText}>
        We use industry-standard encryption to protect your information. 
        Your data is never shared without your permission.
      </Text>
      <TouchableOpacity style={styles.privacyLink}>
        <Text style={styles.privacyLinkText}>Privacy Policy</Text>
        <ExternalLink size={14} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <OnboardingLayout
      title={ONBOARDING_STEPS.AUTH.title}
      subtitle={ONBOARDING_STEPS.AUTH.subtitle}
      showProgress={true}
      showSkip={false} // Auth cannot be skipped
    >
      <View style={styles.container}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {renderEmailForm()}
        {renderSocialAuth()}
        {renderPrivacyNote()}

        {/* Guest Mode Warning */}
        <View style={styles.guestWarning}>
          <Text style={styles.guestWarningText}>
            💡 Guest mode provides limited functionality. Create an account to save your preferences and sync across devices.
          </Text>
        </View>
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Error
  errorContainer: {
    backgroundColor: Colors.error + '20',
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.error + '40',
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
  },

  // Email Form
  emailForm: {
    marginBottom: Spacing.xl,
  },
  formToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.lightText,
  },
  toggleTextActive: {
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
  },

  // Input
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textInput: {
    flex: 1,
    fontSize: Typography.sizes.md,
    color: Colors.text,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  eyeButton: {
    padding: Spacing.xs,
  },
  emailButton: {
    marginTop: Spacing.md,
  },

  // Social Auth
  socialAuth: {
    marginBottom: Spacing.xl,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    paddingHorizontal: Spacing.md,
    fontWeight: Typography.weights.medium,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  guestButton: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  socialButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    marginLeft: Spacing.sm,
  },
  guestButtonText: {
    color: Colors.text,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  appleIcon: {
    fontSize: 16,
  },

  // Privacy
  privacySection: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  privacyTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  privacyText: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    lineHeight: Typography.sizes.sm * 1.4,
    marginBottom: Spacing.sm,
  },
  privacyLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  privacyLinkText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
    marginRight: Spacing.xs,
  },

  // Guest Warning
  guestWarning: {
    backgroundColor: Colors.warning + '20',
    borderRadius: 8,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning + '40',
  },
  guestWarningText: {
    fontSize: Typography.sizes.sm,
    color: Colors.warning,
    lineHeight: Typography.sizes.sm * 1.4,
    textAlign: 'center',
  },
});
