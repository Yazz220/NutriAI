import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView,
  Alert,
  Platform,
  Vibration
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { ItemCategory } from '@/types';
import { X, Package, Calendar, Hash } from 'lucide-react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
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
          {/* Enhanced Header with Gradient */}
          <ExpoLinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalHeader}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerTitleRow}>
                <View style={styles.headerIcon}>
                  <Package size={24} color={Colors.white} />
                </View>
                <Text style={styles.modalTitle}>Add New Item</Text>
              </View>
              <TouchableOpacity 
                onPress={handleClose} 
                style={styles.closeButton}
                disabled={isSubmitting}
                accessibilityLabel="Close modal"
                accessibilityHint="Tap to close the add item modal"
              >
                <X size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </ExpoLinearGradient>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Enhanced Input Sections */}
            <View style={styles.inputSection}>
              <View style={styles.sectionHeader}>
                <Package size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Item Details</Text>
              </View>
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
            </View>

            <View style={styles.inputSection}>
              <View style={styles.sectionHeader}>
                <Hash size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Quantity & Unit</Text>
              </View>
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
                  <Text style={styles.inputLabel}>
                    Unit <Text style={{ color: Colors.error }}>*</Text>
                  </Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.unitsScroll}
                    accessibilityLabel="Scroll to see more units"
                  >
                    {commonUnits.map((u) => (
                      <TouchableOpacity
                        key={u}
                        style={[
                          styles.modernUnitButton,
                          unit === u && styles.selectedModernUnitButton
                        ]}
                        onPress={() => { try { Vibration.vibrate(10); } catch {}; setUnit(u); }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: unit === u }}
                        accessibilityLabel={`${u} unit`}
                        accessibilityHint={`Select ${u} as the unit of measurement`}
                      >
                        <Text 
                          style={[
                            styles.modernUnitButtonText,
                            unit === u && styles.selectedModernUnitButtonText
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
            
            <View style={styles.inputSection}>
              <View style={styles.sectionHeader}>
                <Package size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Category</Text>
              </View>
              <View style={styles.modernCategoryContainer}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.modernCategoryButton,
                      category === cat && styles.selectedModernCategoryButton
                    ]}
                    onPress={() => { try { Vibration.vibrate(10); } catch {}; setCategory(cat); }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: category === cat }}
                    accessibilityLabel={`${cat} category`}
                    accessibilityHint={`Select ${cat} as the item category`}
                  >
                    <Text 
                      style={[
                        styles.modernCategoryButtonText,
                        category === cat && styles.selectedModernCategoryButtonText
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.inputSection}>
              <View style={styles.sectionHeader}>
                <Calendar size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Expiration</Text>
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
            </View>
          </ScrollView>
          
          <Button
            title={isSubmitting ? "Adding..." : "Add Item"}
            onPress={() => { try { Vibration.vibrate(10); } catch {}; handleAdd(); }}
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  modalHeader: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: 20,
    maxHeight: '70%',
  },
  inputSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfColumn: {
    flex: 1,
  },
  unitsScroll: {
    marginTop: 8,
  },
  modernUnitButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedModernUnitButton: {
    backgroundColor: Colors.card,
    borderColor: Colors.primary,
  },
  modernUnitButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  selectedModernUnitButtonText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  modernCategoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modernCategoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  selectedModernCategoryButton: {
    backgroundColor: Colors.card,
    borderColor: Colors.primary,
  },
  modernCategoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  selectedModernCategoryButtonText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  addButton: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 16,
    paddingVertical: 14,
  },
});