import type { Subscription } from 'react-native-iap';

export function pickBestPriceString(p: Subscription): string | null {
  // Best effort: prefer localizedPrice if present
  // Different versions of RNIAP expose different fields; handle both.
  const anyP: any = p as any;
  return (
    anyP.localizedPrice ||
    anyP.priceString ||
    anyP.subscriptionOfferDetails?.[0]?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice ||
    null
  );
}

export function pickMicrosAndCurrency(
  p: Subscription,
): { micros: number | null; currency: string | null } {
  const anyP: any = p as any;

  // subscriptionOfferDetails pricingPhaseList is Android Billing v5+ style
  const phase =
    anyP.subscriptionOfferDetails?.[0]?.pricingPhases?.pricingPhaseList?.[0] ||
    anyP.subscriptionOfferDetails?.[0]?.pricingPhases?.pricingPhaseList?.[0] ||
    null;

  const micros = phase?.priceAmountMicros ?? anyP.priceAmountMicros ?? null;
  const currency = phase?.priceCurrencyCode ?? anyP.currency ?? anyP.priceCurrencyCode ?? null;

  return {
    micros: typeof micros === 'number' ? micros : null,
    currency: typeof currency === 'string' ? currency : null,
  };
}

export function microsToNumber(micros: number): number {
  return micros / 1_000_000;
}

export function perDay(total: number, days: number): number {
  if (!days || days <= 0) return total;
  return total / days;
}

export function formatMoney(value: number, currency: string | null): string {
  // Best effort: Intl is supported in RN Hermes; fallback to raw.
  try {
    if (!currency) return value.toFixed(2);
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return currency ? `${currency} ${value.toFixed(2)}` : value.toFixed(2);
  }
}
