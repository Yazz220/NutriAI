import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Modal, Dimensions, FlatList, Image, TextInput, KeyboardAvoidingView, Platform, Alert, PanResponder, TouchableWithoutFeedback } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Brain, Plus, Medal, Fire, Pencil, X } from 'phosphor-react-native';
import SearchIcon from '@/assets/icons/search.svg';
import CalenderIcon from '@/assets/icons/Calender.svg';
import CameraIcon from '@/assets/icons/Camera.svg';
import LeftArrowIcon from '@/assets/icons/left arrow.svg';
import RightArrowIcon from '@/assets/icons/right arrow.svg';
import ProgressPageIcon from '@/assets/icons/Progress page.svg';
import TrackingPageIcon from '@/assets/icons/Tracking page.svg';
import BreakfastIcon from '@/assets/icons/Breakfast.svg';
import LunchIcon from '@/assets/icons/Lunch.svg';
import DinnerIcon from '@/assets/icons/Dinner.svg';
import SnackIcon from '@/assets/icons/Snack.svg';
import { Colors } from '@/constants/colors';
import { Typography as Type } from '@/constants/typography';
import { WEEK_RINGS_SCALE } from '@/constants/theme';
import { Spacing, Typography } from '@/constants/spacing';
import { useNutritionWithMealPlan } from '@/hooks/useNutritionWithMealPlan';
import { Button } from '@/components/ui/Button';
import { EnhancedCalorieRing } from '@/components/nutrition/EnhancedCalorieRing';
import { CompactNutritionRings } from '@/components/nutrition/CompactNutritionRings';
import { ExternalFoodLoggingModal } from '@/components/nutrition/ExternalFoodLoggingModal';
import { ProgressSection } from '@/components/nutrition/ProgressSection';
import { NutritionTrends } from '@/components/nutrition/NutritionTrends';
import { NutritionTrendsCard } from '@/components/nutrition/NutritionTrendsCard';
import { NutritionTrendsModal } from '@/components/nutrition/NutritionTrendsModal';
import { StreakCard } from '@/components/nutrition/StreakCard';
import { useCoachChat } from '@/hooks/useCoachChat';
import { useMealPlanner } from '@/hooks/useMealPlanner';
import { useMeals } from '@/hooks/useMealsStore';
import { useWeightTracking } from '@/hooks/useWeightTracking';
import { MealPlanModal } from '@/components/MealPlanModal';
import { MealType } from '@/types';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import FitnessRing, { RingSpec } from '@/components/ui/FitnessRing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { WeightCard } from '@/components/progress/WeightCard';
import { WeightProgressChartCard } from '@/components/progress/WeightProgressChartCard';
import { QuickWeightUpdateModal } from '@/components/progress/QuickWeightUpdateModal';
import { MeasurementCard } from '@/components/progress/MeasurementCard';
import { MeasurementModal } from '@/components/progress/MeasurementModal';
import { BMICard } from '@/components/progress/BMICard';
import BMIModal from '@/components/progress/BMIModal';
// Removed EnhancedDayStreakCard from Progress page; keep StreakCard in Tracking
// Removed unused TotalCaloriesCard import; using EnhancedTotalCaloriesCard instead
import { EnhancedTotalCaloriesCard } from '@/components/progress/EnhancedTotalCaloriesCard';
import { Rule } from '@/components/ui/Rule';
import { IconButtonSquare } from '@/components/ui/IconButtonSquare';
import { StructuredMessage } from '@/components/StructuredMessage';
import { DayCell, DateCarousel, WeekRings, CoachErrorBoundary } from '@/components/coach';
import { ProgressPhotosCard } from '@/components/progress/ProgressPhotosCard';
import { useRouter } from 'expo-router';
import { NutritionCoachChatInterface } from '@/components/NutritionCoachChatInterface';
import { EnhancedFloatingChatButton } from '@/components/coach/EnhancedFloatingChatButton';
import { EnhancedChatInterface } from '@/components/coach/EnhancedChatInterface';
import {
  getWeekStartISO,
  formatWeekRange,
  shiftDate,
  shiftWeek,
  isToday as isTodayUtil,
  getDayLabel
} from '@/utils/coach/dateUtils';
import { useToast } from '@/contexts/ToastContext';
// WeightTracker removed while we clean up Progress tab

