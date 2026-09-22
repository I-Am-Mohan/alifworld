/**
 * AlifWorld Seller Store Settings Repository
 * 
 * Manages store profile settings, logistics addresses, and courier preferences.
 * 
 * Reference: docs/architecture/postgresql-and-prisma-foundations.md
 * Invariant: ADR-0003, ADR-0006, ADR-0022, ADR-0024
 */

import { BaseRepository, assertSellerScope } from '@/shared/database/base-repository';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { nextVersion } from '@/shared/database/lifecycle';
import { NotFoundError } from '@/shared/errors/app-error';
import { SellerStoreSettingsModel, AddressData, CourierProvider } from '../types';

export interface UpsertStoreSettingsData {
  logoUrl?: string | null;
  bannerUrl?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  pickupAddress?: AddressData | null;
  returnAddress?: AddressData | null;
  defaultCourier?: CourierProvider | string | null;
  vacationMode?: boolean;
  vacationMessage?: string | null;
  version?: number;
}

export class SellerStoreSettingsRepository extends BaseRepository {
  /**
   * Finds active store settings for a specific seller.
   */
  public async findBySellerId(sellerId: string): Promise<SellerStoreSettingsModel | null> {
    return this.executeSafe(async () => {
      const settings = await (this.db as any).sellerStoreSettings.findFirst({
        where: this.whereSellerScope(sellerId),
      });
      return settings as SellerStoreSettingsModel | null;
    }, 'SellerStoreSettingsRepository.findBySellerId');
  }

  /**
   * Upserts store settings for a seller with optimistic concurrency protection.
   */
  public async upsertSettings(
    sellerId: string,
    data: UpsertStoreSettingsData
  ): Promise<SellerStoreSettingsModel> {
    return this.executeSafe(async () => {
      const existing = await this.findBySellerId(sellerId);

      if (existing) {
        if (data.version !== undefined) {
          this.assertVersion(existing.version, data.version, existing.id);
        }

        const updated = await (this.db as any).sellerStoreSettings.update({
          where: { id: existing.id },
          data: {
            ...data,
            version: nextVersion(existing.version),
          },
        });
        return updated as SellerStoreSettingsModel;
      }

      const id = generateId(ID_PREFIXES.STORE_SETTINGS);
      const created = await (this.db as any).sellerStoreSettings.create({
        data: {
          id,
          sellerId,
          logoUrl: data.logoUrl || null,
          bannerUrl: data.bannerUrl || null,
          supportEmail: data.supportEmail || null,
          supportPhone: data.supportPhone || null,
          pickupAddress: data.pickupAddress ? (data.pickupAddress as any) : null,
          returnAddress: data.returnAddress ? (data.returnAddress as any) : null,
          defaultCourier: data.defaultCourier || null,
          vacationMode: data.vacationMode ?? false,
          vacationMessage: data.vacationMessage || null,
          version: 1,
        },
      });

      return created as SellerStoreSettingsModel;
    }, 'SellerStoreSettingsRepository.upsertSettings');
  }
}
