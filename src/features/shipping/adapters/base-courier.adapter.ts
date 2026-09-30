/**
 * Base Bangladesh Courier Adapter
 *
 * Provides shared utilities for all Bangladesh courier adapters:
 * 1. E.164 phone normalization via normalizeBangladeshPhone
 * 2. Status canonicalization to ShipmentStatus
 * 3. Bilingual English & Bangla tracking status copy
 * 4. Phone masking for safe customer-facing tracking views
 * 5. BDT poisha formatting
 */

import { CourierCode, ShipmentStatus, TrackingTimelineEventDTO } from '../types/courier.types';
import { normalizeBangladeshPhone } from '@/shared/utils/phone';

export const STATUS_LABELS: Record<
  ShipmentStatus,
  { en: string; bn: string; description: string }
> = {
  PENDING: {
    en: 'Order Confirmed - Awaiting Dispatch',
    bn: 'অর্ডার নিশ্চিত করা হয়েছে - পাঠানোর অপেক্ষায়',
    description: 'Consignment created; waiting for merchant handover to courier.',
  },
  LABEL_CREATED: {
    en: 'Shipping Label Created',
    bn: 'শিপিং লেবেল তৈরি করা হয়েছে',
    description: 'Courier consignment ID and shipping barcode generated.',
  },
  ASSIGNED: {
    en: 'Delivery Rider Assigned',
    bn: 'ডেলি���ারি রাইডার নিয়োগ করা হয়েছে',
    description: 'Shipment assigned to dedicated delivery personnel.',
  },
  PICKED_UP: {
    en: 'Picked Up by Courier',
    bn: 'কুরিয়ার কর্তৃক পিকআপ সম্পন্ন',
    description: 'Parcel collected from merchant warehouse hub.',
  },
  IN_TRANSIT: {
    en: 'In Transit Across Logistics Hubs',
    bn: 'পরিবহনরত (লজিস্টিক হাবের মাধ্যমে)',
    description: 'Parcel moving through sorting hubs towards destination district.',
  },
  OUT_FOR_DELIVERY: {
    en: 'Out for Doorstep Delivery',
    bn: 'ডেলিভারির জন্য বের হয়েছে',
    description: 'Delivery rider is heading to the recipient address.',
  },
  DELIVERED: {
    en: 'Successfully Delivered',
    bn: 'সফলভাবে ডেলিভারি সম্পন্ন',
    description: 'Recipient accepted package and completed payment/verification.',
  },
  FAILED_DELIVERY: {
    en: 'Delivery Attempt Failed',
    bn: 'ডেলিভারি প্রচেষ্টা ব্যর্থ হয়েছে',
    description: 'Recipient was unreachable or delivery rescheduled.',
  },
  RETURNED_TO_SELLER: {
    en: 'Returned to Merchant',
    bn: 'বিক্রেতার কাছে ফেরত এসেছে',
    description: 'Package returned to originating merchant warehouse.',
  },
  CANCELLED: {
    en: 'Shipment Cancelled',
    bn: 'শিপমেন্ট বাতিল করা হয়েছে',
    description: 'Consignment cancelled before courier dispatch.',
  },
};

export abstract class BaseCourierAdapter {
  abstract readonly courierCode: CourierCode;
  abstract readonly courierName: string;

  /**
   * Normalizes an arbitrary Bangladesh phone input into canonical E.164.
   */
  protected normalizePhone(rawPhone: string): string {
    return normalizeBangladeshPhone(rawPhone);
  }

  /**
   * Masks a phone number for customer-facing tracking views (e.g. +88017****1234).
   */
  public maskPhone(phone: string): string {
    try {
      const normalized = this.normalizePhone(phone);
      if (normalized.length >= 10) {
        const prefix = normalized.slice(0, 6); // +88017
        const suffix = normalized.slice(-4); // 1234
        return `${prefix}****${suffix}`;
      }
    } catch {
      // Fallback
    }
    return phone.slice(0, 3) + '****' + phone.slice(-3);
  }

  /**
   * Formats integer poisha into standard BDT currency string.
   */
  public formatBdt(poisha: bigint | number): string {
    const num = typeof poisha === 'bigint' ? Number(poisha) : poisha;
    const bdt = (num / 100).toLocaleString('en-BD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `৳${bdt}`;
  }

  /**
   * Retrieves localized status labels.
   */
  public getStatusLabels(status: ShipmentStatus): { en: string; bn: string } {
    return STATUS_LABELS[status] || { en: status, bn: status };
  }

  /**
   * Generates a deterministic unique tracking timeline event.
   */
  public createEvent(
    status: ShipmentStatus,
    description: string,
    location?: string | null,
    occurredAt?: Date | string,
    carrierPayload?: Record<string, unknown> | null
  ): TrackingTimelineEventDTO {
    const dateStr =
      occurredAt instanceof Date
        ? occurredAt.toISOString()
        : occurredAt || new Date().toISOString();

    return {
      status,
      description,
      location: location || null,
      occurredAt: dateStr,
      carrierPayload: carrierPayload || null,
    };
  }
}
