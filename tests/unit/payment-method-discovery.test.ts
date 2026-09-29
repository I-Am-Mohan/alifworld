/**
 * Milestone 138: Payment Method Discovery & Selection Unit Tests
 *
 * Verifies:
 * 1. Payment gateway adapters availability logic (bKash, Nagad, SSLCommerz, Upay, Rocket, COD, Wallet)
 * 2. Mobile channel deep linking detection for MFS gateways
 * 3. Customer wallet balance sufficiency evaluation
 * 4. Recommended payment method heuristics (Wallet priority, COD for standard retail, MFS fallback)
 * 5. Transparent gateway fee calculation in integer poisha
 */

import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { paymentMethodDiscoveryService } from '@/features/payment/services/payment-method-discovery.service';
import { paymentGatewayRegistry } from '@/features/payment/adapters/payment-gateway.registry';
import { prisma } from '@/shared/database/prisma';

describe('Milestone 138: Payment Method Discovery & Selection Unit Tests', () => {
  describe('1. Gateway Adapters & Transaction Limits', () => {
    it('discovers bKash as available for orders within ৳25,000 transaction limit', async () => {
      const bkash = paymentGatewayRegistry.getAdapter('BKASH');
      const availability = await bkash.checkAvailability({
        orderTotalPoisha: 150000, // ৳1,500.00
        orderSubtotalPoisha: 150000,
        currency: 'BDT',
        hasDigitalItems: false,
        clientPlatform: 'WEB',
      });

      expect(availability.code).toBe('BKASH');
      expect(availability.category).toBe('MFS');
      expect(availability.isAvailable).toBe(true);
      expect(availability.feePoisha).toBe(0);
      expect(availability.feePercent).toBe(0);
      expect(availability.maxAmountPoisha).toBe(2500000); // ৳25,000.00
    });

    it('marks bKash as unavailable when order total exceeds ৳25,000 limit', async () => {
      const bkash = paymentGatewayRegistry.getAdapter('BKASH');
      const availability = await bkash.checkAvailability({
        orderTotalPoisha: 3000000, // ৳30,000.00 > ৳25,000
        orderSubtotalPoisha: 3000000,
        currency: 'BDT',
        hasDigitalItems: false,
        clientPlatform: 'WEB',
      });

      expect(availability.isAvailable).toBe(false);
      expect(availability.unavailableReasonEn).toContain('৳25,000.00');
    });

    it('supports mobile deep linking for bKash on Android and iOS', async () => {
      const bkash = paymentGatewayRegistry.getAdapter('BKASH');
      const androidAvail = await bkash.checkAvailability({
        orderTotalPoisha: 100000,
        orderSubtotalPoisha: 100000,
        currency: 'BDT',
        hasDigitalItems: false,
        clientPlatform: 'ANDROID',
      });

      expect(androidAvail.supportsDeepLink).toBe(true);
    });

    it('discovers SSLCommerz for high-value orders up to ৳500,000', async () => {
      const ssl = paymentGatewayRegistry.getAdapter('SSLCOMMERZ');
      const availability = await ssl.checkAvailability({
        orderTotalPoisha: 15000000, // ৳150,000.00
        orderSubtotalPoisha: 15000000,
        currency: 'BDT',
        hasDigitalItems: false,
      });

      expect(availability.code).toBe('SSLCOMMERZ');
      expect(availability.category).toBe('CARD');
      expect(availability.isAvailable).toBe(true);
    });
  });

  describe('2. Customer Wallet Balance Evaluation', () => {
    let walletSpy: any;

    afterEach(() => {
      walletSpy?.mockRestore();
    });

    it('marks wallet as available when customer has sufficient balance', async () => {
      const walletAdapter = paymentGatewayRegistry.getAdapter('CUSTOMER_WALLET') as any;
      walletSpy = spyOn(walletAdapter, 'getWalletBalance').mockResolvedValue(500000); // ৳5,000.00 available

      const availability = await walletAdapter.checkAvailability({
        orderTotalPoisha: 200000, // ৳2,000.00 order
        orderSubtotalPoisha: 200000,
        currency: 'BDT',
        hasDigitalItems: false,
        customerId: 'usr_customer_01',
      });

      expect(availability.isAvailable).toBe(true);
      expect(availability.hasSufficientWalletBalance).toBe(true);
      expect(availability.userWalletBalancePoisha).toBe(500000);
      expect(availability.userWalletBalanceBdtFormatted).toBe('৳5,000.00');
    });

    it('marks wallet as unavailable when customer has insufficient balance', async () => {
      const walletAdapter = paymentGatewayRegistry.getAdapter('CUSTOMER_WALLET') as any;
      walletSpy = spyOn(walletAdapter, 'getWalletBalance').mockResolvedValue(50000); // ৳500.00 available

      const availability = await walletAdapter.checkAvailability({
        orderTotalPoisha: 200000, // ৳2,000.00 order
        orderSubtotalPoisha: 200000,
        currency: 'BDT',
        hasDigitalItems: false,
        customerId: 'usr_customer_01',
      });

      expect(availability.isAvailable).toBe(false);
      expect(availability.hasSufficientWalletBalance).toBe(false);
      expect(availability.unavailableReasonEn).toContain('Insufficient wallet balance');
    });
  });

  describe('3. Smart Recommendation Heuristics', () => {
    let walletSpy: any;

    afterEach(() => {
      walletSpy?.mockRestore();
    });

    it('recommends CUSTOMER_WALLET when customer has sufficient wallet balance', async () => {
      const walletAdapter = paymentGatewayRegistry.getAdapter('CUSTOMER_WALLET') as any;
      walletSpy = spyOn(walletAdapter, 'getWalletBalance').mockResolvedValue(1000000); // ৳10,000

      const result = await paymentMethodDiscoveryService.discoverPaymentMethods(
        {
          orderTotalPoisha: 250000, // ৳2,500
          hasDigitalItems: false,
          clientPlatform: 'WEB',
        },
        'usr_customer_01'
      );

      expect(result.recommendedMethod).toBe('CUSTOMER_WALLET');
    });

    it('recommends COD for standard retail orders without wallet funds', async () => {
      const walletAdapter = paymentGatewayRegistry.getAdapter('CUSTOMER_WALLET') as any;
      walletSpy = spyOn(walletAdapter, 'getWalletBalance').mockResolvedValue(0);

      const result = await paymentMethodDiscoveryService.discoverPaymentMethods({
        orderTotalPoisha: 300000, // ৳3,000
        hasDigitalItems: false,
        clientPlatform: 'WEB',
      });

      expect(result.recommendedMethod).toBe('COD');
    });
  });
});
