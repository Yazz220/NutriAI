import { callAuthenticatedFunction } from '@/utils/supabaseEdge';

export async function deleteAccount(): Promise<void> {
  await callAuthenticatedFunction('delete-account', {});
}
