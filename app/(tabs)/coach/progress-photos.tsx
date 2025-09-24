import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { Typography as LegacyType } from '@/constants/spacing';
import { Typography as Type } from '@/constants/typography';
import { useProgressPhotos } from '@/hooks/useProgressPhotos';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Images, Trash2, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react-native';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';

const screenWidth = Dimensions.get('window').width;

export default function ProgressPhotosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { photos, addPhoto, removeMany, clearAll, addComparison, comparisons, removeComparison } = useProgressPhotos();
  const [mode, setMode] = useState<'single' | 'compare'>('single');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [compareOpen, setCompareOpen] = useState(false);
  const [comparePair, setComparePair] = useState<{ leftUri: string; rightUri: string } | null>(null);
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const captureRef = useRef<any>(null);
  const [saving, setSaving] = useState(false);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access to add progress photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets?.length) {
      const added = await addPhoto(result.assets[0].uri);
      if (mode === 'compare') {
        if (!leftId) setLeftId(added.id);
        else if (!rightId) setRightId(added.id);
      }
    }
  };

  const takePhoto = async (assign: 'left' | 'right') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets?.length) {
      const added = await addPhoto(result.assets[0].uri);
      if (assign === 'left') setLeftId(added.id); else setRightId(added.id);
    }
  };

  const chooseFromLibrary = async (assign: 'left' | 'right') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets?.length) {
      const added = await addPhoto(result.assets[0].uri);
      if (assign === 'left') setLeftId(added.id); else setRightId(added.id);
    }
  };

  const isSelected = (id: string) => selectedIds.includes(id);
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      // in compare mode limit to 2
      if (mode === 'compare' && prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  const startViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const canDelete = selectedIds.length > 0;
  const selectedPhotos = useMemo(() => photos.filter((p) => selectedIds.includes(p.id)), [photos, selectedIds]);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Images size={80} color={Colors.border} />
      <Text style={styles.emptyTitle}>You don't have any progress photos yet</Text>
      <Text style={styles.emptySubtitle}>
        The Photo Gallery helps you visualize your progress toward your goal â€” sometimes victory is seen in a better look and
        improved body composition, not just on the scale.
      </Text>
    </View>
  );

  const renderSingleGrid = () => (
    <View style={styles.grid}>
      {photos.map((p, idx) => (
        <TouchableOpacity
          key={p.id}
          activeOpacity={0.8}
          onLongPress={() => toggleSelect(p.id)}
          onPress={() => (selectedIds.length > 0 ? toggleSelect(p.id) : startViewer(idx))}
          style={[styles.gridItemWrap, isSelected(p.id) && styles.gridItemSelected]}
        >
          <Image source={{ uri: p.uri }} style={styles.gridItem} resizeMode="cover" />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCompare = () => {
    const left = photos.find(p => p.id === leftId) || null;
    const right = photos.find(p => p.id === rightId) || null;
    const openChooser = (assign: 'left' | 'right') => {
      Alert.alert('Add Photo', 'Choose a source', [
        { text: 'Camera', onPress: () => takePhoto(assign) },
        { text: 'Library', onPress: () => chooseFromLibrary(assign) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    };
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <View style={styles.compareRow}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => openChooser('left')} style={styles.compareTapWrap}>
            {left ? (
              <Image source={{ uri: left.uri }} style={styles.compareImage} />
            ) : (
              <View style={[styles.compareImage, styles.comparePlaceholder, styles.plusCenter]}>
                <Plus size={28} color={Colors.lightText} />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={() => openChooser('right')} style={styles.compareTapWrap}>
            {right ? (
              <Image source={{ uri: right.uri }} style={styles.compareImage} />
            ) : (
              <View style={[styles.compareImage, styles.comparePlaceholder, styles.plusCenter]}>
                <Plus size={28} color={Colors.lightText} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 12, gap: 8 }}>
          <Button
            title="View as Single"
            disabled={!left || !right}
            onPress={() => {
              if (left && right) {
                setComparePair({ leftUri: left.uri, rightUri: right.uri });
                setCompareOpen(true);
              }
            }}
          />
          <Button
            title="Save Comparison"
            disabled={!leftId || !rightId || saving}
            onPress={async () => {
              if (!leftId || !rightId) return;
              try {
                setSaving(true);
                // Save logical pairing
                await addComparison(leftId, rightId);
                // Request permission
                const perm = await MediaLibrary.requestPermissionsAsync();
                if (!perm.granted) {
                  Alert.alert('Permission required', 'Please allow photo access to save the combined image.');
                  return;
                }
                // Ensure we have both images for capture
                if (!left || !right) return;
                // Capture composed view
                const uri = await captureRef.current?.capture?.();
                if (uri) {
                  const asset = await MediaLibrary.createAssetAsync(uri);
                  // Put in album "Nosh Progress"
                  const albumName = 'Nosh Progress';
                  const existing = await MediaLibrary.getAlbumAsync(albumName);
                  if (existing) await MediaLibrary.addAssetsToAlbumAsync([asset], existing, false);
                  else await MediaLibrary.createAlbumAsync(albumName, asset, false);
                  Alert.alert('Saved', 'Combined image saved to your Photos.');
                } else {
                  Alert.alert('Error', 'Unable to create combined image.');
                }
              } catch (e) {
                Alert.alert('Error', 'Failed to save comparison.');
              } finally {
                setSaving(false);
              }
            }}
          />
        </View>

        {/* Hidden composition for capture */}
        {left && right && (
          <View style={{ position: 'absolute', left: -9999, top: 0 }}>
            <ViewShot ref={captureRef} options={{ format: 'png', quality: 1 }}>
              <View style={{ flexDirection: 'row', width: screenWidth, height: Math.round(screenWidth * 0.9), backgroundColor: Colors.background }}>
                <Image source={{ uri: left.uri }} style={{ flex: 1 }} resizeMode="cover" />
                <Image source={{ uri: right.uri }} style={{ flex: 1 }} resizeMode="cover" />
              </View>
            </ViewShot>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '', headerShown: false }} />
      {/* Consistent header with Back only and safe-area padding */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets?.top ?? 0, 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} accessibilityLabel="Back">
          <ChevronLeft size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress Photos</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Mode selector */}
      <View style={styles.segment}>
        <TouchableOpacity style={[styles.segmentBtn, mode === 'single' && styles.segmentActive]} onPress={() => setMode('single')}>
          <Text style={mode === 'single' ? styles.segmentActiveText : styles.segmentText}>View Single Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segmentBtn, mode === 'compare' && styles.segmentActive]} onPress={() => setMode('compare')}>
          <Text style={mode === 'compare' ? styles.segmentActiveText : styles.segmentText}>Side-by-Side</Text>
        </TouchableOpacity>
      </View>

      {/* Delete bar when selection active */}
      {selectedIds.length > 0 && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionText}>{selectedIds.length} selected</Text>
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Delete photos', 'Remove selected photos?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: async () => { await removeMany(selectedIds); setSelectedIds([]); } },
              ]);
            }}
          >
            <Trash2 size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: (insets?.bottom ?? 0) + 220, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        {photos.length === 0 && mode === 'single' ? renderEmpty() : null}
        {mode === 'compare' ? renderCompare() : null}
        {/* Grid is shown in both modes so user can pick photos for compare */}
        {photos.length > 0 ? (
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: Colors.lightText, marginLeft: 0, marginBottom: 6 }}>Library</Text>
            <View style={styles.grid}>
              {photos.map((p, idx) => (
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.8}
                  onLongPress={() => mode === 'single' ? toggleSelect(p.id) : undefined}
                  onPress={() => {
                    if (mode === 'single') {
                      selectedIds.length > 0 ? toggleSelect(p.id) : startViewer(idx);
                    } else {
                      // In compare mode, tapping a library image fills the first empty slot
                      if (!leftId) setLeftId(p.id);
                      else setRightId(p.id);
                    }
                  }}
                  style={[styles.gridItemWrap, (mode === 'single' ? isSelected(p.id) : (p.id === leftId || p.id === rightId)) && styles.gridItemSelected]}
                >
                  <Image source={{ uri: p.uri }} style={styles.gridItem} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {/* Saved Comparisons */}
        {comparisons.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ color: Colors.lightText, marginLeft: 16, marginBottom: 6 }}>Saved Comparisons</Text>
            <View style={styles.comparisonsGrid}>
              {comparisons.map((c) => {
                const left = photos.find(p => p.id === c.leftPhotoId);
                const right = photos.find(p => p.id === c.rightPhotoId);
                if (!left || !right) return null;
                return (
                  <View key={c.id} style={styles.comparisonCard}>
                    <View style={styles.comparisonImages}>
                      <Image source={{ uri: left.uri }} style={styles.comparisonThumb} />
                      <Image source={{ uri: right.uri }} style={styles.comparisonThumb} />
                    </View>
                    <View style={styles.comparisonActions}>
                      <Button title="Load" size="xs" onPress={() => { setMode('compare'); setLeftId(left.id); setRightId(right.id); }} />
                      <Button title="Delete" size="xs" variant="outline" onPress={() => {
                        Alert.alert('Delete comparison', 'Remove this saved comparison?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => removeComparison(c.id) },
                        ]);
                      }} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
        {/* Spacer to avoid overlap with bottom bar */}
        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Bottom Add Photo button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(16, (insets?.bottom ?? 0) + 12), bottom: Math.max(20, (insets?.bottom ?? 0) + 56) } ] }>
        {selectedIds.length > 0 ? (
          <>
            <Button title={`Delete (${selectedIds.length})`} variant="outline" onPress={() => {
              Alert.alert('Delete photos', 'Remove selected photos?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: async () => { await removeMany(selectedIds); setSelectedIds([]); } },
              ]);
            }} />
            <View style={{ height: 8 }} />
            {mode === 'single' && selectedIds.length === 2 && (
              <>
                <Button title="Compare selected" onPress={() => { setMode('compare'); setLeftId(selectedIds[0]); setRightId(selectedIds[1]); setSelectedIds([]); }} />
                <View style={{ height: 8 }} />
              </>
            )}
          </>
        ) : null}
        {mode !== 'compare' && (
          <Button 
            title={photos.length === 0 ? 'Add First Photo' : 'Add Photo'} 
            icon={<ImagePlus size={18} color={Colors.white} />} 
            size="sm"
            onPress={pickPhoto} 
          />
        )}
        {photos.length > 0 && (
          <TouchableOpacity style={{ alignItems: 'center', paddingTop: 8 }}
            onPress={() => {
              Alert.alert('Clear all photos', 'This will remove all progress photos from this device.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear All', style: 'destructive', onPress: () => clearAll() },
              ]);
            }}
          >
            <Text style={{ color: Colors.lightText, fontSize: 12 }}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Fullscreen viewer */}
      <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)}>
        <View style={styles.viewerBackdrop}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerOpen(false)}>
            <X size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.viewerNavLeft}>
            <TouchableOpacity disabled={viewerIndex <= 0} onPress={() => setViewerIndex((i) => Math.max(0, i - 1))}>
              <ChevronLeft size={28} color={viewerIndex <= 0 ? Colors.alpha.white[30] : Colors.white} />
            </TouchableOpacity>
          </View>
          <Image source={{ uri: photos[viewerIndex]?.uri }} style={styles.viewerImage} resizeMode="contain" />
          <View style={styles.viewerNavRight}>
            <TouchableOpacity disabled={viewerIndex >= photos.length - 1} onPress={() => setViewerIndex((i) => Math.min(photos.length - 1, i + 1))}>
              <ChevronRight size={28} color={viewerIndex >= photos.length - 1 ? Colors.alpha.white[30] : Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Side-by-side compare modal (view composed pair) */}
      <Modal visible={compareOpen} transparent animationType="fade" onRequestClose={() => setCompareOpen(false)}>
        <View style={styles.viewerBackdrop}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setCompareOpen(false)}>
            <X size={24} color={Colors.white} />
          </TouchableOpacity>
          {comparePair ? (
            <View style={styles.compareRowModal}>
              <Image source={{ uri: comparePair.leftUri }} style={styles.compareImageModal} resizeMode="contain" />
              <Image source={{ uri: comparePair.rightUri }} style={styles.compareImageModal} resizeMode="contain" />
            </View>
          ) : (
            <Text style={{ color: Colors.white }}>Select two photos to compare</Text>
          )}
        </View>
      </Modal>
    </View>
  );
}

