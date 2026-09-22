/**
 * Identity & Authentication Domain Types
 */

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  SELLER = 'SELLER',
  RIDER = 'RIDER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export interface UserSession {
  readonly userId: string;
  readonly email: string;
  readonly phone?: string;
  readonly role: UserRole;
  readonly sellerId?: string; // Set when user acts within a seller tenant context
  readonly createdAt: Date;
}
