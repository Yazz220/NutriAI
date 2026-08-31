import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { jsonError, jsonResponse } from '../_shared/cors.ts';
import { logError, logInfo, logWarn } from '../_shared/log.ts';
import {
  fetchRevenueCatSubscriber,
  findRevenueCatUserIds,
  parseRevenueCatWebhookEnvironment,
  syncRevenueCatSubscriber,
  verifyRevenueCatWebhookAuthorization,
  verifyRevenueCatWebhookSignature,
} from '../_shared/revenueCat.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const REVENUECAT_SECRET_API_KEY = Deno.env.get('REVENUECAT_SECRET_API_KEY') || '';
const WEBHOOK_AUTH_TOKEN = Deno.env.get('REVENUECAT_WEBHOOK_AUTH_TOKEN') || '';
const WEBHOOK_SIGNING_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SIGNING_SECRET') || '';
// App Review and TestFlight use sandbox receipts against the production app.
// Only an explicit emergency kill switch disables verified sandbox snapshots.
const ACCEPT_SANDBOX = Deno.env.get('REVENUECAT_ACCEPT_SANDBOX_EVENTS') !== 'false';
const MAX_WEBHOOK_BYTES = 1_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function completeEvent(eventId: string, status: string, error: string | null = null) {
  const result = await supabaseAdmin
    .schema('nutriai')
    .rpc('complete_revenuecat_webhook_event', {
      p_event_id: eventId,
      p_status: status,
      p_error: error,
    });
  if (result.error) throw result.error;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return jsonError('Method not allowed', 405, req);
  if (!REVENUECAT_SECRET_API_KEY || !WEBHOOK_AUTH_TOKEN || !WEBHOOK_SIGNING_SECRET) {
    return jsonError('Webhook is not configured', 503, req);
  }
  if (!verifyRevenueCatWebhookAuthorization(
    req.headers.get('Authorization'),
    WEBHOOK_AUTH_TOKEN,
  )) {
    return jsonError('Unauthorized', 401, req);
  }

  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_WEBHOOK_BYTES) {
    return jsonError('Payload too large', 413, req);
  }
  if (!(await verifyRevenueCatWebhookSignature(
    rawBody,
    req.headers.get('X-RevenueCat-Webhook-Signature'),
    WEBHOOK_SIGNING_SECRET,
  ))) {
    return jsonError('Invalid webhook signature', 401, req);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody || 'null');
  } catch {
    return jsonError('Invalid webhook payload', 400, req);
  }
  const event = isRecord(payload) && isRecord(payload.event) ? payload.event : null;
  const eventId = event && typeof event.id === 'string' ? event.id : null;
  const eventType = event && typeof event.type === 'string' ? event.type : 'UNKNOWN';
  if (!event || !eventId) return jsonError('Invalid webhook payload', 400, req);
  let environment: 'production' | 'sandbox' | 'unknown';
  try {
    environment = parseRevenueCatWebhookEnvironment(event);
  } catch {
    return jsonError('Invalid webhook environment', 400, req);
  }

  let claimed = false;
  try {
    // The signed raw payload is passed to the RPC only in memory. The database
    // persists its SHA-256 digest for idempotency/audit, not RevenueCat PII.
    const claim = await supabaseAdmin
      .schema('nutriai')
      .rpc('record_revenuecat_webhook_event', {
        p_event_id: eventId,
        p_event_type: eventType,
        p_environment: environment,
        p_payload: payload,
      });
    if (claim.error) throw claim.error;
    claimed = claim.data === true;
    if (!claimed) return jsonResponse({ received: true, duplicate: true });

    if (environment === 'sandbox' && !ACCEPT_SANDBOX) {
      await completeEvent(eventId, 'ignored');
      logInfo('RevenueCat sandbox webhook ignored', { eventId, eventType });
      return jsonResponse({ received: true, ignored: true });
    }

    const userIds = findRevenueCatUserIds(event);
    if (userIds.length === 0) {
      await completeEvent(eventId, 'ignored');
      logWarn('RevenueCat webhook has no Nosh user identity', { eventId, eventType });
      return jsonResponse({ received: true, ignored: true });
    }

    const results = [];
    for (const userId of userIds) {
      const subscriber = await fetchRevenueCatSubscriber(userId, REVENUECAT_SECRET_API_KEY);
      results.push(await syncRevenueCatSubscriber(supabaseAdmin, userId, subscriber, {
        acceptSandbox: ACCEPT_SANDBOX,
      }));
    }
    const allIgnored = results.every((result) => result.ignored);
    await completeEvent(eventId, allIgnored ? 'ignored' : 'processed');
    logInfo('RevenueCat webhook processed', {
      eventId,
      eventType,
      userIds,
      statuses: results.map((result) => result.state.status),
      environments: results.map((result) => result.state.environment),
    });
    return jsonResponse({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    if (claimed) {
      await completeEvent(eventId, 'failed', message.slice(0, 500)).catch(() => undefined);
    }
    logError('RevenueCat webhook processing failed', { eventId, eventType, error: message });
    return jsonError('Webhook processing failed', 500, req);
  }
});