const gap = 10;
const itemSize = (screenWidth - 32 - gap * 2) / 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBtn: { width: 40, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Type.h3, fontSize: 18, color: Colors.text },
  segment: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  segmentBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  segmentText: { ...Type.caption, color: Colors.lightText },
  segmentActive: { backgroundColor: Colors.text },
  segmentActiveText: { ...Type.caption, color: Colors.white },

  emptyState: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 40 },
  emptyTitle: { ...Type.h3, fontSize: 16, marginTop: 16, color: Colors.text, textAlign: 'center' },
  emptySubtitle: { ...Type.caption, marginTop: 8, color: Colors.lightText, textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap, paddingHorizontal: 16, paddingTop: 16 },
  gridItemWrap: { width: itemSize, height: itemSize, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'transparent' },
  gridItemSelected: { borderColor: Colors.primary },
  gridItem: { width: '100%', height: '100%', backgroundColor: Colors.card },

  comparisonsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap, paddingHorizontal: 16 },
  comparisonCard: { width: itemSize * 1.5 + gap, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, backgroundColor: Colors.card, padding: 8 },
  comparisonImages: { flexDirection: 'row', gap: 6 },
  comparisonThumb: { flex: 1, height: itemSize * 0.9, borderRadius: 8, backgroundColor: Colors.background },
  comparisonActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },

  compareRow: { flexDirection: 'row', gap, paddingHorizontal: 16, paddingTop: 16 },
  compareImage: { flex: 1, height: screenWidth * 0.9, borderRadius: 12, backgroundColor: Colors.card },
  comparePlaceholder: { borderWidth: 1, borderColor: Colors.border },
  compareTapWrap: { flex: 1 },
  plusCenter: { alignItems: 'center', justifyContent: 'center' },

  bottomBar: { position: 'absolute', left: 16, right: 16, bottom: 0 },
  selectionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  selectionText: { ...Type.body, color: Colors.text },

  viewerBackdrop: { flex: 1, backgroundColor: Colors.overlay.strong, justifyContent: 'center', alignItems: 'center' },
  viewerImage: { width: screenWidth, height: screenWidth * 1.2 },
  viewerClose: { position: 'absolute', top: 40, right: 20, padding: 8 },
  viewerNavLeft: { position: 'absolute', left: 20, top: '50%' },
  viewerNavRight: { position: 'absolute', right: 20, top: '50%' },
  compareRowModal: { flexDirection: 'row', width: '100%', paddingHorizontal: 16, gap: 10 },
  compareImageModal: { flex: 1, height: screenWidth * 1.1 },
});
