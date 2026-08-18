/**
 * TelemetryIngestionService
 * ==========================
 * Orchestrator for the full telemetry ingestion pipeline.
 *
 * Pipeline:
 *   Raw webhook body
 *     -> Provider Adapter (parse to ProviderPayload)
 *     -> DeviceResolver   (external_device_id -> vehicle_id + tenant_id)
 *     -> CapabilityResolver (effective capabilities for this installation)
 *     -> TelemetryNormalizer (ProviderPayload -> NormalizedTelemetryEvent)
 *     -> Persistence (Supabase: positions table + vehicles fault codes)
 *     -> DecisionEngine.evalRuleR1 (alert if Critical fault found)
 *
 * server.ts webhook handler becomes a thin 3-line endpoint:
 *   const result = await telemetryIngestionService.process(req.body, 'flespi');
 *   return res.json(result);
 *
 * This service knows NOTHING about vehicle make/model, device manufacturer,
 * or provider-specific payload structure. Those concerns live in their
 * respective layers (adapter, resolver, normalizer).
 */
import { CanonicalTelemetryEvent, TelematicsProviderType } from '../../types';
import { TelematicsProviderRegistry } from './TelematicsProviderRegistry';
import { resolveDevice } from './DeviceResolver';
import { resolveCapabilities } from './CapabilityResolver';
import { SecurityContext } from '../security/WebhookSecurityService';
import { ReplayProtection } from '../security/ReplayProtection';
import { getSecurityPolicyForProvider } from '../security/WebhookSecurityPolicy';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { DecisionEngine } from '../decisionEngine';
import { logger } from '../../lib/logger';

export interface IngestionResult {
  status: 'success';
  processed: number;
  ignored: number;
  events?: CanonicalTelemetryEvent[];
}

// L'idempotence est désormais gérée strictement par la contrainte UNIQUE 
// de la table telemetry_events sur la colonne event_id.

/**
 * Processes a raw telemetry webhook payload end-to-end.
 *
 * @param body     - Raw request body from the webhook endpoint
 * @param provider - Which cloud provider sent this payload (determines adapter)
 * @returns        - Processing summary
 */
