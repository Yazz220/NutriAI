import { useEffect } from 'react';
import { retryPendingLocalUserDataPurges } from '@/utils/accountCleanup';

export function LocalUserDataCleanupResume() {
  useEffect(() => {
    void retryPendingLocalUserDataPurges();
  }, []);

  return null;
}
