import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { useMeals } from '@/hooks/useMealsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DevTools: React.FC = () => {
  const { importSampleRecipes, resetMeals } = useMeals() as any;

  const handleImport = async () => {
    try {
      await importSampleRecipes();
      Alert.alert('Imported', 'Sample recipes imported into storage.');
    } catch (e) {
      Alert.alert('Error', 'Failed to import sample recipes. See console.');
    }
  };

  const handleReset = async () => {
    try {
      await resetMeals();
      Alert.alert('Reset', 'Meals reset to default seed.');
    } catch (e) {
      Alert.alert('Error', 'Failed to reset meals.');
    }
  };

  const handleClear = async () => {
    try {
      await AsyncStorage.removeItem('meals');
      Alert.alert('Cleared', 'Meals key removed from AsyncStorage. Restart app to reseed.');
    } catch (e) {
      Alert.alert('Error', 'Failed to clear storage.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dev Tools</Text>
      <View style={styles.btn}>
        <Button title="Import sampleRecipes.json" onPress={handleImport} />
      </View>
      <View style={styles.btn}>
        <Button title="Reset meals to seed" onPress={handleReset} />
      </View>
      <View style={styles.btn}>
        <Button title="Clear meals from storage" onPress={handleClear} color="#c00" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  btn: { marginBottom: 8 }
});

export default DevTools;
