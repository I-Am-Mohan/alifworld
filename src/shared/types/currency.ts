/**
 * AlifWorld Multi-Currency Data Models and Formatters
 * 
 * Supports 3 core parameters per currency:
 * 1. Name / Code (e.g. BDT, INR, USD, EUR)
 * 2. Symbol (e.g. ৳, ₹, $, €)
 * 3. Position ('left' | 'right' -> e.g. ৳ 100 vs 100 ৳)
 */

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
    // If poisha (BigInt), convert to main unit with 2 decimals
    const num = Number(amount) / 100;
    formattedValue = num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else {
    formattedValue = String(amount);
  }

  return config.position === 'right'
    ? `${formattedValue} ${config.symbol}`
    : `${config.symbol} ${formattedValue}`;
}
