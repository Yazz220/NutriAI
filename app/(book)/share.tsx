import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { Check, Clock3, Share2, TriangleAlert } from 'lucide-react-native';
import { FolioHorizontalLockup } from '@/components/brand/NoshBrandAssets';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import { useNoshNativeShare } from '@/contexts/NoshNativeShareContext';
import { Fonts } from '@/utils/fonts';

export default function NativeShareReceiptScreen() {
  const { receipt, retry, setReceipt } = useNoshNativeShare();
  const { resetShareIntent } = useShareIntentContext();

  function finish() {
    setReceipt({ status: 'idle' });
    router.replace('/(book)');
  }

  function cancel() {
    resetShareIntent(true);
    finish();
  }

  return (
    <LinearGradient colors={Colors.book.shelfGradient} style={styles.container}>
      <View style={styles.card} accessibilityLiveRegion="polite">
        <View style={styles.brand} accessibilityElementsHidden>
          <FolioHorizontalLockup width={132} />
        </View>
        {receipt.status === 'saving' ? (
          <>
            <View style={styles.icon}><ActivityIndicator color={Colors.primary} /></View>
            <Text style={styles.title}>Saving your recipe</Text>
            <Text style={styles.copy}>Folio is securing the shared item before page creation begins.</Text>
          </>
        ) : receipt.status === 'saved' ? (
          <>
            <View style={[styles.icon, styles.successIcon]}><Check size={24} color={Colors.onSuccess} /></View>
            <Text style={styles.title}>Recipe saved</Text>
            <Text style={styles.copy}>Page creation will continue in the background.</Text>
            <Button
              title="View progress"
              icon={<Clock3 size={17} color={Colors.onPrimary} />}
              onPress={() => router.replace(`/(book)/save?captureId=${receipt.captureId}`)}
              fullWidth
            />
            <Button title="Done" variant="ghost" onPress={finish} fullWidth />
          </>
        ) : receipt.status === 'failed' ? (
          <>
            <View style={[styles.icon, styles.errorIcon]}><TriangleAlert size={24} color={Colors.error} /></View>
            <Text style={styles.title}>Folio still has the handoff</Text>
            <Text style={styles.copy}>{receipt.message}</Text>
            <Button title="Try saving again" onPress={retry} fullWidth />
            <Button title="Cancel shared item" variant="ghost" onPress={cancel} fullWidth />
          </>
        ) : (
          <>
            <View style={styles.icon}><Share2 size={24} color={Colors.text} /></View>
            <Text style={styles.title}>No shared recipe is waiting</Text>
            <Button title="Open Save a recipe" onPress={() => router.replace('/(book)/save')} fullWidth />
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  card: { width: '100%', maxWidth: 460, alignItems: 'center', gap: Spacing.md, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.ash, backgroundColor: Colors.white, padding: Spacing.xl, boxShadow: Colors.book.liftedShadow },
  brand: { minHeight: 34, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  icon: { width: 52, height: 52, borderRadius: Radii.numeric[26], alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.parchment },
  successIcon: { backgroundColor: Colors.success },
  errorIcon: { backgroundColor: Colors.errorLight },
  title: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: Typography.sizes.xxlMdPlus, lineHeight: Typography.metrics.lineHeight32, textAlign: 'center' },
  copy: { color: Colors.textSecondary, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight20, textAlign: 'center' },
});
