import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Switch, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useShoppingList } from '@/hooks/useShoppingListStore';

interface ExportShoppingModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ExportShoppingModal: React.FC<ExportShoppingModalProps> = ({ visible, onClose }) => {
  const { shoppingList } = useShoppingList();
  const [includeChecked, setIncludeChecked] = useState<boolean>(false);
  const [groupByCategory, setGroupByCategory] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);

  // Load saved preferences
  useEffect(() => {
    (async () => {
      try {
        const [a, b] = await Promise.all([
          AsyncStorage.getItem('export_includeChecked'),
          AsyncStorage.getItem('export_groupByCategory'),
        ]);
        if (a !== null) setIncludeChecked(a === '1');
        if (b !== null) setGroupByCategory(b === '1');
      } catch {}
    })();
  }, []);

  // Persist preferences
  useEffect(() => {
    AsyncStorage.setItem('export_includeChecked', includeChecked ? '1' : '0').catch(() => {});
  }, [includeChecked]);
  useEffect(() => {
    AsyncStorage.setItem('export_groupByCategory', groupByCategory ? '1' : '0').catch(() => {});
  }, [groupByCategory]);

  const itemsToExport = useMemo(() => {
    return shoppingList.filter(i => (includeChecked ? true : !i.checked));
  }, [shoppingList, includeChecked]);

  // Deduplicate by name+unit+category and sum numeric quantities
  const dedupedItems = useMemo(() => {
    const map = new Map<string, any>();
    itemsToExport.forEach((raw) => {
      const name = (raw.name || '').trim();
      const unit = (raw.unit || '').trim();
      const category = raw.category || 'Other';
      const key = `${name.toLowerCase()}|${unit.toLowerCase()}|${category.toLowerCase()}`;
      const existing = map.get(key);
      const qtyNum = typeof raw.quantity === 'number' ? raw.quantity : Number(raw.quantity);
      if (existing) {
        if (!Number.isNaN(qtyNum) && typeof existing.quantity === 'number') {
          existing.quantity = existing.quantity + qtyNum;
        } else if (!Number.isNaN(qtyNum) && Number.isFinite(qtyNum) && (existing.quantity === undefined || existing.quantity === null || existing.quantity === '')) {
          existing.quantity = qtyNum;
        }
      } else {
        map.set(key, { ...raw, name, unit, category, quantity: Number.isNaN(qtyNum) ? raw.quantity : qtyNum });
      }
    });
    return Array.from(map.values());
  }, [itemsToExport]);

  const byCategory = useMemo(() => {
    const grouped: Record<string, typeof dedupedItems> = {} as any;
    dedupedItems.forEach((i) => {
      const key = i.category || 'Other';
      if (!grouped[key]) grouped[key] = [] as any;
      grouped[key].push(i);
    });
    // Sort items alphabetically within categories
    Object.keys(grouped).forEach((k) => grouped[k].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    return grouped;
  }, [dedupedItems]);

  const categoryEmoji: Record<string, string> = {
    Produce: '🥬',
    Dairy: '🥛',
    Meat: '🥩',
    Seafood: '🦐',
    Frozen: '🧊',
    Pantry: '🧂',
    Bakery: '🥖',
    Beverages: '🥤',
    Other: '🛒',
  };

  const trimNumber = (n: number) => {
    return Number.isInteger(n) ? `${n}` : `${Number(n.toFixed(2))}`;
  };

  const formatItemLine = (i: any): string => {
    const name = (i.name || '').trim();
    const qty = i.quantity;
    const unit = (i.unit || '').trim();
    const qtyStr = typeof qty === 'number' ? `${trimNumber(qty)}` : (qty ? String(qty).trim() : '');
    const parts = [name];
    const meta: string[] = [];
    if (qtyStr) meta.push(qtyStr);
    if (unit) meta.push(unit);
    if (meta.length) parts.push('— ' + meta.join(' '));
    return `• ${parts.join(' ')}`;
  };

  const buildText = (): string => {
    const lines: string[] = [];
    lines.push('Shopping List');
    lines.push(new Date().toLocaleString());
    lines.push('');
    if (groupByCategory) {
      // Deterministic category order
      const categoryOrder = ['Produce', 'Dairy', 'Meat', 'Seafood', 'Bakery', 'Pantry', 'Frozen', 'Beverages', 'Other'];
      const categories = Object.keys(byCategory)
        .sort((a, b) => {
          const ia = categoryOrder.indexOf(a);
          const ib = categoryOrder.indexOf(b);
          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a.localeCompare(b);
        });
      categories.forEach((cat) => {
        const items = byCategory[cat] || [];
        if (!items.length) return;
        const title = cat || 'Other';
        const emoji = categoryEmoji[title] || categoryEmoji.Other;
        lines.push(`${emoji} ${title}`);
        items.forEach((i) => {
          lines.push(formatItemLine(i));
        });
        lines.push('');
      });
    } else {
      dedupedItems
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .forEach((i) => {
        const cat = i.category || 'Other';
        const emoji = categoryEmoji[cat] || categoryEmoji.Other;
        const base = formatItemLine(i);
        lines.push(`${base} (${emoji} ${cat})`);
      });
    }
    return lines.join('\n');
  };

  const content = useMemo(() => buildText(), [dedupedItems, byCategory, groupByCategory]);


  const handleShare = async () => {
    try {
      await Share.share({ message: content });
    } catch (e) {}
  };

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <ScrollView>
          <Text style={styles.title}>Export / Share</Text>

          <Card>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Include checked items</Text>
              <Switch value={includeChecked} onValueChange={setIncludeChecked} />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Group by category</Text>
              <Switch value={groupByCategory} onValueChange={setGroupByCategory} />
            </View>
          </Card>

          <Card style={{ marginTop: Spacing.md }}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <View style={styles.previewBox}>
              <Text style={styles.previewText} selectable>{content}</Text>
            </View>
          </Card>

          <View style={styles.actions}>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ marginRight: Spacing.sm }}>
                <Button title={copied ? 'Copied' : 'Copy'} onPress={handleCopy} variant="outline" />
              </View>
              <Button title="Share" onPress={handleShare} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { maxHeight: '85%', backgroundColor: Colors.background, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: Spacing.lg },
  title: { fontSize: Typography.sizes.xl, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md },
  sectionTitle: { fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md },
  toggleLabel: { color: Colors.text },
  previewBox: { padding: Spacing.md, backgroundColor: Colors.card, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  previewText: { color: Colors.text, fontFamily: 'monospace' as any },
  actions: { marginTop: Spacing.lg },
  cancelBtn: { alignSelf: 'center', padding: Spacing.md },
  cancelText: { color: Colors.primary, fontWeight: '600' },
});
