/**
 * Delivery Serviceability & Address Validation Domain Service
 *
 * Implements:
 * 1. 8-division Bangladesh administrative hierarchy resolution
 * 2. Zone classification (Metro Dhaka, Dhaka Suburbs, Major Cities, Remote Upazila)
 * 3. Multi-courier capability matching (Pathao, Steadfast, RedX, Paperfly, In-House)
 * 4. Cash on Delivery (COD) risk rules & maximum threshold gating
 * 5. Estimated delivery promise timelines (business days)
 *
 * Invariant: BDT poisha monetary units strictly conserved.
 * Invariant: High-value orders exceeding COD limits require digital prepayment.
 */

import { prisma } from '@/shared/database/prisma';
import {
  BangladeshDivisionCode,
  DeliveryZone,
  CourierProviderCode,
  DeliveryCourierOptionDTO,
  AddressServiceabilityResultDTO,
  GeoDivisionDTO,
  GeoDistrictDTO,
  GeoUpazilaDTO,
} from '../types/serviceability.types';
import { ValidateAddressServiceabilityInput } from '../validators/serviceability.validators';

const BANGLADESH_DIVISIONS: GeoDivisionDTO[] = [
  { code: 'DHAKA', nameEn: 'Dhaka', nameBn: 'ঢাকা', headquarters: 'Dhaka' },
  { code: 'CHITTAGONG', nameEn: 'Chittagong', nameBn: 'চট্ট��্রাম', headquarters: 'Chittagong' },
  { code: 'RAJSHAHI', nameEn: 'Rajshahi', nameBn: 'রাজশাহী', headquarters: 'Rajshahi' },
  { code: 'KHULNA', nameEn: 'Khulna', nameBn: 'খুলনা', headquarters: 'Khulna' },
  { code: 'BARISAL', nameEn: 'Barisal', nameBn: 'বরিশাল', headquarters: 'Barisal' },
  { code: 'SYLHET', nameEn: 'Sylhet', nameBn: 'সিলেট', headquarters: 'Sylhet' },
  { code: 'RANGPUR', nameEn: 'Rangpur', nameBn: 'রংপুর', headquarters: 'Rangpur' },
  { code: 'MYMENSINGH', nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ', headquarters: 'Mymensingh' },
];

const METRO_DHAKA_THANAS = new Set([
  'GULSHAN',
  'BANANI',
  'DHANMONDI',
  'MIRPUR',
  'UTTARA',
  'MOTIJHEEL',
  'TEJGAON',
  'MOHAMMADPUR',
  'BASHUNDHARA',
  'BARIDHARA',
  'LALBAGH',
  'KOTWALI',
  'RAMNA',
  'SHAHBAGH',
  'PALTAN',
  'KHILGAON',
  'BAPPARI',
  'CANTONMENT',
  'BADDA',
  'RAMPURA',
]);

const DHAKA_SUBURB_DISTRICTS = new Set([
  'GAZIPUR',
  'NARAYANGANJ',
  'NARSINGDI',
  'MANIKGANJ',
  'MUNSHIGANJ',
]);

const MAJOR_CITY_DISTRICTS = new Set([
  'CHITTAGONG',
  'SYLHET',
  'RAJSHAHI',
  'KHULNA',
  'BARISAL',
  'RANGPUR',
  'MYMENSINGH',
  'CUMILLA',
  'COX\'S BAZAR',
  'BOGURA',
]);

const MAX_STANDARD_COD_LIMIT_POISHA = 5000000; // ৳50,000.00 maximum COD threshold

export class DeliveryServiceabilityService {
  private db = prisma;

  /**
   * Evaluates address serviceability, calculates delivery promise and returns available couriers.
   */
  public async checkAddressServiceability(
    input: ValidateAddressServiceabilityInput
  ): Promise<AddressServiceabilityResultDTO> {
    const divisionCode = input.division.toUpperCase() as BangladeshDivisionCode;
    const divisionMeta = BANGLADESH_DIVISIONS.find((d) => d.code === divisionCode) || {
      code: divisionCode,
      nameEn: divisionCode,
      nameBn: divisionCode,
      headquarters: divisionCode,
    };

    const districtClean = input.district.trim();
    const upazilaClean = input.upazila ? input.upazila.trim() : null;
    const streetAddress = input.address.trim();

    // 1. Determine Delivery Zone
    const zone = this.determineDeliveryZone(divisionCode, districtClean, upazilaClean);

    // 2. Determine Shipping Rates & Delivery Promise Window
    const isInsideDhaka = divisionCode === 'DHAKA';
    const baseShippingFeePoisha = isInsideDhaka ? 6000 : 12000;

    let estimatedMinDays = 2;
    let estimatedMaxDays = 4;
    let primaryCourier: CourierProviderCode = 'PATHAO';

    if (zone === 'METRO_DHAKA') {
      estimatedMinDays = 1;
      estimatedMaxDays = 2;
      primaryCourier = 'IN_HOUSE';
    } else if (zone === 'DHAKA_SUBURBS') {
      estimatedMinDays = 1;
      estimatedMaxDays = 3;
      primaryCourier = 'PATHAO';
    } else if (zone === 'MAJOR_CITIES') {
      estimatedMinDays = 2;
      estimatedMaxDays = 3;
      primaryCourier = 'STEADFAST';
    } else {
      // REMOTE_UPAZILA
      estimatedMinDays = 3;
      estimatedMaxDays = 5;
      primaryCourier = 'STEADFAST';
    }

    // 3. Build Multi-Courier Capability Options
    const availableCouriers: DeliveryCourierOptionDTO[] = [
      {
        courierCode: 'PATHAO',
        courierName: 'Pathao Courier',
        isAvailable: zone !== 'REMOTE_UPAZILA',
        isCodSupported: true,
        maxCodAmountPoisha: 5000000,
        estimatedDaysMin: zone === 'METRO_DHAKA' ? 1 : 2,
        estimatedDaysMax: zone === 'METRO_DHAKA' ? 2 : 4,
        shippingFeePoisha: baseShippingFeePoisha,
        shippingFeeBdtFormatted: this.formatBdt(baseShippingFeePoisha),
      },
      {
        courierCode: 'STEADFAST',
        courierName: 'Steadfast Courier (Nationwide)',
        isAvailable: true,
        isCodSupported: true,
        maxCodAmountPoisha: 5000000,
        estimatedDaysMin: estimatedMinDays,
        estimatedDaysMax: estimatedMaxDays,
        shippingFeePoisha: baseShippingFeePoisha,
        shippingFeeBdtFormatted: this.formatBdt(baseShippingFeePoisha),
      },
      {
        courierCode: 'REDX',
        courierName: 'RedX Logistics',
        isAvailable: zone !== 'REMOTE_UPAZILA',
        isCodSupported: true,
        maxCodAmountPoisha: 4000000,
        estimatedDaysMin: estimatedMinDays,
        estimatedDaysMax: estimatedMaxDays + 1,
        shippingFeePoisha: baseShippingFeePoisha,
        shippingFeeBdtFormatted: this.formatBdt(baseShippingFeePoisha),
      },
      {
        courierCode: 'PAPERFLY',
        courierName: 'Paperfly Doorstep',
        isAvailable: true,
        isCodSupported: true,
        maxCodAmountPoisha: 3000000,
        estimatedDaysMin: estimatedMinDays + 1,
        estimatedDaysMax: estimatedMaxDays + 1,
        shippingFeePoisha: baseShippingFeePoisha,
        shippingFeeBdtFormatted: this.formatBdt(baseShippingFeePoisha),
      },
    ];

    if (zone === 'METRO_DHAKA') {
      availableCouriers.unshift({
        courierCode: 'IN_HOUSE',
        courierName: 'AlifExpress In-House Fleet (Same-Day / Next-Day)',
        isAvailable: true,
        isCodSupported: true,
        maxCodAmountPoisha: 5000000,
        estimatedDaysMin: 1,
        estimatedDaysMax: 1,
        shippingFeePoisha: baseShippingFeePoisha,
        shippingFeeBdtFormatted: this.formatBdt(baseShippingFeePoisha),
      });
    }

    // 4. Evaluate Cash on Delivery (COD) Rules & High-Value Limits
    const orderSubtotal = input.orderSubtotalPoisha || 0;
    const warnings: string[] = [];
    let isCodAvailable = true;
    let requiresPrepayment = false;

    if (orderSubtotal > MAX_STANDARD_COD_LIMIT_POISHA) {
      isCodAvailable = false;
      requiresPrepayment = true;
      warnings.push(
        `Order value (${this.formatBdt(
          orderSubtotal
        )}) exceeds the maximum Cash on Delivery (COD) threshold of ${this.formatBdt(
          MAX_STANDARD_COD_LIMIT_POISHA
        )}. Digital prepayment required.`
      );
    }

    // Zone labels
    const zoneLabels: Record<DeliveryZone, { en: string; bn: string }> = {
      METRO_DHAKA: { en: 'Metro Dhaka (Fast Track)', bn: 'ঢাকা মেট্রো (দ্রুততম ডেলিভারি)' },
      DHAKA_SUBURBS: { en: 'Dhaka Suburbs', bn: 'ঢাকা উপশহর ও পার্শ্ববর্তী জেলা' },
      MAJOR_CITIES: { en: 'Divisional City Center', bn: 'বিভাগীয় প্রধান শহর' },
      REMOTE_UPAZILA: { en: 'District & Upazila Level', bn: 'জেলা ও উপজেলা পর্যায়' },
    };

    const promiseTextEn = `${estimatedMinDays}-${estimatedMaxDays} Business Days`;
    const promiseTextBn = `${estimatedMinDays}-${estimatedMaxDays} কার্যদিবস`;

    return {
      isServiceable: true,
      normalizedAddress: {
        divisionCode,
        divisionNameEn: divisionMeta.nameEn,
        divisionNameBn: divisionMeta.nameBn,
        districtNameEn: districtClean,
        districtNameBn: districtClean,
        upazilaNameEn: upazilaClean,
        upazilaNameBn: upazilaClean,
        postalCode: input.postalCode || null,
        streetAddress,
      },
      zone,
      zoneLabelEn: zoneLabels[zone].en,
      zoneLabelBn: zoneLabels[zone].bn,
      primaryCourier,
      availableCouriers,
      isCodAvailable,
      maxCodLimitPoisha: MAX_STANDARD_COD_LIMIT_POISHA,
      requiresPrepayment,
      estimatedDeliveryMinDays: estimatedMinDays,
      estimatedDeliveryMaxDays: estimatedMaxDays,
      estimatedDeliveryPromiseTextEn: promiseTextEn,
      estimatedDeliveryPromiseTextBn: promiseTextBn,
      baseShippingFeePoisha,
      baseShippingFeeBdtFormatted: this.formatBdt(baseShippingFeePoisha),
      warnings,
    };
  }

  /**
   * Lists all 8 official administrative divisions of Bangladesh.
   */
  public async listDivisions(): Promise<GeoDivisionDTO[]> {
    try {
      const dbDivs = await (this.db as any).geoDivision.findMany({
        where: { isActive: true },
        orderBy: { nameEn: 'asc' },
      });
      if (dbDivs && dbDivs.length > 0) {
        return dbDivs.map((d: any) => ({
          code: (d.code === 'CHATTOGRAM'
            ? 'CHITTAGONG'
            : d.code === 'BARISHAL'
            ? 'BARISAL'
            : d.code) as BangladeshDivisionCode,
          nameEn: d.nameEn,
          nameBn: d.nameBn,
          headquarters: d.headquarters,
        }));
      }
    } catch {
      // DB fallback
    }

    return BANGLADESH_DIVISIONS;
  }

  /**
   * Lists districts belonging to a division.
   */
  public async listDistricts(
    divisionCode?: BangladeshDivisionCode
  ): Promise<GeoDistrictDTO[]> {
    try {
      let whereClause: any = { isActive: true };
      if (divisionCode) {
        const divUpper = divisionCode.toUpperCase();
        const altCode =
          divUpper === 'CHITTAGONG'
            ? 'CHATTOGRAM'
            : divUpper === 'BARISAL'
            ? 'BARISHAL'
            : divUpper;

        whereClause = {
          isActive: true,
          OR: [{ divisionCode: divUpper }, { divisionCode: altCode }],
        };
      }

      const dbDistricts = await (this.db as any).geoDistrict.findMany({
        where: whereClause,
        orderBy: { nameEn: 'asc' },
      });

      if (dbDistricts && dbDistricts.length > 0) {
        return dbDistricts.map((d: any) => ({
          id: d.id,
          divisionCode: (d.divisionCode === 'CHATTOGRAM'
            ? 'CHITTAGONG'
            : d.divisionCode === 'BARISHAL'
            ? 'BARISAL'
            : d.divisionCode) as BangladeshDivisionCode,
          nameEn: d.nameEn,
          nameBn: d.nameBn,
          postalCodePrefix: d.postalCodePrefix,
        }));
      }
    } catch {
      // Fallback
    }

    return this.getFallbackDistricts(divisionCode);
  }

  /**
   * Lists upazilas / thanas belonging to a district.
   */
  public async listUpazilas(
    districtId?: string,
    districtName?: string
  ): Promise<GeoUpazilaDTO[]> {
    try {
      const dbUpazilas = await (this.db as any).geoUpazila.findMany({
        where: {
          isActive: true,
          ...(districtId ? { districtId } : {}),
          ...(districtName ? { district: { nameEn: { contains: districtName, mode: 'insensitive' } } } : {}),
        },
        orderBy: { nameEn: 'asc' },
      });

      if (dbUpazilas && dbUpazilas.length > 0) {
        return dbUpazilas.map((u: any) => ({
          id: u.id,
          districtId: u.districtId,
          nameEn: u.nameEn,
          nameBn: u.nameBn,
          postalCode: u.postalCode,
          level: u.level,
        }));
      }
    } catch {
      // Fallback
    }

    return this.getFallbackUpazilas(districtName);
  }

  private determineDeliveryZone(
    division: BangladeshDivisionCode,
    district: string,
    upazila?: string | null
  ): DeliveryZone {
    const distUpper = district.toUpperCase();
    const upzUpper = (upazila || '').toUpperCase();

    if (division === 'DHAKA') {
      if (distUpper === 'DHAKA') {
        if (upzUpper && METRO_DHAKA_THANAS.has(upzUpper)) {
          return 'METRO_DHAKA';
        }
        return 'METRO_DHAKA'; // Default Dhaka district
      }
      if (DHAKA_SUBURB_DISTRICTS.has(distUpper)) {
        return 'DHAKA_SUBURBS';
      }
    }

    if (MAJOR_CITY_DISTRICTS.has(distUpper)) {
      return 'MAJOR_CITIES';
    }

    return 'REMOTE_UPAZILA';
  }

  private formatBdt(poisha: bigint | number): string {
    const num = typeof poisha === 'bigint' ? Number(poisha) : poisha;
    const bdt = (num / 100).toLocaleString('en-BD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `৳${bdt}`;
  }

  private getFallbackDistricts(divisionCode?: BangladeshDivisionCode): GeoDistrictDTO[] {
    const sampleDistricts: GeoDistrictDTO[] = [
      { id: 'dist_dhk', divisionCode: 'DHAKA', nameEn: 'Dhaka', nameBn: 'ঢাকা', postalCodePrefix: '12' },
      { id: 'dist_gzp', divisionCode: 'DHAKA', nameEn: 'Gazipur', nameBn: 'গাজীপুর', postalCodePrefix: '17' },
      { id: 'dist_nrn', divisionCode: 'DHAKA', nameEn: 'Narayanganj', nameBn: 'নারায়ণগঞ্জ', postalCodePrefix: '14' },
      { id: 'dist_ctg', divisionCode: 'CHITTAGONG', nameEn: 'Chittagong', nameBn: 'চট্টগ্রাম', postalCodePrefix: '40' },
      { id: 'dist_cxb', divisionCode: 'CHITTAGONG', nameEn: 'Cox\'s Bazar', nameBn: 'কক্সবাজার', postalCodePrefix: '47' },
      { id: 'dist_syl', divisionCode: 'SYLHET', nameEn: 'Sylhet', nameBn: 'সিলেট', postalCodePrefix: '31' },
      { id: 'dist_raj', divisionCode: 'RAJSHAHI', nameEn: 'Rajshahi', nameBn: 'রাজশাহী', postalCodePrefix: '60' },
      { id: 'dist_khl', divisionCode: 'KHULNA', nameEn: 'Khulna', nameBn: 'খুলনা', postalCodePrefix: '90' },
      { id: 'dist_bar', divisionCode: 'BARISAL', nameEn: 'Barisal', nameBn: 'বরিশাল', postalCodePrefix: '82' },
      { id: 'dist_rng', divisionCode: 'RANGPUR', nameEn: 'Rangpur', nameBn: 'রংপুর', postalCodePrefix: '54' },
      { id: 'dist_mym', divisionCode: 'MYMENSINGH', nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ', postalCodePrefix: '22' },
    ];

    if (!divisionCode) return sampleDistricts;
    return sampleDistricts.filter((d) => d.divisionCode === divisionCode);
  }

  private getFallbackUpazilas(districtName?: string): GeoUpazilaDTO[] {
    const sampleUpazilas: GeoUpazilaDTO[] = [
      { id: 'upz_gul', districtId: 'dist_dhk', nameEn: 'Gulshan', nameBn: 'গুলশান', postalCode: '1212', level: 'THANA' },
      { id: 'upz_dhn', districtId: 'dist_dhk', nameEn: 'Dhanmondi', nameBn: 'ধানমন্ডি', postalCode: '1209', level: 'THANA' },
      { id: 'upz_ban', districtId: 'dist_dhk', nameEn: 'Banani', nameBn: 'বনানী', postalCode: '1213', level: 'THANA' },
      { id: 'upz_mir', districtId: 'dist_dhk', nameEn: 'Mirpur', nameBn: 'মিরপুর', postalCode: '1216', level: 'THANA' },
      { id: 'upz_utt', districtId: 'dist_dhk', nameEn: 'Uttara', nameBn: 'উত্তরা', postalCode: '1230', level: 'THANA' },
      { id: 'upz_mot', districtId: 'dist_dhk', nameEn: 'Motijheel', nameBn: 'মতিঝিল', postalCode: '1000', level: 'THANA' },
      { id: 'upz_sav', districtId: 'dist_dhk', nameEn: 'Savar', nameBn: 'সাভার', postalCode: '1340', level: 'UPAZILA' },
    ];

    return sampleUpazilas;
  }
}

export const deliveryServiceabilityService = new DeliveryServiceabilityService();
