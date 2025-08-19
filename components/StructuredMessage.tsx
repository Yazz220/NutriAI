import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import type { StructuredResponse, StructuredStep, StructuredIngredient } from '@/utils/aiFormat';

export function StructuredMessage({ data }: { data: StructuredResponse }) {
  if (data.mode === 'recipe') {
    return <RecipeMessage data={data} />;
  }
  return <ChatBullets data={data} />;
}

function ChatBullets({ data }: { data: StructuredResponse }) {
  const lines = data.chat || data.summary || [];
  return (
    <View>
      {data.title && <Text style={styles.title}>{data.title}</Text>}
      {lines.map((l, i) => (
        <View key={i} style={styles.bulletRow}>
          <View style={styles.dot} />
          <Text style={styles.body}>{l}</Text>
        </View>
      ))}
      {!!data.tips?.length && (
        <View style={{ marginTop: Spacing.sm }}>
          <Text style={styles.subheading}>Tips</Text>
          {data.tips.map((t, i) => (
            <View key={`tip-${i}`} style={styles.bulletRow}>
              <View style={[styles.dot, { backgroundColor: Colors.secondary }]} />
              <Text style={styles.body}>{t}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function RecipeMessage({ data }: { data: StructuredResponse }) {
  const [stepIdx, setStepIdx] = useState(0);
  const steps = data.steps || [];
  const ingredients = data.ingredients || [];

  const next = () => setStepIdx(i => Math.min(i + 1, Math.max(0, steps.length - 1)));
  const prev = () => setStepIdx(i => Math.max(0, i - 1));

  return (
    <View>
      {!!data.title && <Text style={styles.title}>{data.title}</Text>}
      {!!data.summary?.length && (
        <View style={{ marginBottom: Spacing.sm }}>
          {data.summary.map((s, i) => (
            <View key={`sum-${i}`} style={styles.bulletRow}>
              <View style={styles.dot} />
              <Text style={styles.body}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {!!ingredients.length && (
        <View style={styles.cardSec}>
          <Text style={styles.subheading}>Ingredients</Text>
          {ingredients.map((ing, i) => (
            <IngredientRow key={`ing-${i}`} ing={ing} />
          ))}
        </View>
      )}

      {!!steps.length && (
        <View style={styles.cardSec}>
          <Text style={styles.subheading}>Steps</Text>
          <View style={styles.stepBox}>
            <Text style={styles.stepLabel}>Step {stepIdx + 1} {steps[stepIdx].label ? `• ${steps[stepIdx].label}` : ''}</Text>
            <Text style={styles.body}>{steps[stepIdx].instruction}</Text>
            {!!steps[stepIdx].durationSec && (
              <Text style={styles.stepMeta}>{Math.round((steps[stepIdx].durationSec || 0) / 60)} min</Text>
            )}
            <View style={styles.stepNav}>
              <Button title="Prev" variant="outline" size="sm" onPress={prev} disabled={stepIdx === 0} />
              <Button title={stepIdx >= steps.length - 1 ? 'Done' : 'Next'} size="sm" onPress={next} />
            </View>
          </View>
        </View>
      )}

      {!!data.tips?.length && (
        <View style={styles.cardSec}>
          <Text style={styles.subheading}>Tips</Text>
          {data.tips.map((t, i) => (
            <View key={`tip-${i}`} style={styles.bulletRow}>
              <View style={[styles.dot, { backgroundColor: Colors.secondary }]} />
              <Text style={styles.body}>{t}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function IngredientRow({ ing }: { ing: StructuredIngredient }) {
  const badgeStyle: ViewStyle[] = [styles.badge as ViewStyle];
  let badgeText = '';
  if (ing.inInventory === true) { badgeStyle.push({ backgroundColor: Colors.primary } as ViewStyle); badgeText = 'In Inventory'; }
  else if (ing.inInventory === false) { badgeStyle.push({ backgroundColor: Colors.expiring } as ViewStyle); badgeText = 'Missing'; }
  return (
    <View style={styles.ingRow}>
      <Text style={styles.body}>
        {formatQty(ing)} {capitalize(ing.name)}{ing.substituteFor ? ` (sub for ${ing.substituteFor})` : ''}
      </Text>
      {!!badgeText && (
        <View style={badgeStyle}><Text style={styles.badgeText}>{badgeText}</Text></View>
      )}
    </View>
  );
}

function formatQty(ing: StructuredIngredient) {
  const qty = ing.quantity === undefined || ing.quantity === null || ing.quantity === '' ? '' : String(ing.quantity);
  const unit = ing.unit ? ` ${ing.unit}` : '';
  return (qty + unit).trim();
}
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

const styles = StyleSheet.create({
  title: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.semibold, color: Colors.text, marginBottom: Spacing.sm },
  subheading: { fontWeight: Typography.weights.semibold, color: Colors.text, marginBottom: Spacing.xs },
  body: { color: Colors.text },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 8 },
  cardSec: { marginTop: Spacing.sm },
  stepBox: { backgroundColor: Colors.tabBackground, borderRadius: 10, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  stepLabel: { color: Colors.text, fontWeight: Typography.weights.semibold, marginBottom: 6 },
  stepMeta: { color: Colors.lightText, marginTop: 6 },
  stepNav: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md },
  ingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeText: { color: Colors.white, fontSize: Typography.sizes.sm },
});
