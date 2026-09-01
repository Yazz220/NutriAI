import { View, StyleSheet } from 'react-native';
import { AlertTriangle, Trash2 } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';
import { getCapturePresentation, getCapturePrimaryActionLabel } from '@/utils/cookbook/capturePresentation';
import { Fonts } from '@/utils/fonts';

interface CaptureActionSheetProps {
  capture: RecipeCapture | null;
  visible: boolean;
  compact?: boolean;
  onClose: () => void;
  onResolve: (capture: RecipeCapture) => void;
  onRemove: (capture: RecipeCapture) => void;
}

export function CaptureActionSheet({
  capture,
  visible,
  compact = false,
  onClose,
  onResolve,
  onRemove,
}: CaptureActionSheetProps) {
  const presentation = capture ? getCapturePresentation(capture) : null;
  const title = capture?.recipeGraph?.title ?? presentation?.title ?? 'Unfinished recipe';

  return (
    <Sheet
      visible={visible && Boolean(capture)}
      onClose={onClose}
      maxHeight={compact ? '52%' : '72%'}
      closeAccessibilityLabel={compact ? 'Close unfinished recipe actions' : 'Close recipe recovery'}
      header={capture ? (
        <Text style={styles.sheetTitle} numberOfLines={2}>{compact ? title : 'Recipe needs attention'}</Text>
      ) : undefined}
    >
      {capture && presentation ? (
        <View style={styles.content}>
          {!compact ? (
            <View style={styles.recoveryCard} accessibilityLiveRegion="polite">
              <View style={styles.icon}>
                <AlertTriangle size={21} color={Colors.error} />
              </View>
              <Text style={styles.title}>{presentation.title}</Text>
              <Text style={styles.detail}>{presentation.detail}</Text>
            </View>
          ) : null}
          <Button
            title={getCapturePrimaryActionLabel(capture)}
            onPress={() => onResolve(capture)}
            fullWidth
          />
          <Button
            title="Remove"
            variant="ghost"
            icon={<Trash2 size={17} color={Colors.error} />}
            onPress={() => onRemove(capture)}
            fullWidth
          />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheetTitle: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: Typography.sizes.lgMd,
  },
  content: { gap: Spacing.sm, paddingBottom: Spacing.sm },
  recoveryCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    padding: Spacing.xl,
  },
  icon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
    backgroundColor: Colors.errorLight,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.xxlMd,
    lineHeight: Typography.metrics.lineHeight29,
    textAlign: 'center',
  },
  detail: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight20,
    textAlign: 'center',
  },
});
