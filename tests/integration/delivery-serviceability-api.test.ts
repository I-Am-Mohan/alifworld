import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import { POST as checkServiceabilityRoute } from '@/app/api/v1/shipping/serviceability/route';
import { GET as getDivisionsRoute } from '@/app/api/v1/shipping/geo/divisions/route';
import { GET as getDistrictsRoute } from '@/app/api/v1/shipping/geo/districts/route';
import { GET as getUpazilasRoute } from '@/app/api/v1/shipping/geo/upazilas/route';
import { deliveryServiceabilityService } from '@/features/shipping';
import { NextRequest } from 'next/server';

describe('Milestone 132: Delivery Serviceability & Geo REST API Integration Tests', () => {
  const mockServiceabilityResult = {
    isServiceable: true,
    normalizedAddress: {
      divisionCode: 'DHAKA' as const,
      divisionNameEn: 'Dhaka',
      divisionNameBn: 'ঢাকা',
      districtNameEn: 'Dhaka',
      districtNameBn: 'ঢাকা',
      upazilaNameEn: 'Gulshan',
      upazilaNameBn: 'গুলশান',
      postalCode: '1212',
      streetAddress: 'House 12, Road 90, Gulshan 2',
    },
    zone: 'METRO_DHAKA' as const,
    zoneLabelEn: 'Metro Dhaka (Fast Track)',
    zoneLabelBn: 'ঢাকা মেট্রো (দ্রুততম ডেলিভারি)',
    primaryCourier: 'IN_HOUSE' as const,
    availableCouriers: [
      {
        courierCode: 'PATHAO' as const,
        courierName: 'Pathao Courier',
        isAvailable: true,
        isCodSupported: true,
        maxCodAmountPoisha: 5000000,
        estimatedDaysMin: 1,
        estimatedDaysMax: 2,
        shippingFeePoisha: 6000,
        shippingFeeBdtFormatted: '৳60.00',
      },
    ],
    isCodAvailable: true,
    maxCodLimitPoisha: 5000000,
    requiresPrepayment: false,
    estimatedDeliveryMinDays: 1,
    estimatedDeliveryMaxDays: 2,
    estimatedDeliveryPromiseTextEn: '1-2 Business Days',
    estimatedDeliveryPromiseTextBn: '১-২ কার্যদিবস',
    baseShippingFeePoisha: 6000,
    baseShippingFeeBdtFormatted: '৳60.00',
    warnings: [],
  };

  beforeEach(() => {
    spyOn(deliveryServiceabilityService, 'checkAddressServiceability').mockResolvedValue(
      mockServiceabilityResult as any
    );
    spyOn(deliveryServiceabilityService, 'listDivisions').mockResolvedValue([
      { code: 'DHAKA', nameEn: 'Dhaka', nameBn: 'ঢাকা', headquarters: 'Dhaka' },
      { code: 'CHITTAGONG', nameEn: 'Chittagong', nameBn: 'চট্টগ্রাম', headquarters: 'Chittagong' },
    ]);
    spyOn(deliveryServiceabilityService, 'listDistricts').mockResolvedValue([
      { id: 'dist_dhk', divisionCode: 'DHAKA', nameEn: 'Dhaka', nameBn: 'ঢাকা', postalCodePrefix: '12' },
    ]);
    spyOn(deliveryServiceabilityService, 'listUpazilas').mockResolvedValue([
      { id: 'upz_gul', districtId: 'dist_dhk', nameEn: 'Gulshan', nameBn: 'গুলশান', postalCode: '1212', level: 'THANA' },
    ]);
  });

  it('POST /api/v1/shipping/serviceability validates address and returns serviceability metrics', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/shipping/serviceability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        division: 'DHAKA',
        district: 'Dhaka',
        upazila: 'Gulshan',
        address: 'House 12, Road 90, Gulshan 2',
        postalCode: '1212',
      }),
    });

    const res = await checkServiceabilityRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.isServiceable).toBe(true);
    expect(body.data.zone).toBe('METRO_DHAKA');
    expect(body.data.baseShippingFeeBdtFormatted).toBe('৳60.00');
  });

  it('GET /api/v1/shipping/geo/divisions returns administrative divisions', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/shipping/geo/divisions');
    const res = await getDivisionsRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(2);
    expect(body.data[0].code).toBe('DHAKA');
  });

  it('GET /api/v1/shipping/geo/districts returns filtered districts', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/shipping/geo/districts?divisionCode=DHAKA');
    const res = await getDistrictsRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data[0].nameEn).toBe('Dhaka');
  });

  it('GET /api/v1/shipping/geo/upazilas returns upazilas for district', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/shipping/geo/upazilas?districtId=dist_dhk');
    const res = await getUpazilasRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data[0].nameEn).toBe('Gulshan');
  });
});
