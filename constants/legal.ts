import { APP_WEBSITE } from '@/constants/brand';

export const PRIVACY_POLICY_URL = `${APP_WEBSITE}/privacy.html`;
export const TERMS_OF_USE_URL = `${APP_WEBSITE}/terms.html`;
export const SUPPORT_URL = `${APP_WEBSITE}/support.html`;
export const OPENROUTER_PRIVACY_URL = 'https://openrouter.ai/privacy';
export const ELEVENLABS_PRIVACY_URL = 'https://elevenlabs.io/privacy-policy';
export const SUPADATA_PRIVACY_URL = 'https://supadata.ai/privacy';

const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim();

export function buildSupportContactUrl(subject = 'Folio support', body?: string): string {
  if (!supportEmail) return SUPPORT_URL;

  const params = new URLSearchParams({ subject });
  if (body) params.set('body', body);
  return `mailto:${supportEmail}?${params.toString()}`;
}

export const SUPPORT_CONTACT_URL = buildSupportContactUrl();
