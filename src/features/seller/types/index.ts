/**
 * Seller Domain Types & Multi-Tenant Boundaries
 * 
 * Defines Seller, SellerStaff, SellerKycDocument, SellerStoreSettings models,
 * verification states, document types, and tenant isolation types.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariant: ADR-0003, ADR-0006, ADR-0022, ADR-0024
 */

export enum SellerStatus {
  DRAFT = 'DRAFT',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
}

export enum KycDocumentType {
  TRADE_LICENSE = 'TRADE_LICENSE',
  NID_FRONT = 'NID_FRONT',
  NID_BACK = 'NID_BACK',
  BIN_CERTIFICATE = 'BIN_CERTIFICATE',
  BANK_CHEQUE_LEAF = 'BANK_CHEQUE_LEAF',
  TIN_CERTIFICATE = 'TIN_CERTIFICATE',
}

export enum KycDocumentStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum CourierProvider {
  PATHAO = 'PATHAO',
  STEADFAST = 'STEADFAST',
  REDX = 'REDX',
  IN_HOUSE = 'IN_HOUSE',
}

export interface AddressData {
  division: string;
  district: string;
  upazila: string;
  streetAddress: string;
  postalCode?: string;
}

export interface SellerModel {
  id: string;
  ownerUserId: string;
  businessName: string;
  slug: string;
  tradeLicenseNumber: string | null;
  binNumber: string | null;
  tinNumber: string | null;
  status: SellerStatus | string;
  rejectionReason: string | null;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  version: number;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerStaffModel {
  id: string;
  sellerId: string;
  userId: string;
  roleCode: string;
  permissions: string[];
  version: number;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerKycDocumentModel {
  id: string;
  sellerId: string;
  documentType: KycDocumentType | string;
  documentNumber: string | null;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  contentSha256?: string | null;
  uploadedBy?: string | null;
  status: KycDocumentStatus | string;
  rejectionReason: string | null;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  version: number;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerStoreSettingsModel {
  id: string;
  sellerId: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  pickupAddress: AddressData | null;
  returnAddress: AddressData | null;
  defaultCourier: CourierProvider | string | null;
  vacationMode: boolean;
  vacationMessage: string | null;
  version: number;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerProfile extends SellerModel {
  settings?: SellerStoreSettingsModel | null;
  kycDocuments?: SellerKycDocumentModel[];
  staffCount?: number;
}

export interface PublicSellerProfile {
  id: string;
  businessName: string;
  slug: string;
  status: SellerStatus | string;
  verifiedAt: Date | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  pickupAddress: AddressData | null;
  vacationMode: boolean;
  vacationMessage: string | null;
}

export interface SellerTenantContext {
  readonly sellerId: string;
  readonly isVerified: boolean;
  readonly roleCode?: string;
}

export interface SellerFilterOptions {
  search?: string;
  status?: SellerStatus | string;
  ownerUserId?: string;
  includeDeleted?: boolean;
}
