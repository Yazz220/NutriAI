import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, LayoutChangeEvent, ScrollView } from 'react-native';
import { Colors } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Meal } from '@/types';
import { useMeals } from '@/hooks/useMealsStore';
import { useRecipeFolders } from '@/hooks/useRecipeFoldersStore';

interface SavedRecipesGridProps {
  meals: Meal[];
  onPress: (meal: Meal) => void;
  onLongPress?: (meal: Meal) => void;
}

export const SavedRecipesGrid: React.FC<SavedRecipesGridProps> = ({ meals, onPress, onLongPress }) => {
  const insets = useSafeAreaInsets();
  const [gridWidth, setGridWidth] = useState(0);
  const GUTTER = 16;
  const COLUMN_GAP = 16;

  const onGridLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && Math.floor(w) !== Math.floor(gridWidth)) setGridWidth(Math.floor(w));
  };

  return (
    <View style={styles.container} onLayout={onGridLayout}>
      <FlatList
        data={meals}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 24 + Math.max(insets.bottom, 12) }}
        renderItem={({ item, index }) => {
          const containerInner = Math.max(gridWidth - (GUTTER * 2), 0);
          const rawWidth = (containerInner - COLUMN_GAP) / 2;
          const itemWidth = Math.floor(rawWidth);
          if (!itemWidth) return null;
          const imageHeight = Math.floor(itemWidth * 0.75);
          const isLeft = index % 2 === 0;
          const totalMins = (typeof item.prepTime === 'number' ? item.prepTime : 0) + (typeof item.cookTime === 'number' ? item.cookTime : 0);
          return (
            <TouchableOpacity
              style={[styles.card, { width: itemWidth, marginRight: isLeft ? COLUMN_GAP : 0 }]}
              activeOpacity={0.9}
              onPress={() => onPress(item)}
              onLongPress={onLongPress ? () => onLongPress(item) : undefined}
            >
              <Image
                source={{ uri: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c' }}
                style={{ width: '100%', height: imageHeight, borderRadius: 12, backgroundColor: Colors.secondary }}
                resizeMode="cover"
              />
              <View style={{ paddingVertical: 10 }}>
                <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
                {totalMins > 0 ? (
                  <Text style={styles.metaText}>{formatCookTime(totalMins)}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  chipActive: { backgroundColor: Colors.text },
  chipText: { color: Colors.lightText, fontWeight: '600' },
  chipActiveText: { color: Colors.white, fontWeight: '700' },
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 10, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  metaText: { fontSize: 12, color: Colors.lightText },
});

function formatCookTime(mins: number) {
  if (!mins || mins <= 0) return '';
  if (mins < 60) return `${mins}m cook time`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m cook time` : `${h}h cook time`;
}
