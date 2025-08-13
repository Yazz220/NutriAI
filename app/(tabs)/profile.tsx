import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/utils/supabaseClient';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { User, Target, Heart, Settings, LogOut, Edit3, Save, Activity, Scale, Ruler } from 'lucide-react-native';

const dietOptions = ['none','vegan','vegetarian','pescatarian','halal','kosher','gluten_free','keto','paleo'] as const;
const goalTypes = ['maintain','lose','gain'] as const;
const activityLevels = ['sedentary','light','moderate','active','athlete'] as const;
const units = ['metric','imperial'] as const;

export default function ProfileScreen() {
  const { profile, updateBasics, updateGoals, updatePreferences, setUnitSystem } = useUserProfile();

  const [local, setLocal] = useState(() => ({
    name: profile.basics.name || '',
    age: profile.basics.age?.toString() || '',
    sex: profile.basics.sex || 'other',
    heightCm: profile.basics.heightCm?.toString() || '',
    weightKg: profile.basics.weightKg?.toString() || '',
    dailyCalories: profile.goals.dailyCalories?.toString() || '',
    proteinTargetG: profile.goals.proteinTargetG?.toString() || '',
    carbsTargetG: profile.goals.carbsTargetG?.toString() || '',
    fatsTargetG: profile.goals.fatsTargetG?.toString() || '',
    goalType: profile.goals.goalType || 'maintain',
    activityLevel: profile.goals.activityLevel || 'light',
    dietary: profile.preferences.dietary || 'none',
    allergies: (profile.preferences.allergies || []).join(', '),
    dislikes: (profile.preferences.dislikedIngredients || []).join(', '),
    cuisines: (profile.preferences.preferredCuisines || []).join(', '),
    unitSystem: profile.metrics.unitSystem || 'metric',
  }));

  function saveBasics() {
    updateBasics({
      name: local.name.trim() || undefined,
      age: local.age ? Number(local.age) : undefined,
      sex: local.sex as any,
      heightCm: local.heightCm ? Number(local.heightCm) : undefined,
      weightKg: local.weightKg ? Number(local.weightKg) : undefined,
    });
  }

  function saveGoals() {
    updateGoals({
      dailyCalories: local.dailyCalories ? Number(local.dailyCalories) : undefined,
      proteinTargetG: local.proteinTargetG ? Number(local.proteinTargetG) : undefined,
      carbsTargetG: local.carbsTargetG ? Number(local.carbsTargetG) : undefined,
      fatsTargetG: local.fatsTargetG ? Number(local.fatsTargetG) : undefined,
      goalType: local.goalType as any,
      activityLevel: local.activityLevel as any,
    });
  }

  function savePreferences() {
    updatePreferences({
      dietary: local.dietary as any,
      allergies: local.allergies.split(',').map(s => s.trim()).filter(Boolean),
      dislikedIngredients: local.dislikes.split(',').map(s => s.trim()).filter(Boolean),
      preferredCuisines: local.cuisines.split(',').map(s => s.trim()).filter(Boolean),
    });
    setUnitSystem(local.unitSystem as any);
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Enhanced Hero Header */}
        <ExpoLinearGradient
          colors={['#4facfe', '#00f2fe']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.statusBarSpacer} />
          
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <User size={32} color={Colors.white} />
              </View>
            </View>
            <Text style={styles.profileName}>{local.name || 'Your Name'}</Text>
            <Text style={styles.profileSubtitle}>Nutrition Journey</Text>
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <StatCard icon={<Scale size={20} color="#4facfe" />} label="Weight" value={local.weightKg ? `${local.weightKg} kg` : '--'} />
            <StatCard icon={<Ruler size={20} color="#4facfe" />} label="Height" value={local.heightCm ? `${local.heightCm} cm` : '--'} />
            <StatCard icon={<Target size={20} color="#4facfe" />} label="Goal" value={local.goalType || '--'} />
          </View>
        </ExpoLinearGradient>

        {/* Enhanced Sections */}
        <View style={styles.sectionsContainer}>
          {/* Basics Section */}
          <EnhancedCard 
            title="Personal Information" 
            icon={<User size={20} color={Colors.primary} />}
            onSave={saveBasics}
          >
            <View style={styles.inputGroup}>
              <Input label="Full Name" value={local.name} onChangeText={(t) => setLocal(p => ({ ...p, name: t }))} />
            </View>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Input label="Age" keyboardType="number-pad" value={local.age} onChangeText={(t) => setLocal(p => ({ ...p, age: t }))} />
              </View>
              <View style={styles.halfInput}>
                <Input label="Sex" value={local.sex} onChangeText={(t) => setLocal(p => ({ ...p, sex: t as any }))} />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Input label="Height (cm)" keyboardType="number-pad" value={local.heightCm} onChangeText={(t) => setLocal(p => ({ ...p, heightCm: t }))} />
              </View>
              <View style={styles.halfInput}>
                <Input label="Weight (kg)" keyboardType="number-pad" value={local.weightKg} onChangeText={(t) => setLocal(p => ({ ...p, weightKg: t }))} />
              </View>
            </View>
          </EnhancedCard>

          {/* Goals Section */}
          <EnhancedCard 
            title="Nutrition Goals" 
            icon={<Target size={20} color={Colors.primary} />}
            onSave={saveGoals}
          >
            <View style={styles.inputGroup}>
              <Input label="Daily Calories Target" keyboardType="number-pad" value={local.dailyCalories} onChangeText={(t) => setLocal(p => ({ ...p, dailyCalories: t }))} />
            </View>
            <View style={styles.macroRow}>
              <View style={styles.macroInput}>
                <Input label="Protein (g)" keyboardType="number-pad" value={local.proteinTargetG} onChangeText={(t) => setLocal(p => ({ ...p, proteinTargetG: t }))} />
              </View>
              <View style={styles.macroInput}>
                <Input label="Carbs (g)" keyboardType="number-pad" value={local.carbsTargetG} onChangeText={(t) => setLocal(p => ({ ...p, carbsTargetG: t }))} />
              </View>
              <View style={styles.macroInput}>
                <Input label="Fats (g)" keyboardType="number-pad" value={local.fatsTargetG} onChangeText={(t) => setLocal(p => ({ ...p, fatsTargetG: t }))} />
              </View>
            </View>
            
            <ChipSelector 
              label="Goal Type" 
              options={goalTypes} 
              selected={local.goalType} 
              onSelect={(g) => setLocal(p => ({ ...p, goalType: g as typeof goalTypes[number] }))}
            />
            
            <ChipSelector 
              label="Activity Level" 
              options={activityLevels} 
              selected={local.activityLevel} 
              onSelect={(a) => setLocal(p => ({ ...p, activityLevel: a as typeof activityLevels[number] }))}
            />
          </EnhancedCard>

          {/* Preferences Section */}
          <EnhancedCard 
            title="Dietary Preferences" 
            icon={<Heart size={20} color={Colors.primary} />}
            onSave={savePreferences}
          >
            <ChipSelector 
              label="Dietary Restrictions" 
              options={dietOptions} 
              selected={local.dietary} 
              onSelect={(d) => setLocal(p => ({ ...p, dietary: d as typeof dietOptions[number] }))}
            />
            
            <View style={styles.inputGroup}>
              <Input label="Allergies (comma-separated)" value={local.allergies} onChangeText={(t) => setLocal(p => ({ ...p, allergies: t }))} multiline />
            </View>
            <View style={styles.inputGroup}>
              <Input label="Disliked Ingredients (comma-separated)" value={local.dislikes} onChangeText={(t) => setLocal(p => ({ ...p, dislikes: t }))} multiline />
            </View>
            <View style={styles.inputGroup}>
              <Input label="Preferred Cuisines (comma-separated)" value={local.cuisines} onChangeText={(t) => setLocal(p => ({ ...p, cuisines: t }))} multiline />
            </View>
            
            <ChipSelector 
              label="Unit System" 
              options={units} 
              selected={local.unitSystem} 
              onSelect={(u) => setLocal(p => ({ ...p, unitSystem: u as typeof units[number] }))}
            />
          </EnhancedCard>

          {/* Account Section */}
          <EnhancedCard 
            title="Account Settings" 
            icon={<Settings size={20} color={Colors.primary} />}
          >
            <TouchableOpacity style={styles.signOutButton} onPress={() => supabase.auth.signOut()}>
              <LogOut size={20} color="#FF6B6B" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </EnhancedCard>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// Enhanced Component Definitions
const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <View style={styles.statCard}>
    <View style={styles.statIcon}>{icon}</View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const EnhancedCard = ({ 
  title, 
  icon, 
  children, 
  onSave 
}: { 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode; 
  onSave?: () => void;
}) => (
  <View style={styles.enhancedCard}>
    <View style={styles.cardHeader}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardIconContainer}>{icon}</View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {onSave && (
        <TouchableOpacity style={styles.saveButton} onPress={onSave}>
          <Save size={16} color={Colors.primary} />
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      )}
    </View>
    <View style={styles.cardContent}>
      {children}
    </View>
  </View>
);

