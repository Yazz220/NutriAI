function extractBase64(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`Invalid ${label}`);

  if (!trimmed.toLowerCase().startsWith('data:')) {
    if (trimmed.includes(',')) throw new Error(`Invalid ${label}`);
    return trimmed;
  }

  const dataUrlMatch = trimmed.match(/^data:([^;,]+)?(?:;[^,]*)*;base64,(.*)$/is);
  if (!dataUrlMatch) throw new Error(`Invalid ${label}`);

  const mimeType = dataUrlMatch[1]?.toLowerCase();
  if (label === 'image' && mimeType && !mimeType.startsWith('image/')) {
    throw new Error(`Invalid ${label}`);
  }

  return dataUrlMatch[2] ?? '';
}

export function normalizeBase64Payload(value: string, maxBytes: number, label: string): string {
  const base64 = extractBase64(value, label);
  if (!/^[A-Za-z0-9+/=\s]+$/.test(base64)) {
    throw new Error(`Invalid ${label}`);
  }

  const compact = base64.replace(/\s/g, '');
  if (!compact || compact.length % 4 === 1) {
    throw new Error(`Invalid ${label}`);
  }

  const firstPadding = compact.indexOf('=');
  if (firstPadding !== -1 && !/^=+$/.test(compact.slice(firstPadding))) {
    throw new Error(`Invalid ${label}`);
  }
  if ((compact.match(/=/g)?.length ?? 0) > 2) {
    throw new Error(`Invalid ${label}`);
  }

  const paddingBytes = compact.endsWith('==') ? 2 : compact.endsWith('=') ? 1 : 0;
  const estimatedBytes = Math.floor((compact.length * 3) / 4) - paddingBytes;
  if (estimatedBytes > maxBytes) {
    throw new Error(`${label} is too large`);
  }

  return compact;
}
