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
import { NormalizedTelemetryEvent, TelematicsProviderType } from '../../types';
import { parseFlespiWebhookBatch } from './providers/FlespiAdapter';
import { resolveDevice } from './DeviceResolver';
import { resolveCapabilities } from './CapabilityResolver';
import { normalizeTelemetryPayload } from './TelemetryNormalizer';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { DecisionEngine } from '../decisionEngine';

export interface IngestionResult {
  status: 'success';
  processed: number;
  ignored: number;
  events?: NormalizedTelemetryEvent[];
}

/**
 * Processes a raw telemetry webhook payload end-to-end.
 *
 * @param body     - Raw request body from the webhook endpoint
 * @param provider - Which cloud provider sent this payload (determines adapter)
 * @returns        - Processing summary
 */
export async function processTelemetryWebhook(
  body: unknown,
  provider: TelematicsProviderType = 'flespi'
): Promise<IngestionResult> {
  let processedCount = 0;
  let ignoredCount = 0;
  const events: NormalizedTelemetryEvent[] = [];

  // Step 1: Adapt raw payload to standardized ProviderPayload[]
  // Each provider has its own adapter. Add new providers here without touching
  // the normalizer, resolver, or decision engine.
  let payloads;
  switch (provider) {
    case 'flespi':
      payloads = parseFlespiWebhookBatch(body);
      break;
    // Future: case 'wialon': payloads = parseWialonBatch(body); break;
    // Future: case 'direct': payloads = parseTCPBatch(body); break;
    default:
      payloads = parseFlespiWebhookBatch(body); // Fallback to Flespi format
  }

  for (const payload of payloads) {
    if (!payload.external_device_id) {
      ignoredCount++;
      continue;
    }

    // Step 2: Resolve external_device_id -> vehicle_id + tenant_id
    const resolved = await resolveDevice(payload.external_device_id, provider);
    if (!resolved) {
      console.warn('[TelemetryIngestionService] Unmapped device:', payload.external_device_id);
      ignoredCount++;
      continue;
    }

    const { vehicle_id, tenant_id, mapping } = resolved;

    // Step 3: Resolve effective capabilities for this installation
    const capabilities = resolveCapabilities(mapping);

    // Step 4: Normalize into canonical event
    const event = normalizeTelemetryPayload(payload, {
      vehicle_id,
      tenant_id,
      device_id: mapping.device_id,
      capabilities,
    });

    // Step 5: Persist position to Supabase
    if (event.position) {
      try {
        // Table 'positions' sera créée ultérieurement, ce code restera fonctionnel
        const positionPayload: any = {
          tenant_id,
          vehicle_id,
          latitude: event.position.latitude,
          longitude: event.position.longitude,
          altitude_m: event.position.altitude ?? null,
          speed_kmh: event.position.speed ?? null,
          heading_deg: event.position.heading ?? null,
          timestamp: event.timestamp,
          data_source: 'live_telematics',
        };
        await supabaseAdmin.from('positions').insert(positionPayload as never);
      } catch (err) {
        console.warn('[TelemetryIngestionService] Position insert failed:', err);
      }
    }

    // Step 6: Update vehicle fault codes + trigger Rule R1
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
            data_source: 'live_telematics',
          };

          await supabaseAdmin
            .from('vehicles')
            .update(updatePayload as never)
            .eq('id', vehicle_id);
        }
      } catch (err) {
        console.warn('[TelemetryIngestionService] Vehicle update failed:', err);
      }
    }

    events.push(event);
    processedCount++;
  }

  return { status: 'success', processed: processedCount, ignored: ignoredCount, events };
}
