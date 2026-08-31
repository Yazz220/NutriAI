import {
  classifyUrlDocument,
  classifyUrlResponse,
  urlAcquisitionFailure,
} from './urlRecipeAcquisition.ts';

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
}

Deno.test('classifyUrlResponse separates restricted and unavailable pages', () => {
  assertEquals(classifyUrlResponse(401)?.reasonCode, 'url_access_restricted');
  assertEquals(classifyUrlResponse(403)?.reasonCode, 'url_access_restricted');
  assertEquals(classifyUrlResponse(429)?.reasonCode, 'url_access_restricted');
  assertEquals(classifyUrlResponse(404)?.reasonCode, 'url_unavailable');
  assertEquals(classifyUrlResponse(503)?.reasonCode, 'url_unavailable');
});

Deno.test('classifyUrlResponse rejects oversized and unsupported responses before reading them', () => {
  assertEquals(classifyUrlResponse(200, 'text/html', 1_000_001, 1_000_000)?.reasonCode, 'url_too_large');
  assertEquals(classifyUrlResponse(200, 'application/pdf')?.reasonCode, 'url_source_unsupported');
  assertEquals(classifyUrlResponse(200, 'text/html'), null);
});

Deno.test('urlAcquisitionFailure owns a safe diagnostic instead of raw provider text', () => {
  const failure = urlAcquisitionFailure('url_unavailable');
  assertEquals(failure.reasonCode, 'url_unavailable');
  assertEquals(failure.message, 'The recipe page could not be reached.');
});

Deno.test('classifyUrlDocument recognizes a bot challenge without guessing at ordinary pages', () => {
  assertEquals(
    classifyUrlDocument('<title>Just a moment...</title><div id="cf-chl-widget">Verify you are human</div>')?.reasonCode,
    'url_access_restricted',
  );
  assertEquals(classifyUrlDocument('<title>Apple pie</title><p>Enable JavaScript for comments.</p>'), null);
});
