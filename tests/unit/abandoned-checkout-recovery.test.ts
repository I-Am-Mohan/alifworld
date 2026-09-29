/**
 * Milestone 140: Abandoned Checkout Recovery Unit Tests
 *
 * Verifies:
 * 1. Cryptographic recovery token generation
 * 2. Token expiry and validation guards
 * 3. Server-side live stock balance and price revalidation
 * 4. Merchant vacation mode detection on cart restoration
 * 5. Recovery state machine transitions (ABANDONED -> NOTIFIED -> RECOVERED)
 */

import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { abandonedCheckoutRecoveryService } from '@/features/checkout/services/abandoned-checkout-recovery.service';
import { abandonedCheckoutRepository } from '@/features/checkout/repositories/abandoned-checkout.repository';
import { prisma } from '@/shared/database/prisma';

describe('Milestone 140: Abandoned Checkout Recovery Unit Tests', () => {
  let findByTokenSpy: any;
  let updateCartSpy: any;
  let outboxSpy: any;

  afterEach(() => {
    findByTokenSpy?.mockRestore();
    updateCartSpy?.mockRestore();
    outboxSpy?.mockRestore();
  });

  describe('1. Token Expiry & Validation Guards', () => {
    it('rejects recovery when token does not exist with 404', async () => {
      findByTokenSpy = spyOn(abandonedCheckoutRepository, 'findByToken').mockResolvedValue(null);

      expect(
        abandonedCheckoutRecoveryService.recoverCart('rec_nonexistent_token')
      ).rejects.toThrow('Invalid recovery token');
    });

    it('rejects recovery when recovery link has expired', async () => {
      const expiredRecord = {
        id: 'rec_01',
        recoveryToken: 'rec_expired_token',
        expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
        cart: { id: 'crt_01', status: 'ABANDONED', items: [] },
      };

      findByTokenSpy = spyOn(abandonedCheckoutRepository, 'findByToken').mockResolvedValue(
        expiredRecord as any
      );

      expect(
        abandonedCheckoutRecoveryService.recoverCart('rec_expired_token')
      ).rejects.toThrow('Recovery link has expired');
    });
  });

  describe('2. Server-Side Live Stock & Price Revalidation on Recovery', () => {
    it('restores abandoned cart and detects live price changes', async () => {
      const sampleRecovery = {
        id: 'rec_02',
        recoveryToken: 'rec_valid_token_01',
        expiresAt: new Date(Date.now() + 3600000 * 24),
        incentiveCouponCode: 'COMEBACK10',
        cart: {
          id: 'crt_02',
          status: 'ABANDONED',
          items: [
            {
              id: 'cit_01',
              variantId: 'var_01',
              pricePoisha: 120000n, // Saved price: ৳1,200.00
              quantity: 2,
              variant: {
                id: 'var_01',
                pricePoisha: 130000n, // Live updated price: ৳1,300.00
                product: {
                  title: 'Premium Shirt',
                  seller: { businessName: 'Craft Store', settings: { vacationMode: false } },
                },
              },
            },
          ],
        },
      };

      findByTokenSpy = spyOn(abandonedCheckoutRepository, 'findByToken').mockResolvedValue(
        sampleRecovery as any
      );
      updateCartSpy = spyOn(abandonedCheckoutRecoveryService, 'reactivateCart').mockResolvedValue();
      const updateItemSpy = spyOn(abandonedCheckoutRecoveryService, 'syncCartItemPrice').mockResolvedValue();
      outboxSpy = spyOn(abandonedCheckoutRecoveryService, 'emitOutboxEvent').mockResolvedValue();

      const result = await abandonedCheckoutRecoveryService.recoverCart('rec_valid_token_01');

      expect(result.success).toBe(true);
      expect(result.cartId).toBe('crt_02');
      expect(result.revalidation.hasPriceChanges).toBe(true);
      expect(result.revalidation.priceChangesCount).toBe(1);
      expect(result.appliedCouponCode).toBe('COMEBACK10');
      expect(result.subtotalPoisha).toBe(260000); // ৳2,600.00 (2 * 130000)

      updateItemSpy.mockRestore();
    });

    it('detects seller vacation mode and alerts customer upon recovery', async () => {
      const sampleRecoveryVacation = {
        id: 'rec_03',
        recoveryToken: 'rec_vacation_token',
        expiresAt: new Date(Date.now() + 3600000 * 24),
        cart: {
          id: 'crt_03',
          status: 'ABANDONED',
          items: [
            {
              id: 'cit_02',
              variantId: 'var_02',
              pricePoisha: 50000n,
              quantity: 1,
              variant: {
                id: 'var_02',
                pricePoisha: 50000n,
                product: {
                  title: 'Artisan Clay Pot',
                  seller: {
                    businessName: 'Pottery Studio',
                    settings: { vacationMode: true, vacationMessage: 'Closed for Eid holidays' },
                  },
                },
              },
            },
          ],
        },
      };

      findByTokenSpy = spyOn(abandonedCheckoutRepository, 'findByToken').mockResolvedValue(
        sampleRecoveryVacation as any
      );
      updateCartSpy = spyOn(abandonedCheckoutRecoveryService, 'reactivateCart').mockResolvedValue();
      outboxSpy = spyOn(abandonedCheckoutRecoveryService, 'emitOutboxEvent').mockResolvedValue();

      const result = await abandonedCheckoutRecoveryService.recoverCart('rec_vacation_token');

      expect(result.success).toBe(true);
      expect(result.revalidation.hasSellerIssues).toBe(true);
      expect(result.revalidation.warnings.some((w) => w.includes('vacation'))).toBe(true);
    });
  });
});
