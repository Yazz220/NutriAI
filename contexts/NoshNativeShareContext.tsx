import React, { createContext, useContext, useMemo, useState } from 'react';
import type { RecipeSourceType } from '@/types/cookbook';

export type NativeShareReceipt =
  | { status: 'idle' }
  | { status: 'waiting_for_sign_in' }
  | { status: 'saving'; sourceType: RecipeSourceType }
  | { status: 'saved'; sourceType: RecipeSourceType; captureId: string }
  | { status: 'failed'; sourceType?: RecipeSourceType; message: string };

interface NoshNativeShareValue {
  receipt: NativeShareReceipt;
  setReceipt: (receipt: NativeShareReceipt) => void;
  retryToken: number;
  retry: () => void;
}

const NoshNativeShareContext = createContext<NoshNativeShareValue | null>(null);

export function NoshNativeShareProvider({ children }: { children: React.ReactNode }) {
  const [receipt, setReceipt] = useState<NativeShareReceipt>({ status: 'idle' });
  const [retryToken, setRetryToken] = useState(0);
  const value = useMemo<NoshNativeShareValue>(() => ({
    receipt,
    setReceipt,
    retryToken,
    retry: () => setRetryToken((current) => current + 1),
  }), [receipt, retryToken]);
  return <NoshNativeShareContext.Provider value={value}>{children}</NoshNativeShareContext.Provider>;
}

export function useNoshNativeShare(): NoshNativeShareValue {
  const value = useContext(NoshNativeShareContext);
  if (!value) throw new Error('useNoshNativeShare must be used inside NoshNativeShareProvider');
  return value;
}
