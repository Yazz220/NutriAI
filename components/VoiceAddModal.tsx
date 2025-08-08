import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { InventoryItem, ItemCategory } from '@/types';

export type ParsedItem = { name: string; quantity: number; unit: string; category?: ItemCategory };

function simpleParseTranscript(transcript: string): ParsedItem[] {
  // Very simple heuristic parser. Splits by comma and parses quantities/units.
  const units = ['count','pcs','piece','pieces','pack','bottle','bottles','can','cans','bag','bags','gallon','gallons','liter','liters','ml','ounce','ounces','oz','pound','pounds','lb','lbs','gram','grams','g','kg','kilogram','kilograms','carton','cartons'];
  const parts = transcript
    .split(/[,\n]/)
    .map(p => p.trim())
    .filter(Boolean);
  const items: ParsedItem[] = [];
  for (const p of parts) {
    // Try to find leading quantity and unit
    const m = p.match(/^(\d+(?:\.\d+)?)\s*(\w+)?\s+of\s+(.+)$/i) || p.match(/^(\d+(?:\.\d+)?)(?:\s*(\w+))?\s+(.+)$/i);
    if (m) {
      const qty = Number(m[1]);
      const unit = (m[2] || 'count').toLowerCase();
      const name = (m[3] || '').toLowerCase().replace(/\.$/, '').trim();
      items.push({ name: singularize(name), quantity: isNaN(qty) ? 1 : qty, unit: normalizeUnit(unit) });
    } else {
      // Default to quantity 1 count
      const name = p.toLowerCase().replace(/\.$/, '').trim();
      if (name) items.push({ name: singularize(name), quantity: 1, unit: 'count' });
    }
  }
  return items;

  function normalizeUnit(u: string): string {
    const map: Record<string,string> = {
      piece: 'count', pieces: 'count', pcs: 'count',
      oz: 'ounce', ounces: 'ounce', lb: 'pound', lbs: 'pound', g: 'gram', kg: 'kilogram', l: 'liter', litres: 'liter',
    };
    return map[u] || u;
  }
  function singularize(name: string): string {
    return name.replace(/s\b/, '');
  }
}

export function VoiceAddModal({
  visible,
  onClose,
  onConfirm,
  initialTranscript,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (items: ParsedItem[]) => void;
  initialTranscript?: string;
}) {
  const [transcript, setTranscript] = useState(initialTranscript || '');
  React.useEffect(() => {
    if (visible) setTranscript(initialTranscript || '');
  }, [visible, initialTranscript]);
  const [parsed, setParsed] = useState<ParsedItem[] | null>(null);

  const handleParse = () => {
    const items = simpleParseTranscript(transcript);
    setParsed(items);
  };

  const updateItem = (index: number, patch: Partial<ParsedItem>) => {
    setParsed(prev => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = { ...next[index], ...patch } as ParsedItem;
      return next;
    });
  };

  return (
    <View style={[styles.overlay, !visible && { display: 'none' }]}>
      <View style={styles.modal}>
        <Text style={styles.title}>Add Items by Voice</Text>
        <Card>
          <Text style={styles.label}>Transcript (edit if needed)</Text>
          <TextInput
            style={styles.textarea}
            value={transcript}
            onChangeText={setTranscript}
            placeholder="e.g., 2 cartons of eggs, 1 gallon of milk, 3 apples"
            multiline
          />
          <Button onPress={handleParse} title="Parse" style={{ marginTop: Spacing.sm }} />
        </Card>

        {parsed && (
          <Card>
            <Text style={styles.sectionTitle}>Detected Items</Text>
            <ScrollView style={{ maxHeight: 220 }}>
              {parsed.map((it, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <TextInput
                    style={[styles.input, { flex: 2 }]}
                    value={it.name}
                    onChangeText={(t) => updateItem(idx, { name: t })}
                  />
                  <TextInput
                    style={[styles.input, { width: 70, textAlign: 'center' }]}
                    value={String(it.quantity)}
                    keyboardType="numeric"
                    onChangeText={(t) => updateItem(idx, { quantity: Number(t) || 1 })}
                  />
                  <TextInput
                    style={[styles.input, { width: 100 }]}
                    value={it.unit}
                    onChangeText={(t) => updateItem(idx, { unit: t })}
                  />
                </View>
              ))}
            </ScrollView>
            <Button onPress={() => parsed && onConfirm(parsed)} title="Add to Inventory" style={{ marginTop: Spacing.sm }} />
          </Card>
        )}

        <TouchableOpacity onPress={onClose} style={{ alignSelf: 'center', marginTop: Spacing.md }}>
          <Text style={{ color: Colors.secondary, fontWeight: '600' }}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modal: {
    width: '92%',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  label: { color: Colors.lightText, marginBottom: 6 },
  textarea: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: Colors.text,
  },
});
