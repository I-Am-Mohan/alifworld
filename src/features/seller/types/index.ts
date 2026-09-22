/**
 * Seller Domain Types & Tenant Scoping
 */

export enum SellerStatus {
  DRAFT = 'DRAFT',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
}

export interface SellerProfile {
  readonly id: string;
  readonly businessName: string;
  readonly tradeLicenseNumber?: string;
  readonly binNumber?: string; // NBR Business Identification Number
  readonly status: SellerStatus;
  readonly ownerUserId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SellerTenantContext {
  readonly sellerId: string;
  readonly isVerified: boolean;
}
