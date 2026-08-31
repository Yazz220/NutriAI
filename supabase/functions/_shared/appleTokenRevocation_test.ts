import {
  exportPKCS8,
  generateKeyPair,
  SignJWT,
} from 'https://esm.sh/jose@5.9.6';
import { revokeAppleAuthorization } from './appleTokenRevocation.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test('Apple authorization code is exchanged and its refresh token is revoked', async () => {
  const { privateKey } = await generateKeyPair('ES256', { extractable: true });
  const privateKeyPem = await exportPKCS8(privateKey);
  const identityToken = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuer('https://appleid.apple.com')
    .setAudience('com.yaz12.nosh')
    .setSubject('apple-user-1')
    .setExpirationTime('5m')
    .sign(privateKey);
  const requests: Array<{ url: string; body: string }> = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    const body = String(init?.body ?? '');
    requests.push({ url: String(url), body });
    if (String(url).endsWith('/auth/token')) {
      return Response.json({ refresh_token: 'refresh-token', id_token: identityToken });
    }
    return new Response(null, { status: 200 });
  }) as typeof fetch;

  await revokeAppleAuthorization({
    authorizationCode: 'single-use-code',
    expectedSubject: 'apple-user-1',
    config: {
      clientId: 'com.yaz12.nosh',
      teamId: 'TEAM123456',
      keyId: 'KEY1234567',
      privateKey: privateKeyPem,
    },
    fetchImpl,
  });

  assert(requests.length === 2, 'Expected token exchange followed by revocation');
  assert(requests[0].body.includes('code=single-use-code'), 'Token exchange must include the code');
  assert(requests[1].body.includes('token=refresh-token'), 'Revocation must include the refresh token');
  assert(requests[1].body.includes('token_type_hint=refresh_token'), 'Revocation must identify the token type');
});
