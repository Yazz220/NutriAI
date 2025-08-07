import React, { memo, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
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
        accessibilityLabel={`${item.name}, ${item.quantity} ${item.unit}, ${item.category}`}
        accessibilityHint="Tap to view item details"
        accessibilityRole="button"
      >
      <View style={styles.imageContainer}>
        {item.imageUrl ? (
          <Image 
            source={{ uri: item.imageUrl }} 
            style={styles.image} 
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.placeholderImage]} />
        )}
        <View style={styles.freshnessContainer}>
          <FreshnessIndicator status={freshnessStatus} />
        </View>
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.quantity}>
          {item.quantity} {item.unit}
        </Text>
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
    backgroundColor: Colors.white,
    borderRadius: Spacing.md,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: Spacing.sm,
  },
  placeholderImage: {
    backgroundColor: Colors.border,
  },
  freshnessContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 2,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: Spacing.md,
  },
  name: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  quantity: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    marginBottom: 2,
  },
  category: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    fontStyle: 'italic',
  },
  actionsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  useUpButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.xl,
    backgroundColor: Colors.primary,
  },
  useUpText: {
    fontSize: Typography.sizes.xs,
    color: Colors.white,
    fontWeight: Typography.weights.bold,
  },
});