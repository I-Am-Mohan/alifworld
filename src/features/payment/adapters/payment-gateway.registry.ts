/**
 * Payment Gateway Adapter Registry
 *
 * Central registry holding all supported Bangladesh payment adapters:
 * - BKASH: bKash MFS
 * - NAGAD: Nagad MFS
 * - UPAY: UCB Upay MFS
 * - ROCKET: DBBL Rocket MFS
 * - SSLCOMMERZ: Cards & Net Banking
 * - COD: Cash on Delivery with fraud-risk gating
 * - CUSTOMER_WALLET: AlifWorld Customer Wallet balance
 */

import { IPaymentGatewayAdapter, PaymentGatewayCode } from '../types/payment-method.types';
import { BkashPaymentAdapter } from './bkash.adapter';
import { NagadPaymentAdapter } from './nagad.adapter';
import { SslCommerzPaymentAdapter } from './sslcommerz.adapter';
import { UpayPaymentAdapter, RocketPaymentAdapter } from './upay-rocket.adapter';
import { CodPaymentAdapter } from './cod.adapter';
import { CustomerWalletPaymentAdapter } from './customer-wallet.adapter';

export class PaymentGatewayRegistry {
  private adapters = new Map<PaymentGatewayCode, IPaymentGatewayAdapter>();

  constructor() {
    this.registerAdapter(new BkashPaymentAdapter());
    this.registerAdapter(new NagadPaymentAdapter());
    this.registerAdapter(new SslCommerzPaymentAdapter());
    this.registerAdapter(new UpayPaymentAdapter());
    this.registerAdapter(new RocketPaymentAdapter());
    this.registerAdapter(new CodPaymentAdapter());
    this.registerAdapter(new CustomerWalletPaymentAdapter());
  }

  public registerAdapter(adapter: IPaymentGatewayAdapter): void {
    this.adapters.set(adapter.code, adapter);
  }

  public getAdapter(code: PaymentGatewayCode | string): IPaymentGatewayAdapter {
    const cleanCode = (code || '').toUpperCase() as PaymentGatewayCode;
    const adapter = this.adapters.get(cleanCode);

    if (!adapter) {
      // Default fallback to SSLCOMMERZ or BKASH
      return this.adapters.get('BKASH') || this.adapters.get('COD')!;
    }

    return adapter;
  }

  public listAdapters(): IPaymentGatewayAdapter[] {
    return Array.from(this.adapters.values());
  }
}

export const paymentGatewayRegistry = new PaymentGatewayRegistry();
