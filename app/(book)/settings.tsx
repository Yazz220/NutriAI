import React, { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  LogOut,
  Mail,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import { LibraryBackButton } from '@/components/navigation/LibraryBackButton';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import { useAuth } from '@/hooks/useAuth';
import { useCookbooks } from '@/hooks/useCookbooks';
import { deleteAccount } from '@/utils/account';
import { clearCachedPages, clearCachedShelf } from '@/utils/cookbook/cache';

export default function CookbookSettingsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const { cookbooks } = useCookbooks();
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
      await deleteAccount();

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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <LibraryBackButton />
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <Section title="Account">
          <Row icon={<Mail size={18} color={Colors.textSecondary} />} label="Email" value={user?.email ?? '-'} />
        </Section>

        {/* Stats */}
        <Section title="Your library">
          <Row
            icon={<Sparkles size={18} color={Colors.textSecondary} />}
            label="Cookbooks"
            value={String(cookbooks.length)}
          />
        </Section>

        {/* Danger zone */}
        <Section title="Account actions">
          <ActionRow
            icon={<LogOut size={18} color={Colors.text} />}
            label={signingOut ? 'Signing out...' : 'Sign out'}
            onPress={handleSignOut}
            disabled={signingOut || deletingAccount}
          />
          <ActionRow
            icon={<Trash2 size={18} color={Colors.error} />}
            label={deletingAccount ? 'Deleting account...' : 'Delete account'}
            destructive
            onPress={confirmDeleteAccount}
            disabled={deletingAccount || signingOut}
          />
        </Section>

        <Text style={styles.footer}>Nosh | Personal cookbook | v0.1</Text>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
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
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.row, styles.actionRow, disabled && styles.actionRowDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  title: {
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight38,
    letterSpacing: Typography.metrics.letterSpacing0,
    color: Colors.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Fonts.ui.medium,
    letterSpacing: Typography.metrics.letterSpacing0,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.sm,
  },
  sectionCard: {
    borderRadius: Radii.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.ash,
    overflow: 'hidden',
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.ash,
  },
  actionRow: {
    minHeight: 56,
  },
  actionRowDisabled: {
    opacity: 0.5,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.parchment,
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
