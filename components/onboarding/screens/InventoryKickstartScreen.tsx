import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Scan, Grid3X3, Plus, Check, Package } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, Shadows } from '@/constants/spacing';
import { OnboardingLayout } from '../OnboardingLayout';
import { Button } from '@/components/ui/Button';
import { useOnboarding } from '../OnboardingProvider';
import { useOnboardingNavigation } from '@/hooks/useOnboardingNavigation';
import { useOnboardingAnalytics } from '@/hooks/useOnboardingAnalytics';
import { STARTER_ITEMS, ONBOARDING_STEPS } from '@/constants/onboarding';
import { StarterItem } from '@/types';

type TabType = 'quickpick' | 'scan';

interface QuickPickItemProps {
  item: StarterItem;
  isSelected: boolean;
  onToggle: (item: StarterItem) => void;
}

const QuickPickItem: React.FC<QuickPickItemProps> = ({ item, isSelected, onToggle }) => {
  return (
    <TouchableOpacity
      style={[styles.quickPickItem, isSelected && styles.quickPickItemSelected]}
      onPress={() => onToggle(item)}
      activeOpacity={0.7}
    >
      <View style={styles.quickPickItemContent}>
        <Text style={styles.quickPickItemIcon}>{item.icon}</Text>
        <Text style={[
          styles.quickPickItemName,
          isSelected && styles.quickPickItemNameSelected
        ]}>
          {item.name}
        </Text>
        <Text style={[
          styles.quickPickItemUnit,
          isSelected && styles.quickPickItemUnitSelected
        ]}>
          {item.defaultQuantity} {item.commonUnit}
        </Text>
      </View>
      {isSelected && (
        <View style={styles.selectedIndicator}>
          <Check size={16} color={Colors.white} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export const InventoryKickstartScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('quickpick');
  const [selectedItems, setSelectedItems] = useState<StarterItem[]>([]);
  const [scannedItems, setScannedItems] = useState<string[]>([]);

  const { state, updateUserData } = useOnboarding();
  const { navigateNext, navigateSkip } = useOnboardingNavigation();
  const { trackInventoryItemsAdded, trackUserChoice } = useOnboardingAnalytics();

  // Load existing inventory if any
  useEffect(() => {
    if (state.userData.initialInventory) {
      const existingItems = STARTER_ITEMS.filter(item => 
        state.userData.initialInventory?.includes(item.id)
      );
      setSelectedItems(existingItems);
    }
  }, [state.userData]);

  // Sort starter items by popularity
  const sortedStarterItems = [...STARTER_ITEMS].sort((a, b) => b.popularity - a.popularity);

  const handleQuickPickToggle = (item: StarterItem) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(selected => selected.id === item.id);
      if (isSelected) {
        return prev.filter(selected => selected.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleScanItem = () => {
    // Simulate barcode scanning - in real app this would open camera
    Alert.alert(
      'Barcode Scanner',
      'In a real app, this would open your camera to scan barcodes. For now, we\'ll add a sample item.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Add Sample Item', 
          onPress: () => {
            const sampleItems = ['Milk', 'Bread', 'Bananas', 'Chicken Breast', 'Tomatoes'];
            const randomItem = sampleItems[Math.floor(Math.random() * sampleItems.length)];
            setScannedItems(prev => [...prev, randomItem]);
          }
        }
      ]
    );
  };

  const handleContinue = async () => {
    const allItems = [
      ...selectedItems.map(item => item.id),
      ...scannedItems
    ];

    // Update user data
    updateUserData({
      initialInventory: allItems,
    });

    // Track analytics
    const categories = [...new Set(selectedItems.map(item => item.category))];
    trackInventoryItemsAdded({
      method: activeTab === 'scan' ? 'scan' : 'quickpick',
      itemCount: allItems.length,
      categories,
    });

    trackUserChoice({
      step: 4, // OnboardingStep.INVENTORY_KICKSTART
      choiceType: 'inventory_setup',
      choiceValue: 'continue',
      context: {
        method: activeTab,
        itemCount: allItems.length,
        quickPickCount: selectedItems.length,
        scannedCount: scannedItems.length,
      },
    });

    await navigateNext();
  };

  const handleSkip = async () => {
    trackUserChoice({
      step: 4, // OnboardingStep.INVENTORY_KICKSTART
      choiceType: 'inventory_setup',
      choiceValue: 'skip',
    });

    await navigateSkip();
  };

  const totalItems = selectedItems.length + scannedItems.length;
  const hasItems = totalItems > 0;

  const renderTabButton = (tab: TabType, icon: React.ReactNode, label: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
      onPress={() => setActiveTab(tab)}
    >
      {icon}
      <Text style={[
        styles.tabButtonText,
        activeTab === tab && styles.tabButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderQuickPickTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabDescription}>
        Select common items you typically have at home:
      </Text>
      <FlatList
        data={sortedStarterItems}
        renderItem={({ item }) => (
          <QuickPickItem
            item={item}
            isSelected={selectedItems.some(selected => selected.id === item.id)}
            onToggle={handleQuickPickToggle}
          />
        )}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.quickPickRow}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.quickPickList}
      />
    </View>
  );

  const renderScanTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabDescription}>
        Scan barcodes of items in your pantry:
      </Text>
      
      <TouchableOpacity
        style={styles.scanButton}
        onPress={handleScanItem}
        activeOpacity={0.7}
      >
        <Scan size={32} color={Colors.primary} />
        <Text style={styles.scanButtonText}>Tap to Scan Item</Text>
        <Text style={styles.scanButtonSubtext}>
          Point your camera at a barcode
        </Text>
      </TouchableOpacity>

      {scannedItems.length > 0 && (
        <View style={styles.scannedItemsContainer}>
          <Text style={styles.scannedItemsTitle}>Scanned Items:</Text>
          {scannedItems.map((item, index) => (
            <View key={index} style={styles.scannedItem}>
              <Package size={16} color={Colors.success} />
              <Text style={styles.scannedItemText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.scanTip}>
        <Text style={styles.scanTipText}>
          💡 Tip: You can also manually add items later in the inventory section
        </Text>
      </View>
    </View>
  );

  return (
    <OnboardingLayout
      title={ONBOARDING_STEPS.INVENTORY_KICKSTART.title}
      subtitle={ONBOARDING_STEPS.INVENTORY_KICKSTART.subtitle}
      showProgress={true}
      showSkip={true}
      onSkip={handleSkip}
      skipWarning="Without inventory items, we can't show you which recipes you can make right now. You can add items later."
    >
      <View style={styles.container}>
        {/* Tab Navigation */}
        <View style={styles.tabNavigation}>
          {renderTabButton('quickpick', <Grid3X3 size={20} color={activeTab === 'quickpick' ? Colors.white : Colors.lightText} />, 'Quick Pick')}
          {renderTabButton('scan', <Scan size={20} color={activeTab === 'scan' ? Colors.white : Colors.lightText} />, 'Scan Items')}
        </View>

        {/* Item Counter */}
        {hasItems && (
          <View style={styles.itemCounter}>
            <Text style={styles.itemCounterText}>
              {totalItems} item{totalItems !== 1 ? 's' : ''} added
            </Text>
          </View>
        )}

        {/* Tab Content */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'quickpick' ? renderQuickPickTab() : renderScanTab()}
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <Button
            title={hasItems ? `Continue with ${totalItems} items` : "Skip for Now"}
            onPress={hasItems ? handleContinue : handleSkip}
            variant="primary"
            size="lg"
            fullWidth={true}
            testID="inventory-kickstart-continue-button"
          />
          
          {hasItems && (
            <Button
              title="Skip This Step"
              onPress={handleSkip}
              variant="ghost"
              size="md"
              fullWidth={true}
              style={styles.skipButton}
            />
          )}
        </View>
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Tab Navigation
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: 8,
    gap: Spacing.sm,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.lightText,
  },
  tabButtonTextActive: {
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
  },

  // Item Counter
  itemCounter: {
    backgroundColor: Colors.success + '20',
    borderRadius: 8,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  itemCounterText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.success,
  },

  // Tab Content
  tabContentContainer: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  tabDescription: {
    fontSize: Typography.sizes.md,
    color: Colors.lightText,
    lineHeight: Typography.sizes.md * 1.4,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },

  // Quick Pick
  quickPickList: {
    paddingBottom: Spacing.xxxl,
  },
  quickPickRow: {
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  quickPickItem: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.md,
    marginHorizontal: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
    ...Shadows.sm,
  },
  quickPickItemSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  quickPickItemContent: {
    alignItems: 'center',
  },
  quickPickItemIcon: {
    fontSize: 24,
    marginBottom: Spacing.sm,
  },
  quickPickItemName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  quickPickItemNameSelected: {
    color: Colors.primary,
  },
  quickPickItemUnit: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    textAlign: 'center',
  },
  quickPickItemUnitSelected: {
    color: Colors.primary,
  },
  selectedIndicator: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scan Tab
  scanButton: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.primary + '40',
    borderStyle: 'dashed',
  },
  scanButtonText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  scanButtonSubtext: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
  },

  // Scanned Items
  scannedItemsContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  scannedItemsTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  scannedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  scannedItemText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },

  // Scan Tip
  scanTip: {
    backgroundColor: Colors.info + '20',
    borderRadius: 8,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.info + '40',
  },
  scanTipText: {
    fontSize: Typography.sizes.sm,
    color: Colors.info,
    lineHeight: Typography.sizes.sm * 1.4,
    textAlign: 'center',
  },

  // Bottom Actions
  bottomActions: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  skipButton: {
    marginTop: Spacing.md,
  },
});