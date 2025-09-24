import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  X, 
  Scale, 
  TrendingDown,
  Trash2,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useWeightTracking } from '@/hooks/useWeightTracking';
import { LineChart } from 'react-native-chart-kit';
 

interface WeightModalProps {
  visible: boolean;
  onClose: () => void;
}

const screenWidth = Dimensions.get('window').width;

export const WeightModal: React.FC<WeightModalProps> = ({ visible, onClose }) => {
  const { 
    entries, 
    goal, 
    getCurrentWeight, 
    getProgressStats, 
    getWeightTrend,
    addWeightEntry,
    removeWeightEntry,
  } = useWeightTracking();
  
  const [newWeight, setNewWeight] = useState('');
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'W' | '30D' | '90D' | 'Y' | 'ALL'>('30D');
  const [showHistory, setShowHistory] = useState(false);
  

  const currentWeight = getCurrentWeight();
  const progressStats = getProgressStats();
  const weightTrend = getWeightTrend();

  const handleLogWeight = async () => {
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0 || weight > 500) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight between 1-500 kg');
      return;
    }

    try {
      await addWeightEntry(weight);
      setNewWeight('');
      setShowWeightInput(false);
      Alert.alert('Success', 'Weight logged successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to log weight. Please try again.');
    }
  };

  const handleCancelInput = () => {
    setNewWeight('');
    setShowWeightInput(false);
  };

  // --- Derived range entries and stats for the selected timeframe (no useMemo) ---
  const computeRangeEntries = () => {
    if (!entries || entries.length === 0) return [] as typeof entries;
    const now = new Date();
    let rangeStart: Date | null = null;
    switch (selectedTimeframe) {
      case 'W':
        rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30D':
        rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90D':
        rangeStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'Y':
        rangeStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'ALL':
        rangeStart = null;
        break;
    }
    return entries
      .filter(e => (rangeStart ? new Date(e.date) >= rangeStart : true))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const rangeEntries = computeRangeEntries();

  const computeRangeStats = () => {
    if (rangeEntries.length === 0) return null as null | {
      highest: number; lowest: number; avg: number; start: number; end: number; delta: number; rangeText: string;
    };
    let highest = rangeEntries[0].weight;
    let lowest = rangeEntries[0].weight;
    let sum = 0;
    for (const e of rangeEntries) {
      highest = Math.max(highest, e.weight);
      lowest = Math.min(lowest, e.weight);
      sum += e.weight;
    }
    const avg = sum / rangeEntries.length;
    const start = rangeEntries[0].weight;
    const end = rangeEntries[rangeEntries.length - 1].weight;
    const delta = end - start;
    const rangeText = `${new Date(rangeEntries[0].date).toLocaleDateString()} ~ ${new Date(rangeEntries[rangeEntries.length - 1].date).toLocaleDateString()}`;
    return { highest, lowest, avg, start, end, delta, rangeText };
  };

  const rangeStats = computeRangeStats();

  const getChartData = () => {
    if (entries.length === 0) {
      return {
        labels: ['No data'],
        datasets: [{ data: [0] }],
      };
    }

    const sortedEntries = rangeEntries;

    if (sortedEntries.length === 0) {
      return {
        labels: ['No data'],
        datasets: [{ data: [0] }],
      };
    }

    const labels = sortedEntries.map(entry => {
      const date = new Date(entry.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const data = sortedEntries.map(entry => entry.weight);

    return {
      labels,
      datasets: [{ data, color: () => Colors.primary }],
    };
  };

  const formatLastWeighIn = () => {
    if (!currentWeight) return 'No entries yet';
    
    const entryDate = new Date(currentWeight.date);
    const today = new Date();
    const isToday = entryDate.toDateString() === today.toDateString();
    
    return isToday ? 'today' : entryDate.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Weight</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current Weight & Log Section */}
          <View style={styles.heroSection}>
            <View style={styles.weightDisplay}>
              <Text style={styles.sectionLabel}>Last weigh-in</Text>
              <Text style={styles.currentWeight}>
                {currentWeight ? `${currentWeight.weight} kg` : '-- kg'}
              </Text>
              <Text style={styles.lastWeighInDate}>{formatLastWeighIn()}</Text>
            </View>
            
            <View style={styles.logWeightContainer}>
              {!showWeightInput ? (
                <Button
                  title="Log weight-in"
                  onPress={() => setShowWeightInput(true)}
                  style={styles.logButton}
                />
              ) : (
                <View style={styles.inputSection}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.weightInput}
                      placeholder="Enter weight (kg)"
                      placeholderTextColor={Colors.lightText}
                      value={newWeight}
                      onChangeText={setNewWeight}
                      keyboardType="decimal-pad"
                      autoFocus
                    />
                  </View>
                  <View style={styles.inputActions}>
                    <Button
                      title="Cancel"
                      onPress={handleCancelInput}
                      variant="outline"
                      style={styles.cancelButton}
                    />
                    <Button
                      title="Save"
                      onPress={handleLogWeight}
                      disabled={!newWeight.trim()}
                      style={styles.saveButton}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Current Weight Stats */}
          <View style={styles.section}>
            <View style={styles.statsHeader}>
              <Scale size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Current Weight Stats</Text>
            </View>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressValue}>{Math.round(progressStats.progress)}%</Text>
              </View>
              
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${Math.min(100, progressStats.progress)}%` }
                  ]} 
                />
              </View>
              
              <View style={styles.weightRange}>
                <Text style={styles.weightRangeText}>
                  {currentWeight ? `${currentWeight.weight} kg` : '-- kg'}
                </Text>
                <Text style={styles.weightRangeText}>
                  {goal ? `${goal.targetWeight} kg` : '-- kg'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.historyButton} onPress={() => setShowHistory(s => !s)}>
              <Text style={styles.historyButtonText}>{showHistory ? 'Hide Weight History' : 'View Weight History'}</Text>
            </TouchableOpacity>
          </View>

          {showHistory && (
            <View style={styles.section}>
              <View style={styles.statsHeader}>
                <Scale size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Weight History</Text>
              </View>
              {entries.length === 0 ? (
                <Text style={styles.noDataText}>No entries yet</Text>
              ) : (
                <View style={styles.historyList}>
                  {entries
                    .slice()
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((e) => (
                      <View key={e.id} style={styles.historyRow}>
                        <Text style={styles.historyDate}>{new Date(e.date).toLocaleDateString()}</Text>
                        <View style={styles.historyRight}>
                          <Text style={styles.historyWeight}>{e.weight.toFixed(1)} kg</Text>
                          <TouchableOpacity onPress={() => removeWeightEntry(e.id)} accessibilityRole="button" accessibilityLabel="Delete entry">
                            <Trash2 size={16} color={Colors.lightText} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                </View>
              )}
            </View>
          )}

          {/* Weight Chart */}
          <View style={styles.section}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleContainer}>
                <TrendingDown size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Weight Chart</Text>
              </View>
            </View>

            {/* Timeframe Selector */}
            <View style={styles.timeframeContainer}>
              {(['W', '30D', '90D', 'Y', 'ALL'] as const).map((timeframe) => (
                <TouchableOpacity
                  key={timeframe}
                  style={[
                    styles.timeframeButton,
                    selectedTimeframe === timeframe && styles.timeframeButtonActive
                  ]}
                  onPress={() => setSelectedTimeframe(timeframe)}
                >
                  <Text style={[
                    styles.timeframeText,
                    selectedTimeframe === timeframe && styles.timeframeTextActive
                  ]}>
                    {timeframe}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Range summary and hi/lo */}
            {rangeStats && (
              <View style={styles.rangeRow}>
                <Text style={styles.rangeText}>{rangeStats.rangeText}</Text>
                <View style={styles.hlRow}>
                  <View style={styles.hlItem}>
                    <Text style={styles.hlValue}>{rangeStats.highest.toFixed(1)} kg</Text>
                    <Text style={styles.hlLabel}>Highest</Text>
                  </View>
                  <View style={styles.hlItem}>
                    <Text style={styles.hlValue}>{rangeStats.lowest.toFixed(1)} kg</Text>
                    <Text style={styles.hlLabel}>Lowest</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Chart */}
            <View style={styles.chartContainer}>
              {entries.length > 0 ? (
                <LineChart
                  data={getChartData()}
                  width={screenWidth - 32}
                  height={220}
                  chartConfig={{
                    backgroundGradientFrom: Colors.card,
                    backgroundGradientTo: Colors.card,
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                    labelColor: (opacity = 1) => Colors.lightText,
                    fillShadowGradient: Colors.primary,
                    fillShadowGradientOpacity: 0.15,
                    propsForDots: { r: '3' },
                    propsForBackgroundLines: { strokeDasharray: '', stroke: Colors.border },
                  }}
                  bezier
                  style={styles.chart}
                />
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No weight data yet</Text>
                  <Text style={styles.noDataSubtext}>Log your first weight to see the chart</Text>
                </View>
              )}
            </View>

            {rangeStats && (
              <View style={styles.deltaRow}>
                <Text style={styles.deltaText}>
                  Change: {rangeStats.delta >= 0 ? '+' : ''}{rangeStats.delta.toFixed(1)} kg Â· Avg {rangeStats.avg.toFixed(1)} kg
                </Text>
              </View>
            )}
          </View>

          {/* Weight Trend Forecast */}
          <View style={styles.section}>
            <View style={styles.statsHeader}>
              <TrendingDown size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Weight Trend Forecast</Text>
            </View>
            
            <Text style={styles.forecastSubtitle}>
              {entries.length < 3 ? 'Log more weigh-ins to get forecast' : 'Based on 14-day weight trends'}
            </Text>

            <View style={styles.forecastStats}>
              <View style={styles.forecastRow}>
                <Text style={styles.forecastLabel}>Current Rate:</Text>
                <Text style={styles.forecastValue}>
                  {weightTrend ? `${weightTrend.ratePerWeek > 0 ? '+' : ''}${weightTrend.ratePerWeek.toFixed(1)} kg/week` : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.forecastRow}>
                <Text style={styles.forecastLabel}>Weight in 7 days</Text>
                <Text style={styles.forecastValue}>N/A</Text>
              </View>
              
              <View style={styles.forecastRow}>
                <Text style={styles.forecastLabel}>Weight in 30 days</Text>
                <Text style={styles.forecastValue}>N/A</Text>
              </View>
              
              <View style={styles.forecastRow}>
                <Text style={styles.forecastLabel}>Weight Target Estimate</Text>
                <Text style={styles.forecastValue}>N/A</Text>
              </View>
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 20,
    padding: 24,
  },
  weightDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 8,
  },
  section: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginLeft: 8,
  },
  currentWeight: {
    fontSize: 48,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    textAlign: 'center',
    lineHeight: 56,
  },
  lastWeighInDate: {
    fontSize: 16,
    color: Colors.lightText,
    textAlign: 'center',
    marginTop: 4,
  },
  logWeightContainer: {
    gap: 16,
  },
  inputContainer: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 4,
  },
  weightInput: {
    borderWidth: 2,
    borderColor: Colors.primary + '30',
    borderRadius: 12,
    padding: 18,
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: Typography.weights.medium,
  },
  logButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
  },
  inputSection: {
    gap: 16,
  },
  inputActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  weightRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weightRangeText: {
    fontSize: 12,
    color: Colors.lightText,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  historyButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeframeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  timeframeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeframeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeframeText: {
    fontSize: 12,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  timeframeTextActive: {
    color: Colors.white,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  rangeText: {
    fontSize: 12,
    color: Colors.lightText,
  },
  hlRow: {
    flexDirection: 'row',
    gap: 12,
  },
  hlItem: {
    alignItems: 'flex-end',
  },
  hlValue: {
    fontSize: 16,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  hlLabel: {
    fontSize: 11,
    color: Colors.lightText,
  },
  deltaRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  deltaText: {
    fontSize: 12,
    color: Colors.lightText,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 16,
    color: Colors.lightText,
    marginBottom: 4,
  },
  noDataSubtext: {
    fontSize: 14,
    color: Colors.lightText,
  },
  forecastSubtitle: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 16,
  },
  forecastStats: {
    gap: 12,
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forecastLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  forecastValue: {
    fontSize: 14,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
});