const ChipSelector = ({ 
  label, 
  options, 
  selected, 
  onSelect 
}: { 
  label: string; 
  options: readonly string[]; 
  selected: string; 
  onSelect: (value: string) => void;
}) => (
  <View style={styles.chipSelectorContainer}>
    <Text style={styles.chipSelectorLabel}>{label}</Text>
    <View style={styles.chipsRow}>
      {options.map(option => (
        <TouchableOpacity 
          key={option} 
          style={[styles.modernChip, selected === option && styles.modernChipActive]} 
          onPress={() => onSelect(option)}
        >
          <Text style={[styles.modernChipText, selected === option && styles.modernChipTextActive]}>
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  hero: {
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    minHeight: 280,
  },
  statusBarSpacer: {
    height: Platform.OS === 'ios' ? 44 : 24,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileName: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  profileSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.lightText,
    fontWeight: '500',
  },
  sectionsContainer: {
    padding: 20,
    paddingTop: 30,
  },
  enhancedCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '30',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardContent: {
    padding: 20,
    paddingTop: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  macroInput: {
    flex: 1,
  },
  chipSelectorContainer: {
    marginBottom: 16,
  },
  chipSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modernChip: {
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 8,
  },
  modernChipActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  modernChipText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  modernChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B15',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF6B6B30',
  },
  signOutText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 20,
  },
});
