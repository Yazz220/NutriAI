import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLocalStorageAdapter } from '@assistant-ui/core/react';
import type { RemoteThreadListAdapter } from '@assistant-ui/react-native';
import { createNoshConversationTitle } from '@/utils/cookbook/noshConversationTitle';
import { noshThreadStoragePrefix } from '@/utils/cookbook/noshThreadCleanup';

export function createNoshThreadListAdapter(userId?: string | null): RemoteThreadListAdapter {
  const owner = userId || 'local';
  return createLocalStorageAdapter({
    storage: AsyncStorage,
    prefix: noshThreadStoragePrefix(owner),
    titleGenerator: {
      generateTitle: async (messages) => createNoshConversationTitle(messages),
    },
  });
}