export async function processTelemetryWebhook(
  body: unknown,
  provider: TelematicsProviderType,
  authContext: SecurityContext,
  replayProtection: ReplayProtection = new ReplayProtection()
): Promise<IngestionResult> {
  let processedCount = 0;
  let ignoredCount = 0;
  const events: CanonicalTelemetryEvent[] = [];

  // Step 1: Retrieve adapter from Registry
  let adapter;
  const startTime = Date.now();
  logger.info({ event: 'telemetry_ingestion_started', provider }, 'Telemetry ingestion started');
  try {
    adapter = TelematicsProviderRegistry.get(provider);
  } catch (err: any) {
    logger.error({ event: 'telemetry_ingestion_failed', provider, error: err.message, duration_ms: Date.now() - startTime }, 'Provider adapter not found');
    throw err;
  }

  // Validate payload (optional but good practice)
  if (!adapter.validate(body)) {
    logger.warn({ event: 'telemetry_ingestion_failed', provider, reason: 'payload_validation_failed', duration_ms: Date.now() - startTime }, 'Payload validation failed');
    return { status: 'success', processed: 0, ignored: 1 };
  }

  // Parse payload into intermediate format
  const parsedItems = adapter.parse(body);

  for (const item of parsedItems) {
    if (!item.externalDeviceId) {
      ignoredCount++;
      continue;
    }

    // Le contrôle d'idempotence s'effectue désormais après la normalisation
    // lors de l'insertion dans la table telemetry_events.

    // Step 3: Resolve external_device_id -> vehicle_id + tenant_id
    const resolved = await resolveDevice(item.externalDeviceId, provider);
    if (!resolved) {
      logger.warn({ event: 'telemetry_ingestion_warning', reason: 'unmapped_device', externalDeviceId: item.externalDeviceId }, 'Unmapped device');
      ignoredCount++;
      continue;
    }

    const { vehicle_id, tenant_id, mapping } = resolved;

    // Step 4: Resolve effective capabilities for this installation
    const capabilities = resolveCapabilities(mapping);

    // Step 5: Normalize into CanonicalTelemetryEvent via Adapter
    const event = adapter.normalize(item.parsedData, {
      vehicleId: vehicle_id,
      tenantId: tenant_id,
      deviceId: mapping.device_id,
      capabilities,
    });

    // Step 5.1: Timestamp Validation & Replay Protection
    const policy = getSecurityPolicyForProvider(provider);
    const timestampMs = new Date(event.timestamp).getTime();
    
    // Ensure deterministic event_id for replay/idempotency
    if (!event.eventId) {
      const posHash = event.position ? Math.round(event.position.latitude * 10000) : 'nopos';
      event.eventId = `${provider}_${mapping.device_id}_${timestampMs}_${posHash}`;
    }

    if (!replayProtection.isTimestampValid(timestampMs, policy)) {
      logger.warn({ event: 'telemetry_ingestion_warning', reason: 'timestamp_out_of_bounds', eventId: event.eventId }, 'Timestamp out of bounds');
      ignoredCount++;
      continue;
    }
    const replayDecision = await replayProtection.checkAndStoreEvent(tenant_id, provider, mapping.device_id!, event.eventId as string, policy);
    
    if (!replayDecision.allowed) {
      if (replayDecision.reason === 'SERVICE_UNAVAILABLE') {
        logger.error({ event: 'telemetry_ingestion_failed', reason: 'SECURITY_SERVICE_UNAVAILABLE' }, 'Security service unavailable');
        throw new Error('SECURITY_SERVICE_UNAVAILABLE');
      }
      logger.warn({ event: 'telemetry_ingestion_warning', reason: replayDecision.reason, eventId: event.eventId }, 'Replay rejected');
      ignoredCount++;
      continue;
    }

    // Step 5.2: Cross-Tenant Spoofing Check
    // If the gateway is explicitly scoped to a tenant (e.g. Numilog dedicated gateway),
    // we strictly verify it matches the device's resolved tenant.
    if (authContext.tenantId && authContext.tenantId !== tenant_id) {
      logger.error({ event: 'telemetry_ingestion_failed', reason: 'cross_tenant_spoofing', gatewayScope: authContext.tenantId, deviceOwner: tenant_id }, 'Cross-tenant spoofing rejected');
      ignoredCount++;
      continue;
    }

    // Step 5.5: Idempotency & Audit Log Insertion
    try {
      const { error } = await supabaseAdmin.from('telemetry_events').insert({
        event_id: event.eventId,
        tenant_id,
        vehicle_id,
        provider,
        external_device_id: event.external_device_id,
        event_timestamp: event.timestamp,
        payload: event
      } as any);
      
      if (error) {
        if (error.code === '23505' || error.message.includes('unique_telemetry_event_id')) {
          logger.info({ event: 'telemetry_ingestion_warning', reason: 'duplicate_event', eventId: event.eventId }, 'Ignoring duplicate event ID from DB');
          ignoredCount++;
          continue; // Stop processing this event, it's a duplicate
        }
        throw error;
      }
    } catch (err: any) {
      logger.error({ event: 'db_query_failed', operation: 'insert_telemetry_events', error: err.message }, 'Telemetry event log insert failed');
      // Let BullMQ retry on DB errors
      throw err;
    }

    // Step 6: Persist position to Supabase
    if (event.position) {
      try {
        const positionPayload: any = {
          tenant_id,
          vehicle_id,
          latitude: event.position.latitude,
          longitude: event.position.longitude,
          altitude_m: event.position.altitude ?? null,
          speed_kmh: event.position.speed ?? null,
          heading_deg: event.position.heading ?? null,
          timestamp: event.timestamp,
          data_source: event.data_source,
        };
        await supabaseAdmin.from('positions').insert(positionPayload as never);
      } catch (err: any) {
        logger.error({ event: 'db_query_failed', operation: 'insert_positions', error: err.message }, 'Position persist failed');
        throw err;
      }
    }

    // Step 7: Update vehicle fault codes + trigger Rule R1
    if (event.faults.length > 0) {
      try {
        const { data: currentVehicleData } = await supabaseAdmin
          .from('vehicles')
          .select('*')
          .eq('id', vehicle_id)
          .single();
        const currentVehicle = currentVehicleData as any;

        if (currentVehicle) {
          const r1Result = DecisionEngine.evalRuleR1(currentVehicle, event.faults);
          const updatedStatus = r1Result.isRedAlert ? 'Unsafe / Red' : currentVehicle.status;

          const updatePayload: any = {
            active_fault_codes: event.faults,
            status: updatedStatus,
            status_reason: r1Result.isRedAlert
              ? 'R1 Alert: ' + (r1Result.criticalFaults[0]?.name ?? 'Critical fault detected')
              : currentVehicle.status_reason,
            data_source: event.data_source,
          };

          await supabaseAdmin
            .from('vehicles')
            .update(updatePayload as never)
            .eq('id', vehicle_id);
        }

        // Always save normalized event even if no new faults
        logger.info({ event: 'telemetry_event_normalized', vehicle_id, tenant_id, faults_detected: event.faults.length }, 'Telemetry event normalized');
      } catch (err: any) {
        logger.warn({ event: 'db_query_failed', operation: 'update_vehicles_faults', error: err.message }, 'Vehicle update failed');
        throw err;
      }
    }

    processedCount++;
    events.push(event);
    
    logger.info({ event: 'telemetry_saved', vehicle_id, tenant_id, provider, eventId: event.eventId }, 'Telemetry saved successfully');
  }

  logger.info({ event: 'telemetry_ingestion_completed', processedCount, ignoredCount, duration_ms: Date.now() - startTime }, 'Ingestion completed');
  return { status: 'success', processed: processedCount, ignored: ignoredCount, events };
}
