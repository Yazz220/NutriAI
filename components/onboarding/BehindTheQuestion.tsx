import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  ScrollView,
  Pressable
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import LampIcon from '@/assets/icons/Lamp .svg';

interface BehindTheQuestionProps {
  title: string;
  subtitle: string;
  content: Array<{
    title: string;
    description: string;
    reference?: string;
  }>;
  variant?: 'card' | 'icon';
}

export function BehindTheQuestion({ title, subtitle, content, variant = 'icon' }: BehindTheQuestionProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const openModal = () => {
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
  };

  return (
    <>
      {variant === 'card' ? (
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
          }}
        >
          <TouchableOpacity
            style={styles.container}
            onPress={openModal}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            accessibilityLabel={`Learn more about: ${title}`}
            accessibilityHint="Opens detailed explanation"
            accessibilityRole="button"
          >
            <View style={styles.iconContainer}>
              <LampIcon width={42} height={42} color={Colors.primary} />
            </View>
            <Text style={styles.compactTitle}>Why do we ask this?</Text>
            <TouchableOpacity style={styles.moreButton} onPress={openModal}>
              <Text style={styles.moreText}>Learn more</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <Animated.View
          style={{ transform: [{ scale: scaleAnim }] }}
        >
          <TouchableOpacity
            style={styles.iconOnlyButton}
            onPress={openModal}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            accessibilityLabel={`Why do we ask this question?`}
            accessibilityHint={`Opens an explanation about: ${title}`}
            accessibilityRole="button"
          >
            <LampIcon width={36} height={36} color={Colors.primary} />
          </TouchableOpacity>
        </Animated.View>
      )}

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeModal}
              accessibilityLabel="Close explanation"
              accessibilityRole="button"
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalSubtitle}>
              Why do we ask this question?
            </Text>

            {content.map((item, index) => (
              <View key={index} style={styles.contentItem}>
                <Text style={styles.contentNumber}>{index + 1}.</Text>
                <View style={styles.contentTextContainer}>
                  <Text style={styles.contentTitle}>{item.title}</Text>
                  <Text style={styles.contentDescription}>{item.description}</Text>
                  {item.reference && (
                    <Text style={styles.contentReference}>({item.reference})</Text>
                  )}
                </View>
              </View>
            ))}
            
            <View style={styles.modalSpacer} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border + '40',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  iconOnlyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.border + '40',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  iconOnlyEmoji: {
    fontSize: 18,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  icon: {
    fontSize: 16,
  },
  compactTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: Typography.weights.medium,
    color: Colors.lightText,
  },
  moreButton: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  moreText: {
    fontSize: 12,
    fontWeight: Typography.weights.medium,
    color: Colors.primary,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  modalSubtitle: {
    fontSize: 20,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.lg,
    lineHeight: 26,
  },
  contentItem: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    alignItems: 'flex-start',
  },
  contentNumber: {
    fontSize: 15,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  contentTextContainer: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 15,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  contentDescription: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  contentReference: {
    fontSize: 12,
    color: Colors.lightText,
    fontStyle: 'italic',
  },
  modalSpacer: {
    height: Spacing.xl,
  },
});
