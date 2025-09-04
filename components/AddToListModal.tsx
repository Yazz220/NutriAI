import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView,
  Alert
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { ItemCategory } from '@/types';
import { X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface AddToListModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: {
    name: string;
    quantity: number;
    unit: string;
    category: ItemCategory;
    checked: boolean;
    addedBy: 'user';
  }) => void;
}

const categories: ItemCategory[] = [
  'Produce', 
  'Dairy', 
  'Meat', 
  'Seafood', 
  'Frozen', 
  'Pantry', 
  'Bakery', 
  'Beverages', 
  'Other'
];

export const AddToListModal: React.FC<AddToListModalProps> = ({ 
  visible, 
  onClose, 
  onAdd 
}) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [category, setCategory] = useState<ItemCategory>('Produce');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!name.trim()) {
      newErrors.name = 'Item name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Item name must be at least 2 characters';
    }
    
    const quantityNum = Number(quantity);
    if (!quantity.trim() || isNaN(quantityNum) || quantityNum <= 0) {
      newErrors.quantity = 'Please enter a valid quantity greater than 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const resetForm = () => {
    setName('');
    setQuantity('1');
    setCategory('Produce');
    setErrors({});
  };
  
  const handleAdd = async () => {
    if (isSubmitting) return;
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      onAdd({
        name: name.trim(),
        quantity: Number(quantity),
        unit: 'pcs',
        category,
        checked: false,
        addedBy: 'user'
      });
      
      resetForm();
      onClose();
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to add item to shopping list. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add to Shopping List</Text>
            <TouchableOpacity 
              onPress={handleClose} 
              style={styles.closeButton}
              disabled={isSubmitting}
              accessibilityLabel="Close modal"
              accessibilityHint="Tap to close the add to shopping list modal"
            >
              <X size={24} color={isSubmitting ? Colors.lightText : Colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Input
              label="Item Name"
              value={name}
              onChangeText={setName}
              placeholder="Enter item name"
              error={errors.name}
              required
              testID="list-item-name-input"
              accessibilityLabel="Shopping list item name input"
              accessibilityHint="Enter the name of the item to add to your shopping list"
            />
            
            <View style={styles.row}>
              <View style={styles.halfColumn}>
                <Input
                  label="Quantity"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  placeholder="1"
                  error={errors.quantity}
                  required
                  testID="list-item-quantity-input"
                  accessibilityLabel="Shopping list item quantity input"
                  accessibilityHint="Enter the quantity needed"
                />
              </View>
              
            </View>
            
            <Text style={[{ fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium, color: Colors.text }, { marginTop: Spacing.md, marginBottom: Spacing.sm }]}>
              Category <Text style={{ color: Colors.error }}>*</Text>
            </Text>
            <View 
              style={styles.categoryContainer}
              accessibilityRole="radiogroup"
              accessibilityLabel="Select item category"
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    category === cat && styles.selectedCategoryButton
                  ]}
                  onPress={() => setCategory(cat)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: category === cat }}
                  accessibilityLabel={`${cat} category`}
                  accessibilityHint={`Select ${cat} as the item category`}
                >
                  <Text 
                    style={[
                      styles.categoryButtonText,
                      category === cat && styles.selectedCategoryButtonText
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          
          <Button
            title={isSubmitting ? "Adding..." : "Add to List"}
            onPress={handleAdd}
            disabled={isSubmitting}
            loading={isSubmitting}
            style={styles.addButton}
            testID="add-to-list-button"
            accessibilityLabel="Add item to shopping list"
            accessibilityHint="Tap to add the item to your shopping list"
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Spacing.xl,
    borderTopRightRadius: Spacing.xl,
    paddingBottom: Spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  modalContent: {
    padding: Spacing.md,
    maxHeight: '70%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  halfColumn: {
    width: '48%',
  },
  pickerContainer: {
    backgroundColor: Colors.white,
    borderRadius: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    height: 'auto',
    marginTop: Spacing.sm,
  },
  unitButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    borderRadius: Spacing.sm,
    backgroundColor: Colors.secondary,
  },
  selectedUnitButton: {
    backgroundColor: Colors.primary,
  },
  unitButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  selectedUnitButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
  },
  categoryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    margin: Spacing.xs,
    borderRadius: Spacing.md,
    backgroundColor: Colors.secondary,
  },
  selectedCategoryButton: {
    backgroundColor: Colors.primary,
  },
  categoryButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  selectedCategoryButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
  },
  addButton: {
    margin: Spacing.md,
  }
});
