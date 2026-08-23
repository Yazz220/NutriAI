import React, { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { BookOpen, ChefHat, ScanSearch } from 'lucide-react-native';
import { MessagePrimitive, ThreadPrimitive, useAuiState } from '@assistant-ui/react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import type { NoshInteractionSession } from '@/types/noshInteraction';
import { Fonts } from '@/utils/fonts';
import { NoshComposer } from './NoshComposer';
import { NoshConversationStart } from './NoshConversationStart';

export type NoshActiveTask =
  | { kind: 'extract'; sourceType: 'url' | 'text' | 'image' | 'video' }
  | { kind: 'create'; cookbookTitle: string };

function UserMessage() {
  return <View style={styles.userRow}><View style={styles.userBubble}><MessagePrimitive.Parts components={{ Text: ({ text }: { text: string }) => <Text style={styles.userText}>{text}</Text> }} /></View></View>;
}

function AssistantMessage() {
  return <View style={styles.assistantRow}><View style={styles.avatar}><ChefHat size={15} color={Colors.onPrimary} /></View><View style={styles.assistantBubble}><MessagePrimitive.Parts components={{ Text: ({ text }: { text: string }) => <Text style={styles.assistantText}>{text}</Text> }} /></View></View>;
}

function ProgressCard({ task }: { task: NoshActiveTask | null }) {
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const reduceMotion = useReducedMotion();
  const sweep = useSharedValue(0);
  const [isTakingLonger, setIsTakingLonger] = useState(false);
  useEffect(() => {
    if (!isRunning) return undefined;
    const reassurance = setTimeout(() => setIsTakingLonger(true), 8_000);
    return () => clearTimeout(reassurance);
  }, [isRunning, task]);
  useEffect(() => {
    if (!isRunning || reduceMotion) { sweep.value = 0; return; }
    sweep.value = withRepeat(withTiming(1, { duration: 2_300, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [isRunning, reduceMotion, sweep]);
  const scanStyle = useAnimatedStyle(() => ({ opacity: reduceMotion ? 0.45 : 0.35 + sweep.value * 0.65, transform: [{ translateY: reduceMotion ? 0 : -13 + sweep.value * 26 }] }));
  if (!isRunning) return null;
  let label = 'Nosh is planning';
  let detail = 'Choosing the right kitchen tools for this request.';
  let icon = <ChefHat size={19} color={Colors.primary} />;
  if (task?.kind === 'extract') {
    label = task.sourceType === 'image' ? 'Analyzing the recipe photo' : task.sourceType === 'video' ? 'Watching the recipe' : task.sourceType === 'url' ? 'Opening the recipe' : 'Reading the recipe';
    detail = 'Finding ingredients, instructions, timings, and useful notes.';
    icon = <ScanSearch size={19} color={Colors.primary} />;
  } else if (task?.kind === 'create') {
    label = `Creating a page for ${task.cookbookTitle}`;
    detail = 'Composing the recipe, imagery, and book style into one finished page.';
    icon = <BookOpen size={19} color={Colors.primary} />;
  }
  return (
    <View style={styles.progress} accessibilityRole="progressbar" accessibilityLiveRegion="polite" accessibilityLabel={`${label}. ${detail}`}>
      <View style={styles.glyph}>{icon}<Animated.View style={[styles.scanLine, scanStyle]} /></View>
      <View style={styles.progressText}><Text style={styles.progressLabel}>{label}</Text><Text style={styles.progressDetail}>{isTakingLonger ? 'Still working — some sources take a little longer.' : detail}</Text><View style={styles.trail}><View style={[styles.dot, styles.dotActive]} /><View style={styles.dot} /><View style={styles.dot} /></View></View>
    </View>
  );
}

export function NoshConversationDisplay({ interaction, activeTask, contextModelEnabled }: {
  interaction: NoshInteractionSession;
  activeTask: NoshActiveTask | null;
  contextModelEnabled: boolean;
}) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.messagesArea} onPress={Keyboard.dismiss}>
        <ThreadPrimitive.MessagesFlatList autoScroll contentContainerStyle={styles.messagesContent} style={styles.messagesList} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" components={{ UserMessage, AssistantMessage }} />
        <ProgressCard task={activeTask} />
        <NoshConversationStart interaction={interaction} contextModelEnabled={contextModelEnabled} />
      </Pressable>
      <NoshComposer interaction={interaction} contextModelEnabled={contextModelEnabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: Spacing.sm }, messagesArea: { flex: 1, gap: Spacing.sm }, messagesList: { flex: 1, minHeight: 220 }, messagesContent: { gap: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: 2 },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end' }, userBubble: { maxWidth: '86%', borderRadius: Radii.lg, borderBottomRightRadius: Radii.sm, backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 }, userText: { color: Colors.onPrimary, fontSize: 14, lineHeight: 20, fontFamily: Fonts.ui.regular },
  assistantRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }, avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, marginTop: 2 }, assistantBubble: { flex: 1, maxWidth: '88%', borderRadius: Radii.lg, borderBottomLeftRadius: Radii.sm, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.ash, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 }, assistantText: { color: Colors.text, fontSize: 14, lineHeight: 20, fontFamily: Fonts.ui.regular },
  progress: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.ash, backgroundColor: Colors.parchment, padding: Spacing.md, marginHorizontal: 2 },
  glyph: { width: 42, height: 42, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 21, borderWidth: 1, borderColor: Colors.ash, backgroundColor: Colors.white }, scanLine: { position: 'absolute', left: 7, right: 7, top: 20, height: 2, borderRadius: 1, backgroundColor: Colors.primary },
  progressText: { flex: 1, gap: 2 }, progressLabel: { color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: 13 }, progressDetail: { color: Colors.textSecondary, fontFamily: Fonts.ui.regular, fontSize: 11, lineHeight: 16 }, trail: { flexDirection: 'row', gap: 4, marginTop: 5 }, dot: { width: 18, height: 2, borderRadius: 1, backgroundColor: Colors.ash }, dotActive: { backgroundColor: Colors.primary },
});
