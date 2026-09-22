import { describe, expect, it } from 'bun:test';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import {
  CreateSellerSchema,
  UpdateSellerSchema,
  CreateSellerStaffSchema,
  CreateSellerKycDocumentSchema,
  VerifyKycDocumentSchema,
  UpdateStoreSettingsSchema,
} from '@/features/seller/validators';

describe('Seller Domain: ID Generation & Prefixes', () => {
  it('generates IDs with correct entity prefixes', () => {
    const sellerId = generatePrefixedId(ENTITY_PREFIXES.SELLER);
    const staffId = generatePrefixedId(ENTITY_PREFIXES.STAFF);
    const kycDocId = generatePrefixedId(ENTITY_PREFIXES.KYC_DOCUMENT);
    const settingsId = generatePrefixedId(ENTITY_PREFIXES.STORE_SETTINGS);

    expect(sellerId.startsWith('sel_')).toBe(true);
    expect(staffId.startsWith('stf_')).toBe(true);
    expect(kycDocId.startsWith('kyc_')).toBe(true);
    expect(settingsId.startsWith('set_')).toBe(true);

    expect(sellerId.length).toBeGreaterThan(10);
    expect(staffId.length).toBeGreaterThan(10);
    expect(kycDocId.length).toBeGreaterThan(10);
    expect(settingsId.length).toBeGreaterThan(10);
  });
});

describe('Seller Domain: Schema Validation', () => {
  it('validates a valid seller creation payload', () => {
    const validPayload = {
      name: 'Dhaka Tech Electronics',
      slug: 'dhaka-tech-electronics',
      ownerUserId: 'usr_seller_zubair_01',
      companyName: 'Dhaka Tech Ltd.',
      tradeLicenseNumber: 'TRAD/DNCC/042189/2024',
      binNumber: '0012345678901',
      tinNumber: '123456789012',
      defaultCommissionRate: 5.0,
      supportEmail: 'support@dhakatech.com',
      supportPhone: '+8801712345678',
    };

    const result = CreateSellerSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Dhaka Tech Electronics');
      expect(result.data.slug).toBe('dhaka-tech-electronics');
      expect(result.data.defaultCommissionRate).toBe(5.0);
    }
  });

  it('rejects an invalid slug format', () => {
    const invalidPayload = {
      name: 'Invalid Store',
      slug: 'Invalid Slug With Spaces & CAPS',
      ownerUserId: 'usr_seller_01',
    };

    const result = CreateSellerSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('rejects negative or out-of-range commission rates', () => {
    const negativeCommission = {
      name: 'Dhaka Tech',
      slug: 'dhaka-tech',
      ownerUserId: 'usr_01',
      defaultCommissionRate: -2.5,
    };

    const excessiveCommission = {
      name: 'Dhaka Tech',
      slug: 'dhaka-tech',
      ownerUserId: 'usr_01',
      defaultCommissionRate: 105.0,
    };

    expect(CreateSellerSchema.safeParse(negativeCommission).success).toBe(false);
    expect(CreateSellerSchema.safeParse(excessiveCommission).success).toBe(false);
  });

  it('validates seller update schema with partial fields', () => {
    const updatePayload = {
      name: 'Dhaka Tech Superstore',
      status: 'ACTIVE' as const,
      isVerified: true,
      defaultCommissionRate: 4.5,
    };

    const result = UpdateSellerSchema.safeParse(updatePayload);
    expect(result.success).toBe(true);
  });

  it('validates store settings schema with Bangladeshi courier defaults', () => {
    const settingsPayload = {
      autoAcceptOrders: true,
      vacationMode: false,
      defaultCourier: 'STEADFAST',
      shippingCutoffTime: '16:00',
      warehouseAddress: {
        addressLine1: 'House 14, Road 5, Block C',
        division: 'DHAKA',
        district: 'Dhaka',
        upazilaOrThana: 'Banani',
        postalCode: '1213',
        country: 'Bangladesh',
      },
    };

    const result = UpdateStoreSettingsSchema.safeParse(settingsPayload);
    expect(result.success).toBe(true);
  });
});

describe('Seller Domain: Staff & KYC Document Schemas', () => {
  it('validates seller staff creation', () => {
    const staffPayload = {
      sellerId: 'sel_dhaka_tech_01',
      userId: 'usr_seller_staff_01',
      role: 'SELLER_STAFF',
      permissions: ['ORDERS_READ', 'ORDERS_UPDATE'],
    };

    const result = CreateSellerStaffSchema.safeParse(staffPayload);
    expect(result.success).toBe(true);
  });

  it('validates KYC document creation schema', () => {
    const kycDoc = {
      sellerId: 'sel_dhaka_tech_01',
      documentType: 'TRADE_LICENSE' as const,
      documentNumber: 'TRAD/DNCC/042189/2024',
      fileKey: 'kyc/sel_dhaka_tech_01/trade_license_2024.pdf',
      fileSize: 1024 * 1024,
      mimeType: 'application/pdf',
    };

    const result = CreateSellerKycDocumentSchema.safeParse(kycDoc);
    expect(result.success).toBe(true);
  });

  it('validates KYC verification payload by admin', () => {
    const verifyPayload = {
      verifiedByAdminId: 'usr_admin_01',
      status: 'VERIFIED' as const,
    };

    const result = VerifyKycDocumentSchema.safeParse(verifyPayload);
    expect(result.success).toBe(true);
  });

  it('validates KYC rejection with required reason', () => {
    const rejectPayload = {
      verifiedByAdminId: 'usr_admin_01',
      status: 'REJECTED' as const,
      rejectionReason: 'Trade License expired on June 30, 2024. Please submit renewed license.',
    };

    const result = VerifyKycDocumentSchema.safeParse(rejectPayload);
    expect(result.success).toBe(true);
  });
});
