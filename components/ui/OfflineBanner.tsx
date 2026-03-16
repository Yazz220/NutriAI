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
      <WifiOff size={14} color={Colors.onWarning} />
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
    gap: 6,
    paddingBottom: 6,
    backgroundColor: Colors.warningDark,
  },
  text: {
    color: Colors.onWarning,
    fontSize: 13,
    fontWeight: '600',
  },
});
