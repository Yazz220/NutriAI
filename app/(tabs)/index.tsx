import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Plus, AlertCircle, Camera as IconCamera, Barcode, Package, TrendingUp, Filter } from 'lucide-react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { useInventory, useInventoryByFreshness } from '@/hooks/useInventoryStore';
import { useShoppingList } from '@/hooks/useShoppingListStore';
import { useToast } from '@/contexts/ToastContext';
import { InventoryItemCard } from '@/components/InventoryItemCard';
import { AddItemModal } from '@/components/AddItemModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { InventoryItem, ItemCategory, ShoppingListItem } from '@/types';
import { detectItemsFromImage, DetectedItem } from '@/utils/visionClient';

// Enhanced Component Definitions
const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <View style={styles.statCard}>
    <View style={styles.statIcon}>{icon}</View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  hero: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    minHeight: 280,
  },
  statusBarSpacer: {
    height: Platform.OS === 'ios' ? 44 : 24,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroTitle: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  inventoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.lightText,
    fontWeight: '500',
    textAlign: 'center',
  },
  searchContainer: {
    marginTop: 10,
  },
  searchInput: {
    marginBottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  expiringSection: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: -10,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  expiringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expiringTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiringTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 8,
  },
  expiringCount: {
    fontSize: 14,
    color: Colors.lightText,
    fontWeight: '500',
  },
  expiringScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  expiringItem: {
    width: 250,
    marginRight: 12,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: Colors.background,
  },
  sectionListContent: {
    paddingBottom: 150,
    paddingTop: 10,
  },
  itemCardContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 50,
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  quickAddContainer: {
    position: 'absolute',
    bottom: 30,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 12,
  },
  quickAddOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickAddText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
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
  const { inventory, isLoading, addItem, removeItem, refresh } = useInventory();
  const { expiring } = useInventoryByFreshness();
  const { addItem: addToShoppingList } = useShoppingList();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ category?: string }>();

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

  const [isQuickAddExpanded, setQuickAddExpanded] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'Other' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refresh?.();
      showToast({ message: 'Inventory refreshed', type: 'info', duration: 1500 });
    } catch (e) {
      console.error(e);
      showToast({ message: 'Refresh failed', type: 'error', duration: 2500 });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Apply category filter from route param on first mount
  useEffect(() => {
    const cat = params?.category;
    if (cat && typeof cat === 'string') {
      // Narrow to known categories else treat as Other
      const known = ['Produce','Dairy','Meat','Seafood','Frozen','Pantry','Bakery','Beverages','Other'] as const;
      const asKnown = known.find(k => k.toLowerCase() === cat.toLowerCase());
      setCategoryFilter((asKnown as ItemCategory | 'Other') ?? 'Other');
    }
  // run only on first render for drill-in behavior
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUseItem = async (item: InventoryItem) => {
    try {
      await removeItem(item.id);
      showToast({ message: `Used up ${item.name}`, type: 'success', duration: 2000 });
      // Prompt to add to shopping list
      Alert.alert(
        'Add to Shopping List?',
        `Would you like to add ${item.name} to your shopping list?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            onPress: async () => {
              try {
                await addToShoppingList({
                  name: item.name,
                  quantity: 1,
                  unit: item.unit || 'pcs',
                  category: item.category || 'Other',
                  addedDate: new Date().toISOString(),
                  checked: false,
                  addedBy: 'system',
                } as Omit<ShoppingListItem, 'id'>);
                showToast({ message: `Added ${item.name} to shopping list`, type: 'success', duration: 1800 });
              } catch (e) {
                console.error(e);
                showToast({ message: 'Failed to add to shopping list', type: 'error', duration: 2500 });
              }
            },
          },
        ]
      );
    } catch (e) {
      console.error(e);
      showToast({ message: 'Failed to update inventory', type: 'error', duration: 2500 });
    }
  };

  const handleAddItem = async (item: Omit<InventoryItem, 'id'>) => {
    try {
      await addItem(item);
      setModalVisible(false);
      showToast({ message: `Added ${item.name}`, type: 'success', duration: 2000 });
    } catch (e) {
      console.error(e);
      showToast({ message: 'Add failed. Please try again.', type: 'error', duration: 2500 });
    }
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

  const addSelectedToInventory = async () => {
    if (!detectedItems) return;
    const now = new Date();
    const expiry = new Date();
    expiry.setDate(now.getDate() + 7);
    try {
      const tasks: Promise<any>[] = [];
      let addedCount = 0;
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
        addedCount += 1;
        tasks.push(addItem(item));
      });
      await Promise.all(tasks);
      setDetectedItems(null);
      setCapturedImage(null);
      setSelectedIdx(new Set());
      showToast({ message: `Added ${addedCount} item(s)`, type: 'success', duration: 2000 });
    } catch (e) {
      console.error(e);
      showToast({ message: 'Some items could not be added', type: 'error', duration: 2500 });
    }
  };

  

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter ? (item.category || 'Other') === categoryFilter : true;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchQuery, categoryFilter]);

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

  // Optional active filter pill (shown above list when filter is active)
  const FilterPill = () => (
    categoryFilter ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8 }}>
        <Text style={{ color: Colors.lightText, marginRight: 8 }}>Filter:</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondary, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: Colors.text, fontWeight: '600' }}>{categoryFilter}</Text>
          <TouchableOpacity onPress={() => setCategoryFilter(null)} style={{ marginLeft: 8 }}>
            <Text style={{ color: Colors.primary, fontWeight: '600' }}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : null
  );

  // Main render
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Enhanced Hero Header */}
      <ExpoLinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.statusBarSpacer} />
        
        {/* Header */}
        <View style={styles.heroHeader}>
          <View style={styles.heroTitleRow}>
            <Package size={28} color={Colors.white} />
            <Text style={styles.heroTitle}>Inventory</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Plus size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.inventoryStats}>
          <StatCard 
            icon={<Package size={20} color="#667eea" />} 
            label="Total Items" 
            value={inventory.length.toString()} 
          />
          <StatCard 
            icon={<AlertCircle size={20} color="#FF6B6B" />} 
            label="Expiring Soon" 
            value={expiring.length.toString()} 
          />
          <StatCard 
            icon={<TrendingUp size={20} color="#4ECDC4" />} 
            label="Categories" 
            value={groupedInventory.length.toString()} 
          />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Input
            placeholder="Search your inventory..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>
      </ExpoLinearGradient>

      <AddItemModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAddItem}
      />

      {/* Enhanced Expiring Section */}
      {expiring.length > 0 && (
        <View style={styles.expiringSection}>
          <View style={styles.expiringHeader}>
            <View style={styles.expiringTitleRow}>
              <AlertCircle size={20} color="#FF6B6B" />
              <Text style={styles.expiringTitle}>Expiring Soon</Text>
            </View>
            <Text style={styles.expiringCount}>{expiring.length} items</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.expiringScroll}>
            {expiring.map(item => (
              <View key={`expiring-${item.id}`} style={styles.expiringItem}>
                <InventoryItemCard item={item} onUseUp={() => handleUseItem(item)} />
              </View>
            ))}
          </ScrollView>
        </View>
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
        showsVerticalScrollIndicator={false}
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          <>
            <FilterPill />
          </>
        }
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
          </View>
        )}
        <TouchableOpacity style={styles.quickAddButton} onPress={() => setQuickAddExpanded(!isQuickAddExpanded)}>
          <Plus size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
