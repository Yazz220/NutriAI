import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';

interface MeasurementModalProps {
  visible: boolean;
  onClose: () => void;
}

type MetricKey = 'weight' | 'waist' | 'bodyFat' | 'chest' | 'arm' | 'bmi';

interface MeasurementEntry {
  date: string; // ISO
  value: number;
  unit: string;
}

type Measurements = Partial<Record<MetricKey, MeasurementEntry[]>>;

const METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: 'weight', label: 'Weight', unit: 'kg' },
  { key: 'waist', label: 'Waist', unit: 'cm' },
  { key: 'bodyFat', label: 'Body fat', unit: '%' },
  { key: 'chest', label: 'Chest', unit: 'cm' },
  { key: 'arm', label: 'Arm', unit: 'cm' },
  { key: 'bmi', label: 'BMI', unit: '' },
];

export const MeasurementModal: React.FC<MeasurementModalProps> = ({ visible, onClose }) => {
  const [activeRange, setActiveRange] = useState<'1m' | '3m' | 'all'>('1m');
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [editing, setEditing] = useState<{ key: MetricKey; value: string } | null>(null);

  const latest = useMemo(() => {
    const out: Partial<Record<MetricKey, MeasurementEntry | undefined>> = {};
    METRICS.forEach(({ key }) => {
      const list = measurements[key] || [];
      out[key] = list.length ? list[list.length - 1] : undefined;
    });
    return out;
  }, [measurements]);

  const startEdit = (key: MetricKey, initial: string = '') => setEditing({ key, value: initial });
  const cancelEdit = () => setEditing(null);

  const saveEdit = () => {
    if (!editing) return;
    const { key, value } = editing;
    const n = Number(value);
    if (Number.isNaN(n)) return;

    setMeasurements(prev => {
      const unit = METRICS.find(m => m.key === key)?.unit || '';
      const entry: MeasurementEntry = { date: new Date().toISOString(), value: n, unit };
      const nextList = [...(prev[key] || []), entry];
      return { ...prev, [key]: nextList };
    });
    setEditing(null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Body Measurements</Text>
          <View style={styles.headerBtn} />
        </View>

        {/* Range Tabs */}
        <View style={styles.tabs}>
          {([
            { key: '1m', label: '1 month' },
            { key: '3m', label: '3 months' },
            { key: 'all', label: 'All' },
          ] as const).map(t => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setActiveRange(t.key)}
              style={[styles.tab, activeRange === t.key && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeRange === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {METRICS.map(({ key, label, unit }, i) => (
            <View key={key} style={styles.metricBlock}>
              <Text style={styles.metricTitle}>{label}</Text>
              <View style={styles.separator} />

              {!latest[key] ? (
                <Text style={styles.emptyText}>No measurements available</Text>
              ) : (
                <View style={styles.latestRow}>
                  <Text style={styles.latestLabel}>Current</Text>
                  <Text style={styles.latestValue}>
                    {latest[key]?.value}
                    {unit ? ` ${unit}` : ''}
                  </Text>
                </View>
              )}

              {/* Add new amount */}
              {editing?.key === key ? (
                <View style={styles.editRow}>
                  <TextInput
                    value={editing.value}
                    onChangeText={(v) => setEditing({ key, value: v })}
                    keyboardType="numeric"
                    placeholder={`0 ${unit}`}
                    placeholderTextColor={Colors.lightText}
                    style={styles.input}
                  />
                  <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addRow} onPress={() => startEdit(key)}>
                  <Text style={styles.addText}>+ Add new amount</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBtn: { width: 40, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: Typography.weights.bold, color: Colors.text },

  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tabActive: { backgroundColor: Colors.card },
  tabText: { color: Colors.lightText, fontWeight: Typography.weights.medium },
  tabTextActive: { color: Colors.text, fontWeight: Typography.weights.semibold },

  metricBlock: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  metricTitle: {
    textAlign: 'center',
    color: Colors.text,
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    marginBottom: 8,
  },
  separator: { height: 1, backgroundColor: Colors.border, opacity: 0.8 },
  emptyText: {
    textAlign: 'center',
    color: Colors.lightText,
    marginVertical: 24,
  },
  latestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  latestLabel: { color: Colors.lightText },
  latestValue: { color: Colors.text, fontWeight: Typography.weights.semibold },

  addRow: {
    paddingVertical: 12,
  },
  addText: { color: Colors.primary, fontWeight: Typography.weights.semibold },

  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    color: Colors.text,
  },
  saveBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.primary, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: Typography.weights.semibold },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.card, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  cancelBtnText: { color: Colors.text },
});
