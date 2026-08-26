import { importPKCS8, SignJWT } from 'https://esm.sh/jose@5.9.6';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_TOKEN_URL = `${APPLE_ISSUER}/auth/token`;
const APPLE_REVOKE_URL = `${APPLE_ISSUER}/auth/revoke`;

interface AppleTokenConfiguration {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
}

interface AppleTokenResponse {
  refresh_token?: string;
  id_token?: string;
  error?: string;
}

function normalizedPrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, '\n').trim();
}

async function createClientSecret(config: AppleTokenConfiguration): Promise<string> {
  const key = await importPKCS8(normalizedPrivateKey(config.privateKey), 'ES256');
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: config.keyId })
    .setIssuer(config.teamId)
    .setSubject(config.clientId)
    .setAudience(APPLE_ISSUER)
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(key);
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('Apple did not return a valid identity token');
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return JSON.parse(atob(padded)) as Record<string, unknown>;
}

function assertExpectedAppleUser(
  identityToken: string,
  expectedSubject: string,
  clientId: string,
): void {
  const claims = decodeJwtPayload(identityToken);
  const audience = claims.aud;
  const audienceMatches = audience === clientId
    || (Array.isArray(audience) && audience.includes(clientId));
  if (
    claims.iss !== APPLE_ISSUER
    || !audienceMatches
    || claims.sub !== expectedSubject
    || typeof claims.exp !== 'number'
    || claims.exp <= Math.floor(Date.now() / 1000)
  ) {
    throw new Error('Apple authorization does not match the signed-in account');
  }
}

async function readAppleResponse(response: Response, operation: string): Promise<AppleTokenResponse> {
  const body = await response.json().catch(() => ({})) as AppleTokenResponse;
  if (!response.ok) {
    throw new Error(`Apple ${operation} failed: ${body.error ?? `HTTP ${response.status}`}`);
  }
  return body;
}

export async function revokeAppleAuthorization(input: {
  authorizationCode: string;
  expectedSubject: string;
  config: AppleTokenConfiguration;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const clientSecret = await createClientSecret(input.config);
  const tokenResponse = await fetchImpl(APPLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: input.config.clientId,
      client_secret: clientSecret,
      code: input.authorizationCode,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = await readAppleResponse(tokenResponse, 'token exchange');
  if (!tokens.refresh_token || !tokens.id_token) {
    throw new Error('Apple token exchange did not return deletion credentials');
  }

  assertExpectedAppleUser(tokens.id_token, input.expectedSubject, input.config.clientId);

  const revokeResponse = await fetchImpl(APPLE_REVOKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: input.config.clientId,
      client_secret: clientSecret,
      token: tokens.refresh_token,
      token_type_hint: 'refresh_token',
    }),
  });
  await readAppleResponse(revokeResponse, 'token revocation');
}
