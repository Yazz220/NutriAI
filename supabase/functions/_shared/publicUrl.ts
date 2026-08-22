const BLOCKED_HOST_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.lan',
  '.home',
];

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '').replace(/\.$/, '');
}

function parseIpv4(address: string): [number, number, number, number] | null {
  const parts = address.split('.').map((part) => Number(part));
  if (parts.length !== 4) return null;
  if (!parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) return null;
  return parts as [number, number, number, number];
}

export function isBlockedHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return true;
  if (normalized === 'localhost') return true;
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) return true;
  if (normalized.includes(':')) return true;
  if (!normalized.includes('.')) return true;
  if (parseIpv4(normalized)) return true;

  return false;
}

export function isBlockedIpAddress(address: string): boolean {
  const normalized = normalizeHostname(address);

  const ipv4 = parseIpv4(normalized);
  if (ipv4) {
    const [a, b] = ipv4;
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
    return false;
  }

  const mappedIpv4 = normalized.match(/(?:^|:)ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mappedIpv4) return isBlockedIpAddress(mappedIpv4[1]);

  if (normalized === '::' || normalized === '::1') return true;
  if (!normalized.includes(':')) return false;

  const firstSegment = normalized.split(':')[0];
  const firstWord = Number.parseInt(firstSegment || '0', 16);
  if (!Number.isFinite(firstWord)) return false;
  if (firstWord >= 0xfc00 && firstWord <= 0xfdff) return true;
  if (firstWord >= 0xfe80 && firstWord <= 0xfebf) return true;
  if (firstWord >= 0xff00 && firstWord <= 0xffff) return true;

  return false;
}

export function validatePublicHttpUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Invalid URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported');
  }
  if (isBlockedHostname(parsed.hostname)) {
    throw new Error('This URL cannot be imported');
  }
  return parsed;
}

export async function assertPublicDnsHostname(hostname: string): Promise<void> {
  if (isBlockedHostname(hostname)) throw new Error('This URL cannot be imported');

  const [aRecords, aaaaRecords] = await Promise.all([
    Deno.resolveDns(hostname, 'A').catch(() => [] as string[]),
    Deno.resolveDns(hostname, 'AAAA').catch(() => [] as string[]),
  ]);

  const addresses = [...aRecords, ...aaaaRecords];
  if (addresses.length === 0) throw new Error('Could not resolve URL host');
  if (addresses.some(isBlockedIpAddress)) throw new Error('This URL cannot be imported');
}
