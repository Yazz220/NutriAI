import React, { useCallback, useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  LifeBuoy,
  LogOut,
  Mail,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import { NoshSymbol } from '@/components/brand/NoshBrandAssets';
import { CookingPreferencesSheet } from '@/components/settings/CookingPreferencesSheet';
import { SubscriptionPlanCard } from '@/components/subscription/SubscriptionPlanCard';
import { LibraryBackButton } from '@/components/navigation/LibraryBackButton';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { PRIVACY_POLICY_URL, SUPPORT_CONTACT_URL, TERMS_OF_USE_URL } from '@/constants/legal';
import { Spacing, Typography } from '@/constants/spacing';
import { useAiDataConsent } from '@/contexts/AiDataConsentContext';
import { useNoshConversation } from '@/contexts/NoshConversationContext';
import { useNoshSubscription } from '@/contexts/NoshSubscriptionContext';
import { useAuth } from '@/hooks/useAuth';
import { useCookbooks } from '@/hooks/useCookbooks';
import { deleteAccount } from '@/utils/account';
import { purgeLocalUserData } from '@/utils/accountCleanup';
import {
  loadCookingPreferences,
  saveCookingPreference,
  type CookingPreference,
} from '@/utils/cookbook/cookingPreferences';
import { Fonts } from '@/utils/fonts';
import { isEffectivePlusAccess } from '@/utils/subscriptions/access';
import { trackEvent } from '@/utils/analytics';
import {
  getAppleDeletionAuthorizationCode,
  isAppleCancellation,
} from '@/utils/appleAuth';

function deletionErrorMessage(): string {
  return 'Folio could not finish deleting your account. Please try again. If this keeps happening, contact support.';
}

export default function CookbookSettingsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const { cookbooks } = useCookbooks();
  const { isGranted, isReady, reviewConsent } = useAiDataConsent();
  const { open: openNosh } = useNoshConversation();
  const subscription = useNoshSubscription();
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [preferencesVisible, setPreferencesVisible] = useState(false);
  const [preferences, setPreferences] = useState<CookingPreference[]>([]);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [removingPreferenceId, setRemovingPreferenceId] = useState<string | null>(null);

  const refreshPreferences = useCallback(async () => {
    if (!user?.id) {
      setPreferences([]);
      return;
    }
    setPreferencesLoading(true);
    setPreferencesError(null);
    try {
      setPreferences(await loadCookingPreferences(user.id));
    } catch {
      setPreferencesError('Could not load preferences. Check your connection and try again.');
    } finally {
      setPreferencesLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refreshPreferences();
  }, [refreshPreferences]);

  async function clearCurrentUserData() {
    if (!user?.id) return;
    const result = await purgeLocalUserData({
      userId: user.id,
      cookbookIds: cookbooks.map((cookbook) => cookbook.id),
    });
    if (!result.complete) {
      console.warn('[Settings] Local account cleanup will retry', result.failed);
    }
  }

  async function handleSignOut() {
    if (signingOut || deletingAccount) return;
    setSigningOut(true);
    try {
      await clearCurrentUserData().catch((error) => {
        console.warn('[Settings] Local sign-out cleanup failed', error);
      });
      queryClient.clear();
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch {
      Alert.alert('Sign out failed', 'Folio could not sign you out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  }

  async function handleDeleteAccount() {
    if (deletingAccount) return;
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in again before deleting your account.');
      return;
    }

    setDeletingAccount(true);
    try {
      const appleAuthorizationCode = await getAppleDeletionAuthorizationCode(user);
      await deleteAccount(appleAuthorizationCode);
      await clearCurrentUserData().catch((error) => {
        console.warn('[Settings] Local account cleanup failed', error);
      });
      queryClient.clear();
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (error) {
      if (isAppleCancellation(error)) return;
      Alert.alert('Delete account failed', deletionErrorMessage());
    } finally {
      setDeletingAccount(false);
    }
  }

  function confirmDeleteAccount() {
    if (deletingAccount) return;
    const hasActivePlus = isEffectivePlusAccess(subscription.access);

    if (hasActivePlus) {
      const renewalCopy = subscription.access?.willRenew
        ? 'Your Folio Plus subscription is set to renew.'
        : 'Your Folio Plus access may remain active through the end of its current billing period.';
      Alert.alert(
        'Delete account',
        `${renewalCopy} Deleting your Folio account does not cancel or refund an App Store subscription. You can manage the subscription first, or delete your account immediately.\n\nThis permanently deletes your cookbooks, recipe sources and pages, conversations, and saved preferences. This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Manage subscription',
            onPress: () => {
              void subscription.manage().then((opened) => {
                if (!opened) {
                  trackEvent({
                    type: 'manage_subscription_failed',
                    data: { reason: 'account_deletion' },
                  });
                  Alert.alert('Could not open subscriptions', 'Please open App Store subscription settings and try again.');
                } else {
                  trackEvent({
                    type: 'manage_subscription_opened',
                    data: { reason: 'account_deletion' },
                  });
                }
              }).catch(() => {
                trackEvent({
                  type: 'manage_subscription_failed',
                  data: { reason: 'account_deletion' },
                });
                Alert.alert('Could not open subscriptions', 'Please open App Store subscription settings and try again.');
              });
            },
          },
          {
            text: 'Delete account',
            style: 'destructive',
            onPress: () => {
              void handleDeleteAccount();
            },
          },
        ],
      );
      return;
    }

    Alert.alert(
      'Delete account',
      'This permanently deletes your Folio account, cookbooks, recipe sources and pages, conversations, and saved preferences. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            void handleDeleteAccount();
          },
        },
      ],
    );
  }

  function confirmRemovePreference(preference: CookingPreference) {
    if (!user?.id || removingPreferenceId) return;
    Alert.alert(
      'Forget this preference?',
      `Folio will stop using "${preference.value}" as a saved ${preference.key.replaceAll('_', ' ')}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forget',
          style: 'destructive',
          onPress: () => {
            setRemovingPreferenceId(preference.id);
            void saveCookingPreference({
              userId: user.id,
              key: preference.key,
              value: preference.value,
              action: 'remove',
            })
              .then(() => {
                setPreferences((current) => current.filter((item) => item.id !== preference.id));
              })
              .catch(() => {
                Alert.alert('Could not forget preference', 'Please try again.');
              })
              .finally(() => {
                setRemovingPreferenceId(null);
              });
          },
        },
      ],
    );
  }

  async function openLink(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open link', 'Please try again when you are online.');
    }
  }

  const preferenceStatus = preferencesLoading
    ? 'Loading'
    : preferencesError
      ? 'Unavailable'
      : preferences.length === 0
        ? 'None saved'
        : `${preferences.length} saved`;
  const consentStatus = isReady ? (isGranted ? 'Allowed on this device' : 'Off') : 'Loading';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <LibraryBackButton />
        <Text style={styles.title}>Settings</Text>
        <View style={styles.topBarBalance} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Section title="Your plan">
          <SubscriptionPlanCard />
        </Section>

        <Section title="Overview">
          <InfoRow
            icon={<Mail size={19} color={Colors.textSecondary} />}
            label="Email"
            value={user?.email ?? '-'}
          />
          <InfoRow
            icon={<Sparkles size={19} color={Colors.textSecondary} />}
            label="Cookbooks"
            value={String(cookbooks.length)}
          />
          <ActionRow
            icon={<SlidersHorizontal size={19} color={Colors.textSecondary} />}
            label="Cooking preferences"
            accessibilityLabel={`Cooking preferences, ${preferenceStatus}`}
            onPress={() => setPreferencesVisible(true)}
          />
        </Section>

        <Section title="Privacy and support">
          <ActionRow
            icon={<ScrollText size={19} color={Colors.textSecondary} />}
            label="Terms of use"
            role="link"
            onPress={() => {
              void openLink(TERMS_OF_USE_URL);
            }}
          />
          <ActionRow
            icon={<ShieldCheck size={19} color={Colors.textSecondary} />}
            label="Privacy policy"
            role="link"
            onPress={() => {
              void openLink(PRIVACY_POLICY_URL);
            }}
          />
          <ActionRow
            icon={<NoshSymbol size={24} />}
            label="AI data use"
            accessibilityLabel={`AI data use, ${consentStatus}`}
            onPress={reviewConsent}
            disabled={!isReady}
          />
          <ActionRow
            icon={<LifeBuoy size={19} color={Colors.textSecondary} />}
            label="Help and support"
            role="link"
            onPress={() => {
              void openLink(SUPPORT_CONTACT_URL);
            }}
          />
        </Section>

        <Section title="Account actions">
          <ActionRow
            icon={<LogOut size={19} color={Colors.text} />}
            label={signingOut ? 'Signing out...' : 'Sign out'}
            onPress={() => {
              void handleSignOut();
            }}
            disabled={signingOut || deletingAccount}
            busy={signingOut}
          />
          <ActionRow
            icon={<Trash2 size={19} color={Colors.error} />}
            label={deletingAccount ? 'Deleting account...' : 'Delete account'}
            destructive
            onPress={confirmDeleteAccount}
            disabled={deletingAccount || signingOut}
            busy={deletingAccount}
          />
        </Section>

        <Text style={styles.footer}>Folio v{version}</Text>
      </ScrollView>

      <CookingPreferencesSheet
        visible={preferencesVisible}
        preferences={preferences}
        loading={preferencesLoading}
        error={preferencesError}
        removingId={removingPreferenceId}
        onClose={() => setPreferencesVisible(false)}
        onRetry={() => {
          void refreshPreferences();
        }}
        onRemove={confirmRemovePreference}
        onOpenNosh={() => {
          setPreferencesVisible(false);
          openNosh('shelf-nosh', { kind: 'collection' });
        }}
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function RowIcon({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.rowIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {children}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}, ${value}`}>
      <RowIcon>{icon}</RowIcon>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  accessibilityLabel,
  onPress,
  destructive,
  disabled,
  busy,
  role = 'button',
}: {
  icon: React.ReactNode;
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  busy?: boolean;
  role?: 'button' | 'link';
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        styles.actionRow,
        pressed && !disabled && styles.actionRowPressed,
        disabled && styles.actionRowDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, busy }}
    >
      <RowIcon>{icon}</RowIcon>
      <Text style={[styles.rowLabel, destructive && styles.destructiveText]}>{label}</Text>
      <ChevronRight size={18} color={Colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight38,
    letterSpacing: Typography.metrics.letterSpacing0,
    color: Colors.text,
    textAlign: 'center',
  },
  topBarBalance: {
    width: 44,
    height: 44,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.metrics.letterSpacing10,
    textTransform: 'uppercase',
  },
  sectionBody: {},
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.ash,
  },
  actionRow: {
    minHeight: 56,
  },
  actionRowPressed: {
    backgroundColor: Colors.backgroundSecondary,
  },
  actionRowDisabled: {
    opacity: Colors.state.disabledOpacity,
  },
  rowIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
  },
  rowValue: {
    color: Colors.slate,
    fontSize: Typography.sizes.md,
    maxWidth: '50%',
  },
  destructiveText: {
    color: Colors.error,
  },
  footer: {
    color: Colors.textTertiary,
    fontSize: Typography.sizes.md,
    textAlign: 'center',
    paddingTop: Spacing.lg,
  },
});
