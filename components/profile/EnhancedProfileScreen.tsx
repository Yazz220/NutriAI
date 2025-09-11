import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Edit3, Target, Heart, ChefHat, Settings, ArrowLeft, ChevronRight, Award, Clock } from 'lucide-react-native';
import { useUserProfileStore } from '../../hooks/useEnhancedUserProfile';
import { PersonalInfoSection } from './PersonalInfoSection';
import { DietaryPreferencesSection } from './DietaryPreferencesSection';
import { HealthGoalsSection } from './HealthGoalsSection';
import { CookingPreferencesSection } from './CookingPreferencesSection';
import { Colors } from '../../constants/colors';
import { Spacing, Typography, Radii, Shadows } from '../../constants/spacing';

type ProfileSection = 'overview' | 'personal' | 'dietary' | 'goals' | 'cooking';

export default function EnhancedProfileScreen() {
  const { profile, isLoading } = useUserProfileStore();
  const [activeSection, setActiveSection] = useState<ProfileSection>('overview');

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'personal':
        return <PersonalInfoSection onBack={() => setActiveSection('overview')} />;
      case 'dietary':
        return <DietaryPreferencesSection onBack={() => setActiveSection('overview')} />;
      case 'goals':
        return <HealthGoalsSection onBack={() => setActiveSection('overview')} />;
      case 'cooking':
        return <CookingPreferencesSection onBack={() => setActiveSection('overview')} />;
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <ScrollView style={styles.overview} showsVerticalScrollIndicator={false}>
      {/* Profile Header Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>
              {(profile?.name || 'User').charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.userName}>{profile?.name || 'Alex Smith'}</Text>
        
        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.healthGoals?.length || 0}</Text>
            <Text style={styles.statLabel}>Goals</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.dietaryRestrictions?.length || 0}</Text>
            <Text style={styles.statLabel}>Restrictions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.preferredCuisines?.length || 0}</Text>
            <Text style={styles.statLabel}>Cuisines</Text>
          </View>
        </View>
      </View>

      {/* Preferences Settings Card */}
      <View style={styles.preferencesCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Settings size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Preference Settings</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setActiveSection('personal')}
        >
          <View style={styles.menuIconContainer}>
            <User size={20} color={Colors.text} />
          </View>
          <Text style={styles.menuText}>Personal info</Text>
          <ChevronRight size={20} color={Colors.lightText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setActiveSection('dietary')}
        >
          <View style={styles.menuIconContainer}>
            <Heart size={20} color={Colors.text} />
          </View>
          <Text style={styles.menuText}>Dietary Preferences</Text>
          <ChevronRight size={20} color={Colors.lightText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setActiveSection('goals')}
        >
          <View style={styles.menuIconContainer}>
            <Target size={20} color={Colors.text} />
          </View>
          <Text style={styles.menuText}>Health Goals</Text>
          <ChevronRight size={20} color={Colors.lightText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setActiveSection('cooking')}
        >
          <View style={styles.menuIconContainer}>
            <ChefHat size={20} color={Colors.text} />
          </View>
          <Text style={styles.menuText}>Cooking Preferences</Text>
          <ChevronRight size={20} color={Colors.lightText} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIconContainer}>
            <Award size={20} color={Colors.text} />
          </View>
          <Text style={styles.menuText}>Achievements</Text>
          <ChevronRight size={20} color={Colors.lightText} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIconContainer}>
            <Clock size={20} color={Colors.text} />
          </View>
          <Text style={styles.menuText}>Meal History</Text>
          <ChevronRight size={20} color={Colors.lightText} />
        </TouchableOpacity>
      </View>

      {/* Help Section */}
      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>Help Center</Text>
        <TouchableOpacity style={styles.helpItem}>
          <Text style={styles.helpText}>Contact Us</Text>
          <ChevronRight size={16} color={Colors.lightText} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.helpItem}>
          <Text style={styles.helpText}>FAQs</Text>
          <ChevronRight size={16} color={Colors.lightText} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.helpItem}>
          <Text style={styles.helpText}>Privacy Policy</Text>
          <ChevronRight size={16} color={Colors.lightText} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {activeSection !== 'overview' && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setActiveSection('overview')}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
      )}
      <Text style={styles.headerTitle}>
        {activeSection === 'overview' ? 'Profile' : getSectionTitle(activeSection)}
      </Text>
      {activeSection === 'overview' && (
        <TouchableOpacity style={styles.settingsButton}>
          <Settings size={24} color={Colors.lightText} />
        </TouchableOpacity>
      )}
    </View>
  );

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs / 2,
  },
  statLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xl,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.md,
    minWidth: 80,
  },
  quickActions: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  actionContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  actionTitle: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: Spacing.xs / 2,
  },
  actionSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
  },
  sectionContainer: {
    padding: Spacing.lg,
  },
  sectionText: {
    fontSize: Typography.sizes.md,
    color: Colors.lightText,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});