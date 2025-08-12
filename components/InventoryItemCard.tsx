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
          <FreshnessIndicator status={indicatorStatus} />
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
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border + '30',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  placeholderImage: {
    backgroundColor: Colors.background,
  },
  freshnessContainer: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  quantity: {
    fontSize: 14,
    color: Colors.lightText,
    fontWeight: '500',
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    color: Colors.lightText,
    fontWeight: '500',
    backgroundColor: Colors.background,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  useUpText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '700',
  },
});