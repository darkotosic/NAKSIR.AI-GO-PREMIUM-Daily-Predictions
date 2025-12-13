import { useEffect, useState, useCallback, useRef } from 'react';
import * as InAppPurchases from 'expo-in-app-purchases';

/**
 * SKU DEFINICIJE
 * MORAJU 1:1 da se poklapaju sa Google Play Console
 */
export const BILLING_SKUS = {
  // 1 DAY
  DAY_1_5: 'naksir_day_1_5_analysis',          // 5$
  DAY_1_10: 'naksir_day_1_10_analysis',        // 10$
  DAY_1_UNLIMITED: 'naksir_day_1_unlimited',  // 25$

  // 7 DAYS
  DAY_7_5: 'naksir_7_days_5_per_day',          // 25$
  DAY_7_10: 'naksir_7_days_10_per_day',        // 35$
  DAY_7_UNLIMITED: 'naksir_7_days_unlimited', // 45$

  // 30 DAYS
  DAY_30_5: 'naksir_30_days_5_per_day',        // 100$
  DAY_30_10: 'naksir_30_days_10_per_day',      // 150$
  DAY_30_UNLIMITED: 'naksir_30_days_unlimited'// 200$
};

/**
 * REDOSLED PRIKAZA (UI)
 */
const PRODUCT_ORDER = Object.values(BILLING_SKUS);

/**
 * Tip za jedan billing proizvod
 */
export type BillingProduct = {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmountMicros?: number;
  priceCurrencyCode?: string;
};

export function usePlayBilling() {
  const isMounted = useRef(true);
  const [connected, setConnected] = useState(false);
  const [products, setProducts] = useState<BillingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const { responseCode, results } =
        await InAppPurchases.getProductsAsync(PRODUCT_ORDER);

      if (responseCode !== InAppPurchases.IAPResponseCode.OK) {
        throw new Error(`Billing response code: ${responseCode}`);
      }

      if (isMounted.current) {
        const sorted = (results || []).sort(
          (a: any, b: any) =>
            PRODUCT_ORDER.indexOf(a.productId) -
            PRODUCT_ORDER.indexOf(b.productId)
        );

        setProducts(sorted);
      }
    } catch (e: any) {
      console.error('Play Billing products fetch error:', e);
      if (isMounted.current) {
        setError(e?.message || 'Failed to load billing products');
      }
      throw e;
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    if (!isMounted.current) return;

    setError(null);
    setLoading(true);

    try {
      await fetchProducts();
    } catch (e) {
      // fetchProducts already handled logging and error state
      console.error('Play Billing refresh error:', e);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [fetchProducts]);

  /**
   * INIT Play Billing
   */
  useEffect(() => {
    async function initBilling() {
      try {
        setError(null);
        setLoading(true);

        await InAppPurchases.connectAsync();
        if (!isMounted.current) return;

        setConnected(true);
        await refreshProducts();
      } catch (e: any) {
        console.error('Play Billing init error:', e);
        if (isMounted.current) {
          setError(e?.message || 'Play Billing init failed');
        }
      } finally {
        if (isMounted.current) setLoading(false);
      }
    }

    initBilling();

    return () => {
      isMounted.current = false;
      InAppPurchases.disconnectAsync();
    };
  }, [refreshProducts]);

  /**
   * Pokretanje kupovine
   */
  const purchase = useCallback(async (productId: string) => {
    try {
      if (!connected) {
        throw new Error('Billing not connected');
      }

      const result = await InAppPurchases.purchaseItemAsync(productId);
      return result; // purchaseToken ide backendu
    } catch (e) {
      console.error('Purchase error:', e);
      throw e;
    }
  }, [connected]);

  return {
    connected,
    loading,
    error,
    products,
    purchase,
    refreshProducts,
    SKUS: BILLING_SKUS
  };
}
