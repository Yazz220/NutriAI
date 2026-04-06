import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Heart, ChefHat, ChevronRight, LogOut } from 'lucide-react-native';
import { useUserProfileStore } from '../../hooks/useEnhancedUserProfile';
import { useAuth } from '../../hooks/useAuth';
import { DietaryPreferencesSection } from './DietaryPreferencesSection';
import { CookingPreferencesSection } from './CookingPreferencesSection';
import { Colors } from '../../constants/colors';
import { Spacing, Typography, Radii, Shadows } from '../../constants/spacing';
import { useToast } from '@/contexts/ToastContext';

type SheetSection = 'dietary' | 'cooking' | null;

export default function EnhancedProfileScreen() {
  const { profile, isLoading } = useUserProfileStore();
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetSection, setSheetSection] = useState<SheetSection>(null);
  const insets = useSafeAreaInsets();
  const [kbHeight, setKbHeight] = useState(0);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setSheetSection(null);
  }, []);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates?.height ?? 0));
    const subHide = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => { subShow.remove(); subHide.remove(); };
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              showToast({ type: 'success', message: 'Signed out successfully' });
            } catch (error) {
              showToast({ type: 'error', message: 'Sign out failed. Please try again.' });
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const email = user?.email || '';
  const displayName = profile?.name || email.split('@')[0] || 'Foodie';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(150, (insets?.bottom ?? 0) + 118) }}
        >
          {/* Hero Profile Card */}
          <View style={styles.heroCard}>
            <View style={styles.avatarCircle}>
              <User size={36} color={Colors.lightText} />
            </View>
            <Text style={styles.userName}>{displayName}</Text>
            {email ? <Text style={styles.userEmail}>{email}</Text> : null}
          </View>

          {/* Preferences */}
          <View style={styles.menuSection}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setSheetSection('dietary'); setSheetVisible(true); }}
            >
              <View style={styles.menuIconContainer}>
                <Heart size={20} color={Colors.text} />
              </View>
              <Text style={styles.menuText}>Dietary Preferences</Text>
              <ChevronRight size={20} color={Colors.lightText} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => { setSheetSection('cooking'); setSheetVisible(true); }}
            >
              <View style={styles.menuIconContainer}>
                <ChefHat size={20} color={Colors.text} />
              </View>
              <Text style={styles.menuText}>Cooking Preferences</Text>
              <ChevronRight size={20} color={Colors.lightText} />
            </TouchableOpacity>
          </View>

          {/* Account */}
          <View style={styles.menuSection}>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={handleLogout}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: Colors.error + '20' }]}>
                <LogOut size={20} color={Colors.error} />
              </View>
              <Text style={[styles.menuText, { color: Colors.error }]}>Sign Out</Text>
              <ChevronRight size={20} color={Colors.lightText} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Slide-up sheet for profile sections */}
      <Modal
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        visible={sheetVisible}
        onRequestClose={closeSheet}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeSheet} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets?.bottom ?? 0, kbHeight) }]}>
              <View style={styles.sheetHandle} />
              {sheetSection === 'dietary' && (
                <DietaryPreferencesSection onBack={closeSheet} />
              )}
              {sheetSection === 'cooking' && (
                <CookingPreferencesSection onBack={closeSheet} />
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: Typography.sizes.md,
    color: Colors.lightText,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  userName: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
  },
  menuSection: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    borderRadius: 20,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    flex: 1,
    fontWeight: '500',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    height: '85%',
    overflow: 'hidden',
    zIndex: 2,
    elevation: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
});
