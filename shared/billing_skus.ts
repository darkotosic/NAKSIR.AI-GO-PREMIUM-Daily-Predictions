export const SUBS_SKUS = [
  "naksir_day_1_10",
  "naksir_day_1_5",
  "naksir_day_1_unlock",
  "naksir_day_7_10",
  "naksir_day_7_5",
  "naksir_day_7_unlimited",
  "naksir_day_30_10",
  "naksir_day_30_5",
  "naksir_day_30_unlimited",
] as const;

export type Sku = (typeof SUBS_SKUS)[number];

export type EntitlementPlan = {
  sku: Sku;
  periodDays: 1 | 7 | 30;
  // “dailyLimit” važi samo za “per day” planove
  dailyLimit: number | null;
  // “totalAllowance” važi za 1-day 5/10 (nije “per day” nego total za period)
  totalAllowance: number | null;
  unlimited: boolean;
};

export const SKU_TO_PLAN: Record<Sku, EntitlementPlan> = {
  naksir_day_1_10: {
    sku: "naksir_day_1_10",
    periodDays: 1,
    dailyLimit: null,
    totalAllowance: 10,
    unlimited: false,
  },
  naksir_day_1_5: {
    sku: "naksir_day_1_5",
    periodDays: 1,
    dailyLimit: null,
    totalAllowance: 5,
    unlimited: false,
  },
  naksir_day_1_unlock: {
    sku: "naksir_day_1_unlock",
    periodDays: 1,
    dailyLimit: null,
    totalAllowance: null,
    unlimited: true,
  },

  naksir_day_7_10: {
    sku: "naksir_day_7_10",
    periodDays: 7,
    dailyLimit: 10,
    totalAllowance: null,
    unlimited: false,
  },
  naksir_day_7_5: {
    sku: "naksir_day_7_5",
    periodDays: 7,
    dailyLimit: 5,
    totalAllowance: null,
    unlimited: false,
  },
  naksir_day_7_unlimited: {
    sku: "naksir_day_7_unlimited",
    periodDays: 7,
    dailyLimit: null,
    totalAllowance: null,
    unlimited: true,
  },

  naksir_day_30_10: {
    sku: "naksir_day_30_10",
    periodDays: 30,
    dailyLimit: 10,
    totalAllowance: null,
    unlimited: false,
  },
  naksir_day_30_5: {
    sku: "naksir_day_30_5",
    periodDays: 30,
    dailyLimit: 5,
    totalAllowance: null,
    unlimited: false,
  },
  naksir_day_30_unlimited: {
    sku: "naksir_day_30_unlimited",
    periodDays: 30,
    dailyLimit: null,
    totalAllowance: null,
    unlimited: true,
  },
};
