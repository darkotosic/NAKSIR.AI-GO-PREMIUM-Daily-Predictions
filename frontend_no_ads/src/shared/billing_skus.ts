// frontend/src/shared/billing_skus.ts

export type Sku = 'naksir_premium_7d' | 'naksir_premium_1m' | 'naksir_premium_1y';

export const SUBS_SKUS: readonly Sku[] = [
  'naksir_premium_7d',
  'naksir_premium_1m',
  'naksir_premium_1y',
] as const;
