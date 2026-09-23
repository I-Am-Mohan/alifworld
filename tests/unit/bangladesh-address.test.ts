import { describe, expect, it } from 'bun:test';
import { normalizeBangladeshPhone } from '@/shared/utils/phone';
import { getBangladeshDistrict, getBangladeshUpazilas } from '@/shared/geo/bangladesh-geo';
import { CustomerAddressInputSchema, validateAddressHierarchy } from '@/features/customer/addresses';

describe('Bangladesh phone, address, and geography contract (Milestone 056)', () => {
  it('normalizes national, international, and Bengali phone forms to +880 E.164', () => {
    expect(normalizeBangladeshPhone('01712-345678')).toBe('+8801712345678');
    expect(normalizeBangladeshPhone('+880 1712 345678')).toBe('+8801712345678');
    expect(normalizeBangladeshPhone('০১৭১২৩৪৫৬৭৮')).toBe('+8801712345678');
  });

  it('resolves district and upazila hierarchy', () => {
    const district = getBangladeshDistrict('dhaka');
    expect(district?.divisionCode).toBe('DHAKA');
    expect(getBangladeshUpazilas('dhaka').some((item) => item.id === 'gulshan')).toBe(true);
  });

  it('rejects a district from a different division', () => {
    const parsed = CustomerAddressInputSchema.parse({
      label: 'Home',
      recipientName: 'Test Customer',
      recipientPhone: '01712345678',
      divisionCode: 'DHAKA',
      districtId: 'chattogram',
      addressLine: 'House 1, Road 1',
      isDefault: false,
    });
    expect(() => validateAddressHierarchy(parsed)).toThrow(/does not belong/);
  });

  it('normalizes a valid address payload for persistence', () => {
    const parsed = CustomerAddressInputSchema.parse({
      label: 'Home',
      recipientName: 'Test Customer',
      recipientPhone: '01712345678',
      divisionCode: 'dhaka',
      districtId: 'dhaka',
      upazilaId: 'gulshan',
      addressLine: 'House 1, Road 1, Gulshan',
      postalCode: '1212',
      isDefault: true,
    });
    const normalized = validateAddressHierarchy(parsed);
    expect(normalized.divisionCode).toBe('DHAKA');
    expect(normalized.recipientPhone).toBe('+8801712345678');
  });
});
