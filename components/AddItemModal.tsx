import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Modal, 
  ScrollView,
  Platform
} from 'react-native';
import { Colors } from '@/constants/colors';
import { ItemCategory } from '@/types';
import { X } from 'lucide-react-native';

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
  
  const handleAdd = () => {
    if (!name.trim() || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      return;
    }
    
    const today = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(today.getDate() + Number(expiryDays));
    
    onAdd({
      name: name.trim(),
      quantity: Number(quantity),
      unit,
      category,
      addedDate: today.toISOString(),
      expiryDate: expiryDate.toISOString()
    });
    
    // Reset form
    setName('');
    setQuantity('1');
    setUnit('pcs');
    setCategory('Produce');
    setExpiryDays('7');
    
    onClose();
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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Item Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter item name"
              placeholderTextColor={Colors.lightText}
              testID="item-name-input"
            />
            
            <View style={styles.row}>
              <View style={styles.halfColumn}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={Colors.lightText}
                  testID="item-quantity-input"
                />
              </View>
              
              <View style={styles.halfColumn}>
                <Text style={styles.label}>Unit</Text>
                <View style={styles.pickerContainer}>
                  {Platform.OS === 'web' ? (
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      style={styles.webPicker}
                    >
                      {commonUnits.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {commonUnits.map((u) => (
                        <TouchableOpacity
                          key={u}
                          style={[
                            styles.unitButton,
                            unit === u && styles.selectedUnitButton
                          ]}
                          onPress={() => setUnit(u)}
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
                  )}
                </View>
              </View>
            </View>
            
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    category === cat && styles.selectedCategoryButton
                  ]}
                  onPress={() => setCategory(cat)}
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
            
            <Text style={styles.label}>Expires in (days)</Text>
            <TextInput
              style={styles.input}
              value={expiryDays}
              onChangeText={setExpiryDays}
              keyboardType="numeric"
              placeholder="7"
              placeholderTextColor={Colors.lightText}
              testID="item-expiry-input"
            />
          </ScrollView>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAdd}
            testID="add-item-button"
          >
            <Text style={styles.addButtonText}>Add Item</Text>
          </TouchableOpacity>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
    maxHeight: '70%',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfColumn: {
    width: '48%',
  },
  pickerContainer: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Platform.OS === 'web' ? 0 : 8,
    paddingHorizontal: Platform.OS === 'web' ? 0 : 8,
    height: Platform.OS === 'web' ? 46 : 'auto',
  },
  webPicker: {
    width: '100%',
    height: 46,
    border: 'none',
    fontSize: 16,
    paddingLeft: 12,
    color: Colors.text,
  },
  unitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  selectedUnitButton: {
    backgroundColor: Colors.primary,
  },
  unitButtonText: {
    color: Colors.text,
    fontSize: 14,
  },
  selectedUnitButtonText: {
    color: Colors.white,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 4,
    borderRadius: 8,
    backgroundColor: Colors.secondary,
  },
  selectedCategoryButton: {
    backgroundColor: Colors.primary,
  },
  categoryButtonText: {
    color: Colors.text,
    fontSize: 14,
  },
  selectedCategoryButtonText: {
    color: Colors.white,
  },
  addButton: {
    backgroundColor: Colors.primary,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  }
});