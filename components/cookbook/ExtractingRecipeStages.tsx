import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Check, Loader2 } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

const STAGE_LABELS = [
  'Reading content',
  'Finding recipe details',
  'Extracting ingredients',
  'Extracting instructions',
  'Organizing data',
] as const;

const STAGE_INTERVAL_MS = 700;

interface ExtractingRecipeStagesProps {
  running: boolean;
}

function StageRow({ label, state }: { label: string; state: 'pending' | 'active' | 'done' }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state !== 'active') {
      spin.stopAnimation();
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [state, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.row}>
      <View style={[styles.dot, state === 'done' && styles.dotDone]}>
        {state === 'done' ? (
          <Check size={14} color={Colors.onPrimary} strokeWidth={3} />
        ) : state === 'active' ? (
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Loader2 size={14} color={Colors.text} strokeWidth={2.5} />
          </Animated.View>
        ) : null}
      </View>
      <Text style={[styles.rowLabel, state === 'pending' && styles.rowLabelPending]}>{label}</Text>
    </View>
  );
}

export function ExtractingRecipeStages({ running }: ExtractingRecipeStagesProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!running) return;
    setActiveIndex(0);
    const timer = setInterval(() => {
      setActiveIndex((current) => Math.min(current + 1, STAGE_LABELS.length - 1));
    }, STAGE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [running]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Just a moment</Text>
        <Text style={styles.title}>Extracting Recipe</Text>
        <Text style={styles.subtitle}>Nosh is reading your source and turning it into structured recipe data.</Text>
      </View>

      <View style={styles.stages}>
        {STAGE_LABELS.map((label, index) => {
          const state: 'pending' | 'active' | 'done' = !running
            ? 'done'
            : index < activeIndex
              ? 'done'
              : index === activeIndex
                ? 'active'
                : 'pending';
          return <StageRow key={label} label={label} state={state} />;
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>This usually takes a few seconds.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    gap: Spacing.lg,
    boxShadow: Colors.book.cardShadow,
  },
  header: {
    gap: 4,
  },
  eyebrow: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: Fonts.ui.medium,
    letterSpacing: 1,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 0.6,
  },
  subtitle: {
    color: Colors.slate,
    fontSize: 14,
    lineHeight: 20,
  },
  stages: {
    gap: Spacing.md,
  },
  row: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.duskGrey,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.alabaster,
  },
  dotDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.butterscotch,
  },
  rowLabel: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: Fonts.ui.medium,
  },
  rowLabelPending: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.regular,
  },
  footer: {
    borderRadius: Radii.md,
    backgroundColor: Colors.skyMist,
    padding: Spacing.md,
  },
  footerText: {
    color: Colors.deepOcean,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
