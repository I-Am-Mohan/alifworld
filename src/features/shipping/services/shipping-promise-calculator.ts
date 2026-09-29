/**
 * Pure Calculation Functions for Shipping Weight & Delivery Promise
 *
 * Invariant: All date calculations use 'Asia/Dhaka' (UTC+6) business boundaries.
 * Invariant: Friday is the primary non-working weekend in Bangladesh logistics.
 * Invariant: Courier volumetric weight standard formula: (L mm * W mm * H mm) / 5,000,000 kg.
 */

import {
  DeliveryPromiseSnapshotDTO,
  PackageWeightBreakdown,
  PromiseConfidenceLevel,
  ShippingItemInput,
} from '../types/shipping-rate.types';

// Bangladesh Day of Week (0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday)
// Friday is the official weekend in Bangladesh.
const BANGLADESH_WEEKEND_DAYS = new Set([5]); // Friday

const BANGLA_NUMERALS: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
};

const BANGLA_MONTHS = [
  'জানু',
  'ফেব্রু',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টে',
  'অক্টো',
  'নভে',
  'ডিসে',
];

const BANGLA_WEEKDAYS = [
  'রবি',
  'সোম',
  'মঙ্গল',
  'বুধ',
  'বৃহস্পতি',
  'শুক্র',
  'শনি',
];

const ENGLISH_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const ENGLISH_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function toBanglaNumber(num: number | string): string {
  return String(num).replace(/[0-9]/g, (digit) => BANGLA_NUMERALS[digit] || digit);
}

/**
 * Calculates package weight breakdown including actual and volumetric weight.
 */
export function calculatePackageWeight(items: ShippingItemInput[]): PackageWeightBreakdown {
  let totalActualGrams = 0;
  let totalVolumetricGrams = 0;

  for (const item of items) {
    if (item.requiresShipping === false || item.shippingClass === 'DIGITAL') {
      continue;
    }

    const qty = Math.max(1, item.quantity);
    const itemActualGrams = item.weightGrams ?? 250; // default 250g if unspecified
    totalActualGrams += itemActualGrams * qty;

    if (item.lengthMm && item.widthMm && item.heightMm) {
      // Volumetric weight in grams = (L mm * W mm * H mm) / 5000
      const itemVolumetricGrams = Math.round(
        (item.lengthMm * item.widthMm * item.heightMm) / 5000
      );
      totalVolumetricGrams += itemVolumetricGrams * qty;
    } else {
      // Fallback volumetric equals actual weight
      totalVolumetricGrams += itemActualGrams * qty;
    }
  }

  const chargeableWeightGrams = Math.max(totalActualGrams, totalVolumetricGrams);
  const isVolumetricDominant = totalVolumetricGrams > totalActualGrams;
  const isOverweight = chargeableWeightGrams > 10000; // >10kg is classified as overweight

  return {
    actualWeightGrams: totalActualGrams,
    volumetricWeightGrams: totalVolumetricGrams,
    chargeableWeightGrams,
    isVolumetricDominant,
    isOverweight,
  };
}

/**
 * Converts a UTC Date into an Asia/Dhaka time representation (UTC + 6 hours).
 */
export function getDhakaDateParts(date: Date): {
  year: number;
  month: number; // 0-11
  day: number; // 1-31
  dayOfWeek: number; // 0-6
  hours: number; // 0-23
  minutes: number; // 0-59
  timestamp: number;
} {
  const dhakaOffsetMs = 6 * 60 * 60 * 1000; // UTC+6
  const dhakaTime = new Date(date.getTime() + dhakaOffsetMs);

  return {
    year: dhakaTime.getUTCFullYear(),
    month: dhakaTime.getUTCMonth(),
    day: dhakaTime.getUTCDate(),
    dayOfWeek: dhakaTime.getUTCDay(),
    hours: dhakaTime.getUTCHours(),
    minutes: dhakaTime.getUTCMinutes(),
    timestamp: dhakaTime.getTime(),
  };
}

