import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Modal, 
  ScrollView,
  Alert
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { ItemCategory } from '@/types';
import { X, AlertCircle } from 'lucide-react-native';
import { useValidation } from '@/hooks/useValidation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface AddItemModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: {
    name: string;
    quantity: number;
    unit: string;
    category: ItemCategory;
    addedDate: string;
    expiryDate: string;
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

const commonUnits = [
  'pcs', 
  'kg', 
  'g', 
  'liter', 
  'ml', 
  'cup', 
  'tbsp', 
  'tsp', 
  'bunch', 
  'can', 
  'bottle'
];

export const AddItemModal: React.FC<AddItemModalProps> = ({ 
  visible, 
  onClose, 
  onAdd 
}) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [category, setCategory] = useState<ItemCategory>('Produce');
  const [expiryDays, setExpiryDays] = useState('7');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { validateInventoryItem, errors, clearErrors } = useValidation();
  
  const resetForm = () => {
    setName('');
    setQuantity('1');
    setUnit('pcs');
    setCategory('Produce');
    setExpiryDays('7');
    clearErrors();
  };
  
  const handleAdd = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    const today = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(today.getDate() + Number(expiryDays));
    
    const itemData = {
      name: name.trim(),
      quantity: Number(quantity),
      unit,
      category,
      addedDate: today.toISOString(),
      expiryDate: expiryDate.toISOString()
    };
    
    const validation = validateInventoryItem(itemData);
    
    if (!validation.isValid) {
      setIsSubmitting(false);
      Alert.alert(
        'Validation Error',
        validation.errors.join('\n'),
        [{ text: 'OK' }]
      );
      return;
    }
    
    try {
      onAdd(itemData);
      resetForm();
      onClose();
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to add item. Please try again.',
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
            <Text style={styles.modalTitle}>Add New Item</Text>
            <TouchableOpacity 
              onPress={handleClose} 
              style={styles.closeButton}
              disabled={isSubmitting}
              accessibilityLabel="Close modal"
              accessibilityHint="Tap to close the add item modal"
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
              testID="item-name-input"
              accessibilityLabel="Item name input"
              accessibilityHint="Enter the name of the item you want to add"
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
                  testID="item-quantity-input"
                  accessibilityLabel="Item quantity input"
                  accessibilityHint="Enter the quantity of the item"
                />
              </View>
              
              <View style={styles.halfColumn}>
                <Text style={[{ fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium, color: Colors.text }, { marginTop: Spacing.md, marginBottom: Spacing.sm }]}>
                  Unit <Text style={{ color: Colors.error }}>*</Text>
                </Text>
                <View 
                  style={styles.pickerContainer}
                  accessibilityRole="radiogroup"
                  accessibilityLabel="Select unit of measurement"
                >
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    accessibilityLabel="Scroll to see more units"
                  >
                    {commonUnits.map((u) => (
                      <TouchableOpacity
                        key={u}
                        style={[
                          styles.unitButton,
                          unit === u && styles.selectedUnitButton
                        ]}
                        onPress={() => setUnit(u)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: unit === u }}
                        accessibilityLabel={`${u} unit`}
                        accessibilityHint={`Select ${u} as the unit of measurement`}
                      >
                        <Text 
                          style={[
                            styles.unitButtonText,
                            unit === u && styles.selectedUnitButtonText
                          ]}
                        >
                          {u}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
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
            
            <Input
              label="Expires in (days)"
              value={expiryDays}
              onChangeText={setExpiryDays}
              keyboardType="numeric"
              placeholder="7"
              error={errors.expiryDays}
              required
              testID="item-expiry-input"
              accessibilityLabel="Item expiry days input"
              accessibilityHint="Enter how many days until the item expires"
            />
          </ScrollView>
          
          <Button
            title={isSubmitting ? "Adding..." : "Add Item"}
            onPress={handleAdd}
            disabled={isSubmitting}
            loading={isSubmitting}
            style={styles.addButton}
            testID="add-item-button"
            accessibilityLabel="Add item to inventory"
            accessibilityHint="Tap to add the item to your inventory"
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
  webPicker: {
    width: '100%',
    height: 46,
    border: 'none',
    fontSize: Typography.sizes.md,
    paddingLeft: Spacing.md,
    color: Colors.text,
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