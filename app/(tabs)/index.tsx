import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SectionList,
  Alert,
  Image,
  Animated,
} from 'react-native';
import { Stack } from 'expo-router';
import { Plus, AlertCircle, Mic, Camera as IconCamera, Barcode } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { useInventory, useInventoryByFreshness } from '@/hooks/useInventoryStore';
import { useShoppingList } from '@/hooks/useShoppingListStore';
// import { useToast } from '@/contexts/ToastContext';
import { InventoryItemCard } from '@/components/InventoryItemCard';
import { AddItemModal } from '@/components/AddItemModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { InventoryItem, ItemCategory } from '@/types';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchInput: {
    marginBottom: 0,
  },
  headerButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  expiringCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  expiringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  expiringTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  expiringItem: {
    width: 250,
    marginRight: Spacing.md,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  sectionListContent: {
    paddingBottom: 150, // Ensure space for quick add buttons
  },
  itemCardContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.secondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 8,
    padding: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  toastText: {
    color: Colors.white,
    fontSize: 14,
    flex: 1,
  },
  toastButton: {
    marginLeft: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  toastButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  quickAddContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'flex-end',
  },
  quickAddButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    marginBottom: 12,
  },
  quickAddOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  quickAddText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.text,
  },
  recordingButton: {
    backgroundColor: Colors.danger,
  },
  cameraContainer: {
    flex: 1,
  },
  cameraActionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 20,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.white,
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  closeScannerButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  previewImage: {
    flex: 1,
  },
  previewActionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 20,
  },
  previewButton: {
    padding: 12,
  },
  previewButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default function InventoryScreen() {
  const { inventory, isLoading, addItem, removeItem } = useInventory();
  const { expiring } = useInventoryByFreshness();
  const { addItem: addToShoppingList } = useShoppingList();
  // const { showToast } = useToast();

  const [isModalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isCameraOpen, setCameraOpen] = useState(false);
  const [isBarcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const [isQuickAddExpanded, setQuickAddExpanded] = useState(false);

  const handleUseItem = (item: InventoryItem) => {
    removeItem(item.id);
    // Temporarily disabled toast
    console.log(`Used up ${item.name}`);
  };

  const handleAddItem = (item: Omit<InventoryItem, 'id'>) => {
    addItem(item);
    setModalVisible(false);
  };

  const openCamera = async () => {
    const { status } = await requestPermission();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to add items with a photo.');
      return;
    }
    setCameraOpen(true);
    setQuickAddExpanded(false);
  };

  const openBarcodeScanner = async () => {
    const { status } = await requestPermission();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required for barcode scanning.');
      return;
    }
    setBarcodeScannerOpen(true);
    setQuickAddExpanded(false);
  };

  const handleTakePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo) {
        setCapturedImage(photo.uri);
        setCameraOpen(false);
      }
    }
  };

  const startRecording = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Audio recording permission is required to add items with your voice.');
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      await audioRecorder.record();
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) {
        console.log('Recording stopped, URI:', uri);
        // TODO: Process the audio file
        Alert.alert('Voice Note', 'Voice note captured! (Processing not implemented yet)');
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [inventory, searchQuery]);

  const groupedInventory = useMemo(() => {
    const grouped = filteredInventory.reduce((acc, item) => {
      const category = item.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<ItemCategory | 'Other', InventoryItem[]>);

    return Object.entries(grouped).map(([title, data]) => ({ title, data }));
  }, [filteredInventory]);

  if (isLoading) {
    return <LoadingSpinner text="Loading your inventory..." />;
  }

  if (isCameraOpen || isBarcodeScannerOpen) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView 
          style={StyleSheet.absoluteFillObject}
          facing='back'
          ref={cameraRef}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'upc_a', 'upc_e'],
          }}
          onBarcodeScanned={(result) => {
            if (isBarcodeScannerOpen) {
              setBarcodeScannerOpen(false);
              Alert.alert('Barcode Scanned', `Data: ${result.data} (Adding not implemented yet)`);
            }
          }}
        />
        <TouchableOpacity style={styles.closeScannerButton} onPress={() => { setCameraOpen(false); setBarcodeScannerOpen(false); }}>
          <AlertCircle size={32} color={Colors.white} />
        </TouchableOpacity>
        {isCameraOpen && (
            <View style={styles.cameraActionsContainer}>
                <TouchableOpacity style={styles.captureButton} onPress={handleTakePicture} />
            </View>
        )}
      </View>
    );
  }

  if (capturedImage) {
    return (
      <View style={styles.cameraContainer}>
        <Image source={{ uri: capturedImage }} style={styles.previewImage} />
        <View style={styles.previewActionsContainer}>
          <TouchableOpacity style={styles.previewButton} onPress={() => setCapturedImage(null)}>
            <Text style={styles.previewButtonText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.previewButton} onPress={() => {
            setCapturedImage(null);
            Alert.alert('Image Saved', 'Image processing not implemented yet.');
          }}>
            <Text style={styles.previewButtonText}>Use Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Your inventory is empty. Add some items to get started!</Text>
      <Button
        title="Add First Item"
        onPress={() => setModalVisible(true)}
        icon={<Plus size={20} color={Colors.white} />}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Inventory',
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton} onPress={() => setModalVisible(true)}>
              <Plus size={24} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <AddItemModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAddItem}
      />

      <View style={styles.searchContainer}>
        <Input
          placeholder="Search inventory..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      {expiring.length > 0 && (
        <Card style={styles.expiringCard}>
          <View style={styles.expiringHeader}>
            <AlertCircle size={20} color={Colors.expiring} />
            <Text style={styles.expiringTitle}>Expiring Soon</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {expiring.map(item => (
              <View key={`expiring-${item.id}`} style={styles.expiringItem}>
                <InventoryItemCard item={item} onUseUp={() => handleUseItem(item)} />
              </View>
            ))}
          </ScrollView>
        </Card>
      )}

      <SectionList
        sections={groupedInventory}
        keyExtractor={(item) => `section-${item.id}`}
        renderItem={({ item }) => (
          <View style={styles.itemCardContainer}>
            <InventoryItemCard item={item} onUseUp={() => handleUseItem(item)} />
          </View>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.sectionListContent}
      />



      <View style={styles.quickAddContainer}>
        {isQuickAddExpanded && (
          <View>
            <TouchableOpacity style={styles.quickAddOption} onPress={openBarcodeScanner}>
              <Barcode size={20} color={Colors.primary} />
              <Text style={styles.quickAddText}>Scan Barcode</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAddOption} onPress={openCamera}>
              <IconCamera size={20} color={Colors.primary} />
              <Text style={styles.quickAddText}>Use Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickAddButton, recorderState.isRecording && styles.recordingButton]} onPress={recorderState.isRecording ? stopRecording : startRecording}>
              <Mic size={20} color={recorderState.isRecording ? Colors.white : Colors.primary} />
              <Text style={[styles.quickAddText, recorderState.isRecording && { color: Colors.white }]}>{recorderState.isRecording ? 'Stop' : 'Voice Note'}</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity style={styles.quickAddButton} onPress={() => setQuickAddExpanded(!isQuickAddExpanded)}>
          <Plus size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
