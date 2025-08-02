import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ShoppingListItem as ShoppingListItemType } from '@/types';
import { Colors } from '@/constants/colors';
import { Check, Trash2 } from 'lucide-react-native';
import { useShoppingList } from '@/hooks/useShoppingListStore';

interface ShoppingListItemProps {
  item: ShoppingListItemType;
}

export const ShoppingListItem: React.FC<ShoppingListItemProps> = ({ item }) => {
  const { toggleItemChecked, removeItem } = useShoppingList();
  
  const handleToggle = () => {
    toggleItemChecked(item.id);
  };
  
  const handleDelete = () => {
    removeItem(item.id);
  };
  
  return (
    <View 
      style={[styles.container, item.checked && styles.checkedContainer]}
      testID={`shopping-item-${item.id}`}
    >
      <TouchableOpacity 
        style={[styles.checkbox, item.checked && styles.checkedCheckbox]}
        onPress={handleToggle}
        testID={`toggle-item-${item.id}`}
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
        style={styles.deleteButton}
        onPress={handleDelete}
        testID={`delete-item-${item.id}`}
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
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  checkedContainer: {
    backgroundColor: Colors.secondary,
    opacity: 0.8,
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
  deleteButton: {
    padding: 8,
  }
});