import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Modal, Image, FlatList, Dimensions, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Brain, ChevronLeft, ChevronRight, Plus, Target, TrendingUp, Award, Flame, Pencil, Calendar } from 'lucide-react-native';
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
import FitnessRing, { RingSpec } from '@/components/ui/FitnessRing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StructuredMessage } from '@/components/StructuredMessage';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Rule } from '@/components/ui/Rule';
import { IconButtonSquare } from '@/components/ui/IconButtonSquare';

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const { loggedMeals, goals } = useNutrition();
  const { messages, sendMessage, performInlineAction, isTyping } = useCoachChat();
  const { getMealForDateAndType, addPlannedMeal, updatePlannedMeal } = useMealPlanner();
  const { meals } = useMeals();
  const [inputText, setInputText] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [dayISO, setDayISO] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [selectedExistingMeal, setSelectedExistingMeal] = useState<ReturnType<typeof getMealForDateAndType> | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date(dayISO);
    d.setDate(1);
    return d;
  });

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

  // Keep calendar month in sync when changing day via other controls
  useEffect(() => {
    const d = new Date(dayISO);
    if (d.getFullYear() !== calendarMonth.getFullYear() || d.getMonth() !== calendarMonth.getMonth()) {
      const first = new Date(d);
      first.setDate(1);
      setCalendarMonth(first);
    }
  }, [dayISO]);

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
    setSelectedExistingMeal(undefined);
    setShowMealPlanModal(true);
  };

  const openEditMeal = (type: MealType) => {
    const existing = getMealForDateAndType(dayISO, type);
    setSelectedMealType(type);
    setSelectedExistingMeal(existing);
    setShowMealPlanModal(true);
  };

  // Reusable DayCell component (Design A: progress ring cell)
  const DayCell: React.FC<{
    date: Date;
    selected: boolean;
    isToday: boolean;
    isYesterday: boolean;
    isFuture: boolean;
    // Optional status: only computed for selected to avoid new logic pathways
    status?: 'met' | 'missed';
    rings?: RingSpec[];
    onPress: () => void;
  }> = ({ date, selected, isToday, isYesterday, isFuture, status, rings, onPress }) => {
    const size = 44; // 40–44dp circle, choose 44 for better tap target
    const ringStroke = 2; // default outer ring stroke for fallback
    const radius = (size - ringStroke) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
    const weekdayInitial = Array.from(weekday)[0] ?? weekday.charAt(0);
    const dayNum = date.getDate();

    // Visual state colors (tokens)
    const baseRing = Colors.border;
    const selectedFill = Colors.primary;
    const todayOutline = Colors.primary;
    const textColor = Colors.text;
    const subText = Colors.lightText;

    // Progress ring: keep subtle unless selected; no new data logic introduced
    const ringColor = selected ? Colors.primary : baseRing;

    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${weekday} ${dayNum}${isToday ? ', Today' : ''}${selected ? ', Selected' : ''}`}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPress={onPress}
        style={[styles.carouselItem, selected && styles.carouselItemSelected]}
      >
        <Text style={[styles.dayWeekLabel, selected && styles.dayWeekLabelSelected]}>
          {weekdayInitial.toUpperCase()}
        </Text>
        <View style={[styles.dayCircleContainer, isToday && styles.dayCircleToday]}>
          {rings && rings.length > 0 ? (
            <FitnessRing size={size} stroke={3} gap={2} backgroundColor={baseRing} rings={rings} />
          ) : (
            <Svg width={size} height={size}>
              <Circle cx={cx} cy={cy} r={radius} stroke={baseRing} strokeWidth={ringStroke} fill="transparent" />
              {/* Outer progress ring – visual only; highlight when selected */}
              <Circle cx={cx} cy={cy} r={radius} stroke={ringColor} strokeWidth={ringStroke} fill="none" opacity={selected ? 1 : 0.4} />
            </Svg>
          )}
          <View style={styles.dayCircleInner} pointerEvents="none">
            <Text style={[styles.dayNumber, selected && styles.dayNumberSelected]}>{dayNum}</Text>
          </View>
        </View>
        {/* Mini activity bar – decorative only to avoid logic changes */}
        <View style={[styles.dayMiniBar, selected && styles.dayMiniBarSelected, isFuture && styles.dayMiniBarFuture]} />
        {/* Optional status text tint – only if provided (e.g., for selected via existing ringPct) */}
        {!!status && (
          <Text style={[styles.dayStatus, status === 'met' ? styles.dayStatusMet : styles.dayStatusMissed]}>
            {status === 'met' ? 'Met' : 'Missed'}
          </Text>
        )}
      </TouchableOpacity>
    );
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
          const todayISO = new Date().toISOString().split('T')[0];
          const isToday = iso === todayISO;
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayISO = yesterday.toISOString().split('T')[0];
          const isYesterday = iso === yesterdayISO;
          const isFuture = new Date(iso) > new Date(todayISO);

          // Optional status for the selected day only, driven by existing daily state
          let status: 'met' | 'missed' | undefined;
          if (isSel) {
            status = (calorieGoal > 0 && eaten >= calorieGoal) ? 'met' : undefined;
          }

          // Build per-day macro rings (outer->inner): Carbs, Protein, Fat
          const dayMacros = loggedMeals
            .filter((m) => m.date === iso)
            .reduce(
              (acc, m) => ({
                carbs: acc.carbs + m.carbs,
                protein: acc.protein + m.protein,
                fats: acc.fats + m.fats,
              }),
              { carbs: 0, protein: 0, fats: 0 }
            );
          const carbGoal = goals?.carbs || 0;
          const proteinGoal = goals?.protein || 0;
          const fatGoal = goals?.fats || 0;
          const rings: RingSpec[] = [
            { pct: carbGoal ? Math.min(1, dayMacros.carbs / carbGoal) : 0, color: '#FF6B6B' },
            { pct: proteinGoal ? Math.min(1, dayMacros.protein / proteinGoal) : 0, color: '#4ECDC4' },
            { pct: fatGoal ? Math.min(1, dayMacros.fats / fatGoal) : 0, color: '#45B7D1' },
          ];

          return (
            <DayCell
              date={d}
              selected={isSel}
              isToday={isToday}
              isYesterday={isYesterday}
              isFuture={isFuture}
              status={status}
              rings={rings}
              onPress={() => onSelectDate(iso)}
            />
          );
        }}
        snapToInterval={totalItemSize}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: totalItemSize, offset: totalItemSize * index, index })}
        initialScrollIndex={centerIndex}
      />
    );
  };

  // Static week rings (Mon–Sun) like the reference design
  const WeekRings: React.FC<{ selectedDate: string; onSelectDate: (iso: string) => void }> = ({ selectedDate, onSelectDate }) => {
    const startISO = getWeekStartISO(selectedDate);
    const start = new Date(startISO);
    const days: { date: Date; iso: string }[] = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d, iso: d.toISOString().split('T')[0] };
    });

    const todayISO = new Date().toISOString().split('T')[0];
    const ringColor = Colors.primary; // use theme primary for consistency

    return (
      <View style={styles.weekRingsContainer}>
        {/* Weekday initials row */}
        <View style={styles.weekInitialsRow}>
          {days.map(({ date, iso }) => {
            const isSel = iso === selectedDate;
            const w = date.toLocaleDateString(undefined, { weekday: 'short' });
            const initial = Array.from(w)[0]?.toUpperCase() ?? w.charAt(0).toUpperCase();
            return (
              <View key={`winit-${iso}`} style={styles.weekInitialCell}>
                <Text style={[styles.weekInitial, isSel && styles.weekInitialSelected]}>{initial}</Text>
              </View>
            );
          })}
        </View>
        {/* Rings row */}
        <View style={styles.weekRingsRow}>
          {days.map(({ iso, date }) => {
            const isFuture = new Date(iso) > new Date(todayISO);
            const totals = loggedMeals
              .filter((m) => m.date === iso)
              .reduce((acc, m) => ({ calories: acc.calories + m.calories }), { calories: 0 });
            const pct = calorieGoal ? Math.min(1, totals.calories / calorieGoal) : 0;
            const ring: RingSpec = { pct, color: ringColor };
            return (
              <TouchableOpacity
                key={`wr-${iso}`}
                style={styles.weekRingCell}
                onPress={() => onSelectDate(iso)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${date.toDateString()}`}
              >
                <View style={{ opacity: isFuture ? 0.35 : 1 }}>
                  <FitnessRing size={40} stroke={4} gap={2} backgroundColor={Colors.border} rings={[ring]} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerShown: false,
        }}
      />
      {/* Unified Screen Header */}
      <ScreenHeader
        title="Coach"
        icon={<Brain size={28} color={Colors.text} />}
      />
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (insets?.bottom ?? 0) + 56 + 32 }}
      >
        {/* Enhanced Hero Header with Gradient */}
        <ExpoLinearGradient
          colors={[Colors.background, Colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Header spacer removed; ScreenHeader provides spacing */}

          {/* Enhanced Progress Ring */}
          <View style={styles.heroInner}>
            <View style={styles.ringContainer}>
              <Svg width={ringSize} height={ringSize}>
                <Defs>
                  <LinearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={Colors.white} stopOpacity="0.15" />
                    <Stop offset="100%" stopColor={Colors.white} stopOpacity="0.10" />
                  </LinearGradient>
                  <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={Colors.primary} stopOpacity="1" />
                    <Stop offset="100%" stopColor={Colors.primary} stopOpacity="0.9" />
                  </LinearGradient>
                </Defs>
                <Circle 
                  cx={ringSize/2} 
                  cy={ringSize/2} 
                  r={radius} 
                  stroke={Colors.border} 
                  strokeWidth={stroke} 
                  fill="none" 
                />
                <Circle
                  cx={ringSize/2}
                  cy={ringSize/2}
                  r={radius}
                  stroke={Colors.primary}
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

          {/* StatRow: Goal / Eaten (outline pills, no cards) */}
          <View style={styles.statRow}>
            <View style={styles.statPill}>
              <Target size={16} color={Colors.primary} />
              <Text style={styles.statPillValue}>{calorieGoal}</Text>
              <Text style={styles.statPillLabel}>Goal</Text>
            </View>
            <View style={styles.statPill}>
              <Flame size={16} color={Colors.primary} />
              <Text style={styles.statPillValue}>{eaten}</Text>
              <Text style={styles.statPillLabel}>Eaten</Text>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Animated.Text style={[styles.weekLabel, { opacity: weekAnim }]}>{weekLabelText}</Animated.Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Jump to Today"
                onPress={() => setDayISO(new Date().toISOString().split('T')[0])}
                style={styles.todayChip}
              >
                <Text style={styles.todayChipText}>Today</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.modernIconBtn} onPress={() => shiftWeek(1)} accessibilityRole="button" accessibilityLabel="Next week">
            <ChevronRight size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.weekHeaderRow}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={styles.modernIconBtn}
            accessibilityRole="button"
            accessibilityLabel="Open calendar"
            onPress={() => setCalendarOpen(true)}
          >
            <Calendar size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={{ paddingHorizontal: 16, marginTop: 4, marginBottom: 16 }}>
          <WeekRings selectedDate={dayISO} onSelectDate={(iso) => setDayISO(iso)} />
        </View>

        {/* Enhanced Meals Section */}
        <View style={styles.mealsSection}>
          <View style={styles.sectionHeader}> 
            <Text style={styles.sectionTitle}>Today's Meals</Text>
            <Button title="Plan All" variant="outline" size="sm" onPress={() => setShowMealPlanModal(true)} />
          </View>
          <Rule />

          {/* Meal rows: show current plan if set; otherwise prompt to add */}
          <View>
            {(['breakfast','lunch','dinner','snack'] as MealType[]).map((type) => {
              const planned = getMealForDateAndType(dayISO, type);
              const recipe = planned ? meals.find((m:any) => m.id === planned.recipeId) : undefined;
              const icon = type === 'breakfast' ? '🌅' : type === 'lunch' ? '☀️' : type === 'dinner' ? '🌙' : '🍎';
              const label = type.charAt(0).toUpperCase() + type.slice(1);
              return (
                <React.Fragment key={type}>
                  <TouchableOpacity style={styles.mealRow} onPress={() => (planned ? openEditMeal(type) : openAddMeal(type))}>
                    <Text style={styles.mealRowIcon}>{icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mealRowTitle}>{label}</Text>
                      {planned ? (
                        <View style={styles.mealRowSubRow}>
                          {recipe?.image ? (
                            <Image source={{ uri: recipe.image }} style={styles.mealRowThumb} />
                          ) : null}
                          <Text style={styles.mealRowSub}>{recipe?.name ?? 'Planned'}</Text>
                        </View>
                      ) : (
                        <Text style={styles.mealRowSub}>Add {type}</Text>
                      )}
                    </View>
                    <IconButtonSquare accessibilityLabel={planned ? `Edit ${type}` : `Plan ${type}`}>
                      {planned ? <Pencil size={16} color={Colors.text} /> : <Plus size={16} color={Colors.text} />}
                    </IconButtonSquare>
                  </TouchableOpacity>
                  <Rule />
                </React.Fragment>
              );
            })}
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
              icon={<Award size={20} color={Colors.primary} />}
              color={Colors.card}
            />
            <InsightCard 
              title="Progress" 
              value={`${Math.round(ringPct * 100)}%`} 
              subtitle="of daily goal" 
              icon={<TrendingUp size={20} color={Colors.primary} />}
              color={Colors.card}
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
          { bottom: Math.max(20, (insets?.bottom ?? 0) + 56 + 24), zIndex: 999, elevation: 20 },
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

      {/* Calendar Modal */}
      <Modal
        visible={calendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarOpen(false)}
      >
        <View style={styles.calendarBackdrop}>
          <View style={styles.calendarSheet}>
            {/* Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.modernIconBtn}
                onPress={() => {
                  const d = new Date(calendarMonth);
                  d.setMonth(d.getMonth() - 1);
                  setCalendarMonth(d);
                }}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
              >
                <ChevronLeft size={18} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.calendarMonthLabel}>
                {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity
                style={styles.modernIconBtn}
                onPress={() => {
                  const d = new Date(calendarMonth);
                  d.setMonth(d.getMonth() + 1);
                  setCalendarMonth(d);
                }}
                accessibilityRole="button"
                accessibilityLabel="Next month"
              >
                <ChevronRight size={18} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Weekday Row (Mon–Sun) */}
            <View style={styles.calendarWeekdaysRow}>
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
                <Text key={d} style={styles.calendarWeekdayText}>{d}</Text>
              ))}
            </View>

            {/* Grid */}
            <View style={styles.calendarGrid}>
              {(() => {
                const items: React.ReactNode[] = [];
                const first = new Date(calendarMonth);
                const month = first.getMonth();
                const year = first.getFullYear();
                const firstWeekday = (() => {
                  // Convert JS Sunday(0)..Saturday(6) to Mon(1)..Sun(7)
                  const js = new Date(year, month, 1).getDay();
                  return js === 0 ? 7 : js;
                })();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const todayISO = new Date().toISOString().split('T')[0];
                const selectedISO = dayISO;
                // leading blanks for Mon-based grid
                const lead = firstWeekday - 1; // 0..6
                for (let i = 0; i < lead; i++) {
                  items.push(<View key={`blank-${i}`} style={styles.calendarCell} />);
                }
                for (let day = 1; day <= daysInMonth; day++) {
                  const d = new Date(year, month, day);
                  const iso = d.toISOString().split('T')[0];
                  const isSelected = iso === selectedISO;
                  const isToday = iso === todayISO;
                  // daily calories progress for ring (like home screen)
                  const totals = loggedMeals
                    .filter((m) => m.date === iso)
                    .reduce((acc, m) => ({ calories: acc.calories + m.calories }), { calories: 0 });
                  const pct = (goals?.dailyCalories ?? 0) > 0 ? Math.min(1, totals.calories / (goals?.dailyCalories ?? 1)) : 0;
                  const isFuture = new Date(iso) > new Date(todayISO);
                  items.push(
                    <TouchableOpacity
                      key={`d-${iso}`}
                      style={[styles.calendarCell, isSelected && styles.calendarCellSelected, isToday && styles.calendarCellToday]}
                      onPress={() => {
                        setDayISO(iso);
                        setCalendarOpen(false);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${d.toDateString()}`}
                      disabled={false}
                    >
                      <View style={{ opacity: isFuture ? 0.35 : 1 }}>
                        <FitnessRing size={40} stroke={4} gap={2} backgroundColor={Colors.border} rings={[{ pct, color: Colors.primary }]} />
                      </View>
                      <View style={styles.calendarCellInner} pointerEvents="none">
                        <Text style={[styles.calendarCellText, isSelected && styles.calendarCellTextSelected]}>{day}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }
                // trailing to complete rows (optional)
                const total = lead + daysInMonth;
                const trailing = total % 7 === 0 ? 0 : 7 - (total % 7);
                for (let i = 0; i < trailing; i++) {
                  items.push(<View key={`trail-${i}`} style={styles.calendarCell} />);
                }
                return items;
              })()}
            </View>

            {/* Footer actions */}
            <View style={styles.calendarFooter}>
              <TouchableOpacity onPress={() => setCalendarOpen(false)} style={styles.calendarCancelBtn}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setDayISO(today);
                  const m = new Date(); m.setDate(1); setCalendarMonth(m);
                  setCalendarOpen(false);
                }}
                style={styles.calendarTodayBtn}
              >
                <Text style={styles.calendarTodayText}>Today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Plan Meal Modal */}
      <MealPlanModal
        visible={showMealPlanModal}
        selectedDate={dayISO}
        selectedMealType={selectedMealType}
        existingMeal={selectedExistingMeal}
        onSave={(plannedMeal) => {
          if (selectedExistingMeal) {
            updatePlannedMeal({ ...selectedExistingMeal, ...plannedMeal });
          } else {
            addPlannedMeal(plannedMeal);
          }
          setShowMealPlanModal(false);
          setSelectedExistingMeal(undefined);
        }}
        onClose={() => { setShowMealPlanModal(false); setSelectedExistingMeal(undefined); }}
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
    fontWeight: Typography.weights.medium,
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
    fontWeight: Typography.weights.semibold,
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
    fontWeight: Typography.weights.semibold,
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
    fontWeight: Typography.weights.medium,
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
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: 12,
    gap: 6,
  },
  statPillValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
  },
  statPillLabel: {
    color: Colors.lightText,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  macrosSection: {
    padding: 20,
    paddingTop: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: Typography.weights.semibold,
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
    backgroundColor: Colors.tints.brandTintSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sectionActionText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  macroCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  macroIcon: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: Typography.weights.medium,
  },
  macroLabel: {
    color: Colors.lightText,
    fontSize: 11,
    fontWeight: Typography.weights.medium,
    letterSpacing: 0.5,
  },
  macroProgress: {
    marginVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroValue: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    lineHeight: 18,
  },
  macroUnit: {
    color: Colors.lightText,
    fontSize: 11,
    fontWeight: '600',
  },
  macroGoal: {
    color: Colors.lightText,
    fontSize: 11,
    marginTop: 6,
  },
  // ... (rest of the styles remain the same)

  mealsSection: {
    padding: 20,
  },
  // Flat meal rows with Rules
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  mealRowIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
    marginRight: 12,
  },
  mealRowTitle: {
    color: Colors.text,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: Typography.weights.semibold,
  },
  mealRowSub: {
    color: Colors.lightText,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 2,
  },
  mealRowSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  mealRowThumb: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  mealsGrid: {
    gap: 14,
  },
  mealCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  mealCardPlanned: {
    borderColor: Colors.primary,
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  mealIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.tabBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  mealIcon: { color: Colors.text, fontWeight: Typography.weights.medium },
  mealTitle: { color: Colors.text, fontSize: 16, fontWeight: Typography.weights.semibold },
  mealContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealImage: { width: 64, height: 64, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  mealInfo: { flex: 1 },
  mealName: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  mealStats: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  mealKcal: { color: Colors.text, fontSize: 12, fontWeight: '600' },
  emptyMealContent: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  emptyMealText: { color: Colors.lightText, fontSize: 14, fontWeight: '500' },
  // ... (rest of the styles remain the same)

  insightsSection: {
    padding: 20,
  },
  insightsGrid: {
    flexDirection: 'row',
    gap: 14,
  },
  insightCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  // ... (rest of the styles remain the same)
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
    fontWeight: Typography.weights.semibold,
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
    fontWeight: Typography.weights.semibold,
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
  sendText: { color: Colors.primary, fontWeight: '600' },
  iconBtn: { padding: Spacing.sm },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, backgroundColor: Colors.primary, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.shadow, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8 },
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
    fontWeight: Typography.weights.semibold,
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
  backgroundColor: Colors.primary,
  borderColor: Colors.primary,
  },
  carouselDayNumber: {
  color: Colors.text,
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
  },
  carouselDayNumberSelected: {
  color: Colors.white,
  },
  // Design A DayCell styles
  dayWeekLabel: { color: Colors.lightText, fontSize: 12, marginBottom: 6 },
  dayWeekLabelSelected: { color: Colors.text, fontWeight: Typography.weights.semibold },
  dayCircleContainer: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dayCircleToday: { },
  dayCircleInner: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 44, height: 44 },
  dayNumber: { color: Colors.text, fontSize: 16, fontWeight: Typography.weights.semibold },
  dayNumberSelected: { color: Colors.white },
  dayMiniBar: { marginTop: 6, height: 3, width: 24, backgroundColor: Colors.border, borderRadius: 2 },
  dayMiniBarSelected: { backgroundColor: Colors.primary },
  dayMiniBarFuture: { opacity: 0.6 },
  dayStatus: { marginTop: 4, fontSize: 10, color: Colors.lightText },
  dayStatusMet: { color: Colors.primary, fontWeight: '600' },
  dayStatusMissed: { color: Colors.warning, fontWeight: '600' },
  // Today chip
  todayChip: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  todayChipText: { color: Colors.text, fontSize: Typography.sizes.sm, fontWeight: '600' },
  // Week rings header (calendar icon)
  weekHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 6,
  },
  // Week rings block
  weekRingsContainer: {
    width: '100%',
  },
  weekInitialsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  weekInitialCell: {
    width: 40,
    alignItems: 'center',
  },
  weekInitial: {
    color: Colors.lightText,
    fontSize: 12,
  },
  weekInitialSelected: {
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
  },
  weekRingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  weekRingCell: {
    width: 40,
    alignItems: 'center',
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
    fontWeight: Typography.weights.semibold,
    fontSize: 14,
  },
  snapIndicator: {
    height: 3,
    width: 28,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginTop: 6,
  },
  // Calendar modal styles
  calendarBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  calendarSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarMonthLabel: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
  },
  calendarWeekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  calendarWeekdayText: {
    width: 40,
    textAlign: 'center',
    color: Colors.lightText,
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  calendarCell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calendarCellToday: {
    borderColor: Colors.primary,
  },
  calendarCellSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  calendarCellText: {
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
  },
  calendarCellTextSelected: {
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
  },
  calendarCellInner: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  calendarCancelBtn: { padding: 10 },
  calendarCancelText: { color: Colors.lightText, fontWeight: '600' },
  calendarTodayBtn: { padding: 10, backgroundColor: Colors.card, borderRadius: 999, borderWidth: 1, borderColor: Colors.border },
  calendarTodayText: { color: Colors.text, fontWeight: '700' },
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


