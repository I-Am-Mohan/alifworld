/**
 * Bangladesh Courier Adapter Registry
 *
 * Central registry holding all configured courier adapters:
 * - PATHAO: Pathao Courier Logistics
 * - STEADFAST: Steadfast Courier Nationwide
 * - REDX: RedX Logistics
 * - PAPERFLY: Paperfly Doorstep Delivery
 * - IN_HOUSE: AlifExpress In-House Fleet
 */

import {
  CourierCode,
  ICourierAdapter,
  CourierInfoDTO,
} from '../types/courier.types';
import { PathaoCourierAdapter } from './pathao.adapter';
import { SteadfastCourierAdapter } from './steadfast.adapter';
import { RedXCourierAdapter } from './redx.adapter';
import { PaperflyCourierAdapter } from './paperfly.adapter';
import { InHouseCourierAdapter } from './in-house.adapter';

export class CourierAdapterRegistry {
  private adapters = new Map<CourierCode, ICourierAdapter>();

  constructor() {
    this.registerAdapter(new PathaoCourierAdapter());
    this.registerAdapter(new SteadfastCourierAdapter());
    this.registerAdapter(new RedXCourierAdapter());
    this.registerAdapter(new PaperflyCourierAdapter());
    this.registerAdapter(new InHouseCourierAdapter());
  }

  public registerAdapter(adapter: ICourierAdapter): void {
    this.adapters.set(adapter.courierCode, adapter);
  }

  /**
   * Retrieves courier adapter by code. Falls back to IN_HOUSE or STEADFAST if code not found.
   */
  public getAdapter(courierCode: CourierCode | string): ICourierAdapter {
    const code = (courierCode || '').toUpperCase() as CourierCode;
    const found = this.adapters.get(code);

    if (found) {
      return found;
    }

    // Fallback based on typical courier availability
    if (code === 'IN_HOUSE') {
      return this.adapters.get('IN_HOUSE')!;
    }

    return this.adapters.get('STEADFAST') || this.adapters.get('IN_HOUSE')!;
  }

  /**
   * Lists all available couriers with readiness and capabilities.
   */
  public listCouriers(): CourierInfoDTO[] {
    return [
      {
        code: 'PATHAO',
        name: 'Pathao Courier Logistics',
        isEnabled: true,
        isConfigured: this.adapters.get('PATHAO')?.isConfigured ?? false,
        supportedZones: ['METRO_DHAKA', 'DHAKA_SUBURBS', 'MAJOR_CITIES'],
        supportsCod: true,
        maxCodLimitPoisha: 5000000,
        maxCodLimitBdtFormatted: '৳50,000.00',
        isFastTrackExpress: true,
        supportsOtpVerification: false,
      },
      {
        code: 'STEADFAST',
        name: 'Steadfast Courier (Nationwide)',
        isEnabled: true,
        isConfigured: this.adapters.get('STEADFAST')?.isConfigured ?? false,
        supportedZones: ['METRO_DHAKA', 'DHAKA_SUBURBS', 'MAJOR_CITIES', 'REMOTE_UPAZILA'],
        supportsCod: true,
        maxCodLimitPoisha: 5000000,
        maxCodLimitBdtFormatted: '৳50,000.00',
        isFastTrackExpress: false,
        supportsOtpVerification: false,
      },
      {
        code: 'REDX',
        name: 'RedX Logistics',
        isEnabled: true,
        isConfigured: this.adapters.get('REDX')?.isConfigured ?? false,
        supportedZones: ['METRO_DHAKA', 'DHAKA_SUBURBS', 'MAJOR_CITIES'],
        supportsCod: true,
        maxCodLimitPoisha: 4000000,
        maxCodLimitBdtFormatted: '৳40,000.00',
        isFastTrackExpress: false,
        supportsOtpVerification: false,
      },
      {
        code: 'PAPERFLY',
        name: 'Paperfly Doorstep Delivery',
        isEnabled: true,
        isConfigured: this.adapters.get('PAPERFLY')?.isConfigured ?? false,
        supportedZones: ['METRO_DHAKA', 'DHAKA_SUBURBS', 'MAJOR_CITIES', 'REMOTE_UPAZILA'],
        supportsCod: true,
        maxCodLimitPoisha: 3000000,
        maxCodLimitBdtFormatted: '৳30,000.00',
        isFastTrackExpress: false,
        supportsOtpVerification: false,
      },
      {
        code: 'IN_HOUSE',
        name: 'AlifExpress In-House Delivery Fleet (Same-Day / Next-Day)',
        isEnabled: true,
        isConfigured: true,
        supportedZones: ['METRO_DHAKA'],
        supportsCod: true,
        maxCodLimitPoisha: 5000000,
        maxCodLimitBdtFormatted: '৳50,000.00',
        isFastTrackExpress: true,
        supportsOtpVerification: true,
      },
    ];
  }
}

export const courierAdapterRegistry = new CourierAdapterRegistry();
