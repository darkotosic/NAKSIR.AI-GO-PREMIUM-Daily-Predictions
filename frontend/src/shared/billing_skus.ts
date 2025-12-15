// frontend/src/shared/billing_skus.ts

export type Sku =
  | 'naksir_day_1_10'
  | 'naksir_day_1_5'
  | 'naksir_day_1_unlock'
  | 'naksir_day_7_10'
  | 'naksir_day_7_5'
  | 'naksir_day_7_unlimited'
  | 'naksir_day_30_10'
  | 'naksir_day_30_5'
  | 'naksir_day_30_unlimited';

export const SUBS_SKUS: readonly Sku[] = [
  'naksir_day_1_10',
  'naksir_day_1_5',
  'naksir_day_1_unlock',
  'naksir_day_7_10',
  'naksir_day_7_5',
  'naksir_day_7_unlimited',
  'naksir_day_30_10',
  'naksir_day_30_5',
  'naksir_day_30_unlimited',
] as const;