export default function CoachScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loggedMeals, goals, getDailyProgress, calculatedGoals, canCalculateFromProfile, logPlannedMeal, removeLoggedMeal, logCustomMeal, weeklyTrends } = useNutritionWithMealPlan();
  const weightTracking = useWeightTracking();
  const [showTrendsModal, setShowTrendsModal] = useState(false);
  const [trendsInitialPeriod, setTrendsInitialPeriod] = useState<'7d'|'30d'|'90d'>('7d');
  const { messages, sendMessage, performInlineAction, isTyping } = useCoachChat();
  const { getMealForDateAndType, addPlannedMeal, updatePlannedMeal, completeMeal, removePlannedMeal } = useMealPlanner();
  const { meals } = useMeals();
  const { showToast } = useToast();
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'tracking' | 'progress'>('tracking');
  const [chatOpen, setChatOpen] = useState(false);
  const [dayISO, setDayISO] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [lockMealType, setLockMealType] = useState(false);
  const [planAllQueue, setPlanAllQueue] = useState<MealType[] | null>(null);
  const [planAllCompleted, setPlanAllCompleted] = useState<MealType[]>([]);
  const [showExternalFoodModal, setShowExternalFoodModal] = useState(false);
  const [externalFoodModalTab, setExternalFoodModalTab] = useState<'search' | 'scan' | 'manual'>('search');
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [selectedExistingMeal, setSelectedExistingMeal] = useState<ReturnType<typeof getMealForDateAndType> | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date(dayISO);
    d.setDate(1);
    return d;
  });
  // Calendar modal state - no excessive offsets needed
  const [showQuickWeightModal, setShowQuickWeightModal] = useState(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [showBmiModal, setShowBmiModal] = useState(false);
  const [imageToAnalyze, setImageToAnalyze] = useState<string | null>(null);
  // Segmented control layout/animation
  const [segWidth, setSegWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const segmentCount = 2;
  const activeIndex = activeTab === 'tracking' ? 0 : 1;
  useEffect(() => {
    if (segWidth > 0) {
      const w = segWidth / segmentCount;
      Animated.spring(indicatorX, {
        toValue: activeIndex * w,
        useNativeDriver: true,
        friction: 10,
        tension: 90,
      }).start();
    }
  }, [activeIndex, segWidth]);

  // Always start with today, but persist day selection during session
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('coach_day_iso');
        const today = new Date().toISOString().split('T')[0];
        
        // Only use saved date if it's today
        if (saved === today) {
          setDayISO(saved);
        } else {
          // Always default to today for better UX
          setDayISO(today);
        }
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

  // Get enhanced daily progress data
  const dailyProgress = useMemo(() => getDailyProgress(dayISO), [getDailyProgress, dayISO]);
  
  // Use calculated goals if available, fallback to manual goals
  const currentGoals = calculatedGoals || goals;
  const calorieGoal = currentGoals?.dailyCalories ?? 0;
  const eaten = dailyProgress.calories.consumed;
  const kcalLeft = dailyProgress.calories.remaining;
  const ringPct = dailyProgress.calories.percentage;
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

  // Carousel-style swipe for WeekRings (prev/current/next) only
  const SWIPE_THRESHOLD = 60;
  const [ringsWidth, setRingsWidth] = useState<number>(0);
  const translateX = useRef(new Animated.Value(0)).current; // will be set after layout

  const changeWeek = useCallback((delta: number) => {
    setDayISO((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7 * delta);
      return d.toISOString().split('T')[0];
    });
  }, []);

  const prevWeekISO = useMemo(() => {
    const d = new Date(dayISO);
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }, [dayISO]);
  const nextWeekISO = useMemo(() => {
    const d = new Date(dayISO);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, [dayISO]);

  const weekSwipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => (Math.abs(g.dx) > 8 && Math.abs(g.dy) < 12),
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        // drag current row; base offset centers current panel
        if (ringsWidth > 0) {
          let val = -ringsWidth + g.dx;
          // clamp so we don't reveal whitespace beyond panels
          if (val > 0) val = 0;
          if (val < -2 * ringsWidth) val = -2 * ringsWidth;
          translateX.setValue(val);
        }
      },
      onPanResponderRelease: (_, g) => {
        const toNext = (g.dx <= -SWIPE_THRESHOLD) || (g.vx < -0.5);
        const toPrev = (g.dx >= SWIPE_THRESHOLD) || (g.vx > 0.5);
        if (toNext) {
          // animate out to next, then animate new week in
          Animated.spring(translateX, { toValue: -2 * ringsWidth, useNativeDriver: true, velocity: -2, friction: 8, tension: 70 }).start(() => {
            changeWeek(1);
            translateX.setValue(0); // position at left edge (prev panel) to slide in to center
            Animated.spring(translateX, { toValue: -ringsWidth, useNativeDriver: true, velocity: -1.5, friction: 9, tension: 80 }).start();
          });
        } else if (toPrev) {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, velocity: 2, friction: 8, tension: 70 }).start(() => {
            changeWeek(-1);
            translateX.setValue(-2 * ringsWidth); // position at right edge (next panel) to slide in to center
            Animated.spring(translateX, { toValue: -ringsWidth, useNativeDriver: true, velocity: 1.5, friction: 9, tension: 80 }).start();
          });
        } else {
          // snap back to center
          Animated.spring(translateX, { toValue: -ringsWidth, useNativeDriver: true, friction: 9, tension: 120 }).start();
        }
      },
    })
  ).current;

  // Ensure translateX centers current panel whenever layout width updates
  useEffect(() => {
    if (ringsWidth > 0) {
      translateX.setValue(-ringsWidth);
    }
  }, [ringsWidth]);

  const openAddMeal = (type: MealType) => {
    setSelectedMealType(type);
    setSelectedExistingMeal(undefined);
    setLockMealType(true);
    setShowMealPlanModal(true);
  };

  const openEditMeal = (type: MealType) => {
    const existing = getMealForDateAndType(dayISO, type);
    setSelectedMealType(type);
    setSelectedExistingMeal(existing);
    setLockMealType(true);
    setShowMealPlanModal(true);
  };

  const handleAiScan = () => {
    Alert.alert(
      'AI Scan Food',
      'Choose an option to scan your food item.',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Camera permission is required to take photos.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              setImageToAnalyze(result.assets[0].uri);
              setSelectedMealType('breakfast'); // Default meal type
              setExternalFoodModalTab('scan');
              setShowExternalFoodModal(true);
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Photo library permission is required.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              setImageToAnalyze(result.assets[0].uri);
              setSelectedMealType('breakfast'); // Default meal type
              setExternalFoodModalTab('scan');
              setShowExternalFoodModal(true);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
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
        title={activeTab === 'progress' ? 'Progress' : 'Tracking'}
        icon={
          activeTab === 'progress'
            ? (
              <View style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center', overflow: 'visible' }}>
                <ProgressPageIcon width={84} height={84} color={Colors.text} />
              </View>
            )
            : (
              <View style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center', overflow: 'visible' }}>
                <TrackingPageIcon width={67.2} height={67.2} color={Colors.text} />
              </View>
            )
        }
        iconScale={activeTab === 'tracking' ? 0.81 : 0.9}
      />
      {/* Segmented control: Tracking | Progress */}
      <View
        style={styles.segmentedContainer}
        onLayout={(e) => setSegWidth(e.nativeEvent.layout.width)}
      >
        <View style={styles.segmentTrack}>
          {segWidth > 0 && (
            <Animated.View
              style={[
                styles.segmentIndicator,
                { width: segWidth / segmentCount, transform: [{ translateX: indicatorX }] },
              ]}
            />
          )}
        </View>
        <View style={styles.segmentsOverlay} pointerEvents="box-none">
          {(['tracking','progress'] as const).map((key, idx) => {
            const isActive = activeTab === key;
            const label = key === 'tracking' ? 'Tracking' : 'Progress';
            return (
              <TouchableOpacity
                key={key}
                style={styles.segmentClick}
                onPress={() => setActiveTab(key)}
                accessibilityRole="button"
                accessibilityLabel={`Switch to ${label}`}
                activeOpacity={0.9}
              >
                <Text style={isActive ? styles.segmentTextActive : styles.segmentText}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {activeTab === 'tracking' && (
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (insets?.bottom ?? 0) + 56 + 32 }}
      >
        {/* Calendar + Swipeable Week Rings moved to the top */}
        <View style={[styles.weekHeaderRow, { paddingHorizontal: 16 }]}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => setCalendarOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open calendar"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ marginTop: 4 }}
          >
            <View style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center' }}>
              <CalenderIcon width={44} height={44} color={Colors.text} style={{ position: 'absolute', left: -(44 - 22) / 2, top: -(44 - 22) / 2 }} />
            </View>
          </TouchableOpacity>
        </View>
        {/* Only WeekRings swipes */}
        <View
          style={{ overflow: 'visible', marginTop: 12, marginBottom: 12, width: '100%', minHeight: 44 }}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width; // use actual container width (full width)
            if (w > 0 && Math.abs(w - ringsWidth) > 0.5) setRingsWidth(w);
          }}
          {...weekSwipe.panHandlers}
        >
          {ringsWidth > 0 ? (
            <Animated.View style={{ width: ringsWidth * 3, flexDirection: 'row', transform: [{ translateX }] }}>
              {(() => {
                // Compute base sizes then scale down by ~10% to make the rings slightly more compact
                const baseCell = Math.floor(ringsWidth / 7);
                const baseRing = Math.max(28, baseCell - 10);
                // Use base sizes and pass a centralized scale prop so WeekRings handles the visual shrink
                const scale = WEEK_RINGS_SCALE;
                return (
                  <>
                    <View style={{ width: ringsWidth }}>
                      <WeekRings selectedDate={prevWeekISO} onSelectDate={(iso) => setDayISO(iso)} cellSize={baseCell} ringSize={32} scale={1} />
                    </View>
                    <View style={{ width: ringsWidth }}>
                      <WeekRings selectedDate={dayISO} onSelectDate={(iso) => setDayISO(iso)} cellSize={baseCell} ringSize={32} scale={1} />
                    </View>
                    <View style={{ width: ringsWidth }}>
                      <WeekRings selectedDate={nextWeekISO} onSelectDate={(iso) => setDayISO(iso)} cellSize={baseCell} ringSize={32} scale={1} />
                    </View>
                  </>
                );
              })()}
            </Animated.View>
          ) : (
            // pre-measure fallback: render current week only (no animation)
            <WeekRings selectedDate={dayISO} onSelectDate={(iso) => setDayISO(iso)} cellSize={48} ringSize={32} scale={1} />
          )}
        </View>

        {/* Enhanced Hero Header with Gradient */}
        <ExpoLinearGradient
          colors={[Colors.background, Colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Header spacer removed; ScreenHeader provides spacing */}

          {/* Compact Nutrition Rings */}
          <View style={styles.heroInner}>
            <CompactNutritionRings
              dailyProgress={dailyProgress}
            />
          </View>

          {/* Actions Row: Search Food / AI Scan (replaces Goal/Eaten) */}
          <View style={styles.statRow}>
            <TouchableOpacity
              style={[styles.statPill, styles.statPillPrimary]}
              onPress={() => {
                setSelectedMealType('breakfast');
                setExternalFoodModalTab('search');
                setShowExternalFoodModal(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Search and log food"
            >
              <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
                <SearchIcon width={56} height={56} color={Colors.primary} />
              </View>
              <Text style={[styles.statPillActionText, { color: Colors.primary }]}>Search Food</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statPill, styles.statPillAccent]}
              onPress={handleAiScan}
              accessibilityRole="button"
              accessibilityLabel="AI scan food from photo"
            >
              <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
                <CameraIcon width={56} height={56} color={Colors.accentPrimary} />
              </View>
              <Text style={[styles.statPillActionText, { color: Colors.accentPrimary }]}>AI Scan</Text>
            </TouchableOpacity>
          </View>
        </ExpoLinearGradient>

        {/* Macros are now integrated into the compact nutrition rings above */}

        {/* Food Logging Actions removed; integrated into actions row above */}

        {/* (moved week header + rings to top) */}

        {/* Enhanced Meals Section */}
        <View style={styles.mealsSection}>
          <View style={styles.sectionHeader}> 
            <Text style={styles.sectionTitle}>Today's Meals</Text>
            <Button title="Plan All" variant="outline" size="sm" onPress={() => {
              // Build a queue of meal types to plan, prioritizing unplanned types
              const all: MealType[] = ['breakfast','lunch','dinner','snack'];
              const missing = all.filter(t => !getMealForDateAndType(dayISO, t));
              const queue = missing.length > 0 ? missing : all;
              setPlanAllQueue(queue);
              // Mark already planned ones as completed so the UI shows a check
              const initiallyCompleted = all.filter(t => !!getMealForDateAndType(dayISO, t));
              setPlanAllCompleted(initiallyCompleted);
              setSelectedMealType(queue[0]);
              setLockMealType(false); // allow switching if desired
              setSelectedExistingMeal(undefined);
              setShowMealPlanModal(true);
            }} />
          </View>
          <Rule />

          {/* Meal rows: show current plan if set; otherwise prompt to add */}
          <View>
            {(['breakfast','lunch','dinner','snack'] as MealType[]).map((type) => {
              const planned = getMealForDateAndType(dayISO, type);
              const recipe = planned ? meals.find((m:any) => m.id === planned.recipeId) : undefined;
              const iconEl = (
                type === 'breakfast' ? <BreakfastIcon width={72} height={72} color={Colors.text} /> :
                type === 'lunch' ? <LunchIcon width={72} height={72} color={Colors.text} /> :
                type === 'dinner' ? <DinnerIcon width={72} height={72} color={Colors.text} /> :
                <SnackIcon width={72} height={72} color={Colors.text} />
              );
              const label = type.charAt(0).toUpperCase() + type.slice(1);
              return (
                <React.Fragment key={type}>
                  <TouchableOpacity style={styles.mealRow} onPress={() => (planned ? openEditMeal(type) : openAddMeal(type))}>
                    <View style={styles.mealRowIconWrap}>{iconEl}</View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mealRowTitle}>{label}</Text>
                      {planned ? (
                        <View style={styles.mealRowSubRow}>
                          {recipe?.image ? (
                            <Image source={{ uri: recipe.image }} style={styles.mealRowThumb} />
                          ) : null}
                          <Text style={styles.mealRowSub} numberOfLines={2}>{recipe?.name ?? 'Planned'}</Text>
                        </View>
                      ) : (
                        <Text style={styles.mealRowSub}>Add {type}</Text>
                      )}
                    </View>
                    <View style={styles.mealActions}>
                      {planned && !planned.isCompleted && (
                        <Button
                          title="Log"
                          onPress={async () => {
                            try {
                              const id = logPlannedMeal(planned, meals);
                              if (id) {
                                await completeMeal(planned.id);
                                showToast({ type: 'success', message: `${label} logged` });
                              } else {
                                showToast({ type: 'error', message: 'Unable to log meal' });
                              }
                            } catch (e) {
                              showToast({ type: 'error', message: 'Failed to log meal' });
                            }
                          }}
                          size="sm"
                          variant="primary"
                          shape="capsule"
                          icon={<Plus size={16} color={Colors.onPrimary} />}
                          fullWidth
                          style={styles.logButton}
                          accessibilityLabel={`Log ${label}`}
                        />
                      )}
                      <IconButtonSquare
                        accessibilityLabel={planned ? `Edit ${type}` : `Plan ${type}`}
                        onPress={() => {
                          if (planned && planned.isCompleted) {
                            Alert.alert(
                              'Remove Logged Meal',
                              'Are you sure you want to remove this logged meal?',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Remove',
                                  style: 'destructive',
                                  onPress: () => {
                                    const loggedMeal = loggedMeals.find(
                                      (lm) => lm.date === planned.date && lm.mealType === planned.mealType
                                    );
                                    if (loggedMeal) {
                                      removeLoggedMeal(loggedMeal.id);
                                      showToast({ type: 'success', message: 'Meal removed' });
                                    }
                                  },
                                },
                              ]
                            );
                          } else {
                            planned ? openEditMeal(type) : openAddMeal(type);
                          }
                        }}
                      >
                        {planned ? <Pencil size={16} color={Colors.text} /> : <Plus size={16} color={Colors.text} />}
                      </IconButtonSquare>
                    </View>
                  </TouchableOpacity>
                  <Rule />
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Streak Tracking Card */}
        <StreakCard onPress={() => {
          // Optional: Navigate to detailed streak view or show streak tips
          showToast({ 
            type: 'info', 
            message: 'Keep logging your meals to maintain your streak!' 
          });
        }} />

        {/* Progress Section (hidden for cleaner UI) */}
        {/* <ProgressSection /> */}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
      )}

      {activeTab === 'progress' && (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: (insets?.bottom ?? 0) + 56 + 24, paddingTop: 16 }}
        >
          {/* Weight Card - full width */}
          <WeightCard tracking={weightTracking} onUpdateWeight={() => setShowQuickWeightModal(true)} />
          <WeightProgressChartCard tracking={weightTracking} />

          {/* Enhanced Total Calories Card */}
          <EnhancedTotalCaloriesCard onOpenPeriod={(p) => {
            // Map to trends initial period and open modal
            const map: Record<string, '7d' | '30d' | '90d'> = { week: '7d', month: '30d', quarter: '90d' };
            setTrendsInitialPeriod(map[p]);
            setShowTrendsModal(true);
          }} />

          {/* Nutrition Trends Card opens bottom sheet modal */}
          <NutritionTrendsCard onPress={() => setShowTrendsModal(true)} />

          {/* BMI Card */}
          <BMICard
            onPress={() => {
              setShowBmiModal(true);
            }}
            onHelpPress={() => setShowBmiModal(true)}
          />

          {/* Measurements Card */}
          <MeasurementCard onPress={() => setShowMeasurementModal(true)} />

          {/* Progress Photos Card */}
          <ProgressPhotosCard onPress={() => router.push('/(tabs)/coach/progress-photos')} />

          {/* Additional progress areas can be added below */}
          <View style={{ height: 12 }} />
        </ScrollView>
      )}

      {/* Weight Quick Update Modal */}
      <QuickWeightUpdateModal tracking={weightTracking} visible={showQuickWeightModal} onClose={() => setShowQuickWeightModal(false)} />

      {/* Measurement Modal */}
      <MeasurementModal visible={showMeasurementModal} onClose={() => setShowMeasurementModal(false)} />

      {/* BMI Info Modal */}
      <BMIModal visible={showBmiModal} onClose={() => setShowBmiModal(false)} />

      {/* Nutrition Trends Modal */}
      <NutritionTrendsModal
        visible={showTrendsModal}
        onClose={() => setShowTrendsModal(false)}
        weeklyTrends={weeklyTrends}
        getDailyProgress={getDailyProgress}
        selectedDate={dayISO}
        initialPeriod={trendsInitialPeriod}
      />

      {/* Enhanced Floating Chat Button */}
      <EnhancedFloatingChatButton
        onPress={() => setChatOpen(true)}
        bottom={Math.max(20, (insets?.bottom ?? 0) + 120)}
        hasUnreadMessages={false}
        isTyping={isTyping}
      />

      {/* Enhanced Chat Interface */}
      <EnhancedChatInterface
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
      />

      {/* Calendar Modal */}
      <Modal
        visible={calendarOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCalendarOpen(false)}
      >
        <SafeAreaView style={styles.calendarContainer}>
          {/* Top header with Today / Close */}
          <View style={styles.calendarTopBar}>
            <TouchableOpacity
              style={styles.calendarTodayButton}
              onPress={() => {
                const today = new Date().toISOString().split('T')[0];
                setDayISO(today);
                const m = new Date(); m.setDate(1); setCalendarMonth(m);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.calendarTodayButtonText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.calendarCloseButton}
              onPress={() => setCalendarOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close calendar"
            >
              <X size={24} color={Colors.text} weight="bold" />
            </TouchableOpacity>
          </View>

          {/* Month header */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              style={styles.calendarArrowButton}
              onPress={() => {
                const d = new Date(calendarMonth);
                d.setMonth(d.getMonth() - 1);
                setCalendarMonth(d);
              }}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
            >
              <LeftArrowIcon width={24} height={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.calendarMonthLabel}>
              {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity
              style={styles.calendarArrowButton}
              onPress={() => {
                const d = new Date(calendarMonth);
                d.setMonth(d.getMonth() + 1);
                setCalendarMonth(d);
              }}
              accessibilityRole="button"
              accessibilityLabel="Next month"
            >
              <RightArrowIcon width={24} height={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Weekday Row (Sun-Sat three-letter abbreviations) */}
          <View style={styles.calendarWeekdaysRow}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
              <Text key={d} style={styles.calendarWeekdayText} numberOfLines={1} adjustsFontSizeToFit>{d}</Text>
            ))}
          </View>

          {/* Grid */}
      <View style={[styles.calendarGrid]}>
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
                const lead = ((new Date(year, month, 1).getDay() + 7) % 7); // Sun=0..Sat=6
                for (let i = 0; i < lead; i++) {
                  items.push(<View key={`blank-${i}`} style={styles.calendarCell} />);
                }
                for (let day = 1; day <= daysInMonth; day++) {
                  const d = new Date(year, month, day);
                  const iso = d.toISOString().split('T')[0];
                  const isSelected = iso === selectedISO;
                  const isToday = iso === todayISO;
                  // daily calories progress for ring using enhanced progress data
                  const dayProgress = getDailyProgress(iso);
                  const pct = Math.min(1, dayProgress.calories.percentage);
                  // Use same single-color ring as WeekRings
                  const ringColor = Colors.primary;
                  const isFuture = new Date(iso) > new Date(todayISO);
                  items.push(
                    <TouchableOpacity
                      key={`d-${iso}`}
                      style={[
                        styles.calendarCell,
                        isToday && styles.calendarCellToday,
                        isSelected && styles.calendarCellSelected,
                      ]}
                      onPress={() => {
                        setDayISO(iso);
                        setCalendarOpen(false);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${d.toDateString()}`}
                      disabled={false}
                    >
                      <View style={{ opacity: isFuture ? 0.35 : 1 }}>
                        <FitnessRing size={32} stroke={4} gap={2} backgroundColor={Colors.border} rings={[{ pct, color: ringColor }]} />
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

          {/* Stats row below calendar */}
          <View style={styles.calendarStatsRow}>
            <View style={styles.calendarStatItem}>
              <Text style={styles.calendarStatLabel}>Active</Text>
              <Text style={styles.calendarStatValue}>{(() => {
                const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
                const last = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
                let count = 0;
                for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
                  const iso = d.toISOString().split('T')[0];
                  const p = getDailyProgress(iso);
                  if ((p.calories.consumed || 0) > 0) count += 1;
                }
                return `${count} days`;
              })()}</Text>
            </View>
            <View style={styles.calendarStatItem}>
              <Text style={styles.calendarStatLabel}>Green Days</Text>
              <Text style={styles.calendarStatValue}>{(() => {
                const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
                const last = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
                let met = 0; let total = 0;
                for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
                  const iso = d.toISOString().split('T')[0];
                  const p = getDailyProgress(iso);
                  if (p) { total += 1; if (p.status === 'met') met += 1; }
                }
                return `${met} / ${total}`;
              })()}</Text>
            </View>
            <View style={styles.calendarStatItem}>
              <Text style={styles.calendarStatLabel}>Weight</Text>
              <Text style={styles.calendarStatValue}>-- kg</Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Plan Meal Modal */}
      <MealPlanModal
        visible={showMealPlanModal}
        selectedDate={dayISO}
        selectedMealType={selectedMealType}
        existingMeal={selectedExistingMeal}
        lockMealType={lockMealType}
        autoCloseOnSave={planAllQueue ? false : true}
        plannedTypes={planAllCompleted}
        onDelete={selectedExistingMeal ? () => {
          removePlannedMeal(selectedExistingMeal.id);
          showToast({ type: 'success', message: 'Meal removed from plan' });
        } : undefined}
        onSave={(plannedMeal) => {
          if (selectedExistingMeal) {
            updatePlannedMeal({ ...selectedExistingMeal, ...plannedMeal });
          } else {
            addPlannedMeal(plannedMeal);
          }
          // If we're in Plan All mode, advance to next type and keep modal open
          if (planAllQueue) {
            setSelectedExistingMeal(undefined);
            // Mark this meal type as completed so the UI shows the check
            setPlanAllCompleted(prev => prev.includes(plannedMeal.mealType) ? prev : [...prev, plannedMeal.mealType]);
            const remaining = planAllQueue.filter(t => t !== plannedMeal.mealType);
            if (remaining.length === 0) {
              setPlanAllQueue(null);
              setPlanAllCompleted([]);
              setShowMealPlanModal(false);
              setLockMealType(false);
              showToast({ type: 'success', message: 'All meals planned for the day' });
            } else {
              setPlanAllQueue(remaining);
              setSelectedMealType(remaining[0]);
            }
          } else {
            // Normal single-plan flow
            setShowMealPlanModal(false);
            setSelectedExistingMeal(undefined);
            setLockMealType(false);
          }
        }}
        onClose={() => { setShowMealPlanModal(false); setSelectedExistingMeal(undefined); setLockMealType(false); setPlanAllQueue(null); setPlanAllCompleted([]); }}
      />

      {/* External Food Logging Modal */}
      <ExternalFoodLoggingModal
        visible={showExternalFoodModal}
        onClose={() => {
          setShowExternalFoodModal(false);
          setImageToAnalyze(null); // Reset image on close
        }}
        selectedDate={dayISO}
        selectedMealType={selectedMealType}
        initialTab={externalFoodModalTab}
        imageToAnalyze={imageToAnalyze}
        onLogFood={(foodData) => {
          logCustomMeal(
            foodData.name,
            foodData.date,
            foodData.mealType,
            {
              calories: foodData.calories,
              protein: foodData.protein,
              carbs: foodData.carbs,
              fats: foodData.fats,
            }
          );
          setShowExternalFoodModal(false);
          showToast({ type: 'success', message: `${foodData.name} logged successfully!` });
        }}
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
  topTabsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topTabItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  rangeRow: { flexDirection: 'row', alignSelf: 'center', gap: 8, marginTop: 10 },
  rangeBtn: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  rangeText: { color: Colors.lightText, fontWeight: '600' },
  cardsRow: { flexDirection: 'row', gap: 12, marginTop: 16, paddingHorizontal: 16 },
  card: { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 16 },
  cardLabel: { color: Colors.lightText, fontSize: 12, fontWeight: '600' },
  cardValue: { color: Colors.text, fontSize: 20, fontWeight: '700', marginTop: 6 },
  section: { marginTop: 20, paddingHorizontal: 16 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  listDate: { color: Colors.lightText, fontSize: 12 },
  listValue: { color: Colors.text, fontWeight: '700' },
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
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: 16,
    gap: 8,
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
  statPillActionText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  statPillActionTextOnFill: {
    color: Colors.white,
  },
  statPillPrimary: {
    backgroundColor: 'transparent',
    borderColor: Colors.primaryDark,
    borderWidth: 1.5,
  },
  statPillAccent: {
    backgroundColor: 'transparent',
    borderColor: Colors.accentPrimary,
    borderWidth: 1.5,
  },
  
  // Food Logging Section Styles
  foodLoggingSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  foodLoggingButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  searchFoodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  searchFoodButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: Typography.weights.semibold,
  },
  aiScanButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  aiScanButtonText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: Typography.weights.semibold,
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
  // Segmented control styles
  segmentedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 0,
    marginTop: 8,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  segmentTrack: {
    flex: 1,
    height: 40,
    backgroundColor: 'transparent',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  segmentClick: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'transparent',
    marginHorizontal: 0,
  },
  segmentLeft: {
    marginRight: -6,
  },
  segmentRight: {
    marginLeft: -6,
  },
  segmentActive: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: {
    ...Type.caption,
    color: Colors.lightText,
  },
  segmentTextActive: {
    ...Type.caption,
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
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
    minHeight: 88,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  mealRowIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
    marginRight: 12,
  },
  mealRowIconWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mealRowTitle: {
    ...Type.h3,
    color: Colors.text,
    fontSize: 20,
    lineHeight: 28,
  },
  mealRowSub: {
    ...Type.body,
    color: Colors.lightText,
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
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
  mealActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    marginLeft: 12,
    flexShrink: 0,
    width: 104,
  },
  logButton: {
    width: '100%',
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
  mealName: { ...Type.body, color: Colors.text, fontSize: 14, fontWeight: '600' },
  mealStats: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  mealKcal: { ...Type.caption, color: Colors.text, fontWeight: '600' },
  emptyMealContent: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  emptyMealText: { color: Colors.lightText, fontSize: 14, fontWeight: '500' },
  // ... (rest of the styles remain the same)


  bottomSpacer: {
    height: 20,
  },
  topRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
  },
  halfWidth: {
    flex: 1,
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
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  calendarMonthLabel: {
    ...Type.h3,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    flex: 1,
  },
  calendarWeekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  calendarWeekdayText: {
    width: '14.2857%',
    textAlign: 'center',
    ...Type.caption,
    color: Colors.lightText,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
  },
  calendarCell: {
    width: '14.2857%',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  calendarCellToday: {
    // no outline circle; keep ring-only look
  },
  calendarCellSelected: {
    // no filled circle; selection indicated by text style
  },
  // New full-screen calendar styles
  calendarContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  calendarTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  calendarTodayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calendarTodayButtonText: {
    ...Type.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  calendarCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTopBarAction: {
    ...Type.caption,
    color: Colors.primary,
  },
  calendarArrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  calendarStatItem: {
    alignItems: 'center',
  },
  calendarStatLabel: {
    ...Type.caption,
    color: Colors.lightText,
    marginBottom: 4,
  },
  calendarStatValue: {
    ...Type.caption,
    color: Colors.text,
  },
  calendarCellText: {
    ...Type.caption,
    color: Colors.text,
  },
  calendarCellTextSelected: {
    ...Type.caption,
    color: Colors.white,
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
  nutritionCoachContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  nutritionCoachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  nutritionCoachTitle: {
    ...Type.h3,
    fontSize: 20,
    color: Colors.text,
  },
  closeCoachButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeCoachText: {
    ...Type.body,
    fontSize: 18,
    color: Colors.text,
  },
});

// --- Enhanced Presentational Components ---
const EnhancedMacroCard = ({ 
  label, 
  value, 
  goal = 0, 
  unit, 
  color, 
  icon,
  percentage 
}: { 
  label: string; 
  value: number; 
  goal?: number; 
  unit: string; 
  color: string;
  icon: string;
  percentage?: number;
}) => {
  const pct = percentage !== undefined ? Math.min(1, percentage) : (goal > 0 ? Math.min(1, value / goal) : 0);
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
                <Fire size={12} color={Colors.primary} />
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


