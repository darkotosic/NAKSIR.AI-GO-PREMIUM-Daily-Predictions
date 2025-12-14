import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as RNIap from 'react-native-iap';

import { verifyGooglePurchase } from '@api/billing';
import { SUBS_SKUS, Sku } from '../../../shared/billing_skus';

type PurchaseState = {
  isConnected: boolean;
  isLoading: boolean;
  productsLoaded: boolean;
  activeSku: Sku | null;
  lastError: string | null;
};

function normalizeSku(productId?: string | null): Sku | null {
  if (!productId) return null;
  return (SUBS_SKUS as readonly string[]).includes(productId) ? (productId as Sku) : null;
}

export function usePlayBilling() {
  const [state, setState] = useState<PurchaseState>({
    isConnected: false,
    isLoading: false,
    productsLoaded: false,
    activeSku: null,
    lastError: null,
  });

  const purchaseUpdateSub = useRef<ReturnType<typeof RNIap.purchaseUpdatedListener> | null>(null);
  const purchaseErrorSub = useRef<ReturnType<typeof RNIap.purchaseErrorListener> | null>(null);

  const isAndroid = Platform.OS === 'android';

  const setError = useCallback((msg: string) => {
    setState((s) => ({ ...s, lastError: msg }));
  }, []);

  const connect = useCallback(async () => {
    if (!isAndroid) return;

    setState((s) => ({ ...s, isLoading: true, lastError: null }));

    try {
      const ok = await RNIap.initConnection();
      setState((s) => ({ ...s, isConnected: !!ok }));

      // Optional: Android flush failed purchases
      try {
        await RNIap.flushFailedPurchasesCachedAsPendingAndroid?.();
      } catch {
        // ignore
      }

      // Load products
      try {
        await RNIap.getSubscriptions({ skus: [...SUBS_SKUS] as string[] } as any);
        setState((s) => ({ ...s, productsLoaded: true }));
      } catch (e: any) {
        setError(`Failed to load subscriptions: ${e?.message || String(e)}`);
      }
    } catch (e: any) {
      setError(`IAP initConnection failed: ${e?.message || String(e)}`);
      setState((s) => ({ ...s, isConnected: false }));
    } finally {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, [isAndroid, setError]);

  const disconnect = useCallback(async () => {
    try {
      purchaseUpdateSub.current?.remove?.();
      purchaseErrorSub.current?.remove?.();
      purchaseUpdateSub.current = null;
      purchaseErrorSub.current = null;
    } catch {
      // ignore
    }

    try {
      await RNIap.endConnection();
    } catch {
      // ignore
    }

    setState((s) => ({ ...s, isConnected: false }));
  }, []);

  const refreshEntitlement = useCallback(async () => {
    if (!isAndroid) return;

    try {
      const purchases = await RNIap.getAvailablePurchases();
      const active = purchases
        .map((p: any) => normalizeSku(p?.productId))
        .find((sku) => !!sku) ?? null;

      setState((s) => ({ ...s, activeSku: active }));
    } catch (e: any) {
      setError(`Failed to read purchases: ${e?.message || String(e)}`);
    }
  }, [isAndroid, setError]);

  const startListeners = useCallback(() => {
    if (!isAndroid) return;

    // Purchase update listener
    purchaseUpdateSub.current = RNIap.purchaseUpdatedListener(async (purchase: any) => {
      try {
        const productId: string | undefined = purchase?.productId;
        const purchaseToken: string | undefined =
          purchase?.purchaseToken || purchase?.transactionReceipt || purchase?.transactionId;

        const sku = normalizeSku(productId);
        if (!sku) return;

        // Server verify + entitlement grant
        await verifyGooglePurchase({
          sku,
          purchaseToken: purchaseToken ?? '',
          productId: productId ?? '',
          platform: 'android',
        } as any);

        // Acknowledge / finish
        try {
          await RNIap.finishTransaction({ purchase, isConsumable: false } as any);
        } catch {
          // ignore
        }

        setState((s) => ({ ...s, activeSku: sku }));
      } catch (e: any) {
        setError(`Purchase processing failed: ${e?.message || String(e)}`);
      }
    });

    // Purchase error listener
    purchaseErrorSub.current = RNIap.purchaseErrorListener((err: any) => {
      setError(`Purchase error: ${err?.message || JSON.stringify(err)}`);
    });
  }, [isAndroid, setError]);

  const buySubscription = useCallback(
    async (sku: Sku) => {
      if (!isAndroid) {
        setError('Subscriptions are only supported on Android in this build.');
        return;
      }

      setState((s) => ({ ...s, isLoading: true, lastError: null }));

      try {
        // For many versions:
        await RNIap.requestSubscription({ sku } as any);
      } catch (e: any) {
        setError(`requestSubscription failed: ${e?.message || String(e)}`);
      } finally {
        setState((s) => ({ ...s, isLoading: false }));
      }
    },
    [isAndroid, setError],
  );

  useEffect(() => {
    if (!isAndroid) return;

    connect().then(() => {
      startListeners();
      refreshEntitlement();
    });

    return () => {
      disconnect();
    };
  }, [isAndroid, connect, startListeners, refreshEntitlement, disconnect]);

  return useMemo(
    () => ({
      ...state,
      buySubscription,
      refreshEntitlement,
    }),
    [state, buySubscription, refreshEntitlement],
  );
}
