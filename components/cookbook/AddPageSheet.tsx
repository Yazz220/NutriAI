import { Pressable, StyleSheet, View } from 'react-native';
import { ImagePlus, Link, TextCursorInput, Video } from 'lucide-react-native';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { RecipeSourceType } from '@/types/cookbook';

interface AddPageSheetProps {
  visible: boolean;
  cookbookTitle: string;
  onClose: () => void;
  onSelectSource: (sourceType: RecipeSourceType) => void;
}

const OPTIONS: Array<{
  type: RecipeSourceType;
  title: string;
  subtitle: string;
  Icon: typeof Link;
}> = [
  {
    type: 'url',
    title: 'From URL or link',
    subtitle: 'Import from a recipe page',
    Icon: Link,
  },
  {
    type: 'text',
    title: 'Paste text',
    subtitle: 'Use copied ingredients and directions',
    Icon: TextCursorInput,
  },
  {
    type: 'image',
    title: 'Upload image or screenshot',
    subtitle: 'Read a recipe card or saved screenshot',
    Icon: ImagePlus,
  },
  {
    type: 'video',
    title: 'From video link',
    subtitle: 'Extract from a cooking video',
    Icon: Video,
  },
];

export function AddPageSheet({
  visible,
  cookbookTitle,
  onClose,
  onSelectSource,
}: AddPageSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      contentStyle={styles.sheet}
      handleStyle={styles.handle}
      closeButtonStyle={styles.closeButton}
      closeAccessibilityLabel="Close add page sheet"
      header={
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Add page</Text>
          <Text style={styles.title} numberOfLines={2}>
            Add a page to {cookbookTitle}
          </Text>
        </View>
      }
    >
      <View style={styles.options}>
        {OPTIONS.map(({ type, title, subtitle, Icon }) => (
          <Pressable
            key={type}
            style={styles.option}
            onPress={() => onSelectSource(type)}
            accessibilityRole="button"
            accessibilityLabel={title}
          >
            <View style={styles.optionIcon}>
              <Icon size={20} color={Colors.text} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{title}</Text>
              <Text style={styles.optionSubtitle}>{subtitle}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.alabaster,
    borderWidth: 1,
    borderColor: Colors.ash,
    paddingBottom: Spacing.xl,
  },
  handle: {
    backgroundColor: Colors.duskGrey,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Fonts.ui.medium,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 0.6,
  },
  closeButton: {
    backgroundColor: Colors.white,
  },
  options: {
    gap: Spacing.sm,
  },
  option: {
    minHeight: 62,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.skyMist,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: Fonts.ui.medium,
  },
  optionSubtitle: {
    color: Colors.slate,
    fontSize: 12,
    lineHeight: 16,
  },
});
