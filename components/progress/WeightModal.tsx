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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  X, 
  Scale, 
  TrendingDown, 
  Calendar,
  Camera,
  Image as ImageIcon,
  ChevronRight,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useWeightTracking } from '@/hooks/useWeightTracking';
import { LineChart } from 'react-native-chart-kit';
import * as ImagePicker from 'expo-image-picker';
import { useProgressPhotos } from '@/hooks/useProgressPhotos';
import { useRouter } from 'expo-router';

interface WeightModalProps {
  visible: boolean;
  onClose: () => void;
}

const screenWidth = Dimensions.get('window').width;

export const WeightModal: React.FC<WeightModalProps> = ({ visible, onClose }) => {
  const router = useRouter();
  const { 
    entries, 
    goal, 
    getCurrentWeight, 
    getProgressStats, 
    getWeightTrend,
    addWeightEntry 
  } = useWeightTracking();
  
  const [newWeight, setNewWeight] = useState('');
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'W' | '30D' | '90D' | 'Y' | 'ALL'>('30D');
  const { photos, addPhoto } = useProgressPhotos();

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

  const getChartData = () => {
    if (entries.length === 0) {
      return {
        labels: ['No data'],
        datasets: [{ data: [0] }],
      };
    }

    // Filter entries based on timeframe
    const now = new Date();
    let filteredEntries = entries;
    
    switch (selectedTimeframe) {
      case 'W':
        filteredEntries = entries.filter(entry => {
          const entryDate = new Date(entry.date);
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return entryDate >= weekAgo;
        });
        break;
      case '30D':
        filteredEntries = entries.filter(entry => {
          const entryDate = new Date(entry.date);
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return entryDate >= monthAgo;
        });
        break;
      case '90D':
        filteredEntries = entries.filter(entry => {
          const entryDate = new Date(entry.date);
          const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          return entryDate >= threeMonthsAgo;
        });
        break;
      case 'Y':
        filteredEntries = entries.filter(entry => {
          const entryDate = new Date(entry.date);
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          return entryDate >= yearAgo;
        });
        break;
    }

    // Sort by date and take last 10 points for readability
    const sortedEntries = filteredEntries
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10);

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

            <TouchableOpacity style={styles.historyButton}>
              <ImageIcon size={16} color={Colors.primary} />
              <Text style={styles.historyButtonText}>View Weight History</Text>
            </TouchableOpacity>
          </View>

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
                    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                    labelColor: (opacity = 1) => Colors.lightText,
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

          {/* BMI Section */}
          <TouchableOpacity style={styles.bmiSection}>
            <View style={styles.bmiIcon}>
              <Text style={styles.bmiIconText}>BMI</Text>
            </View>
            <Text style={styles.bmiText}>
              Your BMI is {currentWeight ? (currentWeight.weight / 1.75 / 1.75).toFixed(1) : '--'}
            </Text>
            <ChevronRight size={20} color={Colors.lightText} />
          </TouchableOpacity>

          {/* Progress Photos Section */}
          <View style={styles.section}>
            <View style={styles.statsHeader}>
              <Camera size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Progress Photos</Text>
            </View>

            <Text style={styles.photosSubtitle}>
              The Photo Gallery can help you visualize your progress as you move toward your goal
            </Text>

            <Button
              title={photos.length === 0 ? 'Add First Photo' : 'Add Photo'}
              onPress={async () => {
                // request media library permission and pick image
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Permission required', 'Please allow photo library access to add progress photos.');
                  return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  quality: 0.8,
                });
                if (!result.canceled && result.assets && result.assets.length > 0) {
                  await addPhoto(result.assets[0].uri);
                }
              }}
              style={styles.addPhotoButton}
            />

            <TouchableOpacity style={styles.viewPhotosButton} onPress={() => router.push('/(tabs)/coach/progress-photos')}>
              <Text style={styles.viewPhotosText}>View Photos</Text>
            </TouchableOpacity>
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
  bmiSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 20,
  },
  bmiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22C55E15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bmiIconText: {
    fontSize: 12,
    fontWeight: Typography.weights.bold,
    color: '#22C55E',
  },
  bmiText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  photosSubtitle: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 16,
    lineHeight: 18,
  },
  addPhotoButton: {
    backgroundColor: Colors.primary,
    marginBottom: 12,
  },
  viewPhotosButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  viewPhotosText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  photoThumb: {
    width: (screenWidth - 32 - 8 * 3) / 3,
    height: (screenWidth - 32 - 8 * 3) / 3,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },
});
