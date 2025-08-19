import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { SkipForward } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface SkipButtonProps {
  onSkip: () => void;
  disabled?: boolean;
  skipWarning?: string;
  requiresConfirmation?: boolean;
  variant?: 'text' | 'button';
  size?: 'sm' | 'md';
  testID?: string;
}

export const SkipButton: React.FC<SkipButtonProps> = ({
  onSkip,
  disabled = false,
  skipWarning,
  requiresConfirmation = true,
  variant = 'text',
  size = 'md',
  testID,
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSkipPress = () => {
    if (requiresConfirmation && skipWarning) {
      setShowConfirmation(true);
    } else {
      onSkip();
    }
  };

  const handleConfirmSkip = () => {
    setShowConfirmation(false);
    onSkip();
  };

  const handleCancelSkip = () => {
    setShowConfirmation(false);
  };

  if (variant === 'button') {
    return (
      <>
        <Button
          title="Skip"
          onPress={handleSkipPress}
          variant="ghost"
          size={size}
          disabled={disabled}
          icon={<SkipForward size={16} color={Colors.lightText} />}
          testID={testID}
          accessibilityLabel="Skip this step"
          accessibilityHint="Skip the current onboarding step"
        />
        
        {renderConfirmationModal()}
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[
          styles.skipButton,
          styles[size],
          disabled && styles.disabled,
        ]}
        onPress={handleSkipPress}
        disabled={disabled}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel="Skip this step"
        accessibilityHint="Skip the current onboarding step"
      >
        <SkipForward 
          size={size === 'sm' ? 14 : 16} 
          color={disabled ? Colors.gray[400] : Colors.lightText} 
        />
        <Text style={[
          styles.skipText,
          styles[`${size}Text`],
          disabled && styles.disabledText,
        ]}>
          Skip
        </Text>
      </TouchableOpacity>

      {renderConfirmationModal()}
    </>
  );

  function renderConfirmationModal() {
    return (
      <Modal
        visible={showConfirmation}
        onClose={handleCancelSkip}
        title="Skip This Step?"
        size="sm"
        scrollable={false}
      >
        <Text style={styles.warningText}>
          {skipWarning || "You can always complete this step later in your profile settings."}
        </Text>
        
        <Text style={styles.consequenceText}>
          Skipping may limit some personalized features until you provide this information.
        </Text>

        <View style={styles.modalButtons}>
          <Button
            title="Go Back"
            onPress={handleCancelSkip}
            variant="outline"
            size="md"
            style={styles.modalButton}
          />
          <Button
            title="Skip Step"
            onPress={handleConfirmSkip}
            variant="ghost"
            size="md"
            style={styles.modalButton}
          />
        </View>
      </Modal>
    );
  }
};

const styles = StyleSheet.create({
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  sm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  md: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },

  skipText: {
    marginLeft: Spacing.xs,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  smText: {
    fontSize: Typography.sizes.sm,
  },
  mdText: {
    fontSize: Typography.sizes.md,
  },
  disabledText: {
    color: Colors.gray[400],
  },

  // Modal styles
  warningText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    lineHeight: Typography.lineHeights.normal * Typography.sizes.md,
    marginBottom: Spacing.lg,
  },
  consequenceText: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    lineHeight: Typography.lineHeights.normal * Typography.sizes.sm,
    marginBottom: Spacing.xl,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});