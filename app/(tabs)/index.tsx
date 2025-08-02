import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  SectionList,
  Alert,
  Image,
  TextInput,
  Animated
} from 'react-native';
import { Stack } from 'expo-router';
import { Plus, AlertCircle, Mic, Camera as IconCamera, Barcode, Trash2 } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { Colors } from '@/constants/colors';
import { useInventory, useInventoryByFreshness } from '@/hooks/useInventoryStore';
import { useShoppingList } from '@/hooks/useShoppingListStore';
import { InventoryItemCard } from '@/components/InventoryItemCard';
import { AddItemModal } from '@/components/AddItemModal';
import { InventoryItem, ItemCategory } from '@/types';

export default function InventoryScreen() {
  const { inventory, isLoading, addItem, removeItem, getItemsByCategory } = useInventory();
  const { expiring } = useInventoryByFreshness();
  const { addItem: addToShoppingList } = useShoppingList();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [isCaptureVisible, setIsCaptureVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [lastUsedItem, setLastUsedItem] = useState<InventoryItem | null>(null);
  const cameraRef = React.useRef<CameraView>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [permission, requestPermission] = useCameraPermissions();

  const handleRecord = async () => {
    console.log('handleRecord called. isRecording:', isRecording);
    try {
      console.log('Requesting microphone permissions...');
      const { status } = await Audio.requestPermissionsAsync();
      console.log('Permission status:', status);
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'You need to grant microphone access to record audio.');
        return;
      }

      if (isRecording && recording) {
        console.log('Attempting to stop recording...');
        setIsRecording(false);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        console.log('Recording stopped. URI:', uri);
        setRecording(null);
        console.log('Recording state cleared.');
      } else {
        console.log('Attempting to start recording...');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        console.log('Audio mode set.');
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(newRecording);
        setIsRecording(true);
        console.log('Recording started.');
      }
    } catch (error) {
      console.error('Error handling record:', error);
      Alert.alert('Error', 'Failed to handle audio recording.');
    }
  };

  const handleUseUpItem = (item: InventoryItem) => {
    // Remove from inventory
    removeItem(item.id);
    
    // Show toast notification
    setLastUsedItem(item);
    setToastMessage(`You've used up '${item.name}'.`);
    setToastVisible(true);
    
    // Auto-hide toast after 3 seconds
    setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

  const handleAddToShoppingList = () => {
    if (lastUsedItem) {
      addToShoppingList({
        name: lastUsedItem.name,
        quantity: lastUsedItem.quantity,
        unit: lastUsedItem.unit,
        category: lastUsedItem.category,
        checked: false,
        addedBy: 'user',
      });
      setToastVisible(false);
      setLastUsedItem(null);
    }
  };

  const handleCapture = async () => {
    if (!permission) return;
    if (!permission.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Denied', 'You need to grant camera access to take photos.');
        return;
      }
    }
    setIsCaptureVisible(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      setCapturedImage(photo.uri);
      setIsCaptureVisible(false);
    }
  };

  const savePicture = () => {
    console.log('Picture saved:', capturedImage);
    // TODO: Implement logic to add the item from the picture
    setCapturedImage(null);
    Alert.alert('Saved!', 'The photo has been saved.');
  };

  const retakePicture = () => {
    setCapturedImage(null);
    setIsCaptureVisible(true);
  };

  const handleScan = async () => {
    console.log('handleScan called');
    console.log('Current permission status:', permission);

    if (!permission) {
      console.log('Permissions are null, requesting...');
      const { granted } = await requestPermission();
      if (granted) {
        console.log('Permission granted after request.');
        setIsScannerVisible(true);
      } else {
        console.log('Permission denied after request.');
        Alert.alert('Permission Denied', 'You need to grant camera access to use the scanner.');
      }
      return;
    }

    if (permission.granted) {
      console.log('Permission already granted.');
      setIsScannerVisible(true);
    } else {
      console.log('Permission not granted, requesting...');
      const { granted } = await requestPermission();
      if (granted) {
        console.log('Permission granted after request.');
        setIsScannerVisible(true);
      } else {
        console.log('Permission denied after request.');
        Alert.alert('Permission Denied', 'You need to grant camera access to use the scanner.');
      }
    }
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setIsScannerVisible(false);
    Alert.alert('Barcode Scanned!', `Type: ${type}\nData: ${data}`);
    // TODO: Fetch product info from an API using the scanned data
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  
  const itemsByCategory = getItemsByCategory();
  
  // Create sections for SectionList
  const sections = Object.entries(itemsByCategory)
    .filter(([_, items]) => items.length > 0)
    .map(([category, items]) => ({
      title: category as ItemCategory,
      data: items
    }));
  
  return (
    <View>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          title: 'My Inventory',
          headerRight: () => (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setAddModalVisible(true)}
              testID="add-inventory-item-button"
            >
              <Plus size={20} color={Colors.white} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <TextInput
        style={styles.searchBar}
        placeholder="Search inventory..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor={Colors.secondary}
      />
      
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <InventoryItemCard 
            item={item} 
            onUseUp={handleUseUpItem}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items in inventory</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setAddModalVisible(true)}
            >
              <Text style={styles.addButtonText}>Add Your First Item</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.sectionList}
      />
    )}

    {/* Toast Notification */}
    {toastVisible && (
      <View style={styles.toastContainer}>
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
          <TouchableOpacity 
            style={styles.toastButton}
            onPress={handleAddToShoppingList}
          >
            <Text style={styles.toastButtonText}>Add to Shopping List</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}

    <View style={styles.quickAddContainer}>
      <TouchableOpacity 
        style={[styles.quickAddButton, isRecording && styles.recordingButton]}
        onPress={handleRecord}
      >
        <Mic size={20} color={Colors.white} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.quickAddButton} onPress={handleCapture}>
        <IconCamera size={20} color={Colors.white} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.quickAddButton} onPress={handleScan}>
        <Barcode size={20} color={Colors.white} />
      </TouchableOpacity>
    </View>
    
    {isCaptureVisible && (
      <View style={StyleSheet.absoluteFillObject}>
        <CameraView style={StyleSheet.absoluteFillObject} ref={cameraRef} />
        <View style={styles.cameraActionsContainer}>
          <TouchableOpacity style={styles.captureButton} onPress={takePicture} />
          <TouchableOpacity style={styles.closeScannerButton} onPress={() => setIsCaptureVisible(false)}>
            <Text style={styles.closeScannerButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}

    {capturedImage && (
      <View style={StyleSheet.absoluteFillObject}>
        <Image source={{ uri: capturedImage }} style={StyleSheet.absoluteFillObject} />
        <View style={styles.previewActionsContainer}>
          <TouchableOpacity style={styles.previewButton} onPress={retakePicture}>
            <Text style={styles.previewButtonText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.previewButton} onPress={savePicture}>
            <Text style={styles.previewButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}

    {isScannerVisible && (
      <View style={StyleSheet.absoluteFillObject}>
        <CameraView
          onBarcodeScanned={handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.cameraActionsContainer}>
          <TouchableOpacity style={styles.closeScannerButton} onPress={() => setIsScannerVisible(false)}>
            <Text style={styles.closeScannerButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}

    <AddItemModal
      visible={addModalVisible}
      onClose={() => setAddModalVisible(false)}
      onAdd={(item) => addItem(item as Omit<InventoryItem, 'id'>)}
    />
  </View>
);

const styles = StyleSheet.create({
  searchBar: {
    height: 40,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  addButton: {
    padding: 8,
    marginRight: 8,
  },
  expiringContainer: {
    backgroundColor: Colors.white,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  expiringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  expiringTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  expiringScroll: {
    marginLeft: -12,
    marginRight: -12,
  },
  expiringScrollContent: {
    paddingHorizontal: 12,
  },
  expiringItem: {
    width: 250,
    marginRight: 12,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: Colors.background,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  quickAddContainer: {
    position: 'absolute',
    bottom: 80,
    right: 24,
    flexDirection: 'column',
    zIndex: 10, // Ensure it's above other elements
  },
  closeScannerButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
  },
  closeScannerButtonText: {
    color: Colors.white,
    fontSize: 16,
  },
  cameraActionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.white,
    borderWidth: 5,
    borderColor: 'grey',
  },
  previewActionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  previewButton: {
    padding: 15,
  },
  previewButtonText: {
    color: Colors.white,
    fontSize: 18,
  },
  recordingButton: {
    backgroundColor: Colors.expiring,
  },
  quickAddButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sectionList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: Colors.text,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toastText: {
    color: Colors.white,
    fontSize: 14,
    flex: 1,
  },
  toastButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  toastButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
});