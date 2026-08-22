import { useEffect, useRef } from 'react';
import { useAui, useAuiState } from '@assistant-ui/react-native';
import {
  isNoshInteractionSession,
  type NoshInteractionSession,
} from '@/types/noshInteraction';

const COLLECTION_SESSION: NoshInteractionSession = {
  entryPoint: 'shelf-nosh',
  task: 'collection',
  focus: { kind: 'collection' },
};

export function NoshInteractionStateSync({
  interaction,
  onRestoreInteraction,
  onThreadChanged,
}: {
  interaction: NoshInteractionSession;
  onRestoreInteraction: (session: NoshInteractionSession) => void;
  onThreadChanged: () => void;
}) {
  const aui = useAui();
  const threadId = useAuiState((state) => state.threadListItem.id);
  const threadStatus = useAuiState((state) => state.threadListItem.status);
  const custom = useAuiState((state) => state.threadListItem.custom);
  const restoredThreadRef = useRef<string | null>(null);
  const restoringInteractionRef = useRef<string | null>(null);

  useEffect(() => {
    if (restoredThreadRef.current === threadId) return;
    if (restoredThreadRef.current !== null) onThreadChanged();
    restoredThreadRef.current = threadId;
    const saved = custom?.noshInteraction;
    if (isNoshInteractionSession(saved)) {
      restoringInteractionRef.current = JSON.stringify(saved);
      onRestoreInteraction(saved);
    } else {
      restoringInteractionRef.current = JSON.stringify(COLLECTION_SESSION);
      onRestoreInteraction(COLLECTION_SESSION);
    }
  }, [custom, onRestoreInteraction, onThreadChanged, threadId]);

  useEffect(() => {
    const thread = aui.threadListItem.getState();
    if (thread.status === 'new') return;
    const current = thread.custom ?? {};
    const interactionJson = JSON.stringify(interaction);
    if (restoringInteractionRef.current) {
      if (restoringInteractionRef.current !== interactionJson) return;
      restoringInteractionRef.current = null;
    }
    if (JSON.stringify(current.noshInteraction) === interactionJson) return;
    aui.threadListItem.updateCustom({ ...current, noshInteraction: interaction });
  }, [aui, interaction, threadId, threadStatus]);

  return null;
}
