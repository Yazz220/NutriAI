import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { Brain, ChefHat, Bell, Activity } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useCoach } from '@/hooks/useCoach';
import { useNutrition } from '@/hooks/useNutrition';
import { useCoachChat } from '@/hooks/useCoachChat';
import { MealDetailModal } from '@/components/MealDetailModal';

export default function CoachScreen() {
  const { suggestions, performAction } = useCoach();
  const { todayTotals, goals, remainingAgainstGoals, last7Days } = useNutrition();
  const { messages, sendMessage, performInlineAction, isTyping } = useCoachChat();
  const [showDetail, setShowDetail] = useState(false);
  const [detailRecipe, setDetailRecipe] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'actions'>('chat');
  const [inputText, setInputText] = useState('');

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'AI Coach',
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton}>
              <Brain size={24} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Top toggle between Chat and Quick Actions */}
      <View style={styles.topTabs}>
        <TouchableOpacity style={[styles.topTab, activeTab === 'chat' && styles.topTabActive]} onPress={() => setActiveTab('chat')}>
          <Text style={[styles.topTabText, activeTab === 'chat' && styles.topTabTextActive]}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.topTab, activeTab === 'actions' && styles.topTabActive]} onPress={() => setActiveTab('actions')}>
          <Text style={[styles.topTabText, activeTab === 'actions' && styles.topTabTextActive]}>Quick Actions</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'chat' ? (
          <>
            <Text style={styles.sectionTitle}>Ask the Nutrition Coach</Text>
            <Card>
              <View style={styles.chipsRow}>
                {['Plan my day', 'Plan my week', 'Generate shopping list'].map((chip) => (
                  <TouchableOpacity key={chip} style={styles.chip} onPress={() => sendMessage(chip)}>
                    <Text style={styles.chipText}>{chip}</Text>
                  </TouchableOpacity>
                ))}
                {isTyping && (
                  <View style={[styles.msg, styles.msgCoach]}>
                    <Text style={styles.typingText}>AI is typing…</Text>
                  </View>
                )}
              </View>
              <View style={styles.messages}>
                {messages.map((m) => (
                  <View key={m.id} style={[styles.msg, m.role === 'user' ? styles.msgUser : styles.msgCoach]}>
                    {!!m.text && <Text style={styles.msgText}>{m.text}</Text>}
                    {!!m.summary && <Text style={styles.msgSummary}>{m.summary}</Text>}
                    {m.role === 'coach' && !!m.source && (
                      <Text style={styles.msgSource}>
                        {m.source === 'ai' ? 'AI' : m.source === 'heuristic' ? 'Suggestion' : 'Built-in'}
                      </Text>
                    )}
                    {!!m.meals && m.meals.length > 0 && (
                      <View style={{ marginTop: Spacing.sm }}>
                        {m.meals.map(({ recipe, mealType }, idx) => (
                          <View key={`${m.id}-${idx}`} style={styles.inlineCard}>
                            <Text style={styles.inlineTitle}>{mealType ? `${mealType}: ` : ''}{recipe.name}</Text>
                            <Text style={styles.inlineSub}>
                              {recipe.availability.availabilityPercentage}% available • Missing {recipe.availability.missingIngredients.length}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {!!m.actions && (
                      <View style={styles.inlineActions}>
                        {m.actions.map((a, idx) => (
                          <Button key={`${m.id}-act-${idx}`} title={a.label} size="sm" onPress={() => performInlineAction(a, m.meals)} />
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.composerRow}>
                  <TextInput
                    placeholder="Ask me to plan your day or week…"
                    placeholderTextColor={Colors.lightText}
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={(e) => { const v = e.nativeEvent.text.trim(); if (v) { sendMessage(v); setInputText(''); } }}
                    returnKeyType="send"
                  />
                  <TouchableOpacity
                    style={styles.sendBtn}
                    onPress={() => { const v = inputText.trim(); if (v) { sendMessage(v); setInputText(''); } }}
                  >
                    <Text style={styles.sendText}>Send</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </Card>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Today</Text>
            <Card>
              <View style={styles.ringsRow}>
                <View style={styles.ringItem}>
                  <Text style={styles.ringLabel}>Calories</Text>
                  <Text style={styles.ringValue}>
                    {todayTotals.calories}{goals ? ` / ${goals.dailyCalories}` : ''}
                  </Text>
                </View>
                <View style={styles.ringItem}>
                  <Text style={styles.ringLabel}>Protein</Text>
                  <Text style={styles.ringValue}>
                    {todayTotals.protein}{goals ? ` / ${goals.protein}g` : 'g'}
                  </Text>
                </View>
                <View style={styles.ringItem}>
                  <Text style={styles.ringLabel}>Carbs</Text>
                  <Text style={styles.ringValue}>
                    {todayTotals.carbs}{goals ? ` / ${goals.carbs}g` : 'g'}
                  </Text>
                </View>
                <View style={styles.ringItem}>
                  <Text style={styles.ringLabel}>Fats</Text>
                  <Text style={styles.ringValue}>
                    {todayTotals.fats}{goals ? ` / ${goals.fats}g` : 'g'}
                  </Text>
                </View>
              </View>
              {remainingAgainstGoals && (
                <Text style={styles.remainingText}>
                  Remaining: {remainingAgainstGoals.protein}g P • {remainingAgainstGoals.carbs}g C • {remainingAgainstGoals.fats}g F
                </Text>
              )}
            </Card>

            <Text style={styles.sectionTitle}>Right Now</Text>
            {suggestions.map((s) => (
              <Card key={s.id}>
                <View style={styles.cardHeader}>
                  {s.type === 'primary_meal' && <ChefHat size={18} color={Colors.primary} />}
                  {s.type === 'heads_up' && <Bell size={18} color={Colors.expiring} />}
                  {s.type === 'goal_pulse' && <Activity size={18} color={Colors.primary} />}
                  <Text style={styles.cardTitle}>{s.title}</Text>
                </View>
                {!!s.subtitle && <Text style={styles.subtitle}>{s.subtitle}</Text>}
                {s.recipe && (
                  <View style={styles.metaRow}>
                    {typeof s.meta?.readyInMins === 'number' && (
                      <Text style={styles.metaChip}>{s.meta.readyInMins} mins</Text>
                    )}
                    {!!s.meta?.highlight && (
                      <Text style={[styles.metaChip, styles.highlightChip]}>{s.meta.highlight}</Text>
                    )}
                    {typeof s.meta?.missingCount === 'number' && s.meta.missingCount > 0 && (
                      <Text style={[styles.metaChip, styles.missingChip]}>Missing {s.meta.missingCount}</Text>
                    )}
                  </View>
                )}
                <View style={styles.actionsRow}>
                  {s.actions.map((a, idx) => {
                    const handlePress = () => {
                      if (a.intent === 'SEE_RECIPE' && s.recipe) {
                        setDetailRecipe(s.recipe);
                        setShowDetail(true);
                        return;
                      }
                      performAction(a.intent, a.args);
                    };
                    return (
                      <Button
                        key={`${s.id}-action-${idx}`}
                        title={a.label}
                        onPress={handlePress}
                        variant={a.variant === 'outline' ? 'outline' : 'primary'}
                        size="sm"
                        style={styles.actionBtn}
                      />
                    );
                  })}
                </View>
              </Card>
            ))}

            <Text style={styles.sectionTitle}>This Week</Text>
            <Card>
              <View style={styles.sparklineRow}>
                {last7Days.map((d, idx) => (
                  <View key={idx} style={[styles.sparkBar, { height: Math.max(4, Math.min(60, d.calories / 40)) }]} />
                ))}
              </View>
              <Text style={styles.sparkCaption}>Calories last 7 days</Text>
            </Card>
          </>
        )}
      </ScrollView>

      <MealDetailModal
        visible={showDetail}
        meal={detailRecipe}
        availability={detailRecipe?.availability}
        onClose={() => {
          setShowDetail(false);
          setDetailRecipe(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerButton: { padding: Spacing.sm, marginRight: Spacing.sm },
  content: { flex: 1 },
  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold as any,
    color: Colors.text,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ringItem: { alignItems: 'center', flex: 1 },
  ringLabel: { color: Colors.lightText, marginBottom: 4 },
  ringValue: { color: Colors.text, fontSize: Typography.sizes.lg, fontWeight: '600' },
  remainingText: { marginTop: Spacing.sm, color: Colors.lightText },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  cardTitle: { marginLeft: Spacing.sm, fontSize: Typography.sizes.lg, fontWeight: '600', color: Colors.text },
  subtitle: { color: Colors.lightText, marginBottom: Spacing.sm },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  metaChip: { backgroundColor: Colors.tabBackground, color: Colors.text, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: Typography.sizes.sm },
  highlightChip: { backgroundColor: Colors.secondary, color: Colors.white },
  missingChip: { backgroundColor: Colors.expiring, color: Colors.white },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  actionBtn: { marginRight: Spacing.sm, marginTop: Spacing.xs },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16 },
  chipText: { color: Colors.text, fontSize: Typography.sizes.sm },
  messages: { marginTop: Spacing.sm },
  msg: { padding: Spacing.md, borderRadius: 12, marginBottom: Spacing.sm },
  msgUser: { backgroundColor: Colors.secondary },
  msgCoach: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  msgText: { color: Colors.text },
  msgSummary: { color: Colors.lightText, marginTop: 4 },
  msgSource: { color: Colors.lightText, marginTop: 4, fontSize: Typography.sizes.sm },
  typingText: { color: Colors.lightText, fontStyle: 'italic' },
  inlineCard: { backgroundColor: Colors.tabBackground, borderRadius: 8, padding: Spacing.sm, marginTop: Spacing.xs },
  inlineTitle: { color: Colors.text, fontWeight: '600' },
  inlineSub: { color: Colors.lightText, marginTop: 2 },
  inlineActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  composerRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: Spacing.sm, backgroundColor: Colors.white },
  input: { flex: 1, paddingVertical: Spacing.md, color: Colors.text },
  sendBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  sendText: { color: Colors.primary, fontWeight: '600' },
  sparklineRow: { flexDirection: 'row', alignItems: 'flex-end', height: 60, gap: 4 },
  sparkBar: { flex: 1, backgroundColor: Colors.primary, borderRadius: 2 },
  sparkCaption: { marginTop: Spacing.sm, color: Colors.lightText },
  topTabs: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.md, backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  topTab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: 10 },
  topTabActive: { backgroundColor: Colors.primary + '20' },
  topTabText: { color: Colors.lightText, fontWeight: '600' },
  topTabTextActive: { color: Colors.primary },
});


