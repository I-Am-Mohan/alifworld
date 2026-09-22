/**
 * AlifWorld Multi-Currency Data Models and Formatters
 * 
 * Supports 3 core parameters per currency:
 * 1. Name / Code (e.g. BDT, INR, USD, EUR)
 * 2. Symbol (e.g. ৳, ₹, $, €)
 * 3. Position ('left' | 'right' -> e.g. ৳ 100 vs 100 ৳)
 */

import { z } from 'zod';

export const CURRENCY_MINOR_UNITS = {
  BDT: 2,
  USD: 2,
  INR: 2,
  EUR: 2,
  GBP: 2,
  AED: 2,
  SAR: 2,
  JPY: 0,
} as const;

export type CurrencyCode = keyof typeof CURRENCY_MINOR_UNITS;
export const CurrencyCodeSchema = z.enum(Object.keys(CURRENCY_MINOR_UNITS) as [CurrencyCode, ...CurrencyCode[]]);

export interface CurrencyConfig {
  name: string;
  symbol: string;
  position: 'left' | 'right';
}

export const DEFAULT_CURRENCIES: CurrencyConfig[] = [
  { name: 'BDT', symbol: '৳', position: 'left' },
  { name: 'USD', symbol: '$', position: 'left' },
  { name: 'INR', symbol: '₹', position: 'left' },
];

/**
 * Safely parses currency configuration from database JSON or legacy comma-delimited string.
 */
export function parseCurrencies(raw: string | undefined | null): CurrencyConfig[] {
  if (!raw) return DEFAULT_CURRENCIES;

  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const normalized = parsed
        .map((item) => ({
          name: String(item.name || '').trim().toUpperCase(),
          symbol: String(item.symbol || '').trim(),
          position: item.position === 'right' ? ('right' as const) : ('left' as const),
        }))
        .filter((c) => Boolean(c.name && c.symbol));

      if (normalized.length > 0) {
        return normalized;
      }
    }
  } catch {
    // Non-JSON or legacy comma-separated string fallback
  }

  const legacyList = String(raw)
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const symbolMap: Record<string, string> = {
    BDT: '৳',
    USD: '$',
    INR: '₹',
    EUR: '€',
    GBP: '£',
    AED: 'AED',
    SAR: 'SAR',
    JPY: '¥',
  };

  if (legacyList.length === 0) {
    return DEFAULT_CURRENCIES;
  }

  return legacyList.map((code) => ({
    name: code,
    symbol: symbolMap[code] || code,
    position: 'left' as const,
  }));
}

export function isSupportedCurrencyCode(value: string): value is CurrencyCode {
  return Object.prototype.hasOwnProperty.call(CURRENCY_MINOR_UNITS, value.toUpperCase());
}

export function assertCurrencyCode(value: string): CurrencyCode {
  const code = value.toUpperCase();
  if (!isSupportedCurrencyCode(code)) throw new Error(`Unsupported currency code: ${value}`);
  return code;
}

/** Formats integer minor units without converting through JavaScript Number. */
export function formatMinorUnitAmount(
  minorUnits: bigint,
  currency: CurrencyCode = 'BDT',
  locale: 'en-BD' | 'bn-BD' = 'en-BD'
): string {
  const code = assertCurrencyCode(currency);
  const fractionDigits = CURRENCY_MINOR_UNITS[code];
  const negative = minorUnits < 0n;
  const absolute = negative ? -minorUnits : minorUnits;
  const divisor = 10n ** BigInt(fractionDigits);
  const whole = absolute / divisor;
  const fraction = fractionDigits === 0 ? '' : `.${(absolute % divisor).toString().padStart(fractionDigits, '0')}`;
  const wholeText = new Intl.NumberFormat(locale === 'bn-BD' ? 'en-US' : 'en-US').format(whole);
  const symbol = DEFAULT_CURRENCIES.find((item) => item.name === code)?.symbol || code;
  const value = `${negative ? '-' : ''}${wholeText}${fraction}`;
  return locale === 'bn-BD' && code === 'BDT' ? `৳${value}` : `${symbol} ${value}`;
}

/**
 * Formats a monetary amount using the designated currency configuration.
 */
export function formatCurrencyAmount(
  amount: number | string | bigint,
  currencyNameOrConfig: string | CurrencyConfig = 'BDT',
  currencies: CurrencyConfig[] = DEFAULT_CURRENCIES
): string {
  const config =
    typeof currencyNameOrConfig === 'string'
      ? currencies.find((c) => c.name.toUpperCase() === currencyNameOrConfig.toUpperCase()) || {
          name: currencyNameOrConfig,
          symbol: currencyNameOrConfig === 'BDT' ? '৳' : currencyNameOrConfig,
          position: 'left' as const,
        }
      : currencyNameOrConfig;

  let formattedValue = '';
  if (typeof amount === 'number') {
    formattedValue = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else if (typeof amount === 'bigint') {
    const code = assertCurrencyCode(config.name);
    const fractionDigits = CURRENCY_MINOR_UNITS[code];
    const negative = amount < 0n;
    const absolute = negative ? -amount : amount;
    const divisor = 10n ** BigInt(fractionDigits);
    const whole = absolute / divisor;
    const fraction = fractionDigits === 0 ? '' : `.${(absolute % divisor).toString().padStart(fractionDigits, '0')}`;
    formattedValue = `${negative ? '-' : ''}${new Intl.NumberFormat('en-US').format(whole)}${fraction}`;
  } else {
    formattedValue = String(amount);
  }

  return config.position === 'right'
    ? `${formattedValue} ${config.symbol}`
    : `${config.symbol} ${formattedValue}`;
}