/**
 * Creates a UTC Date representing 00:00:00 Asia/Dhaka on the specified year, month, day.
 */
export function createDhakaMidnightDate(year: number, month: number, day: number): Date {
  // Midnight Dhaka is 18:00 UTC previous day
  return new Date(Date.UTC(year, month, day, 0 - 6, 0, 0, 0));
}

/**
 * Checks whether a given calendar day in Dhaka is a business day (Friday is off).
 */
export function isDhakaBusinessDay(dayOfWeek: number): boolean {
  return !BANGLADESH_WEEKEND_DAYS.has(dayOfWeek);
}

/**
 * Adds business days to a starting Dhaka date, skipping non-working days (Fridays).
 */
export function addDhakaBusinessDays(
  startYear: number,
  startMonth: number,
  startDay: number,
  businessDaysToAdd: number
): { year: number; month: number; day: number; dayOfWeek: number; date: Date } {
  const curDate = new Date(Date.UTC(startYear, startMonth, startDay, 12, 0, 0));
  let added = 0;

  while (added < businessDaysToAdd) {
    curDate.setUTCDate(curDate.getUTCDate() + 1);
    const dayOfWeek = curDate.getUTCDay();
    if (isDhakaBusinessDay(dayOfWeek)) {
      added++;
    }
  }

  const resultDate = createDhakaMidnightDate(
    curDate.getUTCFullYear(),
    curDate.getUTCMonth(),
    curDate.getUTCDate()
  );

  return {
    year: curDate.getUTCFullYear(),
    month: curDate.getUTCMonth(),
    day: curDate.getUTCDate(),
    dayOfWeek: curDate.getUTCDay(),
    date: resultDate,
  };
}

export interface PromiseCalculationParams {
  asOfDate?: Date;
  handlingDays: number;
  transitDaysMin: number;
  transitDaysMax: number;
  orderCutoffTime?: string; // "14:00"
  ruleVersion?: string;
  isGuaranteed?: boolean;
}

/**
 * Authoritative Delivery Promise calculation engine in Asia/Dhaka.
 */
