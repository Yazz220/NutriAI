import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Stack, router } from 'expo-router';
import { Brain, ChevronLeft, ChevronRight, BarChart3, LineChart as LineIcon } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNutrition } from '@/hooks/useNutrition';
import { useCoachChat } from '@/hooks/useCoachChat';
// Removed MealDetailModal (unused in Insights)
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { StructuredMessage } from '@/components/StructuredMessage';

export default function CoachScreen() {
  const { todayTotals, goals, remainingAgainstGoals, last7Days } = useNutrition();
  const { messages, sendMessage, performInlineAction, isTyping } = useCoachChat();
  // Removed detail modal state (unused)
  const [activeTab, setActiveTab] = useState<'chat' | 'insights'>('chat');
  const [inputText, setInputText] = useState('');
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [calorieView, setCalorieView] = useState<'bar' | 'line'>('bar');
  const chartWidth = Dimensions.get('window').width - Spacing.lg * 2; // card horizontal margin
  const chartConfig = {
    backgroundGradientFrom: Colors.white,
    backgroundGradientTo: Colors.white,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(5, 150, 105, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    propsForBackgroundLines: { stroke: Colors.border },
    propsForLabels: { fontSize: 10 },
  } as const;

  const weekLabel = useMemo(() => {
    // Derive a simple current-week label for now
    const now = new Date();
    const day = now.getDay(); // 0-6
    const diffToMon = ((day + 6) % 7); // days since Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMon);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fmt(monday)} – ${fmt(sunday)}`;
  }, []);

  const caloriesSeries = useMemo(() => {
    // Use last7Days; fallback to zeros if missing
    return last7Days.map((d: any, idx: number) => ({ x: idx + 1, y: Math.max(0, Number(d?.calories ?? 0)) }));
  }, [last7Days]);

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

      {/* Top toggle between Chat, Insights, and Planner */}
      <View style={styles.topTabs}>
        <TouchableOpacity style={[styles.topTab, activeTab === 'chat' && styles.topTabActive]} onPress={() => setActiveTab('chat')}>
          <Text style={[styles.topTabText, activeTab === 'chat' && styles.topTabTextActive]}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.topTab, activeTab === 'insights' && styles.topTabActive]} onPress={() => setActiveTab('insights')}>
          <Text style={[styles.topTabText, activeTab === 'insights' && styles.topTabTextActive]}>Insight</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.topTab}
          onPress={() => router.push('/(tabs)/planner')}
        >
          <Text style={styles.topTabText}>Planner</Text>
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
                    {m.role !== 'user' && m.structured ? (
                      <StructuredMessage data={m.structured} />
                    ) : (
                      <>
                        {!!m.text && <Text style={styles.msgText}>{m.text}</Text>}
                        {!!m.summary && <Text style={styles.msgSummary}>{m.summary}</Text>}
                      </>
                    )}
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
            <Text style={styles.sectionTitle}>Insights</Text>
            <Card>
              <View style={styles.timeframeRow}>
                {(['weekly','monthly','yearly'] as const).map(tf => (
                  <TouchableOpacity key={tf} style={[styles.timeframeTab, timeframe === tf && styles.timeframeTabActive]} onPress={() => setTimeframe(tf)}>
                    <Text style={[styles.topTabText, timeframe === tf && styles.topTabTextActive]}>
                      {tf === 'weekly' ? 'Weekly' : tf === 'monthly' ? 'Monthly' : 'Yearly'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.rangeHeader}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => { /* TODO: implement range back */ }}>
                  <ChevronLeft size={18} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.rangeLabel}>
                  {timeframe === 'weekly' ? weekLabel : timeframe === 'monthly' ? 'This Month' : 'This Year'}
                </Text>
                <TouchableOpacity style={styles.iconBtn} onPress={() => { /* TODO: implement range forward */ }}>
                  <ChevronRight size={18} color={Colors.text} />
                </TouchableOpacity>
              </View>
            </Card>

            <Card>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Calorie (kcal)</Text>
              </View>
              <View style={styles.chartHeaderRow}>
                <TouchableOpacity
                  style={[styles.chartToggle, calorieView === 'bar' && styles.chartToggleActive]}
                  onPress={() => setCalorieView('bar')}
                >
                  <BarChart3 size={16} color={calorieView === 'bar' ? Colors.primary : Colors.lightText} />
                  <Text style={[styles.chartToggleText, calorieView === 'bar' && styles.topTabTextActive]}>Bar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chartToggle, calorieView === 'line' && styles.chartToggleActive]}
                  onPress={() => setCalorieView('line')}
                >
                  <LineIcon size={16} color={calorieView === 'line' ? Colors.primary : Colors.lightText} />
                  <Text style={[styles.chartToggleText, calorieView === 'line' && styles.topTabTextActive]}>Line</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chartKitContainer}>
                {calorieView === 'bar' ? (
                  <BarChart
                    data={{
                      labels: caloriesSeries.map((_, i) => String(i + 1)),
                      datasets: [{ data: caloriesSeries.map((p) => p.y) }],
                    }}
                    width={chartWidth}
                    height={180}
                    chartConfig={chartConfig}
                    showBarTops={false}
                    withInnerLines
                    style={{ borderRadius: 12 }}
                  />
                ) : (
                  <LineChart
                    data={{
                      labels: caloriesSeries.map((_, i) => String(i + 1)),
                      datasets: [{ data: caloriesSeries.map((p) => p.y), color: () => Colors.primary }],
                    }}
                    width={chartWidth}
                    height={180}
                    chartConfig={chartConfig}
                    bezier
                    style={{ borderRadius: 12 }}
                  />
                )}
              </View>
              <Text style={styles.sparkCaption}>Calories last 7 days{goals?.dailyCalories ? ` • Goal ${goals.dailyCalories}` : ''}</Text>
            </Card>

            <Card>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Nutrition (%)</Text>
              </View>
              {(() => {
                const totalCals = Math.max(1, todayTotals.protein * 4 + todayTotals.carbs * 4 + todayTotals.fats * 9);
                const macros = [
                  { x: 'Protein', y: Math.max(0, todayTotals.protein * 4), color: Colors.primary },
                  { x: 'Carbs', y: Math.max(0, todayTotals.carbs * 4), color: Colors.secondary },
                  { x: 'Fats', y: Math.max(0, todayTotals.fats * 9), color: Colors.expiring },
                ];
                return (
                  <View style={styles.chartKitContainer}>
                    <PieChart
                      data={macros.map((m) => ({
                        name: m.x as string,
                        population: m.y as number,
                        color: m.color as string,
                        legendFontColor: Colors.text,
                        legendFontSize: 12,
                      }))}
                      width={chartWidth}
                      height={180}
                      chartConfig={chartConfig}
                      accessor="population"
                      backgroundColor="transparent"
                      hasLegend
                      center={[0, 0]}
                    />
                    <Text style={styles.sparkCaption}>
                      P {todayTotals.protein}g • C {todayTotals.carbs}g • F {todayTotals.fats}g
                    </Text>
                  </View>
                );
              })()}
            </Card>
          </>
        )}
      </ScrollView>

      {/* Modal removed: Insights tab no longer shows recipe detail here */}
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
  timeframeRow: { flexDirection: 'row', backgroundColor: Colors.tabBackground, borderRadius: 8, padding: 4 },
  timeframeTab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 6 },
  timeframeTabActive: { backgroundColor: Colors.white },
  chartContainer: { position: 'relative', paddingVertical: Spacing.md },
  chartBar: { flex: 1, backgroundColor: Colors.primary, borderRadius: 4 },
  goalLine: { position: 'absolute', left: 0, right: 0, height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.border },
  rangeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  iconBtn: { padding: Spacing.sm },
  rangeLabel: { color: Colors.text, fontWeight: '600' },
  chartHeaderRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  chartToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.tabBackground, borderRadius: 8 },
  chartToggleActive: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.primary + '40' },
  chartToggleText: { color: Colors.lightText, fontWeight: '600' },
  chartKitContainer: { alignItems: 'center', paddingVertical: Spacing.sm },
});


