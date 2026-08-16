import { describe, it, expect } from 'vitest';
import { resolveCapabilities, hasCapability } from '../CapabilityResolver';
import { DeviceMapping, TelematicsDevice } from '../../../types';

describe('CapabilityResolver', () => {
  it('should default to safe false values when neither mapping nor device provide capabilities', () => {
    const mapping = { capabilities: undefined };
    const resolved = resolveCapabilities(mapping);
    expect(resolved.gps).toBe(false);
    expect(resolved.fuelLevel).toBe(false);
    expect(hasCapability(resolved, 'ignition')).toBe(false);
  });

  it('should use device capabilities when mapping overlay is absent', () => {
    const device: Pick<TelematicsDevice, 'capabilities'> = {
      capabilities: { gps: true, fuelLevel: true } as any,
    };
    const mapping = { capabilities: undefined };
    const resolved = resolveCapabilities(mapping, device);
    
    expect(resolved.gps).toBe(true);
    expect(resolved.fuelLevel).toBe(true);
    expect(resolved.ignition).toBe(false);
  });

  it('should allow mapping capabilities to overlay and override device capabilities', () => {
    const device: Pick<TelematicsDevice, 'capabilities'> = {
      capabilities: { gps: true, fuelLevel: true, ignition: true } as any,
    };
    // The specific installation disables fuelLevel (e.g. sensor broken/unplugged)
    // but enables CAN bus which the device didn't theoretically declare.
    const mapping: Pick<DeviceMapping, 'capabilities'> = { 
      capabilities: { fuelLevel: false, canBus: true }
    };
    
    const resolved = resolveCapabilities(mapping, device);
    
    expect(resolved.gps).toBe(true); // From device
    expect(resolved.ignition).toBe(true); // From device
    expect(resolved.fuelLevel).toBe(false); // Overridden by mapping
    expect(resolved.canBus).toBe(true); // Added by mapping
  });

  it('hasCapability should safely handle numbers and booleans', () => {
    const caps = { digitalInputs: 2, analogInputs: 0, gps: true, eobd: false } as any;
    expect(hasCapability(caps, 'digitalInputs')).toBe(true);
    expect(hasCapability(caps, 'analogInputs')).toBe(false);
    expect(hasCapability(caps, 'gps')).toBe(true);
    expect(hasCapability(caps, 'eobd')).toBe(false);
    // @ts-expect-error Testing unknown capability
    expect(hasCapability(caps, 'unknown_feature')).toBe(false);
  });
});
