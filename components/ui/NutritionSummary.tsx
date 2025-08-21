import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

export type NutritionPerServing = {
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
};

interface NutritionSummaryProps {
  perServing?: NutritionPerServing;
  servingsSelected: number; // desired/current servings
  showAttribution?: boolean;
  attributionText?: string; // e.g., "Data by Edamam"
}

export const NutritionSummary: React.FC<NutritionSummaryProps> = ({
  perServing,
  servingsSelected,
  showAttribution,
  attributionText = 'Data by Edamam',
}) => {
  const total = React.useMemo(() => {
    if (!perServing) return undefined;
    return {
      calories: typeof perServing.calories === 'number' ? perServing.calories * servingsSelected : undefined,
      protein: typeof perServing.protein === 'number' ? perServing.protein * servingsSelected : undefined,
      carbs: typeof perServing.carbs === 'number' ? perServing.carbs * servingsSelected : undefined,
      fats: typeof perServing.fats === 'number' ? perServing.fats * servingsSelected : undefined,
    } as NutritionPerServing;
  }, [perServing, servingsSelected]);

  const fmt = (n?: number, unit = '') => (typeof n === 'number' ? `${Math.round(n)}${unit}` : '—');

  if (!perServing) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nutrition (for {servingsSelected} serving{servingsSelected === 1 ? '' : 's'})</Text>
      <View style={styles.row}>
        <Item label="Calories" value={fmt(total?.calories, 'kcal')} />
        <Item label="Protein" value={fmt(total?.protein, 'g')} />
        <Item label="Carbs" value={fmt(total?.carbs, 'g')} />
        <Item label="Fats" value={fmt(total?.fats, 'g')} />
      </View>
      <Text style={styles.hint}>≈ Per serving: {`${fmt(perServing.calories, ' kcal')} • ${fmt(perServing.protein, 'g P')} • ${fmt(perServing.carbs, 'g C')} • ${fmt(perServing.fats, 'g F')}`}</Text>
      {showAttribution && (
        <Text style={styles.attribution}>{attributionText}</Text>
      )}
    </View>
  );
};

const Item = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.item}>
    <Text style={styles.itemLabel}>{label}</Text>
    <Text style={styles.itemValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  item: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, padding: 12, borderRadius: 8, minWidth: 140, alignItems: 'center' },
  itemLabel: { fontSize: 12, color: Colors.lightText, marginBottom: 4 },
  itemValue: { fontSize: 16, fontWeight: '600', color: Colors.text },
  hint: { marginTop: 8, fontSize: 12, color: Colors.lightText },
  attribution: { marginTop: 6, fontSize: 11, color: Colors.lightText },
});

export default NutritionSummary;
