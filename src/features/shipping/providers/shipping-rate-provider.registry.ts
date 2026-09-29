/**
 * Shipping Rate Provider Registry
 *
 * Pluggable registry holding shipping rate and promise providers.
 * Milestone 133 provides the platform rule provider and registry architecture;
 * Milestone 134 registers courier adapters (Pathao, Steadfast, RedX, Paperfly, In-House).
 */

import { IShippingRateProvider } from '../types/shipping-rate.types';
import { RuleBasedShippingRateProvider } from './rule-based-shipping.provider';

export class ShippingRateProviderRegistry {
  private providers = new Map<string, IShippingRateProvider>();

  constructor() {
    // Register authoritative platform rule-based provider by default
    this.registerProvider(new RuleBasedShippingRateProvider());
  }

  /**
   * Registers a shipping rate provider.
   */
  public registerProvider(provider: IShippingRateProvider): void {
    this.providers.set(provider.providerCode.toUpperCase(), provider);
  }

  /**
   * Retrieves provider by provider code, falling back to PLATFORM provider if not found or disabled.
   */
  public getProvider(providerCode?: string): IShippingRateProvider {
    if (providerCode) {
      const found = this.providers.get(providerCode.toUpperCase());
      if (found && found.isEnabled) {
        return found;
      }
    }

    const platformProvider = this.providers.get('PLATFORM');
    if (!platformProvider) {
      const fallback = new RuleBasedShippingRateProvider();
      this.registerProvider(fallback);
      return fallback;
    }

    return platformProvider;
  }

  /**
   * Lists all registered providers and their availability status.
   */
  public listProviders(): Array<{
    code: string;
    name: string;
    isEnabled: boolean;
  }> {
    return Array.from(this.providers.values()).map((p) => ({
      code: p.providerCode,
      name: p.providerName,
      isEnabled: p.isEnabled,
    }));
  }
}

export const shippingRateProviderRegistry = new ShippingRateProviderRegistry();
