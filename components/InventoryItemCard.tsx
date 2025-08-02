import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { InventoryItem } from '@/types';
import { FreshnessIndicator } from './FreshnessIndicator';
import { useInventory } from '@/hooks/useInventoryStore';
import { Colors } from '@/constants/colors';
import { Trash2 } from 'lucide-react-native';

interface InventoryItemCardProps {
  item: InventoryItem;
  onPress?: () => void;
  onUseUp?: (item: InventoryItem) => void;
}

export const InventoryItemCard: React.FC<InventoryItemCardProps> = ({ 
  item, 
  onPress,
  onUseUp 
}) => {
  const { getFreshnessStatus, removeItem } = useInventory();
  const freshnessStatus = getFreshnessStatus(item.expiryDate);
  
  const handleDelete = () => {
    removeItem(item.id);
  };

  const handleUseUp = () => {
    if (onUseUp) {
      onUseUp(item);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      testID={`inventory-item-${item.id}`}
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
      
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={handleDelete}
        testID={`delete-item-${item.id}`}
      >
        <Trash2 size={16} color={Colors.expiring} />
      </TouchableOpacity>
      <TouchableOpacity onPress={handleUseUp} style={styles.useUpButton}>
        <Text style={styles.useUpText}>Use Up</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  placeholderImage: {
    backgroundColor: Colors.secondary,
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
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  quantity: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    color: Colors.lightText,
  },
  deleteButton: {
    justifyContent: 'center',
    padding: 8,
  },
  useUpButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  useUpText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});