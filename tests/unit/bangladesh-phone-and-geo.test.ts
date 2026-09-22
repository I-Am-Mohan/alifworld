/**
 * Unit Tests for Bangladesh Phone Normalization, MNO Detection,
 * OTP Authentication, and Geographic Hierarchy
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Milestone: 038 (Design Bangladesh phone normalization and OTP authentication)
 * Invariants: ADR-0005, ADR-0023, ADR-0031, ADR-0034
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { NextRequest } from 'next/server';
import {
  normalizeBangladeshPhone,
  isValidBangladeshPhone,
  formatBangladeshPhoneNational,
  formatBangladeshPhoneBengali,
  formatBangladeshPhoneInternational,
  maskBangladeshPhone,
  parseBengaliNumerals,
  toBengaliNumerals,
  getBangladeshMobileOperator,
  BANGLADESH_OPERATORS,
} from '@/shared/utils/phone';
import {
  getBangladeshDivisions,
  getBangladeshDistricts,
  getBangladeshUpazilas,
  getBangladeshDivision,
  getBangladeshDistrict,
  getBangladeshUpazila,
  validateBangladeshAddress,
  formatBangladeshAddress,
  BANGLADESH_DIVISIONS,
  BANGLADESH_DISTRICTS,
} from '@/shared/geo/bangladesh-geo';
import { GET as getDivisionsRoute } from '@/app/api/v1/geo/divisions/route';
import { GET as getDistrictsRoute } from '@/app/api/v1/geo/districts/route';
import { GET as getUpazilasRoute } from '@/app/api/v1/geo/upazilas/route';
import { PhoneAuthService } from '@/services/phone-auth.service';
import { AuthTokenService } from '@/services/auth-token.service';
import { UserRepository } from '@/repositories/user.repository';
import { OtpRepository } from '@/repositories/otp.repository';
import { SessionRepository } from '@/repositories/session.repository';
import { ValidationError } from '@/shared/errors/app-error';

describe('Milestone 038: Bangladesh Phone Normalization & MNO Identification', () => {
  describe('Bengali Numeral Parsing & Conversion', () => {
    it('converts Bengali numerals (০-৯) to ASCII digits (0-9)', () => {
      expect(parseBengaliNumerals('০১২৩৪৫৬৭৮৯')).toBe('0123456789');
      expect(parseBengaliNumerals('০১৭১২-৩৪৫৬৭৮')).toBe('01712-345678');
      expect(parseBengaliNumerals('+৮৮০১৭১২-৩৪৫৬৭৮')).toBe('+8801712-345678');
    });

    it('converts ASCII digits (0-9) to Bengali numerals (০-৯)', () => {
      expect(toBengaliNumerals('0123456789')).toBe('০১২৩৪৫৬৭৮৯');
      expect(toBengaliNumerals('01712-345678')).toBe('০১৭১২-৩৪৫৬৭৮');
    });
  });

  describe('Strict Phone Normalization (E.164 +8801[3-9]XXXXXXXX)', () => {
    it('normalizes standard 11-digit numbers in ASCII and Bengali', () => {
      expect(normalizeBangladeshPhone('01712345678')).toBe('+8801712345678');
      expect(normalizeBangladeshPhone('০১৭১২৩৪৫৬৭৮')).toBe('+8801712345678');
      expect(normalizeBangladeshPhone('০১৮১১২২৩৩৪৪')).toBe('+8801811223344');
      expect(normalizeBangladeshPhone('০১৯৯৯৮৮৭৭৬৬')).toBe('+8801999887766');
    });

    it('normalizes 10-digit national input without leading 0', () => {
      expect(normalizeBangladeshPhone('1712345678')).toBe('+8801712345678');
      expect(normalizeBangladeshPhone('১৭১২৩৪৫৬৭৮')).toBe('+8801712345678');
    });

    it('handles +880, 880, and 00880 prefixes with hyphens and spaces', () => {
      expect(normalizeBangladeshPhone('+880 1712-345678')).toBe('+8801712345678');
      expect(normalizeBangladeshPhone('8801712345678')).toBe('+8801712345678');
      expect(normalizeBangladeshPhone('008801712345678')).toBe('+8801712345678');
      expect(normalizeBangladeshPhone('(017) 12-345678')).toBe('+8801712345678');
    });

    it('rejects invalid or defunct mobile operators (010, 011 Citycell, 012)', () => {
      expect(() => normalizeBangladeshPhone('01112345678')).toThrow(ValidationError);
      expect(() => normalizeBangladeshPhone('01012345678')).toThrow(ValidationError);
      expect(() => normalizeBangladeshPhone('01212345678')).toThrow(ValidationError);
    });

    it('rejects non-BD numbers and invalid lengths', () => {
      expect(() => normalizeBangladeshPhone('+12025550143')).toThrow(ValidationError);
      expect(() => normalizeBangladeshPhone('12345')).toThrow(ValidationError);
      expect(() => normalizeBangladeshPhone('+880171234567899')).toThrow(ValidationError);
    });
  });

  describe('Mobile Network Operator (MNO) Detection', () => {
    it('detects Grameenphone for 017 and 013 prefixes', () => {
      const op17 = getBangladeshMobileOperator('01712345678');
      expect(op17?.code).toBe('GRAMEENPHONE');
      expect(op17?.name).toBe('Grameenphone');

      const op13 = getBangladeshMobileOperator('01300112233');
      expect(op13?.code).toBe('GRAMEENPHONE');
    });

    it('detects Banglalink for 019 and 014 prefixes', () => {
      const op19 = getBangladeshMobileOperator('01912345678');
      expect(op19?.code).toBe('BANGLALINK');

      const op14 = getBangladeshMobileOperator('01400112233');
      expect(op14?.code).toBe('BANGLALINK');
    });

    it('detects Robi / Airtel for 018 and 016 prefixes', () => {
      const op18 = getBangladeshMobileOperator('01812345678');
      expect(op18?.code).toBe('ROBI');

      const op16 = getBangladeshMobileOperator('01600112233');
      expect(op16?.code).toBe('ROBI');
    });

    it('detects Teletalk for 015 prefix', () => {
      const op15 = getBangladeshMobileOperator('01512345678');
      expect(op15?.code).toBe('TELETALK');
      expect(op15?.isGovernmentOwned).toBe(true);
    });

    it('detects operator from Bengali numerals', () => {
      const op = getBangladeshMobileOperator('০১৭১২৩৪৫৬৭৮');
      expect(op?.code).toBe('GRAMEENPHONE');
    });

    it('returns null for invalid numbers', () => {
      expect(getBangladeshMobileOperator('12345')).toBeNull();
      expect(getBangladeshMobileOperator('01112345678')).toBeNull();
    });
  });

  describe('Phone Privacy Masking & Display Formatting', () => {
    it('masks phone for standard audit and notification security', () => {
      const masked = maskBangladeshPhone('+8801712345678', 'standard');
      expect(masked).toBe('+880 17***-**678');
    });

    it('masks phone for national display format', () => {
      const masked = maskBangladeshPhone('01712345678', 'national');
      expect(masked).toBe('017**-***678');
    });

    it('masks phone for minimal display format', () => {
      const masked = maskBangladeshPhone('01712345678', 'minimal');
      expect(masked).toBe('+880 1712-***678');
    });

    it('formats phone into human-readable national and Bengali representations', () => {
      expect(formatBangladeshPhoneNational('+8801712345678')).toBe('01712-345678');
      expect(formatBangladeshPhoneBengali('+8801712345678')).toBe('০১৭১২-৩৪৫৬৭৮');
      expect(formatBangladeshPhoneInternational('+8801712345678')).toBe('+880 1712-345678');
    });
  });
});

describe('Milestone 038: Bangladesh Geographic Hierarchy & Address Validation', () => {
  describe('Administrative Hierarchy Completeness', () => {
    it('contains all 8 authoritative Administrative Divisions', () => {
      const divisions = getBangladeshDivisions();
      expect(divisions.length).toBe(8);

      const codes = divisions.map((d) => d.code);
      expect(codes).toContain('DHAKA');
      expect(codes).toContain('CHATTOGRAM');
      expect(codes).toContain('RAJSHAHI');
      expect(codes).toContain('KHULNA');
      expect(codes).toContain('BARISHAL');
      expect(codes).toContain('SYLHET');
      expect(codes).toContain('RANGPUR');
      expect(codes).toContain('MYMENSINGH');

      // Verify bilingual labels exist on every division
      for (const div of divisions) {
        expect(div.nameEn.length).toBeGreaterThan(0);
        expect(div.nameBn.length).toBeGreaterThan(0);
        expect(div.headquarters.length).toBeGreaterThan(0);
      }
    });

    it('contains exactly 64 Administrative Districts', () => {
      const districts = getBangladeshDistricts();
      expect(districts.length).toBe(64);

      // Verify every district has an ID, valid division code, postal prefix, and bilingual names
      for (const dist of districts) {
        expect(dist.id.length).toBeGreaterThan(0);
        expect(dist.nameEn.length).toBeGreaterThan(0);
        expect(dist.nameBn.length).toBeGreaterThan(0);
        expect(dist.postalCodePrefix.length).toBe(2);
        expect(BANGLADESH_DIVISIONS.some((div) => div.code === dist.divisionCode)).toBe(true);
      }
    });

    it('verifies district count partition across all 8 divisions sums to 64', () => {
      const dhakaDistricts = getBangladeshDistricts('DHAKA');
      const ctgDistricts = getBangladeshDistricts('CHATTOGRAM');
      const rajDistricts = getBangladeshDistricts('RAJSHAHI');
      const khulnaDistricts = getBangladeshDistricts('KHULNA');
      const barishalDistricts = getBangladeshDistricts('BARISHAL');
      const sylhetDistricts = getBangladeshDistricts('SYLHET');
      const rangpurDistricts = getBangladeshDistricts('RANGPUR');
      const mymenDistricts = getBangladeshDistricts('MYMENSINGH');

      expect(dhakaDistricts.length).toBe(13);
      expect(ctgDistricts.length).toBe(11);
      expect(rajDistricts.length).toBe(8);
      expect(khulnaDistricts.length).toBe(10);
      expect(barishalDistricts.length).toBe(6);
      expect(sylhetDistricts.length).toBe(4);
      expect(rangpurDistricts.length).toBe(8);
      expect(mymenDistricts.length).toBe(4);

      const totalSum =
        dhakaDistricts.length +
        ctgDistricts.length +
        rajDistricts.length +
        khulnaDistricts.length +
        barishalDistricts.length +
        sylhetDistricts.length +
        rangpurDistricts.length +
        mymenDistricts.length;

      expect(totalSum).toBe(64);
    });

    it('returns empty array for non-existent division', () => {
      expect(getBangladeshDistricts('ATLANTIS')).toEqual([]);
    });
  });

  describe('Upazilas / Thanas Lookup', () => {
    it('returns Dhaka metropolitan thanas for Dhaka district', () => {
      const upazilas = getBangladeshUpazilas('dhaka');
      expect(upazilas.length).toBeGreaterThanOrEqual(10);

      const names = upazilas.map((u) => u.nameEn);
      expect(names).toContain('Dhanmondi');
      expect(names).toContain('Gulshan');
      expect(names).toContain('Mirpur');
      expect(names).toContain('Uttara');
      expect(names).toContain('Savar');
    });

    it('returns Chattogram commercial thanas for Chattogram district', () => {
      const upazilas = getBangladeshUpazilas('chattogram');
      expect(upazilas.length).toBeGreaterThanOrEqual(5);

      const names = upazilas.map((u) => u.nameEn);
      expect(names).toContain('Agrabad / Double Mooring');
      expect(names).toContain('Panchlaish');
    });

    it('provides canonical sadar upazila for rural districts', () => {
      const upazilas = getBangladeshUpazilas('meherpur');
      expect(upazilas.length).toBeGreaterThan(0);
      expect(upazilas[0].nameEn).toContain('Sadar');
    });
  });

  describe('Address Validation & Formatting', () => {
    it('validates a correct Bangladesh address input', () => {
      const result = validateBangladeshAddress({
        division: 'Dhaka',
        district: 'Dhaka',
        upazila: 'Dhanmondi',
        postalCode: '1205',
        streetAddress: 'House 42, Road 9A',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.normalized?.division.code).toBe('DHAKA');
      expect(result.normalized?.district?.id).toBe('dhaka');
      expect(result.normalized?.upazila?.id).toBe('dhanmondi');
    });

    it('rejects an invalid division', () => {
      const result = validateBangladeshAddress({
        division: 'Calcutta',
        district: 'Dhaka',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid Bangladesh division'))).toBe(true);
    });

    it('detects district mismatch when district belongs to another division', () => {
      const result = validateBangladeshAddress({
        division: 'Dhaka',
        district: 'Chattogram', // Belongs to CHATTOGRAM
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('does not belong to Division'))).toBe(true);
    });

    it('rejects invalid 5-digit or 3-digit postal codes', () => {
      const result = validateBangladeshAddress({
        division: 'Dhaka',
        district: 'Dhaka',
        postalCode: '12345',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid Bangladesh postal code'))).toBe(true);
    });

    it('formats address into English and Bengali presentation strings', () => {
      const address = {
        division: 'Dhaka',
        district: 'Dhaka',
        upazila: 'Dhanmondi',
        postalCode: '1205',
        streetAddress: 'House 42, Road 9A',
      };

      const en = formatBangladeshAddress(address, 'en');
      expect(en).toContain('House 42, Road 9A');
      expect(en).toContain('Dhanmondi');
      expect(en).toContain('Dhaka');
      expect(en).toContain('Postal Code: 1205');
      expect(en).toContain('Bangladesh');

      const bn = formatBangladeshAddress(address, 'bn');
      expect(bn).toContain('ধানমন্ডি');
      expect(bn).toContain('ঢাকা');
      expect(bn).toContain('বাংলাদেশ');
    });
  });
});

describe('Milestone 038: Geo REST API Route Handlers', () => {
  it('GET /api/v1/geo/divisions returns 8 divisions with metadata', async () => {
    const res = await getDivisionsRoute();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(8);
    expect(body.meta.country).toBe('BD');
    expect(body.meta.currency).toBe('BDT');
  });

  it('GET /api/v1/geo/districts returns all 64 districts when unfiltered', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/geo/districts');
    const res = await getDistrictsRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(64);
  });

  it('GET /api/v1/geo/districts?division=DHAKA returns 13 districts', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/geo/districts?division=DHAKA');
    const res = await getDistrictsRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(13);
  });

  it('GET /api/v1/geo/districts with invalid division returns 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/geo/districts?division=UNKNOWN');
    const res = await getDistrictsRoute(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_DIVISION');
  });

  it('GET /api/v1/geo/upazilas?district=dhaka returns upazilas', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/geo/upazilas?district=dhaka');
    const res = await getUpazilasRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });
});

describe('Milestone 038: PhoneAuthService with Bengali Numerals & Geo Integration', () => {
  let mockUsers: Map<string, any>;
  let mockOtps: Map<string, any>;
  let mockSessions: Map<string, any>;
  let mockAuditLogs: any[];
  let mockOutboxEvents: any[];
  let mockPrisma: any;
  let mockUserRepo: any;
  let mockOtpRepo: any;
  let mockSessionRepo: any;
  let tokenService: AuthTokenService;
  let phoneAuthService: PhoneAuthService;

  beforeEach(() => {
    mockUsers = new Map();
    mockOtps = new Map();
    mockSessions = new Map();
    mockAuditLogs = [];
    mockOutboxEvents = [];

    // Existing Customer User
    const user = {
      id: 'usr_phone_bd_01',
      phone: '+8801700112233',
      name: 'Mohan Platform Admin',
      status: 'ACTIVE',
      tokenVersion: 1,
      isPhoneVerified: true,
      isEmailVerified: false,
      lastLoginAt: null,
      roleAssignments: [{ role: { code: 'CUSTOMER' } }],
    };
    mockUsers.set(user.id, user);

    mockPrisma = {
      $transaction: async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          user: {
            create: async ({ data }: any) => {
              mockUsers.set(data.id, data);
              return data;
            },
          },
          role: {
            findUnique: async () => ({ id: 'rol_customer', code: 'CUSTOMER' }),
          },
          userRoleAssignment: {
            create: async ({ data }: any) => data,
          },
          wallet: {
            create: async ({ data }: any) => data,
          },
          pointAccount: {
            create: async ({ data }: any) => data,
          },
          otpToken: {
            create: async ({ data }: any) => {
              mockOtps.set(data.id, { ...data, createdAt: new Date() });
              return data;
            },
          },
          auditLog: {
            create: async ({ data }: any) => {
              mockAuditLogs.push(data);
              return data;
            },
          },
          outboxEvent: {
            create: async ({ data }: any) => {
              mockOutboxEvents.push(data);
              return data;
            },
          },
        };
        return cb(tx);
      },
    };

    mockUserRepo = {
      findUserByPhone: async (phone: string) => {
        return Array.from(mockUsers.values()).find((u) => u.phone === phone) || null;
      },
    };

    mockOtpRepo = {
      findActiveOtp: async (identifier: string, purpose: string) => {
        return (
          Array.from(mockOtps.values()).find(
            (o) =>
              o.identifier === identifier &&
              o.purpose === purpose &&
              !o.isUsed &&
              new Date(o.expiresAt).getTime() > Date.now()
          ) || null
        );
      },
      getLatestOtp: async () => null,
      getRecentOtpCount: async () => 0,
      incrementAttempts: async (id: string) => {
        const token = mockOtps.get(id);
        if (token) token.attempts += 1;
        return { attempts: token?.attempts || 1, maxAttempts: 3 };
      },
      markUsed: async (id: string) => {
        const token = mockOtps.get(id);
        if (token) token.isUsed = true;
        return token;
      },
      invalidateActiveOtps: async () => 0,
    };

    mockSessionRepo = {
      createSession: async (params: any) => ({
        id: 'ses_test_01',
        ...params,
        isRevoked: false,
      }),
      enforceSessionLimit: async () => {},
    };

    tokenService = new AuthTokenService(
      mockSessionRepo as unknown as SessionRepository,
      'test_jwt_secret_for_phone_auth_service_32_characters_minimum'
    );

    phoneAuthService = new PhoneAuthService(
      mockUserRepo as unknown as UserRepository,
      mockOtpRepo as unknown as OtpRepository,
      tokenService,
      mockPrisma
    );
  });

  it('checks user existence using Bengali numeral input and returns operator + maskedPhone', async () => {
    // Number: 01700112233 in Bengali: ০১৭০০১১২২৩৩
    const result = await phoneAuthService.checkUser('০১৭০০১১২২৩৩');

    expect(result.exists).toBe(true);
    expect(result.phone).toBe('+8801700112233');
    expect(result.maskedPhone).toBe('+880 17***-**233');
    expect(result.operator?.code).toBe('GRAMEENPHONE');
    expect(result.operator?.name).toBe('Grameenphone');
  });

  it('sends login OTP using Bengali numerals and includes operator info', async () => {
    const result = await phoneAuthService.sendLoginOtp('০১৭০০১১২২৩৩');

    expect(result.success).toBe(true);
    expect(result.phone).toBe('+8801700112233');
    expect(result.maskedPhone).toBe('+880 17***-**233');
    expect(result.operator?.code).toBe('GRAMEENPHONE');
    expect(result.devOtpCode).toBeDefined();
  });

  it('completes registration with district, upazila, and postalCode, recording geo metadata in audit and outbox', async () => {
    const newPhone = '০১৮৫৫৬৬৭৭৮৮'; // Robi number in Bengali
    const sendRes = await phoneAuthService.sendRegisterOtp(newPhone);
    const verifyRes = await phoneAuthService.verifyRegisterOtp(newPhone, sendRes.devOtpCode!);

    const regResult = await phoneAuthService.completeRegistration({
      phone: newPhone,
      verificationTicket: verifyRes.verificationTicket,
      firstName: 'Kazi',
      lastName: 'Nazrul',
      password: 'Dhaka@Commerce#2026!',
      division: 'Dhaka',
      district: 'Dhaka',
      upazila: 'Dhanmondi',
      postalCode: '1205',
      address: 'House 10, Road 4',
      clientType: 'WEB',
    });

    expect(regResult.success).toBe(true);
    expect(regResult.user.phone).toBe('+8801855667788');

    // Verify audit log has complete geo metadata
    const audit = mockAuditLogs.find((l) => l.action === 'CUSTOMER_REGISTERED');
    expect(audit).toBeDefined();
    expect(audit.metadata.division).toBe('Dhaka');
    expect(audit.metadata.district).toBe('Dhaka');
    expect(audit.metadata.upazila).toBe('Dhanmondi');
    expect(audit.metadata.postalCode).toBe('1205');

    // Verify outbox event has geo payload
    const outbox = mockOutboxEvents.find((e) => e.eventType === 'auth.customer_registered');
    expect(outbox).toBeDefined();
    expect(outbox.payload.optionalProfile.district).toBe('Dhaka');
    expect(outbox.payload.optionalProfile.upazila).toBe('Dhanmondi');
    expect(outbox.payload.optionalProfile.postalCode).toBe('1205');
  });

  it('rejects registration if address details fail geographic validation (e.g. invalid district in division)', async () => {
    const newPhone = '01899112233';
    const sendRes = await phoneAuthService.sendRegisterOtp(newPhone);
    const verifyRes = await phoneAuthService.verifyRegisterOtp(newPhone, sendRes.devOtpCode!);

    await expect(
      phoneAuthService.completeRegistration({
        phone: newPhone,
        verificationTicket: verifyRes.verificationTicket,
        firstName: 'Test',
        lastName: 'User',
        password: 'Dhaka@Commerce#2026!',
        division: 'Dhaka',
        district: 'Chattogram', // Belongs to CHATTOGRAM, not Dhaka
      })
    ).rejects.toThrow(ValidationError);
  });
});
