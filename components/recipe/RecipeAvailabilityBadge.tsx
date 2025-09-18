import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, ShoppingCart } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { RecipeAvailability } from '@/utils/inventoryRecipeMatching';

interface RecipeAvailabilityBadgeProps {
  availability: RecipeAvailability;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
}

function getAvailabilityStatus(availability: RecipeAvailability): {
  status: 'ready' | 'mostly-ready' | 'partial' | 'missing';
  textColor: string;
  backgroundColor: string;
  icon: React.ComponentType<any>;
  label: string;
} {
  const { availabilityPercentage, canCookNow } = availability;
  
  if (canCookNow) {
    return {
      status: 'ready',
      textColor: Colors.onSuccess,
      backgroundColor: Colors.success,
      icon: CheckCircle,
      label: 'Ready to Cook'
    };
  }
  
  if (availabilityPercentage >= 75) {
    return {
      status: 'mostly-ready',
      textColor: Colors.onAccent,
      backgroundColor: Colors.accentPrimary,
      icon: ShoppingCart,
      label: 'Almost Ready'
    };
  }
  
  if (availabilityPercentage >= 25) {
    return {
      status: 'partial',
      textColor: Colors.onAccent,
      backgroundColor: Colors.accentPrimary,
      icon: ShoppingCart,
      label: 'Some Ingredients'
    };
  }
  
  return {
    status: 'missing',
    textColor: Colors.onSurface.high,
    backgroundColor: Colors.gray[200],
    icon: ShoppingCart,
    label: 'Need Ingredients'
  };
}

export const RecipeAvailabilityBadge: React.FC<RecipeAvailabilityBadgeProps> = ({
  availability,
  size = 'medium',
  showDetails = false
}) => {
  const statusInfo = getAvailabilityStatus(availability);
  const Icon = statusInfo.icon;
  
  const sizeStyles = {
    small: {
      container: styles.smallContainer,
      text: styles.smallText,
      icon: 12,
      padding: Spacing.xs,
    },
    medium: {
      container: styles.mediumContainer,
      text: styles.mediumText,
      icon: 14,
      padding: Spacing.sm,
    },
    large: {
      container: styles.largeContainer,
      text: styles.largeText,
      icon: 16,
      padding: Spacing.md,
    }
  };
  
  const currentSize = sizeStyles[size];
  
  return (
    <View style={[
      styles.container,
      currentSize.container,
      { 
        backgroundColor: statusInfo.backgroundColor,
        borderColor: statusInfo.backgroundColor,
        padding: currentSize.padding,
      }
    ]}>
      <View style={styles.mainContent}>
        <Icon size={currentSize.icon} color={statusInfo.textColor} />
        <Text style={[
          styles.label,
          currentSize.text,
          { color: statusInfo.textColor }
        ]}>
          {statusInfo.label}
        </Text>
        <Text style={[
          styles.percentage,
          currentSize.text,
          { color: statusInfo.textColor }
        ]}>
          {availability.availabilityPercentage}%
        </Text>
      </View>
      
      {showDetails && size !== 'small' && (
        <View style={styles.details}>
          <Text style={[styles.detailText, { color: statusInfo.textColor }]}>
            {availability.availableIngredients}/{availability.totalIngredients} ingredients
          </Text>
          
          {/* Expiring details removed */}
          
          {availability.missingIngredients.length > 0 && (
            <Text style={[styles.detailText, { color: statusInfo.textColor }]}>
              {availability.missingIngredients.length} missing
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  smallContainer: {
    borderRadius: 6,
  },
  mediumContainer: {
    borderRadius: 8,
  },
  largeContainer: {
    borderRadius: 10,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontWeight: '600',
    flex: 1,
  },
  smallText: {
    fontSize: 10,
  },
  mediumText: {
    fontSize: 12,
  },
  largeText: {
    fontSize: 14,
  },
  percentage: {
    fontWeight: '700',
  },
  details: {
    marginTop: 4,
    gap: 2,
  },
  detailText: {
    fontSize: 10,
    fontWeight: '500',
  },
});