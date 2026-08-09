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

const PRIMARY_OPTION: {
  type: RecipeSourceType;
  title: string;
  subtitle: string;
  Icon: typeof Link;
} = {
  type: 'url',
  title: 'Paste a recipe link',
  subtitle: 'Fastest path from a recipe page to your book',
  Icon: Link,
};

const SECONDARY_OPTIONS: Array<{
  type: RecipeSourceType;
  title: string;
  subtitle: string;
  Icon: typeof Link;
}> = [
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
      <Pressable
        style={styles.primaryOption}
        onPress={() => onSelectSource(PRIMARY_OPTION.type)}
        accessibilityRole="button"
        accessibilityLabel={PRIMARY_OPTION.title}
      >
        <View style={styles.primaryIcon}>
          <PRIMARY_OPTION.Icon size={22} color={Colors.onPrimary} />
        </View>
        <View style={styles.optionText}>
          <Text style={styles.primaryTitle}>{PRIMARY_OPTION.title}</Text>
          <Text style={styles.optionSubtitle}>{PRIMARY_OPTION.subtitle}</Text>
        </View>
      </Pressable>

      <Text style={styles.secondaryLabel}>Other ways to add a recipe</Text>
      <View style={styles.options}>
        {SECONDARY_OPTIONS.map(({ type, title, subtitle, Icon }) => (
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
    letterSpacing: 0,
  },
  closeButton: {
    backgroundColor: Colors.white,
  },
  options: {
    gap: Spacing.sm,
  },
  primaryOption: {
    minHeight: 76,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.charcoal,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    boxShadow: Colors.book.cardShadow,
  },
  primaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  primaryTitle: {
    color: Colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.display.semibold,
  },
  secondaryLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Fonts.ui.medium,
    marginTop: Spacing.sm,
  },
  option: {
    minHeight: 62,
    borderRadius: Radii.lg,
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
    backgroundColor: Colors.parchment,
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
