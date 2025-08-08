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
  TextInput,
} from 'react-native';
import { Stack } from 'expo-router';
import { Plus, AlertCircle, Mic, Camera as IconCamera, Barcode } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
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
import { detectItemsFromImage, DetectedItem } from '@/utils/visionClient';
import { VoiceAddModal } from '@/components/VoiceAddModal';

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedItems, setDetectedItems] = useState<DetectedItem[] | null>(null);
  const [editableItems, setEditableItems] = useState<Array<{ name: string; quantity: string; unit: string; category: ItemCategory }>>([]);
  const [selectedIdx, setSelectedIdx] = useState<Set<number>>(new Set());
  const [isReceiptMode, setIsReceiptMode] = useState<boolean>(true); // affects category mapping
  const cameraRef = useRef<CameraView>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const [isQuickAddExpanded, setQuickAddExpanded] = useState(false);
  const [isVoiceModalVisible, setVoiceModalVisible] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');

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

  const analyzeCapturedImage = async () => {
    if (!capturedImage) return;
    try {
      setIsAnalyzing(true);
      // Convert to base64 data URL for model input
      const base64 = await FileSystem.readAsStringAsync(capturedImage, { encoding: FileSystem.EncodingType.Base64 });
      const dataUrl = `data:image/jpeg;base64,${base64}`;
      const items = await detectItemsFromImage({ imageDataUrl: dataUrl });
      setDetectedItems(items);
      setSelectedIdx(new Set(items.map((_, i) => i))); // preselect all
      const editable = items.map((it) => ({
        name: (it.name || 'Item').trim(),
        quantity: String(it.quantity && it.quantity > 0 ? it.quantity : 1),
        unit: (it.unit as any) || 'pcs',
        category: mapCategory(it.category, (it.name || ''), isReceiptMode),
      }));
      setEditableItems(editable);
    } catch (e) {
      Alert.alert('Vision Error', 'Failed to analyze image. Please try again.');
      console.error('Vision analyze error', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSelect = (i: number) => {
    setSelectedIdx(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const addSelectedToInventory = () => {
    if (!detectedItems) return;
    const now = new Date();
    const expiry = new Date();
    expiry.setDate(now.getDate() + 7);
    detectedItems.forEach((it, idx) => {
      if (!selectedIdx.has(idx)) return;
      const edit = editableItems[idx];
      const item: Omit<InventoryItem, 'id'> = {
        name: edit?.name || it.name || 'Item',
        quantity: Number(edit?.quantity || it.quantity || 1) || 1,
        unit: (edit?.unit as any) || (it.unit as any) || 'pcs',
        category: (edit?.category as ItemCategory) || (mapCategory(it.category, it.name || '', isReceiptMode)) || 'Other',
        addedDate: now.toISOString(),
        expiryDate: expiry.toISOString(),
      };
      addItem(item);
    });
    setDetectedItems(null);
    setCapturedImage(null);
    setSelectedIdx(new Set());
    Alert.alert('Inventory Updated', 'Added selected items to your inventory.');
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
        // Frontend-only phase: open modal with editable transcript.
        // Later we will upload `uri` to backend for transcription.
        setVoiceTranscript('');
        setVoiceModalVisible(true);
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

  if (capturedImage && !detectedItems) {
    return (
      <View style={styles.cameraContainer}>
        <Image source={{ uri: capturedImage }} style={styles.previewImage} />
        <View style={styles.previewActionsContainer}>
          <TouchableOpacity style={styles.previewButton} onPress={() => setCapturedImage(null)}>
            <Text style={styles.previewButtonText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.previewButton} onPress={analyzeCapturedImage} disabled={isAnalyzing}>
            <Text style={styles.previewButtonText}>{isAnalyzing ? 'Analyzing…' : 'Analyze Items'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (capturedImage && detectedItems) {
    return (
      <View style={styles.cameraContainer}>
        <Image source={{ uri: capturedImage }} style={styles.previewImage} />
        <View style={[styles.previewActionsContainer, { flexDirection: 'column', alignItems: 'stretch' }]}> 
          <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 8 }}>
            <Text style={[styles.previewButtonText, { textAlign: 'center' }]}>Detected Items</Text>
          </View>
          <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.96)', borderBottomWidth: 1, borderBottomColor: Colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: Colors.text, fontWeight: '600' }}>Mode</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setIsReceiptMode(true)} style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: isReceiptMode ? Colors.primary : Colors.secondary, borderRadius: 10 }}>
                  <Text style={{ color: isReceiptMode ? Colors.white : Colors.text }}>Receipt</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsReceiptMode(false)} style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: !isReceiptMode ? Colors.primary : Colors.secondary, borderRadius: 10 }}>
                  <Text style={{ color: !isReceiptMode ? Colors.white : Colors.text }}>Items Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <ScrollView style={{ maxHeight: 300, backgroundColor: 'rgba(255,255,255,0.96)' }} contentContainerStyle={{ padding: 12 }}>
            {detectedItems.map((it, idx) => (
              <View key={`det-${idx}`} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
                <TouchableOpacity onPress={() => toggleSelect(idx)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: Colors.primary, backgroundColor: selectedIdx.has(idx) ? Colors.primary : 'transparent', marginRight: 10 }} />
                  <Text style={{ color: Colors.text, fontWeight: '600' }}>{editableItems[idx]?.name || it.name}</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 2 }}>
                    <Text style={{ color: Colors.lightText, marginBottom: 4 }}>Name</Text>
                    <TextInput
                      value={editableItems[idx]?.name}
                      onChangeText={(v) => setEditableItems(prev => prev.map((e, i) => i === idx ? { ...e, name: v } : e))}
                      style={{ backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, color: Colors.text }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: Colors.lightText, marginBottom: 4 }}>Qty</Text>
                    <TextInput
                      keyboardType="numeric"
                      value={editableItems[idx]?.quantity}
                      onChangeText={(v) => setEditableItems(prev => prev.map((e, i) => i === idx ? { ...e, quantity: v.replace(/[^0-9.]/g, '') } : e))}
                      style={{ backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, color: Colors.text }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: Colors.lightText, marginBottom: 4 }}>Unit</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {['pcs','kg','g','l','ml','can','bottle','bunch'].map(u => (
                        <TouchableOpacity key={u} onPress={() => setEditableItems(prev => prev.map((e, i) => i === idx ? { ...e, unit: u } : e))} style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: editableItems[idx]?.unit === u ? Colors.primary : Colors.secondary, borderRadius: 8, marginRight: 6 }}>
                          <Text style={{ color: editableItems[idx]?.unit === u ? Colors.white : Colors.text }}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: Colors.lightText, marginBottom: 4 }}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {(['Produce','Dairy','Meat','Seafood','Frozen','Pantry','Bakery','Beverages','Other'] as ItemCategory[]).map(cat => (
                      <TouchableOpacity key={cat} onPress={() => setEditableItems(prev => prev.map((e, i) => i === idx ? { ...e, category: cat } : e))} style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: editableItems[idx]?.category === cat ? Colors.primary : Colors.secondary, borderRadius: 8, marginRight: 6 }}>
                        <Text style={{ color: editableItems[idx]?.category === cat ? Colors.white : Colors.text }}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            ))}
            {detectedItems.length === 0 && <Text style={{ color: Colors.text }}>No items detected. Try another photo.</Text>}
          </ScrollView>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <TouchableOpacity style={styles.previewButton} onPress={() => { setDetectedItems(null); }}>
              <Text style={styles.previewButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.previewButton} onPress={addSelectedToInventory} disabled={selectedIdx.size === 0}>
              <Text style={styles.previewButtonText}>Add Selected</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.previewButton} onPress={() => { setSelectedIdx(new Set(detectedItems.map((_, i) => i))); addSelectedToInventory(); }} disabled={detectedItems.length === 0}>
              <Text style={styles.previewButtonText}>Add All</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Simple category mapping heuristic
  function mapCategory(cat?: string, name?: string, receiptMode?: boolean): ItemCategory {
    const n = (name || '').toLowerCase();
    const c = (cat || '').toLowerCase();
    const inAny = (s: string, arr: string[]) => arr.some(x => s.includes(x));
    if (inAny(c, ['produce','vegetable','fruit'])) return 'Produce';
    if (inAny(c, ['dairy'])) return 'Dairy';
    if (inAny(c, ['meat','poultry','beef','chicken','pork'])) return 'Meat';
    if (inAny(c, ['seafood','fish','shrimp','salmon','tuna'])) return 'Seafood';
    if (inAny(c, ['frozen'])) return 'Frozen';
    if (inAny(c, ['bakery','bread'])) return 'Bakery';
    if (inAny(c, ['beverage','drink','soda','juice','water'])) return 'Beverages';
    if (inAny(c, ['pantry','dry'])) return 'Pantry';

    if (inAny(n, ['apple','banana','lettuce','tomato','onion','pepper','spinach','carrot','broccoli','herb','cilantro','parsley','avocado'])) return 'Produce';
    if (inAny(n, ['milk','cheese','yogurt','butter','cream'])) return 'Dairy';
    if (inAny(n, ['beef','chicken','pork','turkey','sausage','bacon'])) return 'Meat';
    if (inAny(n, ['salmon','tuna','shrimp','cod','tilapia'])) return 'Seafood';
    if (inAny(n, ['frozen','ice cream','frozen pizza','peas'])) return 'Frozen';
    if (inAny(n, ['bread','bagel','bun','tortilla'])) return 'Bakery';
    if (inAny(n, ['soda','cola','juice','water','coffee','tea','beer','wine'])) return 'Beverages';

    // Receipt mode leans toward Pantry/Beverages
    if (receiptMode) {
      if (inAny(n, ['sauce','pasta','rice','flour','sugar','oil','salt','cereal','beans','canned','can'])) return 'Pantry';
      if (inAny(n, ['soda','juice','water','coffee','tea','beer','wine'])) return 'Beverages';
    }
    return 'Pantry';
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

      {/* Voice Add Modal */}
      <VoiceAddModal
        visible={isVoiceModalVisible}
        initialTranscript={voiceTranscript}
        onClose={() => setVoiceModalVisible(false)}
        onConfirm={(items) => {
          const now = new Date();
          const expiry = new Date();
          expiry.setDate(now.getDate() + 7);
          const toUnit = (u: string): string => (u === 'count' ? 'pcs' : u);
          items.forEach((it) => {
            const item: Omit<InventoryItem, 'id'> = {
              name: it.name || 'Item',
              quantity: Number(it.quantity) || 1,
              unit: toUnit((it.unit as any) || 'pcs') as any,
              category: (it as any).category || mapCategory(undefined, it.name, true),
              addedDate: now.toISOString(),
              expiryDate: expiry.toISOString(),
            };
            addItem(item);
          });
          setVoiceModalVisible(false);
          setVoiceTranscript('');
          Alert.alert('Inventory Updated', 'Added items from voice input.');
        }}
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
            <TouchableOpacity style={styles.quickAddOption} onPress={recorderState.isRecording ? stopRecording : startRecording}>
              <Mic size={20} color={Colors.primary} />
              <Text style={styles.quickAddText}>{recorderState.isRecording ? 'Stop Recording' : 'Voice Note'}</Text>
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
