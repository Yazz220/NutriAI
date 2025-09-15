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
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetSection, setSheetSection] = useState<Exclude<ProfileSection, 'overview'> | null>(null);

  const closeSheet = () => { setSheetVisible(false); setSheetSection(null); };

  const renderSectionContent = () => {
    // Main area shows overview only; detail pages are shown in slide-up sheet
    return renderOverview();
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
        
        {/* Stats Row removed as requested */}
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
          <Text style={styles.menuText}>Personal info</Text>
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
          onPress={() => { setSheetSection('goals'); setSheetVisible(true); }}
        >
          <View style={styles.menuIconContainer}>
            <Target size={20} color={Colors.text} />
          </View>
          <Text style={styles.menuText}>Health Goals</Text>
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

      {/* Slide-up detail sheet for profile sections */}
      <Modal animationType="slide" transparent visible={sheetVisible} onRequestClose={closeSheet}>
        <View style={styles.sheetOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.sheetContainer}>
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
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    width: '100%',
    overflow: 'hidden',
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