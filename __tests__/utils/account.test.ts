import { deleteAccount } from '@/utils/account';
import { callAuthenticatedFunction } from '@/utils/supabaseEdge';

jest.mock('@/utils/supabaseEdge', () => ({ callAuthenticatedFunction: jest.fn() }));

describe('account deletion', () => {
  it('sends the fresh Apple authorization code to the server-side deletion flow', async () => {
    jest.mocked(callAuthenticatedFunction).mockResolvedValue({ success: true });

    await deleteAccount('single-use-code');

    expect(callAuthenticatedFunction).toHaveBeenCalledWith('delete-account', {
      appleAuthorizationCode: 'single-use-code',
    });
  });
});
