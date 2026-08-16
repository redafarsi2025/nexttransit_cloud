import { TelematicsProviderAdapter } from './TelematicsProviderAdapter';
import { TelematicsProviderType } from '../../types';

class TelematicsProviderRegistryClass {
  private adapters: Map<TelematicsProviderType, TelematicsProviderAdapter> = new Map();

  /**
   * Registers a new provider adapter.
   */
  register(adapter: TelematicsProviderAdapter): void {
    if (this.adapters.has(adapter.provider)) {
      console.warn(`[TelematicsProviderRegistry] Overwriting existing adapter for provider: ${adapter.provider}`);
    }
    this.adapters.set(adapter.provider, adapter);
  }

  /**
   * Retrieves a provider adapter by its identifier.
   * Throws an explicit error if the provider is unknown.
   */
  get(provider: TelematicsProviderType): TelematicsProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`[TelematicsProviderRegistry] Unknown or unregistered provider: ${provider}`);
    }
    return adapter;
  }

  /**
   * Checks if a provider adapter is registered.
   */
  has(provider: TelematicsProviderType): boolean {
    return this.adapters.has(provider);
  }

  /**
   * Lists all registered provider identifiers.
   */
  list(): TelematicsProviderType[] {
    return Array.from(this.adapters.keys());
  }
}

export const TelematicsProviderRegistry = new TelematicsProviderRegistryClass();
