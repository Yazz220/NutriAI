import { useEffect, useState, useCallback } from 'react';
import * as Network from 'expo-network';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
}

/**
 * Monitors device network connectivity and internet reachability.
 * Polls on mount and re-checks periodically (every 15 s) to detect changes,
 * since expo-network does not provide a real-time listener API.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
  });

  const check = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setStatus({
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable ?? state.isConnected ?? true,
      });
    } catch {
      // If the API throws (e.g. unsupported platform), assume online
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 15_000);
    return () => clearInterval(interval);
  }, [check]);

  return status;
}
