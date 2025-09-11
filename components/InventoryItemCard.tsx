import React, { memo, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import IngredientIcon from '@/components/common/IngredientIcon';
import { slugifyIngredient } from '@/utils/ingredientSlug';
import { InventoryItem } from '@/types';
import { FreshnessIndicator } from './FreshnessIndicator';
import { useInventory } from '@/hooks/useInventoryStore';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, Shadows } from '@/constants/spacing';

interface InventoryItemCardProps {
  item: InventoryItem;
  onPress?: () => void;
  onUseUp?: (item: InventoryItem) => void;
}

export const InventoryItemCard: React.FC<InventoryItemCardProps> = memo(({ 
  item, 
  onPress,
  onUseUp 
}) => {
  const { getFreshnessStatus } = useInventory();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  // Memoize expensive calculations
  const freshnessStatus = useMemo(() => 
    getFreshnessStatus(item.expiryDate), 
    [getFreshnessStatus, item.expiryDate]
  );
  const indicatorStatus: 'fresh' | 'aging' | 'expiring' =
    freshnessStatus === 'untracked' ? 'aging' : freshnessStatus;

  // Animate card entrance
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleUseUp = useCallback(() => {
    if (onUseUp) {
      onUseUp(item);
    }
  }, [onUseUp, item]);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    }
  }, [onPress]);

  return (
    <Animated.View 
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <TouchableOpacity 
        style={styles.container}
        onPress={handlePress}
        testID={`inventory-item-${item.id}`}
        activeOpacity={onPress ? 0.7 : 1}
        accessibilityLabel={`${item.name}, ${item.category}`}
        accessibilityHint="Tap to view item details"
        accessibilityRole="button"
      >
        <View style={styles.imageContainer}>
        {item.imageUrl ? (
          <Image 
            source={{ uri: item.imageUrl }} 
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.image, styles.placeholderCenter]}>
            {/* Use generated ingredient-specific icon with SVG placeholder while pending */}
            <IngredientIcon slug={slugifyIngredient(item.name)} size={56} />
          </View>
        )}
      </View>
      
        <View style={styles.contentContainer}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.note}>Tap to set details</Text>
          <Text style={styles.category}>{item.category}</Text>
        </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          onPress={handleUseUp} 
          style={styles.useUpButton}
          accessibilityLabel={`Use up ${item.name}`}
          accessibilityHint="Tap to mark this item as used up"
          accessibilityRole="button"
        >
          <Text style={styles.useUpText}>Use Up</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
});

// Add display name for debugging
InventoryItemCard.displayName = 'InventoryItemCard';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imageContainer: {
    position: 'relative',
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.secondary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  // placeholderImage no longer needed; backgroundColor applied on image area
  placeholderCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  freshnessContainer: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.card,
    borderRadius: 6,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: 4,
  },
  note: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    color: Colors.lightText,
    fontWeight: Typography.weights.semibold,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  actionsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  useUpButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  useUpText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
  },
});
