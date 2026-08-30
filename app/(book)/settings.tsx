import React, { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  Bot,
  LifeBuoy,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import { LibraryBackButton } from '@/components/navigation/LibraryBackButton';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import { useAuth } from '@/hooks/useAuth';
import { useCookbooks } from '@/hooks/useCookbooks';
import { deleteAccount } from '@/utils/account';
import { clearCachedPages, clearCachedShelf } from '@/utils/cookbook/cache';
import { PRIVACY_POLICY_URL, SUPPORT_URL } from '@/constants/legal';
import { useAiDataConsent } from '@/contexts/AiDataConsentContext';
import {
  getAppleDeletionAuthorizationCode,
  isAppleCancellation,
} from '@/utils/appleAuth';

export default function CookbookSettingsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const { cookbooks } = useCookbooks();
  const { reviewConsent } = useAiDataConsent();
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not sign out.';
      Alert.alert('Sign out failed', message);
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

    const cookbookIds = cookbooks.map((cookbook) => cookbook.id);
    setDeletingAccount(true);
    try {
      const appleAuthorizationCode = await getAppleDeletionAuthorizationCode(user);
      await deleteAccount(appleAuthorizationCode);

      const cleanupResults = await Promise.allSettled([
        clearCachedPages(cookbookIds),
        clearCachedShelf(user.id),
      ]);
      cleanupResults.forEach((result) => {
        if (result.status === 'rejected') {
          console.warn('[Settings] Local account cleanup failed', result.reason);
        }
      });

      queryClient.clear();
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (err) {
      if (isAppleCancellation(err)) return;
      const message = err instanceof Error ? err.message : 'Could not delete account.';
      Alert.alert('Delete account failed', message);
    } finally {
      setDeletingAccount(false);
    }
  }

  function confirmDeleteAccount() {
    if (deletingAccount) return;
    Alert.alert(
      'Delete account',
      'This permanently deletes your Nosh account, cookbooks, and recipe pages. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void handleDeleteAccount();
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
        <Section title="Overview">
          <Row icon={<Mail size={18} color={Colors.textSecondary} />} label="Email" value={user?.email ?? '-'} />
          <Row
            icon={<Sparkles size={18} color={Colors.textSecondary} />}
            label="Cookbooks"
            value={String(cookbooks.length)}
          />
        </Section>

        <Section title="Privacy and support">
          <ActionRow
            icon={<ShieldCheck size={18} color={Colors.textSecondary} />}
            label="Privacy policy"
            onPress={() => { void openLink(PRIVACY_POLICY_URL); }}
          />
          <ActionRow
            icon={<Bot size={18} color={Colors.textSecondary} />}
            label="AI data use"
            onPress={reviewConsent}
          />
          <ActionRow
            icon={<LifeBuoy size={18} color={Colors.textSecondary} />}
            label="Help and support"
            onPress={() => { void openLink(SUPPORT_URL); }}
          />
        </Section>

        <Section title="Account actions">
          <ActionRow
            icon={<LogOut size={18} color={Colors.text} />}
            label={signingOut ? 'Signing out…' : 'Sign out'}
            onPress={handleSignOut}
            disabled={signingOut || deletingAccount}
            busy={signingOut}
          />
          <ActionRow
            icon={<Trash2 size={18} color={Colors.error} />}
            label={deletingAccount ? 'Deleting account…' : 'Delete account'}
            destructive
            onPress={confirmDeleteAccount}
            disabled={deletingAccount || signingOut}
            busy={deletingAccount}
          />
        </Section>

        <Text style={styles.footer}>Nosh v0.1</Text>
      </ScrollView>
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

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
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
  onPress,
  destructive,
  disabled,
  busy,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      style={[styles.row, styles.actionRow, disabled && styles.actionRowDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
    >
      <View style={styles.rowIcon}>{icon}</View>
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
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  section: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Fonts.ui.medium,
    letterSpacing: Typography.metrics.letterSpacing10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  sectionBody: {
  },
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
  actionRowDisabled: {
    opacity: 0.5,
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
