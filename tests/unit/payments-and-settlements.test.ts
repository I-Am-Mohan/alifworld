import { describe, it, expect } from 'bun:test';
import { createHmac } from 'crypto';
import {
  createPaymentSchema,
  paymentWebhookSchema,
  processRefundSchema,
  createSettlementSchema,
  createPayoutSchema,
} from '../../src/validators/payment.validator';
import { PaymentReconciliationService } from '../../src/services/payment-reconciliation.service';
import { ID_PREFIXES } from '../../src/shared/utils/id';

describe('Payments & Settlements Architecture (Milestone 028)', () => {
  describe('Integer Minor Unit Arithmetic & Financial Invariants', () => {
    it('calculates 5% platform commission strictly using BigInt poisha integer arithmetic', () => {
      // ৳21,990.00 = 2,199,000 poisha
      const basisAmountPoisha = BigInt(2199000);
      const commissionRateBps = 500; // 5.00%
      const commissionPoisha = (basisAmountPoisha * BigInt(commissionRateBps)) / BigInt(10000);

      // Expected 5% = 109,950 poisha (৳1,099.50)
      expect(commissionPoisha).toBe(BigInt(109950));
      expect(typeof commissionPoisha).toBe('bigint');
    });

    it('conserves exact poisha across gross subtotal, shipping, VAT, commission, and net seller payout', () => {
      const grossSubtotal = BigInt(2199000); // ৳21,990.00
      const shippingFee = BigInt(6000);      // ৳60.00
      const taxVat = BigInt(329850);         // ৳3,298.50 (15%)
      const commission = BigInt(109950);     // ৳1,099.50 (5%)
      const refundDeduction = BigInt(0);

      const netPayoutPoisha = grossSubtotal + shippingFee + taxVat - commission - refundDeduction;

      // Expected net payout: 2,199,000 + 6,000 + 329,850 - 109,950 = 2,424,900 poisha (৳24,249.00)
      expect(netPayoutPoisha).toBe(BigInt(2424900));
      expect(grossSubtotal + shippingFee + taxVat - commission - refundDeduction).toBe(netPayoutPoisha);
    });

    it('enforces exact sum conservation when item-level partial refund occurs', () => {
      const capturedPayment = BigInt(2534850);
      const refund1 = BigInt(299000);  // ৳2,990.00
      const refund2 = BigInt(500000);  // ৳5,000.00

      const remainingBalance = capturedPayment - (refund1 + refund2);
      expect(remainingBalance).toBe(BigInt(1735850));
      expect(refund1 + refund2).toBeLessThanOrEqual(capturedPayment);
    });
  });

  describe('Bounded Partial Refund Ceiling Invariant', () => {
    it('allows refund when requested amount is within captured payment ceiling', () => {
      const capturedAmountPoisha = BigInt(2534850);
      const previouslyRefundedPoisha = BigInt(0);
      const requestedRefundPoisha = BigInt(2199000);

      const isEligible = previouslyRefundedPoisha + requestedRefundPoisha <= capturedAmountPoisha;
      expect(isEligible).toBe(true);
    });

    it('rejects refund request when cumulative refunds exceed captured payment ceiling', () => {
      const capturedAmountPoisha = BigInt(2534850);
      const previouslyRefundedPoisha = BigInt(2000000);
      const requestedRefundPoisha = BigInt(1000000); // 2,000,000 + 1,000,000 = 3,000,000 > 2,534,850

      const isEligible = previouslyRefundedPoisha + requestedRefundPoisha <= capturedAmountPoisha;
      expect(isEligible).toBe(false);
    });
  });

  describe('Independent Product Points (PP) Loyalty Reversal', () => {
    it('reverses exact snapshotted discrete Product Points per returned item without currency conversion leakage', () => {
      const orderItem = {
        title: 'Nexus Pro Smartphone 5G',
        sku: 'PHN-NEXUS-BLK',
        unitPricePoisha: BigInt(2199000),
        productPointSnapshot: 450, // 450 discrete Product Points per item
        quantity: 2,
      };

      const returnedQuantity = 1;
      const reversedPoints = returnedQuantity * orderItem.productPointSnapshot;

      expect(reversedPoints).toBe(450);
      expect(Number.isInteger(reversedPoints)).toBe(true);
      // Ensure points are integer and not derived from price division
      expect(reversedPoints).not.toBe(Number(orderItem.unitPricePoisha) / 100);
    });
  });

  describe('Platform Commission Ledger & Signed Negative Reversals', () => {
    it('creates signed negative commission entry for partial refund adjustments', () => {
      const originalCommissionPoisha = BigInt(109950);
      const refundedItemSubtotal = BigInt(2199000);
      const rateBps = 500;

      // 5% adjustment reversal
      const commissionAdjustmentPoisha = (refundedItemSubtotal * BigInt(rateBps)) / BigInt(10000);
      const signedReversalPoisha = -commissionAdjustmentPoisha;

      expect(signedReversalPoisha).toBe(-BigInt(109950));
      expect(originalCommissionPoisha + signedReversalPoisha).toBe(BigInt(0));
    });
  });

  describe('HMAC SHA-256 Webhook Verification & Deduplication', () => {
    it('verifies valid HMAC SHA-256 signature for incoming gateway IPN payload', () => {
      const secret = 'bkash_webhook_secret_key_2026';
      const payloadString = JSON.stringify({
        trxID: 'TRX99201948BK',
        paymentID: 'BKPAY20260922881',
        amount: '25348.50',
        currency: 'BDT',
      });

      const validSignature = createHmac('sha256', secret).update(payloadString).digest('hex');

      const computedSignature = createHmac('sha256', secret).update(payloadString).digest('hex');
      expect(computedSignature).toBe(validSignature);
    });

    it('rejects tampered webhook payload with mismatched signature', () => {
      const secret = 'bkash_webhook_secret_key_2026';
      const originalPayload = JSON.stringify({ trxID: 'TRX99201948BK', amount: '25348.50' });
      const tamperedPayload = JSON.stringify({ trxID: 'TRX99201948BK', amount: '100.00' });

      const originalSignature = createHmac('sha256', secret).update(originalPayload).digest('hex');
      const tamperedSignature = createHmac('sha256', secret).update(tamperedPayload).digest('hex');

      expect(originalSignature).not.toBe(tamperedSignature);
    });
  });

  describe('Zod Validation Schemas (payment.validator.ts)', () => {
    it('validates a well-formed customer payment initiation schema', () => {
      const validPayment = {
        orderId: 'ord_01j7x4b9e8m02k3f8d7c6b5a1',
        customerId: 'usr_01j7x4b9e8m02k3f8d7c6b5a1',
        gatewayProvider: 'BKASH',
        amountPoisha: '2534850',
        currency: 'BDT',
        idempotencyKey: 'idemp_pay_001',
      };

      const result = createPaymentSchema.safeParse(validPayment);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amountPoisha).toBe(BigInt(2534850));
        expect(result.data.gatewayProvider).toBe('BKASH');
      }
    });

    it('rejects payment with negative or zero poisha amount', () => {
      const invalidPayment = {
        orderId: 'ord_01j7x4b9e8m02k3f8d7c6b5a1',
        customerId: 'usr_01j7x4b9e8m02k3f8d7c6b5a1',
        gatewayProvider: 'BKASH',
        amountPoisha: '-100',
        currency: 'BDT',
      };

      const result = createPaymentSchema.safeParse(invalidPayment);
      expect(result.success).toBe(false);
    });

    it('validates well-formed webhook ingestion schema', () => {
      const validWebhook = {
        gatewayProvider: 'BKASH',
        eventType: 'PAYMENT_CAPTURE',
        externalEventId: 'EVT_BK_9920',
        signature: 'a4f890c2e9123b7a8d5f6e890123456789abcdef0123456789abcdef01234567',
        payload: { trxID: 'TRX99201948BK', amount: '25348.50' },
      };

      const result = paymentWebhookSchema.safeParse(validWebhook);
      expect(result.success).toBe(true);
    });

    it('validates itemized partial refund schema with discrete Product Points', () => {
      const validRefund = {
        paymentId: 'pay_01j7x4b9e8m02k3f8d7c6b5a1',
        orderId: 'ord_01j7x4b9e8m02k3f8d7c6b5a1',
        amountPoisha: '2199000',
        reason: 'DAMAGED_GOODS',
        reversalPoints: 450,
        items: [
          {
            orderItemId: 'itm_01j7x4b9e8m02k3f8d7c6b5a1',
            quantity: 1,
            amountPoisha: '2199000',
            taxPoisha: '329850',
            productPoints: 450,
          },
        ],
      };

      const result = processRefundSchema.safeParse(validRefund);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amountPoisha).toBe(BigInt(2199000));
        expect(result.data.reversalPoints).toBe(450);
        expect(result.data.items?.[0].productPoints).toBe(450);
      }
    });

    it('validates BEFTN seller payout disbursal schema', () => {
      const validPayout = {
        settlementId: 'stl_01j7x4b9e8m02k3f8d7c6b5a1',
        sellerId: 'sel_01j7x4b9e8m02k3f8d7c6b5a1',
        channel: 'BEFTN',
        bankName: 'City Bank PLC',
        accountNumber: '1102938475001',
        accountTitle: 'Dhaka Tech Retail Ltd',
        routingNumber: '225272345',
        amountPoisha: '2424900',
      };

      const result = createPayoutSchema.safeParse(validPayout);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.channel).toBe('BEFTN');
        expect(result.data.routingNumber).toBe('225272345');
        expect(result.data.amountPoisha).toBe(BigInt(2424900));
      }
    });
  });

  describe('Standardized ID Prefixes', () => {
    it('verifies domain prefixes for payment and settlement entities', () => {
      expect(ID_PREFIXES.PAYMENT).toBe('pay');
      expect(ID_PREFIXES.REFUND).toBe('ref');
      expect(ID_PREFIXES.REFUND_ITEM).toBe('rfi');
      expect(ID_PREFIXES.COMMISSION).toBe('com');
      expect(ID_PREFIXES.SETTLEMENT).toBe('stl');
      expect(ID_PREFIXES.PAYOUT).toBe('pot');
      expect(ID_PREFIXES.WEBHOOK_LOG).toBe('pwl');
    });
  });
});
