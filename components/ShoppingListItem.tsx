import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { ShoppingListItem as ShoppingListItemType } from '@/types';
import { Colors } from '@/constants/colors';
import { Check, Trash2 } from 'lucide-react-native';
import { useShoppingList } from '@/hooks/useShoppingListStore';

interface ShoppingListItemProps {
  item: ShoppingListItemType;
  onToggle: (item: ShoppingListItemType) => void;
}

export const ShoppingListItem: React.FC<ShoppingListItemProps> = ({ item, onToggle }) => {
  const { removeItem } = useShoppingList();
  
  const handleToggle = () => {
    onToggle(item);
  };
  
  const handleDelete = () => {
    try { Vibration.vibrate(10); } catch {}
    removeItem(item.id);
  };
  
  return (
    <View 
      style={[styles.container]}
      testID={`shopping-item-${item.id}`}
    >
      <TouchableOpacity 
        style={[styles.checkbox, item.checked && styles.checkedCheckbox]}
        onPress={handleToggle}
        testID={`toggle-item-${item.id}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.checked }}
      >
        {item.checked && <Check size={16} color={Colors.white} />}
      </TouchableOpacity>
      
      <View style={styles.contentContainer}>
        <Text 
          style={[styles.name, item.checked && styles.checkedText]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text style={[styles.quantity, item.checked && styles.checkedText]}>
          {item.quantity} {item.unit}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.iconButtonSquare}
        onPress={handleDelete}
        testID={`delete-item-${item.id}`}
        accessibilityLabel={`Delete ${item.name}`}
      >
        <Trash2 size={16} color={Colors.expiring} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedCheckbox: {
    backgroundColor: Colors.primary,
  },
  contentContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  quantity: {
    fontSize: 14,
    color: Colors.lightText,
  },
  checkedText: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  iconButtonSquare: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
});