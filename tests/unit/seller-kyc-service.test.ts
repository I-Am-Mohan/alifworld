import { describe, expect, it, mock } from 'bun:test';
import { SellerKycService } from '@/features/seller/services/seller-kyc-service';
import { KycDocumentStatus, KycDocumentType, SellerStatus } from '@/features/seller/types';
import { AuthorizationError, NotFoundError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';

describe('SellerKycService Unit Tests', () => {
  const mockSeller = {
    id: 'sel_dhaka_tech_01',
    name: 'Dhaka Tech Electronics',
    slug: 'dhaka-tech-electronics',
    ownerUserId: 'usr_seller_zubair_01',
    companyName: 'Dhaka Tech Ltd.',
    tradeLicenseNumber: 'TRAD/DNCC/042189/2024',
    binNumber: '0012345678901',
    tinNumber: '123456789012',
    status: SellerStatus.DRAFT,
    isVerified: false,
    defaultCommissionRate: 5.0,
    supportEmail: 'support@dhakatech.com',
    supportPhone: '+8801712345678',
    version: 1,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDoc = {
    id: 'kyc_doc_001',
    sellerId: 'sel_dhaka_tech_01',
    documentType: KycDocumentType.TRADE_LICENSE,
    documentNumber: 'TRAD/DNCC/042189/2024',
    fileUrl: 'kyc/sel_dhaka_tech_01/trade_license.pdf',
    fileSize: 1048576,
    mimeType: 'application/pdf',
    status: KycDocumentStatus.PENDING,
    rejectionReason: null,
    verifiedAt: null,
    verifiedBy: null,
    version: 1,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('allows store owner to submit a KYC document and updates seller to PENDING_VERIFICATION', async () => {
    let sellerStatusUpdated = false;
    let outboxCreated = false;
    let auditCreated = false;

    const mockKycRepo: any = {
      submitDocument: mock(async () => mockDoc),
    };

    const mockSellerRepo: any = {
      findById: mock(async (id: string) => ({ ...mockSeller })),
      update: mock(async (id: string, ver: number, data: any) => {
        if (data.status === 'PENDING_VERIFICATION') {
          sellerStatusUpdated = true;
        }
        return { ...mockSeller, status: SellerStatus.PENDING_VERIFICATION };
      }),
    };

    const mockRoleRepo: any = {
      hasRole: mock(async () => false),
    };

    // Mock prisma calls
    (prisma as any).outboxEvent = {
      create: mock(async () => {
        outboxCreated = true;
        return { id: 'evt_01' };
      }),
    };
    (prisma as any).auditLog = {
      create: mock(async () => {
        auditCreated = true;
        return { id: 'aud_01' };
      }),
    };

    const service = new SellerKycService(mockKycRepo, mockSellerRepo, mockRoleRepo);

    const doc = await service.submitDocument('usr_seller_zubair_01', {
      sellerId: 'sel_dhaka_tech_01',
      documentType: KycDocumentType.TRADE_LICENSE,
      documentNumber: 'TRAD/DNCC/042189/2024',
      fileUrl: 'kyc/sel_dhaka_tech_01/trade_license.pdf',
      fileSize: 1048576,
      mimeType: 'application/pdf',
    });

    expect(doc.id).toBe('kyc_doc_001');
    expect(sellerStatusUpdated).toBe(true);
    expect(outboxCreated).toBe(true);
    expect(auditCreated).toBe(true);
  });

  it('rejects document submission by an unauthorized user', async () => {
    const mockKycRepo: any = {
      submitDocument: mock(async () => mockDoc),
    };
    const mockSellerRepo: any = {
      findById: mock(async () => ({ ...mockSeller })),
    };
    const mockRoleRepo: any = {
      hasRole: mock(async () => false), // Not staff, not admin
    };

    const service = new SellerKycService(mockKycRepo, mockSellerRepo, mockRoleRepo);

    expect(
      service.submitDocument('usr_intruder_99', {
        sellerId: 'sel_dhaka_tech_01',
        documentType: KycDocumentType.TRADE_LICENSE,
        documentNumber: 'TRAD/DNCC/042189/2024',
        fileUrl: 'kyc/sel_dhaka_tech_01/trade_license.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
      })
    ).rejects.toThrow(AuthorizationError);
  });

  it('allows admin to review and verify a KYC document', async () => {
    let auditAction = '';
    const mockKycRepo: any = {
      reviewDocument: mock(async (_id: string, _v: number, data: any) => ({
        ...mockDoc,
        status: data.status,
        verifiedBy: data.verifiedBy,
        verifiedAt: new Date(),
        version: 2,
      })),
    };
    const mockSellerRepo: any = {};
    const mockRoleRepo: any = {
      hasRole: mock(async (_u: string, role: string) => role === 'SUPER_ADMIN'),
    };

    (prisma as any).auditLog = {
      create: mock(async (params: any) => {
        auditAction = params.data.action;
        return { id: 'aud_02' };
      }),
    };

    const service = new SellerKycService(mockKycRepo, mockSellerRepo, mockRoleRepo);

    const verified = await service.reviewDocument('usr_admin_01', 1, {
      documentId: 'kyc_doc_001',
      status: KycDocumentStatus.VERIFIED,
    });

    expect(verified.status).toBe(KycDocumentStatus.VERIFIED);
    expect(verified.verifiedBy).toBe('usr_admin_01');
    expect(auditAction).toBe('SELLER_KYC_VERIFY');
  });

  it('blocks non-admin users from reviewing KYC documents', async () => {
    const mockKycRepo: any = {};
    const mockSellerRepo: any = {};
    const mockRoleRepo: any = {
      hasRole: mock(async () => false),
    };

    const service = new SellerKycService(mockKycRepo, mockSellerRepo, mockRoleRepo);

    expect(
      service.reviewDocument('usr_seller_zubair_01', 1, {
        documentId: 'kyc_doc_001',
        status: KycDocumentStatus.VERIFIED,
      })
    ).rejects.toThrow(AuthorizationError);
  });

  it('generates secure signed URL for owner and audits access', async () => {
    let auditAction = '';
    const mockKycRepo: any = {
      findById: mock(async () => ({ ...mockDoc })),
    };
    const mockSellerRepo: any = {
      findById: mock(async () => ({ ...mockSeller })),
    };
    const mockRoleRepo: any = {
      hasRole: mock(async () => false),
    };

    (prisma as any).auditLog = {
      create: mock(async (params: any) => {
        auditAction = params.data.action;
        return { id: 'aud_03' };
      }),
    };

    const service = new SellerKycService(mockKycRepo, mockSellerRepo, mockRoleRepo);

    const result = await service.getSecureDocumentViewUrl('usr_seller_zubair_01', 'kyc_doc_001');

    expect(result.viewUrl).toContain('https://storage.alifworld.com/private/');
    expect(result.viewUrl).toContain('token=sig_kyc_doc_001_');
    expect(auditAction).toBe('SELLER_KYC_VIEW');
  });

  it('blocks unauthorized users from obtaining signed KYC download links', async () => {
    const mockKycRepo: any = {
      findById: mock(async () => ({ ...mockDoc })),
    };
    const mockSellerRepo: any = {
      findById: mock(async () => ({ ...mockSeller })),
    };
    const mockRoleRepo: any = {
      hasRole: mock(async () => false),
    };

    const service = new SellerKycService(mockKycRepo, mockSellerRepo, mockRoleRepo);

    expect(
      service.getSecureDocumentViewUrl('usr_intruder_99', 'kyc_doc_001')
    ).rejects.toThrow(AuthorizationError);
  });
});
