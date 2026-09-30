/**
 * Cash on Delivery (COD) Risk & Fraud Repository
 *
 * Scoped Prisma queries for blacklist checks, customer RTO calculation, and order velocity.
 */

import { prisma } from '@/shared/database/prisma';
import { CodBlacklistEntryDTO } from '../types/cod-risk.types';

export class CodRiskRepository {
  private db = prisma;

  /**
   * Checks if an identifier (phone, email, IP) is currently on the fraud blacklist.
   */
  public async findActiveBlacklistEntry(
    type: 'PHONE' | 'EMAIL' | 'IP_ADDRESS' | 'DEVICE_FINGERPRINT',
    identifier: string
  ): Promise<any | null> {
    const now = new Date();
    return (this.db as any).codFraudBlacklist.findFirst({
      where: {
        type,
        identifier,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }

  /**
   * Adds or updates a blacklist entry.
   */
  public async addBlacklistEntry(data: {
    type: 'PHONE' | 'EMAIL' | 'IP_ADDRESS' | 'DEVICE_FINGERPRINT';
    identifier: string;
    reason: string;
    severity?: 'BLOCK' | 'OTP_REQUIRED' | 'FLAG';
    addedBy?: string | null;
    expiresAt?: Date | null;
  }): Promise<CodBlacklistEntryDTO> {
    const created = await (this.db as any).codFraudBlacklist.upsert({
      where: {
        type_identifier: {
          type: data.type,
          identifier: data.identifier,
        },
      },
      create: {
        type: data.type,
        identifier: data.identifier,
        reason: data.reason,
        severity: data.severity || 'BLOCK',
        addedBy: data.addedBy || null,
        expiresAt: data.expiresAt || null,
      },
      update: {
        reason: data.reason,
        severity: data.severity || 'BLOCK',
        addedBy: data.addedBy || null,
        expiresAt: data.expiresAt || null,
      },
    });

    return {
      id: created.id,
      type: created.type,
      identifier: created.identifier,
      reason: created.reason,
      severity: created.severity,
      addedBy: created.addedBy,
      expiresAt: created.expiresAt ? new Date(created.expiresAt).toISOString() : null,
      createdAt: created.createdAt.toISOString(),
    };
  }

  /**
   * Removes an identifier from the blacklist.
   */
  public async removeBlacklistEntry(
    type: 'PHONE' | 'EMAIL' | 'IP_ADDRESS' | 'DEVICE_FINGERPRINT',
    identifier: string
  ): Promise<boolean> {
    const result = await (this.db as any).codFraudBlacklist.deleteMany({
      where: { type, identifier },
    });
    return result.count > 0;
  }

  /**
   * Lists blacklist entries with pagination.
   */
  public async listBlacklist(options: {
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: CodBlacklistEntryDTO[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const where = options.type ? { type: options.type } : {};

    const [items, total] = await Promise.all([
      (this.db as any).codFraudBlacklist.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.db as any).codFraudBlacklist.count({ where }),
    ]);

    return {
      items: items.map((i: any) => ({
        id: i.id,
        type: i.type,
        identifier: i.identifier,
        reason: i.reason,
        severity: i.severity,
        addedBy: i.addedBy,
        expiresAt: i.expiresAt ? new Date(i.expiresAt).toISOString() : null,
        createdAt: i.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Analyzes customer order delivery history (completed orders vs returned/refused orders).
   */
  public async getCustomerOrderStats(
    phone: string,
    customerId?: string | null
  ): Promise<{
    totalOrders: number;
    completedOrders: number;
    returnedOrders: number;
    cancelledOrders: number;
    rtoRatePercent: number;
  }> {
    const whereClause: any = {
      deletedAt: null,
      OR: [{ shippingPhone: phone }, ...(customerId ? [{ customerId }] : [])],
    };

    const orders = await (this.db as any).order.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        fulfillmentStatus: true,
      },
    });

    const totalOrders = orders.length;
    let completedOrders = 0;
    let returnedOrders = 0;
    let cancelledOrders = 0;

    for (const ord of orders) {
      if (ord.status === 'COMPLETED' || ord.fulfillmentStatus === 'FULFILLED') {
        completedOrders++;
      } else if (ord.status === 'CANCELLED') {
        cancelledOrders++;
      } else if (ord.fulfillmentStatus === 'RETURNED') {
        returnedOrders++;
      }
    }

    const failedDeliveries = returnedOrders + cancelledOrders;
    const rtoRatePercent = totalOrders > 0 ? Math.round((failedDeliveries / totalOrders) * 100) : 0;

    return {
      totalOrders,
      completedOrders,
      returnedOrders,
      cancelledOrders,
      rtoRatePercent,
    };
  }

  /**
   * Counts active pending COD orders for this phone or customer (velocity control).
   */
  public async countActivePendingCodOrders(
    phone: string,
    customerId?: string | null
  ): Promise<number> {
    const where: any = {
      deletedAt: null,
      status: { in: ['PENDING_PAYMENT', 'PROCESSING', 'CONFIRMED'] },
      paymentStatus: 'UNPAID',
      OR: [{ shippingPhone: phone }, ...(customerId ? [{ customerId }] : [])],
    };

    return (this.db as any).order.count({ where });
  }
}

export const codRiskRepository = new CodRiskRepository();
