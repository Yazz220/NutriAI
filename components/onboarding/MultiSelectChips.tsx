import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Animated,
} from 'react-native';
import { MagnifyingGlass, X } from 'phosphor-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, Shadows } from '@/constants/spacing';
import { GlassSurface } from '@/components/common/GlassSurface';
import { MultiSelectChipsProps, ChipOption } from '@/types';

export const MultiSelectChips: React.FC<MultiSelectChipsProps> = ({
  options,
  selectedValues,
  onSelectionChange,
  maxSelections,
  searchable = false,
  placeholder = "Search options...",
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [animatedValues] = useState(() => 
    new Map(options.map(option => [option.id, new Animated.Value(1)]))
  );

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    
    const query = searchQuery.toLowerCase();
    return options.filter(option =>
      option.label.toLowerCase().includes(query) ||
      option.value.toLowerCase().includes(query) ||
      option.description?.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // Handle chip selection
  const handleChipPress = (option: ChipOption) => {
    const isSelected = selectedValues.includes(option.value);
    let newSelection: string[];

    if (isSelected) {
      // Remove from selection
      newSelection = selectedValues.filter(value => value !== option.value);
    } else {
      // Add to selection (check max limit)
      if (maxSelections && selectedValues.length >= maxSelections) {
        return; // Don't add if at max limit
      }
      newSelection = [...selectedValues, option.value];
    }

    // Animate the chip
    const animValue = animatedValues.get(option.id);
    if (animValue) {
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }

    onSelectionChange(newSelection);
  };

  // Clear all selections
  const handleClearAll = () => {
    onSelectionChange([]);
  };

  // Render individual chip
  const renderChip = ({ item }: { item: ChipOption }) => {
    const isSelected = selectedValues.includes(item.value);
    const animValue = animatedValues.get(item.id) || new Animated.Value(1);
    
    return (
      <Animated.View
        style={[
          styles.chipContainer,
          { transform: [{ scale: animValue }] },
        ]}
      >
        <GlassSurface
          pressable
          onPress={() => handleChipPress(item)}
          style={[styles.chip, isSelected && styles.chipSelected]}
          padding={Spacing.md}
        >
          {/* Icon */}
          {item.icon && (
            <Text style={[
              styles.chipIcon,
              isSelected && styles.chipIconSelected,
            ]}>
              {item.icon}
            </Text>
          )}
          
          {/* Label */}
          <Text style={[
            styles.chipLabel,
            isSelected && styles.chipLabelSelected,
          ]}>
            {item.label}
          </Text>
        </GlassSurface>
      </Animated.View>
    );
  };

  // Render search bar
  const renderSearchBar = () => {
    if (!searchable) return null;

    return (
      <View style={styles.searchContainer}>
        <GlassSurface padding={Spacing.sm} style={styles.searchInputContainer}>
          <MagnifyingGlass size={16} color={Colors.lightText} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={placeholder}
            placeholderTextColor={Colors.lightText}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchButton}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              <X size={16} color={Colors.lightText} />
            </TouchableOpacity>
          )}
        </GlassSurface>
      </View>
    );
  };

  // Render selection summary
  const renderSelectionSummary = () => {
    if (selectedValues.length === 0) return null;

    return (
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          {selectedValues.length} selected
          {maxSelections && ` of ${maxSelections}`}
        </Text>
        {selectedValues.length > 0 && (
          <TouchableOpacity
            onPress={handleClearAll}
            style={styles.clearAllButton}
            accessibilityLabel="Clear all selections"
            accessibilityRole="button"
          >
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderSearchBar()}
      {renderSelectionSummary()}
      
      <FlatList
        data={filteredOptions}
        renderItem={renderChip}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
        ItemSeparatorComponent={() => <View style={styles.chipSeparator} />}
      />

      {/* Max selections warning */}
      {maxSelections && selectedValues.length >= maxSelections && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            Maximum {maxSelections} selections reached
          </Text>
        </View>
      )}

      {/* No results message */}
      {searchQuery && filteredOptions.length === 0 && (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>
            No options found for "{searchQuery}"
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Search
  searchContainer: {
    marginBottom: Spacing.lg,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.md,
    color: Colors.text,
    paddingVertical: Spacing.xs,
  },
  clearSearchButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },

  // Selection Summary
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  summaryText: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  clearAllButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  clearAllText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },

  // Chips
  chipsContainer: {
    paddingBottom: Spacing.lg,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  chipContainer: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    minHeight: 48,
  },
  chipSelected: {},
  chipIcon: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  chipIconSelected: {},
  chipLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
    textAlign: 'center',
    flex: 1,
  },
  chipLabelSelected: {
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
  },
  chipSeparator: {
    height: Spacing.sm,
  },

  // Warning
  warningContainer: {
    backgroundColor: Colors.warning + '20',
    borderRadius: 8,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  warningText: {
    fontSize: Typography.sizes.sm,
    color: Colors.warning,
    textAlign: 'center',
    fontWeight: Typography.weights.medium,
  },

  // No Results
  noResultsContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: Typography.sizes.md,
    color: Colors.lightText,
    textAlign: 'center',
  },
});