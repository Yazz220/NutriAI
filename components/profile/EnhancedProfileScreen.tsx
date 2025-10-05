import React, { useEffect, useState } from 'react';
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
import { User, Edit3, Target, ChefHat, Settings, ArrowLeft, ChevronRight, LogOut, Heart } from 'lucide-react-native';
import { useUserProfileStore } from '../../hooks/useEnhancedUserProfile';
import { HealthGoal, GoalDirection } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { PersonalInfoSection } from './PersonalInfoSection';
import { DietaryPreferencesSection } from './DietaryPreferencesSection';
import { HealthGoalsSection } from './HealthGoalsSection';
import { CookingPreferencesSection } from './CookingPreferencesSection';
import { Colors } from '../../constants/colors';
import { Spacing, Typography, Radii, Shadows } from '../../constants/spacing';
import { useToast } from '@/contexts/ToastContext';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';
import { RecipeNutritionCard } from '@/components/recipe-detail/RecipeNutritionCard';

type ProfileSection = 'overview' | 'personal' | 'dietary' | 'goals' | 'cooking';

const GOAL_LABELS: Record<HealthGoal, string> = {
  'lose-weight': 'Lose weight',
  'maintain-weight': 'Maintain weight',
  'gain-weight': 'Gain weight',
  custom: 'Custom goal',
};

const GOAL_DIRECTION_COPY: Record<GoalDirection, string> = {
  lose: 'Dialing in a smart deficit to lean out steadily.',
  maintain: 'Keeping nutrition balanced to maintain your momentum.',
  gain: 'Fueling a healthy surplus to build strength and size.',
};

export default function EnhancedProfileScreen() {
  const { profile, isLoading } = useUserProfileStore();
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<ProfileSection>('overview');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetSection, setSheetSection] = useState<Exclude<ProfileSection, 'overview'> | null>(null);
  const insets = useSafeAreaInsets();
  const [kbHeight, setKbHeight] = useState(0);

  const closeSheet = () => { setSheetVisible(false); setSheetSection(null); };

  // Track keyboard to avoid sheet collapsing behind it
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
              Alert.alert('Sign out failed', error instanceof Error ? error.message : 'Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderSectionContent = () => {
    // Main area shows overview only; detail pages are shown in slide-up sheet
    return renderOverview();
  };

    const renderOverview = () => {
    const typedGoal = (profile?.healthGoals ?? [])[0] as HealthGoal | undefined;
    const goalDirection: GoalDirection = profile?.goalDirection ?? 'maintain';
    const hasGoal = Boolean(typedGoal);
    const goalLabel = hasGoal
      ? typedGoal === 'custom'
        ? profile?.customGoalTitle?.trim() || GOAL_LABELS[typedGoal as HealthGoal]
        : GOAL_LABELS[typedGoal as HealthGoal]
      : 'Choose a goal to personalize your plan';
    const directionCopy = GOAL_DIRECTION_COPY[goalDirection];
    const goalDescription = hasGoal
      ? typedGoal === 'custom'
        ? profile?.customGoalMotivation?.trim() || directionCopy
        : directionCopy
      : 'Tap "Manage goals" to set your focus.';
    const calorieSummary = profile?.dailyCalorieTarget
      ? `${profile.dailyCalorieTarget} kcal / day`
      : 'No calorie target yet';
    const macroSummaryParts = [
      profile?.dailyProteinTarget ? `P${profile.dailyProteinTarget}` : null,
      profile?.dailyCarbTarget ? `C${profile.dailyCarbTarget}` : null,
      profile?.dailyFatTarget ? `F${profile.dailyFatTarget}` : null,
    ].filter(Boolean) as string[];
    const goalStats = hasGoal
      ? macroSummaryParts.length > 0
        ? `${calorieSummary} | ${macroSummaryParts.join(' / ')}`
        : calorieSummary
      : 'Set calories and macros to unlock deeper tracking.';

    return (
      <ScrollView
        style={styles.overview}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(150, (insets?.bottom ?? 0) + 118) }}
      >
        {/* Header icons removed (non-functional) */}

        {/* Hero Profile Card */}
        <ProgressCardContainer style={styles.heroCard} padding={0}>
          <View style={styles.heroInner}>
            <View style={styles.heroBackground} />
            <View style={styles.heroContent}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarCircle}>
                  <User size={32} color={Colors.lightText} />
                </View>
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
        </ProgressCardContainer>

        {/* Goals Card */}
        <ProgressCardContainer style={styles.goalsCard} padding={Spacing.xl}>
          <View style={styles.goalsHeader}>
            <View style={styles.goalsIconContainer}>
              <Target size={20} color={Colors.secondary} />
            </View>
            <Text style={styles.goalsTitle}>Your Goal</Text>
          </View>
          
          <Text style={styles.goalLabel}>{goalLabel}</Text>
          
          {/* Nutrition Display with Ring and Bars */}
          {profile?.dailyCalorieTarget && (
            <RecipeNutritionCard
              calories={profile.dailyCalorieTarget}
              protein={profile.dailyProteinTarget || 0}
              carbs={profile.dailyCarbTarget || 0}
              fats={profile.dailyFatTarget || 0}
              showGrams={true}
            />
          )}
          
          <TouchableOpacity 
            style={styles.manageGoalsButton}
            onPress={() => { setSheetSection('goals'); setSheetVisible(true); }}
          >
            <Text style={styles.manageGoalsText}>Edit Goal</Text>
            <ChevronRight size={18} color={Colors.primary} />
          </TouchableOpacity>
        </ProgressCardContainer>

        {/* Menu Items */}
        <ProgressCardContainer style={styles.menuSection} padding={0}>
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
              <Heart size={20} color={Colors.text} />
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
        </ProgressCardContainer>

        {/* Account Section */}
        <ProgressCardContainer style={styles.accountSection} padding={0}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <View style={styles.logoutIconContainer}>
              <LogOut size={20} color={Colors.error} />
            </View>
            <Text style={styles.logoutText}>Sign Out</Text>
            <ChevronRight size={20} color={Colors.lightText} />
          </TouchableOpacity>
        </ProgressCardContainer>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

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
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets?.bottom ?? 0, kbHeight) }]}>
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
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  heroInner: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: Colors.card,
  },
  heroBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 132,
    backgroundColor: Colors.secondary,
  },
  heroContent: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
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
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: 20,
  },
  goalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  goalsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  goalsTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  goalLabel: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  manageGoalsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.md,
  },
  manageGoalsText: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.primary,
    marginRight: Spacing.xs,
  },
  
  // Account section styles
  accountSection: {
    marginHorizontal: Spacing.lg,
    borderRadius: 20,
    marginBottom: Spacing.lg,
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
    marginHorizontal: Spacing.lg,
    borderRadius: 20,
    marginBottom: Spacing.lg,
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
