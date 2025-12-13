// frontend/src/billing/usePlayBilling.ts
//
// Subscription-first billing layer for Naksir Go Premium.
// Works with expo-iap. SKUs must match Google Play Console subscriptions exactly.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIAP } from 'expo-iap';

import { verifyGooglePurchase } from '@api/billing';

export const BILLING_SKUS = {
  // 1 DAY
  DAY_1_5: 'naksir_day_1_5_',
  DAY_1_10: 'naksir_day_1_10_',
  DAY_1_UNLIMITED: 'naksir_day_1_unlock',

  // 7 DAYS
  DAY_7_5: 'naksir_day_7_5',
  DAY_7_10: 'naksir_day_7_10',
  DAY_7_UNLIMITED: 'naksir_day_7_unlimited',

  // 30 DAYS
  DAY_30_5: 'naksir_day_30_5',
  DAY_30_10: 'naksir_day_30_10',
  DAY_30_UNLIMITED: 'naksir_day_30_unlimited',
} as const;

export type BillingSku = (typeof BILLING_SKUS)[keyof typeof BILLING_SKUS];

const SUBSCRIPTION_ORDER: BillingSku[] = [
  BILLING_SKUS.DAY_1_5,
  BILLING_SKUS.DAY_1_10,
  BILLING_SKUS.DAY_1_UNLIMITED,
  BILLING_SKUS.DAY_7_5,
  BILLING_SKUS.DAY_7_10,
  BILLING_SKUS.DAY_7_UNLIMITED,
  BILLING_SKUS.DAY_30_5,
  BILLING_SKUS.DAY_30_10,
  BILLING_SKUS.DAY_30_UNLIMITED,
];

type AnyProduct = any;

type UsePlayBillingReturn = {
  connected: boolean;
  loading: boolean;
  error: string | null;
  products: AnyProduct[];
  buy: (sku: BillingSku) => Promise<void>;
  SKUS: typeof BILLING_SKUS;
};

export function usePlayBilling(): UsePlayBillingReturn {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      try {
        /**
         * IMPORTANT:
         * 1) Send purchase to backend for verification + entitlement creation.
         * 2) Only after backend confirms, finish the transaction.
         */

        await verifyGooglePurchase({
          packageName: (purchase as any)?.packageNameAndroid || 'com.naksir.soccerpredictions',
          productId: (purchase as any)?.productId || (purchase as any)?.sku || '',
          purchaseToken: (purchase as any)?.purchaseToken || '',
        });

        await finishTransaction({
          purchase,
          // subscriptions are not consumables
          isConsumable: false,
        });
      } catch (e: any) {
        setError(e?.message || 'Failed to finalize subscription purchase');
      }
    },
    onPurchaseError: (e) => {
      setError((e as any)?.message || 'Purchase failed');
    },
  });

  // Load subscriptions list when connected
  useEffect(() => {
    (async () => {
      try {
        if (!connected) return;
        setLoading(true);
        setError(null);

        await fetchProducts({
          skus: SUBSCRIPTION_ORDER,
          type: 'subs',
        });
      } catch (e: any) {
        setError(e?.message || 'Failed to fetch subscriptions');
      } finally {
        setLoading(false);
      }
    })();
  }, [connected, fetchProducts]);

  // Sort products by our preferred order
  const sortedProducts = useMemo(() => {
    const list = (products || []) as AnyProduct[];

    return list.slice().sort((a, b) => {
      const aId = String(a?.id ?? a?.productId ?? '');
      const bId = String(b?.id ?? b?.productId ?? '');
      const ai = SUBSCRIPTION_ORDER.indexOf(aId as BillingSku);
      const bi = SUBSCRIPTION_ORDER.indexOf(bId as BillingSku);

      // Unknown items go last
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [products]);

  const buy = useCallback(
    async (sku: BillingSku) => {
      setError(null);
      if (!connected) throw new Error('Billing not connected');

      await requestPurchase({
        type: 'subs',
        request: {
          android: { skus: [sku] },
          ios: { sku }, // future-proof if you add iOS later
        },
      });
    },
    [connected, requestPurchase]
  );

  return {
    connected,
    loading,
    error,
    products: sortedProducts,
    buy,
    SKUS: BILLING_SKUS,
  };
}
