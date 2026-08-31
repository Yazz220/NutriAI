import { Typography , Spacing} from '@/constants/spacing';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/**
 * Renders a slim banner at the top of the screen when the device is offline.
 * Automatically hides when connectivity is restored.
 */
export function OfflineBanner() {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const insets = useSafeAreaInsets();

  const offline = !isConnected || !isInternetReachable;

  if (!offline) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 4 }]}>
      <WifiOff size={14} color={Colors.text} />
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.values[6],
    paddingBottom: Spacing.values[8],
    backgroundColor: Colors.parchment,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.ash,
  },
  text: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: '500',
  },
});
