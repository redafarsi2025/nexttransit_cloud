import { Request } from 'express';
import { CanonicalTelemetryEvent, TelematicsProviderType } from '../../types';

export type WebhookAuthenticationResult =
  | { authenticated: true }
  | {
      authenticated: false;
      reason:
        | 'MISSING_CREDENTIALS'
        | 'INVALID_CREDENTIALS'
        | 'REPLAY_DETECTED'
        | 'PROVIDER_DISABLED'
        | 'MISCONFIGURED';
    };

export interface TelematicsProviderAdapter {
  /**
   * The canonical identifier for this provider (e.g., 'flespi', 'traccar', 'manual')
   */
  readonly provider: TelematicsProviderType;

  /**
   * Checks if this adapter can handle the given raw payload.
   * Useful for polymorphic webhooks.
   */
  canHandle(payload: unknown): boolean;

  /**
   * Validates that the raw payload matches the expected schema for this provider.
   * Throws an error or returns false if malformed.
   */
  validate(payload: unknown): boolean;

  /**
   * Parses the raw provider payload into a structured intermediate format.
   * Extracts the external_device_id. Returns an array if it's a batch payload.
   */
  parse(payload: unknown): Array<{
    externalDeviceId: string;
    parsedData: any;
  }>;

  /**
   * Normalizes the parsed intermediate data into NextTransit's CanonicalTelemetryEvent.
   * This step is completely isolated from R1-R7 logic.
   * 
   * @param parsedData The single parsed data item returned from `parse()`.
   * @param context Context injected by the ingestion service (tenant, vehicle, etc.).
   */
  normalize(
    parsedData: any,
    context: {
      tenantId: string;
      vehicleId: string;
      deviceId?: string;
      capabilities?: any;
    }
  ): CanonicalTelemetryEvent;

  /**
   * Performs a health check against the provider's API (if applicable)
   * or simply returns true if the adapter is functioning locally.
   */
  healthCheck(): Promise<boolean>;
}
