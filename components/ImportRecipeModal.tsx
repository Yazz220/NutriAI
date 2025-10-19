import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import {
  X,
  Link,
  Image as ImageIcon,
  FileText,
  Video,
  ChevronRight,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImportedRecipe } from '@/types/importedRecipe';
import { BlurView } from 'expo-blur';

interface ImportRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  onImport: (recipe: ImportedRecipe) => void;
}

type ImportMode = 'selection' | 'link' | 'text' | 'image' | 'video';

export const ImportRecipeModal: React.FC<ImportRecipeModalProps> = ({
  visible,
  onClose,
  onImport,
}) => {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<ImportMode>('selection');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetModal = useCallback(() => {
    setMode('selection');
    setInputValue('');
    setError(null);
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    resetModal();
    onClose();
  }, [onClose, resetModal]);

  const handleModeSelect = (selectedMode: ImportMode) => {
    setMode(selectedMode);
    setError(null);
  };

  const handleImport = async () => {
    if (!inputValue.trim()) {
      setError('Please enter a valid input');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Import using client-side function for now
      const { importRecipe } = await import('@/utils/recipeImport');
      const result = await importRecipe(inputValue, mode as any);
      
      if (result.success && result.recipe) {
        onImport(result.recipe);
        handleClose();
      } else {
        throw new Error(result.error || 'Failed to import recipe');
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'Failed to import recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderSelectionMode = () => (
    <View style={styles.selectionContainer}>
      <Text style={styles.title}>Add a recipe using</Text>
      
      <TouchableOpacity
        style={styles.optionCard}
        onPress={() => handleModeSelect('text')}
      >
        <View style={styles.optionIcon}>
          <FileText size={24} color={Colors.text} />
        </View>
        <Text style={styles.optionLabel}>Text</Text>
        <ChevronRight size={20} color={Colors.lightText} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionCard}
        onPress={() => handleModeSelect('image')}
      >
        <View style={styles.optionIcon}>
          <ImageIcon size={24} color={Colors.text} />
        </View>
        <Text style={styles.optionLabel}>Image</Text>
        <ChevronRight size={20} color={Colors.lightText} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionCard}
        onPress={() => handleModeSelect('video')}
      >
        <View style={styles.optionIcon}>
          <Video size={24} color={Colors.text} />
        </View>
        <Text style={styles.optionLabel}>Video</Text>
        <ChevronRight size={20} color={Colors.lightText} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionCard}
        onPress={() => handleModeSelect('link')}
      >
        <View style={styles.optionIcon}>
          <Link size={24} color={Colors.text} />
        </View>
        <Text style={styles.optionLabel}>Link</Text>
        <ChevronRight size={20} color={Colors.lightText} />
      </TouchableOpacity>

      <Text style={styles.supportedText}>
        We support website, Instagram, TikTok, and YouTube links. 
        Tap the icon below to paste from clipboard.
      </Text>
    </View>
  );

  const renderInputMode = () => {
    const placeholderText = {
      link: 'Paste your link here',
      text: 'Paste or type your recipe here',
      image: 'Paste image URL or select from gallery',
      video: 'Paste video URL (TikTok, Instagram, YouTube)',
    }[mode];

    const titleText = {
      link: 'Add a recipe using a link',
      text: 'Add a recipe using text',
      image: 'Add a recipe using an image',
      video: 'Add a recipe using a video',
    }[mode];

    const supportText = {
      link: 'We support website, Instagram, TikTok, and YouTube links',
      text: 'Paste recipe text from any source',
      image: 'Upload a photo of a recipe or paste an image URL',
      video: 'Paste a video link from TikTok, Instagram, or YouTube',
    }[mode];

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 48}
        style={styles.keyboardAvoiding}
      >
        <ScrollView
          contentContainerStyle={styles.inputScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setMode('selection')}
            >
              <ChevronRight
                size={24}
                color={Colors.text}
                style={{ transform: [{ rotate: '180deg' }] }}
              />
            </TouchableOpacity>

            <Text style={styles.title}>{titleText}</Text>
            <Text style={styles.supportText}>{supportText}</Text>

            <TextInput
              style={[styles.input, error && styles.inputError]}
              placeholder={placeholderText}
              placeholderTextColor={Colors.lightText}
              value={inputValue}
              onChangeText={setInputValue}
              multiline={mode === 'text'}
              numberOfLines={mode === 'text' ? 6 : 1}
              autoFocus
              textAlignVertical={mode === 'text' ? 'top' : 'center'}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.addButton,
                  (!inputValue.trim() || loading) && styles.buttonDisabled,
                ]}
                onPress={handleImport}
                disabled={!inputValue.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.addButtonText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <BlurView intensity={20} style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {mode === 'selection' ? renderSelectionMode() : renderInputMode()}
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  selectionContainer: {
    paddingBottom: 20,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  inputScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 32,
  },
  inputContainer: {
    paddingBottom: 20,
  },
  title: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionLabel: {
    ...Typography.body,
    color: Colors.text,
    flex: 1,
  },
  supportedText: {
    ...Typography.caption,
    color: Colors.lightText,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
    zIndex: 1,
  },
  supportText: {
    ...Typography.caption,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    ...Typography.body,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    ...Typography.buttonText,
    color: Colors.text,
  },
  addButton: {
    backgroundColor: Colors.primary,
  },
  addButtonText: {
    ...Typography.buttonText,
    color: Colors.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
