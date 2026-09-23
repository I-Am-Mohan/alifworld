import { SellerStatus } from './types';

export const SELLER_LIFECYCLE_TRANSITIONS: Record<string, readonly string[]> = {
  VERIFIED: [SellerStatus.RESTRICTED, SellerStatus.SUSPENDED],
  RESTRICTED: [SellerStatus.VERIFIED, SellerStatus.SUSPENDED],
  SUSPENDED: [SellerStatus.VERIFIED, SellerStatus.RESTRICTED],
};

export function canTransitionSellerStatus(from: string, to: string): boolean {
  return SELLER_LIFECYCLE_TRANSITIONS[from]?.includes(to) ?? false;
}
