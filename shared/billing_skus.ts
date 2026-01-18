export const SUBS_SKUS = [
  "naksir_premium_7d",
  "naksir_premium_1m",
  "naksir_premium_1y",
] as const;

export type Sku = (typeof SUBS_SKUS)[number];

export type EntitlementPlan = {
  sku: Sku;
  periodDays: 7 | 30 | 365;
  dailyLimit: number | null;
  totalAllowance: number | null;
  unlimited: boolean;
};

export const SKU_TO_PLAN: Record<Sku, EntitlementPlan> = {
  naksir_premium_7d: {
    sku: "naksir_premium_7d",
    periodDays: 7,
    dailyLimit: null,
    totalAllowance: null,
    unlimited: true,
  },
  naksir_premium_1m: {
    sku: "naksir_premium_1m",
    periodDays: 30,
    dailyLimit: null,
    totalAllowance: null,
    unlimited: true,
  },
  naksir_premium_1y: {
    sku: "naksir_premium_1y",
    periodDays: 365,
    dailyLimit: null,
    totalAllowance: null,
    unlimited: true,
  },
};
