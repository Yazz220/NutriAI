import type { RecipeEvidenceFailureCode } from './recipeEvidence.ts';

export type UrlRecipeAcquisitionFailureCode = Extract<
  RecipeEvidenceFailureCode,
  'url_unavailable' | 'url_access_restricted' | 'url_source_unsupported' | 'url_too_large'
>;

const READABLE_URL_CONTENT_TYPES = new Set([
  'text/html',
  'application/xhtml+xml',
  'text/plain',
  'application/json',
  'application/ld+json',
]);

const URL_FAILURE_MESSAGES: Record<UrlRecipeAcquisitionFailureCode, string> = {
  url_unavailable: 'The recipe page could not be reached.',
  url_access_restricted: 'The recipe page blocked automated access.',
  url_source_unsupported: 'The URL did not return a readable recipe page.',
  url_too_large: 'The recipe page was too large to read safely.',
};

export class UrlRecipeAcquisitionError extends Error {
  constructor(readonly reasonCode: UrlRecipeAcquisitionFailureCode) {
    super(URL_FAILURE_MESSAGES[reasonCode]);
    this.name = 'UrlRecipeAcquisitionError';
  }
}

export function urlAcquisitionFailure(
  reasonCode: UrlRecipeAcquisitionFailureCode,
): UrlRecipeAcquisitionError {
  return new UrlRecipeAcquisitionError(reasonCode);
}

export function classifyUrlResponse(
  status: number,
  contentType?: string,
  contentLength = 0,
  maxBytes = 1_000_000,
): UrlRecipeAcquisitionError | null {
  if (contentLength > maxBytes) return urlAcquisitionFailure('url_too_large');
  if ([401, 402, 403, 407, 423, 429, 451].includes(status)) {
    return urlAcquisitionFailure('url_access_restricted');
  }
  if (status < 200 || status >= 300) return urlAcquisitionFailure('url_unavailable');

  const normalizedContentType = contentType?.split(';')[0]?.trim().toLowerCase();
  if (normalizedContentType && !READABLE_URL_CONTENT_TYPES.has(normalizedContentType)) {
    return urlAcquisitionFailure('url_source_unsupported');
  }
  return null;
}

export function classifyUrlDocument(html: string): UrlRecipeAcquisitionError | null {
  const sample = html.slice(0, 200_000).toLowerCase();
  const challengeMarker = /cf-chl-|challenge-platform|verify (?:that )?you are human|enable javascript and cookies to continue/.test(sample)
    || /<(?:div|iframe|form)[^>]+(?:g-recaptcha|h-captcha|hcaptcha|captcha-(?:container|widget)|(?:id|class)=["'][^"']*captcha)/.test(sample);
  const accessDeniedPage = /<title[^>]*>\s*(?:access denied|just a moment)/.test(sample);
  return challengeMarker || accessDeniedPage
    ? urlAcquisitionFailure('url_access_restricted')
    : null;
}
