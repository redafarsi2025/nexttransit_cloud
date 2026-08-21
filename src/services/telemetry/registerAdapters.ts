import { TelematicsProviderRegistry } from './TelematicsProviderRegistry';
import { FlespiAdapter } from './providers/FlespiAdapter';
import { ManualEntryAdapter } from './providers/ManualEntryAdapter';
import { TraccarAdapter } from './providers/TraccarAdapter';

// TelematicsProviderRegistry is in-process memory, not shared across the API server and the
// BullMQ worker (two separate Node processes). Each process that needs to look up an adapter
// must register them itself; call this once at startup in every entrypoint that does.
export function registerTelematicsAdapters(): void {
  TelematicsProviderRegistry.register(FlespiAdapter);
  TelematicsProviderRegistry.register(ManualEntryAdapter);
  TelematicsProviderRegistry.register(TraccarAdapter);
}
