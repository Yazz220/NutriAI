import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Modal, Image, FlatList, Dimensions, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Brain, ChevronLeft, ChevronRight, Plus, Target, TrendingUp, Award, Flame, Star } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useNutrition } from '@/hooks/useNutrition';
import { useCoachChat } from '@/hooks/useCoachChat';
import { useMealPlanner } from '@/hooks/useMealPlanner';
import { useMeals } from '@/hooks/useMealsStore';
import { MealPlanModal } from '@/components/MealPlanModal';
import { MealType } from '@/types';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StructuredMessage } from '@/components/StructuredMessage';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const { loggedMeals, goals } = useNutrition();
  const { messages, sendMessage, performInlineAction, isTyping } = useCoachChat();
  const { getMealForDateAndType, addPlannedMeal } = useMealPlanner();
  const { meals } = useMeals();
  const [inputText, setInputText] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [dayISO, setDayISO] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');

  // Persist last viewed day
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('coach_day_iso');
        if (saved) setDayISO(saved);
      } catch {}
    })();
  }, []);
  useEffect(() => {
    AsyncStorage.setItem('coach_day_iso', dayISO).catch(() => {});
  }, [dayISO]);

  const dayLabel = useMemo(() => {
    const d = new Date(dayISO);
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  }, [dayISO]);
  const isToday = useMemo(() => {
    const todayISO = new Date().toISOString().split('T')[0];
    return dayISO === todayISO;
  }, [dayISO]);

  // Totals for selected day
  const dayTotals = useMemo(() => {
    return loggedMeals
      .filter(m => m.date === dayISO)
      .reduce((acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fats: acc.fats + m.fats,
      }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  }, [loggedMeals, dayISO]);

  const calorieGoal = goals?.dailyCalories ?? 0;
  const eaten = dayTotals.calories;
  const kcalLeft = Math.max(0, calorieGoal - eaten);
  const ringPct = calorieGoal > 0 ? Math.min(1, eaten / calorieGoal) : 0;
  const ringSize = 200;
  const stroke = 14;
  const radius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * ringPct;

  const shiftDay = (delta: number) => {
    const d = new Date(dayISO);
    d.setDate(d.getDate() + delta);
    setDayISO(d.toISOString().split('T')[0]);
  };

  // Shift week by number of weeks (delta can be negative)
  const shiftWeek = (deltaWeeks: number) => {
    const d = new Date(dayISO);
    d.setDate(d.getDate() + deltaWeeks * 7);
    setDayISO(d.toISOString().split('T')[0]);
  };

  const getWeekStartISO = (isoDateStr: string) => {
    const target = new Date(isoDateStr);
    const dayOfWeek = target.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // treat Sunday as last day
    const monday = new Date(target);
    monday.setDate(target.getDate() + mondayOffset);
    return monday.toISOString().split('T')[0];
  };

  const formatWeekRange = (anyIsoInWeek: string) => {
    const startISO = getWeekStartISO(anyIsoInWeek);
    const start = new Date(startISO);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const s = start.toLocaleDateString(undefined, opts);
    const e = end.toLocaleDateString(undefined, opts);
    return `${s} — ${e}`;
  };

  // animated week label transition
  const weekAnim = useRef(new Animated.Value(0)).current;
  const weekLabelText = useMemo(() => formatWeekRange(dayISO), [dayISO]);
  useEffect(() => {
    // simple fade out -> change -> fade in
    Animated.sequence([
      Animated.timing(weekAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(weekAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [dayISO]);

  const openAddMeal = (type: MealType) => {
    setSelectedMealType(type);
    setShowMealPlanModal(true);
  };

  // Centered, clickable horizontal date picker using FlatList for snapping and consistent centering
  const DateCarousel: React.FC<{ selectedDate: string; onSelectDate: (d: string) => void; daysToShow?: number }> = ({ selectedDate, onSelectDate, daysToShow = 7 }) => {
    const listRef = React.useRef<FlatList<Date> | null>(null);
    const itemWidth = 64; // width of the day bubble
    const itemMargin = 8;
    const totalItemSize = itemWidth + itemMargin * 2;
    const windowWidth = Dimensions.get('window').width;
    const centerIndex = Math.floor(daysToShow / 2);

  const buildDates = () => {
      const center = new Date(selectedDate);
      const arr: Date[] = [];
      for (let i = -centerIndex; i <= centerIndex; i++) {
        const d = new Date(center);
        d.setDate(center.getDate() + i);
        arr.push(d);
      }
      return arr;
    };

    const dates = React.useMemo(buildDates, [selectedDate, daysToShow]);

    useEffect(() => {
      // always scroll so the selected item sits at the center position
      // using viewPosition 0.5 centers the item in the viewport
      listRef.current?.scrollToIndex({ index: centerIndex, animated: true, viewPosition: 0.5 });
    }, [selectedDate]);

    return (
      <FlatList
        ref={(r) => { listRef.current = r; }}
        horizontal
        data={dates}
        keyExtractor={(d) => d.toISOString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Math.max(12, (windowWidth - itemWidth) / 2 - itemMargin) }}
        renderItem={({ item }) => {
          const d = item;
          const iso = d.toISOString().split('T')[0];
          const isSel = iso === selectedDate;
          // Use Array.from to correctly grab the first grapheme cluster for localized/RTL weekdays
          const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
          const weekdayInitial = Array.from(weekday)[0] ?? weekday.charAt(0);
          const dayNum = d.getDate();
          return (
            <TouchableOpacity
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${weekday} ${dayNum}`}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.carouselItem, isSel && styles.carouselItemSelected]}
              onPress={() => onSelectDate(iso)}
            >
              <Text style={[styles.carouselWeekday, isSel && styles.carouselWeekdaySelected]}>{weekdayInitial.toUpperCase()}</Text>
              <View style={[styles.carouselCircle, isSel && styles.carouselCircleSelected]}>
                <Text style={[styles.carouselDayNumber, isSel && styles.carouselDayNumberSelected]}>{dayNum}</Text>
              </View>
              {isSel && <View style={styles.snapIndicator} />}
            </TouchableOpacity>
          );
        }}
        snapToInterval={totalItemSize}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: totalItemSize, offset: totalItemSize * index, index })}
        initialScrollIndex={centerIndex}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Dashboard',
          headerShown: true,
        }}
      />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Enhanced Hero Header with Gradient */}
        <ExpoLinearGradient
          colors={[Colors.background, Colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Status Bar Spacer */}
          <View style={styles.statusBarSpacer} />

          {/* Screen Title removed to rely on navigation header */}

          {/* Enhanced Progress Ring */}
          <View style={styles.heroInner}>
            <View style={styles.ringContainer}>
              <Svg width={ringSize} height={ringSize}>
                <Defs>
                  <LinearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
                    <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.10" />
                  </LinearGradient>
                  <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#F1828D" stopOpacity="1" />
                    <Stop offset="100%" stopColor="#F1828D" stopOpacity="0.9" />
                  </LinearGradient>
                </Defs>
                <Circle 
                  cx={ringSize/2} 
                  cy={ringSize/2} 
                  r={radius} 
                  stroke="rgba(0,0,0,0.12)" 
                  strokeWidth={stroke} 
                  fill="none" 
                />
                <Circle
                  cx={ringSize/2}
                  cy={ringSize/2}
                  r={radius}
                  stroke="#F1828D"
                  strokeWidth={stroke}
                  strokeDasharray={`${dash}, ${circumference}`}
                  strokeLinecap="round"
                  fill="none"
                  rotation={-90}
                  origin={`${ringSize/2}, ${ringSize/2}`}
                />
              </Svg>
              
              {/* Center Content */}
              <View style={styles.kcalCenter}>
                <Text style={styles.kcalNumber}>{calorieGoal ? kcalLeft : eaten}</Text>
                <Text style={styles.kcalLabel}>{calorieGoal ? 'kcal left' : 'kcal eaten'}</Text>
                {calorieGoal > 0 && (
                  <View style={styles.progressStats}>
                    <Text style={styles.progressText}>{eaten} / {calorieGoal}</Text>
                    <View style={styles.progressBadge}>
                      <Text style={styles.progressPercent}>{Math.round(ringPct * 100)}%</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Quick Stats Row */}
            <View style={styles.quickStatsRow}>
            <View style={styles.quickStat}>
              <Target size={16} color={Colors.primary} />
              <Text style={styles.quickStatText}>Goal: {calorieGoal}</Text>
            </View>
            <View style={styles.quickStat}>
              <Flame size={16} color={Colors.primary} />
              <Text style={styles.quickStatText}>Eaten: {eaten}</Text>
            </View>
          </View>
        </ExpoLinearGradient>

        {/* Enhanced Macros Section */}
        <View style={styles.macrosSection}> 
          <Text style={styles.sectionTitle}>Nutrition Breakdown</Text>
          <View style={styles.macrosGrid}>
            <EnhancedMacroCard 
              label="Carbs" 
              value={dayTotals.carbs} 
              goal={goals?.carbs || 0} 
              unit="g" 
              color="#FF6B6B"
              icon="🍞"
            />
            <EnhancedMacroCard 
              label="Protein" 
              value={dayTotals.protein} 
              goal={goals?.protein || 0} 
              unit="g" 
              color="#4ECDC4"
              icon="🥩"
            />
            <EnhancedMacroCard 
              label="Fat" 
              value={dayTotals.fats} 
              goal={goals?.fats || 0} 
              unit="g" 
              color="#45B7D1"
              icon="🥑"
            />
          </View>
        </View>

        {/* Week Navigation + Date Carousel */}
        <View style={styles.weekNavRow}>
          <TouchableOpacity style={styles.modernIconBtn} onPress={() => shiftWeek(-1)} accessibilityRole="button" accessibilityLabel="Previous week">
            <ChevronLeft size={18} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Animated.Text style={[styles.weekLabel, { opacity: weekAnim }]}>{weekLabelText}</Animated.Text>
          </View>
          <TouchableOpacity style={styles.modernIconBtn} onPress={() => shiftWeek(1)} accessibilityRole="button" accessibilityLabel="Next week">
            <ChevronRight size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={{ paddingHorizontal: 8, marginTop: 8, marginBottom: 16 }}>
          <DateCarousel selectedDate={dayISO} onSelectDate={(iso) => setDayISO(iso)} />
        </View>

        {/* Enhanced Meals Section */}
        <View style={styles.mealsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Meals</Text>
            <TouchableOpacity style={styles.sectionAction}>
              <Star size={16} color={Colors.primary} />
              <Text style={styles.sectionActionText}>Plan All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.mealsGrid}>
            <EnhancedMealCard title="Breakfast" type="breakfast" dayISO={dayISO} onAdd={openAddMeal} icon="🌅" />
            <EnhancedMealCard title="Lunch" type="lunch" dayISO={dayISO} onAdd={openAddMeal} icon="☀️" />
            <EnhancedMealCard title="Dinner" type="dinner" dayISO={dayISO} onAdd={openAddMeal} icon="🌙" />
            <EnhancedMealCard title="Snack" type="snack" dayISO={dayISO} onAdd={openAddMeal} icon="🍎" />
          </View>
        </View>

        {/* Insights Section */}
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>Daily Insights</Text>
          <View style={styles.insightsGrid}>
            <InsightCard 
              title="Streak" 
              value="7 days" 
              subtitle="Keep it up!" 
              icon={<Award size={20} color="#FFD93D" />}
              color="#FFF3CD"
            />
            <InsightCard 
              title="Progress" 
              value={`${Math.round(ringPct * 100)}%`} 
              subtitle="of daily goal" 
              icon={<TrendingUp size={20} color="#28A745" />}
              color="#D4EDDA"
            />
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Chat Button */}
      <TouchableOpacity
        style={[
          styles.fab,
          { bottom: Math.max(16, (insets?.bottom ?? 0) + 12), zIndex: 999, elevation: 20 },
        ]}
        onPress={() => setChatOpen(true)}
      >
        <Brain size={24} color={Colors.white} />
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal
        visible={chatOpen}
        animationType="slide"
        onRequestClose={() => setChatOpen(false)}
        presentationStyle="fullScreen"
        statusBarTranslucent={false}
      >
        <SafeAreaView edges={['top','bottom']} style={[styles.container, { backgroundColor: Colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: (insets?.top ?? 0) + Spacing.sm }] }>
            <Text style={styles.modalTitle}>Coach Chat</Text>
            <TouchableOpacity onPress={() => setChatOpen(false)} style={styles.headerButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: Colors.primary, fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxl }}>
            <View style={styles.chipsRow}>
              {['Plan my day', 'Plan my week', 'Generate shopping list'].map((chip) => (
                <TouchableOpacity key={chip} style={styles.chip} onPress={() => sendMessage(chip)}>
                  <Text style={styles.chipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
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
              {isTyping && (
                <View style={[styles.msg, styles.msgCoach]}>
                  <Text style={styles.typingText}>AI is typing…</Text>
                </View>
              )}
            </View>
          </ScrollView>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.composerRow, { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }]}> 
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
        </SafeAreaView>
      </Modal>

      {/* Plan Meal Modal */}
      <MealPlanModal
        visible={showMealPlanModal}
        selectedDate={dayISO}
        selectedMealType={selectedMealType}
        onSave={(plannedMeal) => { addPlannedMeal(plannedMeal); setShowMealPlanModal(false); }}
        onClose={() => setShowMealPlanModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  hero: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    minHeight: 320,
  },
  // dashboardTitle removed (using nav header)
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
    gap: 16,
  },
  dateLabel: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },
  statusBarSpacer: {
    height: Platform.OS === 'ios' ? 44 : 24,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
    marginTop: 10,
  },
  dateContainer: {
    alignItems: 'center',
  },
  heroDate: {
  color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroSubDate: {
  color: Colors.lightText,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  modernIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
  backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  borderColor: Colors.border,
  },
  heroInner: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kcalCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kcalNumber: {
  color: Colors.text,
    fontSize: 42,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  kcalLabel: {
  color: Colors.lightText,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  progressStats: {
    alignItems: 'center',
    marginTop: 8,
  },
  progressText: {
  color: Colors.lightText,
    fontSize: 12,
    fontWeight: '500',
  },
  progressBadge: {
  backgroundColor: Colors.card,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  progressPercent: {
  color: Colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
  backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  borderColor: Colors.border,
  },
  quickStatText: {
  color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  macrosSection: {
    padding: 20,
    paddingTop: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  color: Colors.text,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
  backgroundColor: 'rgba(241,130,141,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sectionActionText: {
  color: '#F1828D',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  macroCard: {
    flex: 1,
  backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  borderColor: Colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  macroHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  macroIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: '700',
  color: Colors.lightText,
    letterSpacing: 0.5,
  },
  macroProgress: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  macroCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  macroUnit: {
    fontSize: 10,
  color: Colors.lightText,
    fontWeight: '600',
  },
  macroGoal: {
    fontSize: 12,
  color: Colors.lightText,
    fontWeight: '500',
  },
  mealsSection: {
    padding: 20,
  },
  mealsGrid: {
    gap: 12,
  },
  mealCard: {
  backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  borderColor: Colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  mealCardPlanned: {
  borderColor: 'rgba(241,130,141,0.30)',
  backgroundColor: 'rgba(241,130,141,0.05)',
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
  backgroundColor: 'rgba(241,130,141,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mealIcon: {
    fontSize: 18,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '700',
  color: Colors.text,
  },
  mealContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
    marginRight: 12,
  backgroundColor: Colors.secondary,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '600',
  color: Colors.text,
    marginBottom: 4,
  },
  mealStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealKcal: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyMealContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyMealText: {
    fontSize: 14,
  color: Colors.lightText,
    fontWeight: '500',
    marginTop: 8,
  },
  insightsSection: {
    padding: 20,
  },
  insightsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  insightCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  backgroundColor: Colors.card,
    borderWidth: 1,
  borderColor: Colors.border,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: '600',
  color: Colors.text,
    marginLeft: 6,
  },
  insightValue: {
    fontSize: 20,
    fontWeight: '800',
  color: Colors.text,
    marginBottom: 2,
  },
  insightSubtitle: {
    fontSize: 11,
  color: Colors.lightText,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 20,
  },
  modalHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  borderBottomWidth: 1,
  borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
  color: Colors.text,
  },
  headerButton: { padding: Spacing.sm, marginRight: Spacing.sm },
  metaChip: { backgroundColor: Colors.tabBackground, color: Colors.text, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: Typography.sizes.sm },
  cardTitle: { marginLeft: Spacing.sm, fontSize: Typography.sizes.lg, fontWeight: '600', color: Colors.text },
  subtitle: { color: Colors.lightText, marginBottom: Spacing.sm },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  actionBtn: { marginRight: Spacing.sm, marginTop: Spacing.xs },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  chip: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16 },
  chipText: { color: Colors.text, fontSize: Typography.sizes.sm },
  messages: { marginTop: Spacing.md },
  msg: { padding: Spacing.md, borderRadius: 12, marginBottom: Spacing.md },
  msgUser: { backgroundColor: Colors.card },
  msgCoach: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  msgText: { color: Colors.text },
  msgSummary: { color: Colors.lightText, marginTop: 4 },
  msgSource: { color: Colors.lightText, marginTop: 4, fontSize: Typography.sizes.sm },
  typingText: { color: Colors.lightText, fontStyle: 'italic' },
  inlineCard: { backgroundColor: Colors.secondary, borderRadius: 8, padding: Spacing.sm, marginTop: Spacing.xs },
  inlineTitle: { color: Colors.text, fontWeight: '600' },
  inlineSub: { color: Colors.lightText, marginTop: 2 },
  inlineActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  composerRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: 999, paddingHorizontal: Spacing.md, backgroundColor: Colors.card },
  input: { flex: 1, paddingVertical: Spacing.md, color: Colors.text },
  sendBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  sendText: { color: '#F1828D', fontWeight: '600' },
  iconBtn: { padding: Spacing.sm },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, backgroundColor: '#F1828D', borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: 'rgba(241,130,141,0.3)', shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 },
  carouselItem: {
    width: 64,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  carouselItemSelected: {
    // lift selected item slightly
    transform: [{ translateY: -8 }],
  },
  carouselWeekday: {
  color: Colors.lightText,
    fontSize: 12,
    marginBottom: 6,
  },
  carouselWeekdaySelected: {
  color: Colors.text,
    fontWeight: '700',
  },
  carouselCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  backgroundColor: Colors.card,
  borderWidth: 1,
  borderColor: Colors.border,
  },
  carouselCircleSelected: {
    // use app accent (orange) so it matches app theme rather than the example screenshot
  backgroundColor: '#F1828D',
  borderColor: '#F1828D',
  },
  carouselDayNumber: {
  color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  carouselDayNumberSelected: {
  color: Colors.white,
  },
  weekNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 6,
  },
  weekLabel: {
  color: Colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  snapIndicator: {
    height: 3,
    width: 28,
  backgroundColor: '#F1828D',
    borderRadius: 2,
    marginTop: 6,
  },
});

// --- Enhanced Presentational Components ---
const EnhancedMacroCard = ({ 
  label, 
  value, 
  goal = 0, 
  unit, 
  color, 
  icon 
}: { 
  label: string; 
  value: number; 
  goal?: number; 
  unit: string; 
  color: string;
  icon: string;
}) => {
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const circumference = 2 * Math.PI * 30;
  const strokeDasharray = circumference * pct;
  
  return (
    <View style={styles.macroCard}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroIcon}>{icon}</Text>
        <Text style={styles.macroLabel}>{label.toUpperCase()}</Text>
      </View>
      
      <View style={styles.macroProgress}>
        <Svg width={70} height={70}>
          <Circle 
            cx={35} 
            cy={35} 
            r={30} 
            stroke={color + '20'} 
            strokeWidth={6} 
            fill="none" 
          />
          <Circle
            cx={35}
            cy={35}
            r={30}
            stroke={color}
            strokeWidth={6}
            strokeDasharray={`${strokeDasharray}, ${circumference}`}
            strokeLinecap="round"
            fill="none"
            rotation={-90}
            origin="35, 35"
          />
        </Svg>
        <View style={styles.macroCenter}>
          <Text style={[styles.macroValue, { color }]}>{Math.round(value)}</Text>
          <Text style={styles.macroUnit}>{unit}</Text>
        </View>
      </View>
      
      <Text style={styles.macroGoal}>of {goal}{unit}</Text>
    </View>
  );
};

const EnhancedMealCard = ({ 
  title, 
  type, 
  dayISO, 
  onAdd, 
  icon 
}: { 
  title: string; 
  type: MealType; 
  dayISO: string; 
  onAdd: (t: MealType) => void;
  icon: string;
}) => {
  const { getMealForDateAndType } = useMealPlanner();
  const { meals } = useMeals();
  const planned = getMealForDateAndType(dayISO, type);
  const recipe = planned ? meals.find(m => m.id === planned.recipeId) : undefined;
  const kcal = recipe?.nutritionPerServing?.calories ? Math.round(recipe.nutritionPerServing.calories * (planned?.servings ?? 1)) : undefined;
  
  return (
    <TouchableOpacity 
      style={[styles.mealCard, recipe && styles.mealCardPlanned]}
      onPress={() => onAdd(type)}
    >
      <View style={styles.mealCardHeader}>
        <View style={styles.mealIconContainer}>
          <Text style={styles.mealIcon}>{icon}</Text>
        </View>
        <Text style={styles.mealTitle}>{title}</Text>
      </View>
      
      {recipe ? (
        <View style={styles.mealContent}>
          {recipe.image && (
            <Image source={{ uri: recipe.image }} style={styles.mealImage} />
          )}
          <View style={styles.mealInfo}>
            <Text style={styles.mealName} numberOfLines={2}>{recipe.name}</Text>
            {kcal && (
              <View style={styles.mealStats}>
                <Flame size={12} color={Colors.primary} />
                <Text style={styles.mealKcal}>{kcal} kcal</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.emptyMealContent}>
          <Plus size={24} color={Colors.lightText} />
          <Text style={styles.emptyMealText}>Add {title.toLowerCase()}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const InsightCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color 
}: { 
  title: string; 
  value: string; 
  subtitle: string; 
  icon: React.ReactNode;
  color: string;
}) => (
  <View style={[styles.insightCard, { backgroundColor: color }]}>
    <View style={styles.insightHeader}>
      {icon}
      <Text style={styles.insightTitle}>{title}</Text>
    </View>
    <Text style={styles.insightValue}>{value}</Text>
    <Text style={styles.insightSubtitle}>{subtitle}</Text>
  </View>
);


