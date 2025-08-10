import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/utils/supabaseClient';

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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
      <Text style={styles.title}>Profile</Text>

      <Card>
        <Text style={styles.sectionTitle}>Basics</Text>
        <View style={styles.row}>
          <Input label="Name" value={local.name} onChangeText={(t) => setLocal(p => ({ ...p, name: t }))} />
        </View>
        <View style={styles.row}>
          <Input label="Age" keyboardType="number-pad" value={local.age} onChangeText={(t) => setLocal(p => ({ ...p, age: t }))} />
          <Input label="Sex" value={local.sex} onChangeText={(t) => setLocal(p => ({ ...p, sex: t as any }))} />
        </View>
        <View style={styles.row}>
          <Input label={local.unitSystem === 'metric' ? 'Height (cm)' : 'Height (cm)'} keyboardType="number-pad" value={local.heightCm} onChangeText={(t) => setLocal(p => ({ ...p, heightCm: t }))} />
          <Input label={local.unitSystem === 'metric' ? 'Weight (kg)' : 'Weight (kg)'} keyboardType="number-pad" value={local.weightKg} onChangeText={(t) => setLocal(p => ({ ...p, weightKg: t }))} />
        </View>
        <Button title="Save Basics" onPress={saveBasics} style={styles.saveBtn} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Goals</Text>
        <View style={styles.row}>
          <Input label="Daily Calories" keyboardType="number-pad" value={local.dailyCalories} onChangeText={(t) => setLocal(p => ({ ...p, dailyCalories: t }))} />
        </View>
        <View style={styles.row}>
          <Input label="Protein (g)" keyboardType="number-pad" value={local.proteinTargetG} onChangeText={(t) => setLocal(p => ({ ...p, proteinTargetG: t }))} />
          <Input label="Carbs (g)" keyboardType="number-pad" value={local.carbsTargetG} onChangeText={(t) => setLocal(p => ({ ...p, carbsTargetG: t }))} />
          <Input label="Fats (g)" keyboardType="number-pad" value={local.fatsTargetG} onChangeText={(t) => setLocal(p => ({ ...p, fatsTargetG: t }))} />
        </View>
        <View style={styles.rowWrap}>
          <Text style={styles.label}>Goal Type</Text>
          <View style={styles.chipsRow}>
            {goalTypes.map(g => (
              <TouchableOpacity key={g} style={[styles.chip, local.goalType === g && styles.chipActive]} onPress={() => setLocal(p => ({ ...p, goalType: g }))}>
                <Text style={[styles.chipText, local.goalType === g && styles.chipTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.rowWrap}>
          <Text style={styles.label}>Activity Level</Text>
          <View style={styles.chipsRow}>
            {activityLevels.map(a => (
              <TouchableOpacity key={a} style={[styles.chip, local.activityLevel === a && styles.chipActive]} onPress={() => setLocal(p => ({ ...p, activityLevel: a }))}>
                <Text style={[styles.chipText, local.activityLevel === a && styles.chipTextActive]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <Button title="Save Goals" onPress={saveGoals} style={styles.saveBtn} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.rowWrap}>
          <Text style={styles.label}>Dietary</Text>
          <View style={styles.chipsRow}>
            {dietOptions.map(d => (
              <TouchableOpacity key={d} style={[styles.chip, local.dietary === d && styles.chipActive]} onPress={() => setLocal(p => ({ ...p, dietary: d }))}>
                <Text style={[styles.chipText, local.dietary === d && styles.chipTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.row}>
          <Input label="Allergies (comma-separated)" value={local.allergies} onChangeText={(t) => setLocal(p => ({ ...p, allergies: t }))} />
        </View>
        <View style={styles.row}>
          <Input label="Disliked Ingredients (comma-separated)" value={local.dislikes} onChangeText={(t) => setLocal(p => ({ ...p, dislikes: t }))} />
        </View>
        <View style={styles.row}>
          <Input label="Preferred Cuisines (comma-separated)" value={local.cuisines} onChangeText={(t) => setLocal(p => ({ ...p, cuisines: t }))} />
        </View>
        <View style={styles.rowWrap}>
          <Text style={styles.label}>Units</Text>
          <View style={styles.chipsRow}>
            {units.map(u => (
              <TouchableOpacity key={u} style={[styles.chip, local.unitSystem === u && styles.chipActive]} onPress={() => setLocal(p => ({ ...p, unitSystem: u }))}>
                <Text style={[styles.chipText, local.unitSystem === u && styles.chipTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <Button title="Save Preferences" onPress={savePreferences} style={styles.saveBtn} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Account</Text>
        <Button title="Sign Out" onPress={() => supabase.auth.signOut()} style={styles.saveBtn} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { marginHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.sm, fontSize: Typography.sizes.xl, fontWeight: '600', color: Colors.text },
  sectionTitle: { fontSize: Typography.sizes.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  rowWrap: { marginBottom: Spacing.sm },
  label: { color: Colors.lightText, marginBottom: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16 },
  chipActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  chipText: { color: Colors.text, textTransform: 'capitalize' },
  chipTextActive: { color: Colors.primary, fontWeight: '600' },
  saveBtn: { marginTop: Spacing.sm },
  saveText: { color: Colors.white, fontWeight: '600' },
});
