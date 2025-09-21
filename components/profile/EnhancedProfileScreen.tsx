import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Edit3, Target, ChefHat, Settings, ArrowLeft, ChevronRight, LogOut } from 'lucide-react-native';
import HeartIcon from '@/assets/icons/Heart.svg';
import CameraIcon from '@/assets/icons/Camera.svg';
import { useUserProfileStore } from '../../hooks/useEnhancedUserProfile';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../supabase/functions/_shared/supabaseClient';
import { PersonalInfoSection } from './PersonalInfoSection';
import { DietaryPreferencesSection } from './DietaryPreferencesSection';
import { HealthGoalsSection } from './HealthGoalsSection';
import { CookingPreferencesSection } from './CookingPreferencesSection';
import { Colors } from '../../constants/colors';
import { Spacing, Typography, Radii, Shadows } from '../../constants/spacing';

type ProfileSection = 'overview' | 'personal' | 'dietary' | 'goals' | 'cooking';

export default function EnhancedProfileScreen() {
  const { profile, isLoading } = useUserProfileStore();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<ProfileSection>('overview');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetSection, setSheetSection] = useState<Exclude<ProfileSection, 'overview'> | null>(null);

  const closeSheet = () => { setSheetVisible(false); setSheetSection(null); };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => supabase.auth.signOut()
        }
      ]
    );
  };

  const renderSectionContent = () => {
    // Main area shows overview only; detail pages are shown in slide-up sheet
    return renderOverview();
  };

  const renderOverview = () => (
    <ScrollView style={styles.overview} showsVerticalScrollIndicator={false}>
      {/* Header icons removed (non-functional) */}

      {/* Hero Profile Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroBackground} />
        <View style={styles.heroContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <User size={32} color={Colors.lightText} />
            </View>
            <TouchableOpacity style={styles.cameraButton}>
              <CameraIcon width={16} height={16} color={Colors.white} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>{profile?.name || 'Yasir A'}</Text>
          <Text style={styles.joinDate}>Joined {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</Text>
          
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.height || '170'} cm</Text>
              <Text style={styles.statLabel}>Height</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.weight || '70'} kg</Text>
              <Text style={styles.statLabel}>Weight</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.age || '19'}</Text>
              <Text style={styles.statLabel}>Age</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Goals Card */}
      <View style={styles.goalsCard}>
        <View style={styles.goalsHeader}>
          <Target size={20} color={Colors.text} />
          <Text style={styles.goalsTitle}>Goals</Text>
        </View>
        <Text style={styles.goalsSubtitle}>You're tackling 1 goal right now, keep at it or add more!</Text>
        
        <View style={styles.goalItem}>
          <View style={styles.goalIcon}>
            <Target size={16} color={Colors.text} />
          </View>
          <View style={styles.goalContent}>
            <Text style={styles.goalName}>Lose Weight</Text>
            <Text style={styles.goalTarget}>-20 kg by November 16</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.manageGoalsButton}
          onPress={() => { setSheetSection('goals'); setSheetVisible(true); }}
        >
          <Text style={styles.manageGoalsText}>Manage goals</Text>
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => { setSheetSection('personal'); setSheetVisible(true); }}
        >
          <View style={styles.menuIconContainer}>
            <User size={20} color={Colors.text} />
          </View>
          <Text style={styles.menuText}>Personal Information</Text>
          <ChevronRight size={20} color={Colors.lightText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => { setSheetSection('dietary'); setSheetVisible(true); }}
        >
          <View style={styles.menuIconContainer}>
            <HeartIcon width={20} height={20} color={Colors.text} />
          </View>
          <Text style={styles.menuText}>Dietary Preferences</Text>
          <ChevronRight size={20} color={Colors.lightText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => { setSheetSection('cooking'); setSheetVisible(true); }}
        >
          <View style={styles.menuIconContainer}>
            <ChefHat size={20} color={Colors.text} />
          </View>
          <Text style={styles.menuText}>Cooking Preferences</Text>
          <ChevronRight size={20} color={Colors.lightText} />
        </TouchableOpacity>
      </View>

      {/* Account Section */}
      <View style={styles.accountSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <View style={styles.logoutIconContainer}>
            <LogOut size={20} color={Colors.error} />
          </View>
          <Text style={styles.logoutText}>Sign Out</Text>
          <ChevronRight size={20} color={Colors.lightText} />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  const renderHeader = () => null;

  const getSectionTitle = (section: ProfileSection): string => {
    switch (section) {
      case 'personal': return 'Personal Information';
      case 'dietary': return 'Dietary Preferences';
      case 'goals': return 'Health Goals';
      case 'cooking': return 'Cooking Preferences';
      default: return 'Profile';
    }
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

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <View style={styles.content}>
        {renderSectionContent()}
      </View>

      {/* Slide-up detail sheet for profile sections (partial height, bottom-aligned) */}
      <Modal
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        visible={sheetVisible}
        onRequestClose={closeSheet}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeSheet} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0} style={{ flex: 1 }}>
            <View style={styles.sheetContainer}>
              <View style={styles.sheetHandle} />
              {sheetSection === 'personal' && (
                <PersonalInfoSection onBack={closeSheet} />
              )}
              {sheetSection === 'dietary' && (
                <DietaryPreferencesSection onBack={closeSheet} />
              )}
              {sheetSection === 'goals' && (
                <HealthGoalsSection onBack={closeSheet} />
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
  
  // Header styles
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Hero card styles
  heroCard: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    marginTop: 0,
    marginBottom: Spacing.md,
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.md,
  },
  heroBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: '#B8860B', // Golden color from reference
  },
  heroContent: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  cameraButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  joinDate: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    marginBottom: Spacing.lg,
  },
  
  // Stats styles
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
  },
  
  // Goals card styles
  goalsCard: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: 16,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  goalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  goalsTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  goalsSubtitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  goalIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  goalContent: {
    flex: 1,
  },
  goalName: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  goalTarget: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
  },
  manageGoalsButton: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  manageGoalsText: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  
  // Account section styles
  accountSection: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  logoutIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.error + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  logoutText: {
    fontSize: Typography.sizes.md,
    color: Colors.error,
    flex: 1,
    fontWeight: '500',
  },
  
  bottomSpacer: {
    height: 16,
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '600',
    color: Colors.white,
    flex: 1,
    textAlign: 'center',
  },
  settingsButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  overview: {
    flex: 1,
  },
  
  // Profile Card Styles
  profileCard: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.md,
  },
  avatarContainer: {
    marginBottom: Spacing.md,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
  },
  userName: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  // Stats row removed
  
  // Preferences Card
  preferencesCard: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.md,
  },
  editButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  editButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.white,
  },
  
  // Menu Section
  menuSection: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
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
  
  // Help Section
  helpSection: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  helpTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.lightText,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  helpText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  
  // Loading States
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: Typography.sizes.md,
    color: Colors.lightText,
  },
  
  // Legacy styles (keeping for compatibility)
  welcomeCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  subtitleText: {
    fontSize: Typography.sizes.md,
    color: Colors.lightText,
    textAlign: 'center',
  },
});