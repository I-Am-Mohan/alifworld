import { z } from 'zod';

export const PayoutProfileInputSchema = z.object({
  sellerId: z.string().regex(/^sel_[A-Za-z0-9]+$/),
  providerName: z.string().trim().min(2).max(120),
  accountNumber: z.string().trim().min(4).max(40).regex(/^[A-Za-z0-9 -]+$/),
  routingNumber: z.string().trim().min(4).max(40).regex(/^[A-Za-z0-9 -]+$/).optional(),
  accountTitle: z.string().trim().min(2).max(160),
  version: z.number().int().positive(),
});

export type PayoutProfileInput = z.infer<typeof PayoutProfileInputSchema>;

export interface SafePayoutProfile {
  id: string;
  sellerId: string;
  method: string;
  providerName: string;
  accountLast4: string;
  routingLast4: string | null;
  displayAccount: string;
  status: string;
  isPrimary: boolean;
  version: number;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
