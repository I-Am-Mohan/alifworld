import { describe, expect, it, beforeEach } from 'bun:test';
import { DeliveryServiceabilityService } from '@/features/shipping/services/delivery-serviceability.service';

describe('Milestone 132: Delivery Serviceability & Address Validation Unit Tests', () => {
  let service: DeliveryServiceabilityService;

  beforeEach(() => {
    service = new DeliveryServiceabilityService();
  });

  describe('1. Metro Dhaka Serviceability & Fast-Track Delivery', () => {
    it('evaluates Metro Dhaka address with fast 1-2 day delivery promise and ৳60 fee', async () => {
      const result = await service.checkAddressServiceability({
        division: 'DHAKA',
        district: 'Dhaka',
        upazila: 'Gulshan',
        address: 'House 12, Road 90, Gulshan 2',
        postalCode: '1212',
        orderSubtotalPoisha: 1850000, // ৳18,500.00
      });

      expect(result.isServiceable).toBe(true);
      expect(result.zone).toBe('METRO_DHAKA');
      expect(result.baseShippingFeePoisha).toBe(6000); // ৳60.00
      expect(result.baseShippingFeeBdtFormatted).toBe('৳60.00');
      expect(result.estimatedDeliveryMinDays).toBe(1);
      expect(result.estimatedDeliveryMaxDays).toBe(2);
      expect(result.isCodAvailable).toBe(true);
      expect(result.requiresPrepayment).toBe(false);
      expect(result.availableCouriers.some((c) => c.courierCode === 'PATHAO')).toBe(true);
      expect(result.availableCouriers.some((c) => c.courierCode === 'IN_HOUSE')).toBe(true);
    });
  });

  describe('2. Nationwide & Regional Delivery Serviceability', () => {
    it('evaluates Outside-Dhaka address with ৳120 fee and Steadfast nationwide courier', async () => {
      const result = await service.checkAddressServiceability({
        division: 'CHITTAGONG',
        district: 'Chittagong',
        upazila: 'Agrabad',
        address: 'Commercial Area, Agrabad',
        postalCode: '4100',
        orderSubtotalPoisha: 250000, // ৳2,500.00
      });

      expect(result.isServiceable).toBe(true);
      expect(result.baseShippingFeePoisha).toBe(12000); // ৳120.00
      expect(result.baseShippingFeeBdtFormatted).toBe('৳120.00');
      expect(result.estimatedDeliveryMinDays).toBe(2);
      expect(result.estimatedDeliveryMaxDays).toBe(3);
      expect(result.isCodAvailable).toBe(true);
      expect(result.availableCouriers.some((c) => c.courierCode === 'STEADFAST')).toBe(true);
    });
  });

  describe('3. Cash on Delivery (COD) Risk Thresholds', () => {
    it('enforces prepayment for high-value orders exceeding the ৳50,000 COD limit', async () => {
      const result = await service.checkAddressServiceability({
        division: 'DHAKA',
        district: 'Dhaka',
        upazila: 'Banani',
        address: 'Road 11, Block D',
        orderSubtotalPoisha: 7500000, // ৳75,000.00 (> ৳50,000 COD limit)
      });

      expect(result.isCodAvailable).toBe(false);
      expect(result.requiresPrepayment).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Digital prepayment required');
    });
  });

  describe('4. Bangladesh Geo Hierarchy Resolution', () => {
    it('lists 8 administrative divisions of Bangladesh', async () => {
      const divisions = await service.listDivisions();
      expect(divisions.length).toBe(8);
      expect(divisions.some((d) => d.code === 'DHAKA')).toBe(true);
      expect(divisions.some((d) => d.code === 'CHITTAGONG')).toBe(true);
      expect(divisions.some((d) => d.code === 'SYLHET')).toBe(true);
    });

    it('lists districts filtered by division', async () => {
      const districts = await service.listDistricts('DHAKA');
      expect(districts.length).toBeGreaterThan(0);
      expect(districts.every((d) => d.divisionCode === 'DHAKA')).toBe(true);
    });

    it('lists upazilas for a district', async () => {
      const upazilas = await service.listUpazilas(undefined, 'Dhaka');
      expect(upazilas.length).toBeGreaterThan(0);
      expect(upazilas.some((u) => u.nameEn === 'Gulshan')).toBe(true);
    });
  });
});
