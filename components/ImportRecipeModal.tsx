import React, { useState, useCallback, useEffect } from 'react';
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
  Keyboard,

} from 'react-native';

import { importRecipe } from '@/utils/recipeImport';
import {
  X,
  Link,
  FileText,
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

type ImportMode = 'selection' | 'url' | 'text';

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
  const [keyboardHeight, setKeyboardHeight] = useState(0);


  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

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
      setError('Please enter a recipe URL or text');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Determine import type based on mode
      const importType = mode === 'url' ? 'link' : 'text';
      
      const result = await importRecipe(inputValue, importType, {
        useAI: false,
        includeNutrition: false,
        maxRetries: 1,
      });
      
      if (result.success && result.recipe) {
        onImport(result.recipe);
        handleClose();
      } else {
        throw new Error(result.error || 'Failed to import recipe');
      }
    } catch (err: any) {
      console.error('Import error:', err);
      
      // Provide helpful error messages
      let errorMessage = 'Failed to import recipe. Please try again.';
      if (err.message?.includes('CORS') || err.message?.includes('network')) {
        errorMessage = 'Unable to access this website. Try copying the recipe text instead.';
      } else if (err.message?.includes('not found') || err.message?.includes('404')) {
        errorMessage = 'Recipe not found at this URL. Please check the link and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
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
        onPress={() => handleModeSelect('url')}
      >
        <View style={styles.optionIcon}>
          <Link size={24} color={Colors.text} />
        </View>
        <Text style={styles.optionLabel}>Link</Text>
        <ChevronRight size={20} color={Colors.lightText} />
      </TouchableOpacity>

      <Text style={styles.supportedText}>
        Enter recipe text manually or paste a recipe website link.
        Tap the icon below to paste from clipboard.
      </Text>
    </View>
  );

  const renderInputMode = () => {
    const textMappings = {
      url: {
        placeholder: 'Paste your link here',
        title: 'Add a recipe using a link',
        support: 'We support website, Instagram, TikTok, and YouTube links',
      },
      text: {
        placeholder: 'Paste or type your recipe here',
        title: 'Add a recipe using text',
        support: 'Paste recipe text from any source',
      },
      image: {
        placeholder: 'Paste image URL or select from gallery',
        title: 'Add a recipe using an image',
        support: 'Take a photo of your meal or upload a recipe image. Our AI will identify the food and create a recipe for you.',
      },
      video: {
        placeholder: 'Paste video URL (TikTok, Instagram, YouTube)',
        title: 'Add a recipe using a video',
        support: 'Paste a video link from TikTok, Instagram, or YouTube',
      },
    };

    const currentMapping = textMappings[mode as keyof typeof textMappings] || {
      placeholder: 'Enter your content here',
      title: 'Add a recipe',
      support: 'Enter your recipe content',
    };

    const placeholderText = currentMapping.placeholder;
    const titleText = currentMapping.title;
    const supportText = currentMapping.support;

    return (
      <ScrollView
        contentContainerStyle={styles.inputScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.inputScrollView}
        onScrollBeginDrag={() => Keyboard.dismiss()}
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
            autoFocus={true}
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={[
            styles.modalContent, 
            { 
              paddingBottom: Math.max(insets.bottom + 20, keyboardHeight > 0 ? 20 : insets.bottom + 20),
              maxHeight: keyboardHeight > 0 ? '95%' : '80%'
            },
            mode !== 'selection' && styles.modalContentInput
          ]}>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {mode === 'selection' ? renderSelectionMode() : renderInputMode()}
          </View>
        </KeyboardAvoidingView>
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
  keyboardAvoidingContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  modalContentInput: {
    maxHeight: '90%',
    minHeight: '50%',
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
  inputScrollView: {
    flex: 1,
  },
  inputScrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  inputContainer: {
    flex: 1,
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
    backgroundColor: Colors.background,
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
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text,
  },
  addButton: {
    backgroundColor: Colors.primary,
  },
  addButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },


});