export function calculateDeliveryPromise(
  params: PromiseCalculationParams
): DeliveryPromiseSnapshotDTO {
  const asOf = params.asOfDate || new Date();
  const dhakaNow = getDhakaDateParts(asOf);

  const cutoffTime = params.orderCutoffTime || '14:00';
  const [cutoffHourStr, cutoffMinuteStr] = cutoffTime.split(':');
  const cutoffHour = parseInt(cutoffHourStr, 10) || 14;
  const cutoffMinute = parseInt(cutoffMinuteStr, 10) || 0;

  const currentMinutesInDay = dhakaNow.hours * 60 + dhakaNow.minutes;
  const cutoffMinutesInDay = cutoffHour * 60 + cutoffMinute;

  const isCutoffPassed = currentMinutesInDay >= cutoffMinutesInDay;
  const cutoffRemainingMinutes = isCutoffPassed
    ? null
    : cutoffMinutesInDay - currentMinutesInDay;

  // Determine starting handling day in Dhaka
  let startYear = dhakaNow.year;
  let startMonth = dhakaNow.month;
  let startDay = dhakaNow.day;
  let startDayOfWeek = dhakaNow.dayOfWeek;

  // If cutoff passed or today is Friday, start from next business day
  if (isCutoffPassed || !isDhakaBusinessDay(startDayOfWeek)) {
    const nextBiz = addDhakaBusinessDays(startYear, startMonth, startDay, 1);
    startYear = nextBiz.year;
    startMonth = nextBiz.month;
    startDay = nextBiz.day;
    startDayOfWeek = nextBiz.dayOfWeek;
  }

  // Handling days (processing time by merchant before courier pickup)
  const handlingDays = Math.max(0, params.handlingDays);
  const dispatch =
    handlingDays > 0
      ? addDhakaBusinessDays(startYear, startMonth, startDay, handlingDays)
      : {
          year: startYear,
          month: startMonth,
          day: startDay,
          dayOfWeek: startDayOfWeek,
          date: createDhakaMidnightDate(startYear, startMonth, startDay),
        };

  // Transit days (courier transport time)
  const transitMin = Math.max(0, params.transitDaysMin);
  const transitMax = Math.max(transitMin, params.transitDaysMax);

  const minDelivery =
    transitMin > 0
      ? addDhakaBusinessDays(dispatch.year, dispatch.month, dispatch.day, transitMin)
      : dispatch;

  const maxDelivery =
    transitMax > 0
      ? addDhakaBusinessDays(dispatch.year, dispatch.month, dispatch.day, transitMax)
      : minDelivery;

  // Date formatting
  const minDateEn = `${ENGLISH_WEEKDAYS[minDelivery.dayOfWeek]}, ${minDelivery.day} ${ENGLISH_MONTHS[minDelivery.month]}`;
  const maxDateEn = `${ENGLISH_WEEKDAYS[maxDelivery.dayOfWeek]}, ${maxDelivery.day} ${ENGLISH_MONTHS[maxDelivery.month]}`;

  const minDateBn = `${BANGLA_WEEKDAYS[minDelivery.dayOfWeek]}, ${toBanglaNumber(minDelivery.day)} ${BANGLA_MONTHS[minDelivery.month]}`;
  const maxDateBn = `${BANGLA_WEEKDAYS[maxDelivery.dayOfWeek]}, ${toBanglaNumber(maxDelivery.day)} ${BANGLA_MONTHS[maxDelivery.month]}`;

  const totalMinDays = handlingDays + transitMin;
  const totalMaxDays = handlingDays + transitMax;

  let promiseTextEn: string;
  let promiseTextBn: string;

  if (totalMinDays === totalMaxDays) {
    promiseTextEn = `Delivery by ${minDateEn}`;
    promiseTextBn = `${minDateBn}-এর মধ্যে ডেলিভারি`;
  } else {
    promiseTextEn = `${totalMinDays}-${totalMaxDays} Business Days (Expected: ${minDelivery.day} ${ENGLISH_MONTHS[minDelivery.month]} - ${maxDelivery.day} ${ENGLISH_MONTHS[maxDelivery.month]})`;
    promiseTextBn = `${toBanglaNumber(totalMinDays)}-${toBanglaNumber(totalMaxDays)} কার্যদিবস (সম্ভাব্য: ${toBanglaNumber(minDelivery.day)} ${BANGLA_MONTHS[minDelivery.month]} - ${toBanglaNumber(maxDelivery.day)} ${BANGLA_MONTHS[maxDelivery.month]})`;
  }

  const isGuaranteed = Boolean(params.isGuaranteed);
  const confidenceLevel: PromiseConfidenceLevel = isGuaranteed
    ? 'GUARANTEED'
    : totalMaxDays <= 2
    ? 'HIGH'
    : 'ESTIMATED';

  // SLA Hours commitment (24 hours per business day)
  const slaHours = Math.max(24, totalMaxDays * 24);

  return {
    minEstimatedDate: minDelivery.date.toISOString(),
    maxEstimatedDate: maxDelivery.date.toISOString(),
    minEstimatedFormattedEn: minDateEn,
    maxEstimatedFormattedEn: maxDateEn,
    minEstimatedFormattedBn: minDateBn,
    maxEstimatedFormattedBn: maxDateBn,
    promiseTextEn,
    promiseTextBn,
    handlingDays,
    transitDaysMin: transitMin,
    transitDaysMax: transitMax,
    orderCutoffTime: cutoffTime,
    cutoffRemainingMinutes,
    isCutoffPassed,
    confidenceLevel,
    isGuaranteed,
    slaHours,
    appliedRuleVersion: params.ruleVersion || 'v1.0.0',
  };
}
