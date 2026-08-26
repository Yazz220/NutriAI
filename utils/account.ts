import { callAuthenticatedFunction } from '@/utils/supabaseEdge';

export async function deleteAccount(appleAuthorizationCode?: string): Promise<void> {
  await callAuthenticatedFunction('delete-account', {
    ...(appleAuthorizationCode ? { appleAuthorizationCode } : {}),
  });
}
