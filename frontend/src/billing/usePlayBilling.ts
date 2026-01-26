// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { Subscription } from 'react-native-iap';
import { finishTransaction } from 'react-native-iap';
import * as RNIap from 'react-native-iap';

import { verifyGooglePurchase } from '@api/billing';
import { useEntitlements } from '@state/EntitlementsContext';
import {
  savePendingPurchase,
  loadPendingPurchase,
  clearPendingPurchase,
} from './pendingPurchase';
import { SUBS_SKUS, Sku } from '../shared/billing_skus';

console.log('[IAP] RNIap keys:', Object.keys(RNIap || {}));
console.log('[IAP] has getSubscriptions:', typeof (RNIap as any).getSubscriptions);
console.log('[IAP] has getProducts:', typeof (RNIap as any).getProducts);

let IAP_INITIALIZED = false;
let IAP_INITIALIZING = false;

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

function toMaskedToken(token?: string) {
  if (!token) return '';
  if (token.length <= 10) return '***';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

export function usePlayBilling() {
  const [state, setState] = useState<PurchaseState>({
    isConnected: false,
    isLoading: false,
    productsLoaded: false,
    activeSku: null,
    lastError: null,
  });
  const [products, setProducts] = useState<Subscription[]>([]);
  const [productBySku, setProductBySku] = useState<Map<string, Subscription>>(new Map());

  const purchaseUpdateSub = useRef<ReturnType<typeof RNIap.purchaseUpdatedListener> | null>(null);
  const purchaseErrorSub = useRef<ReturnType<typeof RNIap.purchaseErrorListener> | null>(null);

  const isAndroid = Platform.OS === 'android';
  const { refresh: refreshServerEntitlements } = useEntitlements();

  const setError = useCallback((msg: string) => {
    setState((s) => ({ ...s, lastError: msg }));
  }, []);

  const loadSubscriptions = useCallback(async () => {
    const skus = [...SUBS_SKUS] as string[];

    if (typeof RNIap.getSubscriptions === 'function') {
      try {
        const subs = await (RNIap.getSubscriptions as any)({ skus } as any);
        setProducts(subs);
        setProductBySku(new Map(subs.map((p: Subscription) => [(p as any).productId, p])));
        console.log('[IAP] requested skus:', skus);
        console.log('[IAP] subscriptions returned:', subs?.length ?? 0);
        if (subs?.length) {
          console.log('[IAP] first sub keys:', Object.keys(subs[0] as any));
          console.log(
            '[IAP] first sub offerDetails:',
            (subs[0] as any)?.subscriptionOfferDetails ??
              (subs[0] as any)?.subscriptionOfferDetailsAndroid ??
              (subs[0] as any)?.offers,
          );
        }
        if (!subs || subs.length === 0) {
          setError(
            'No subscriptions returned from Google Play. Ensure you installed from Play (Internal testing) and your account is in License Testing.',
          );
        }
        return subs;
      } catch (error) {
        const subs = await (RNIap.getSubscriptions as any)(skus);
        setProducts(subs);
        setProductBySku(new Map(subs.map((p: Subscription) => [(p as any).productId, p])));
        console.log('[IAP] requested skus:', skus);
        console.log('[IAP] subscriptions returned:', subs?.length ?? 0);
        if (subs?.length) {
          console.log('[IAP] first sub keys:', Object.keys(subs[0] as any));
          console.log(
            '[IAP] first sub offerDetails:',
            (subs[0] as any)?.subscriptionOfferDetails ??
              (subs[0] as any)?.subscriptionOfferDetailsAndroid ??
              (subs[0] as any)?.offers,
          );
        }
        if (!subs || subs.length === 0) {
          setError(
            'No subscriptions returned from Google Play. Ensure you installed from Play (Internal testing) and your account is in License Testing.',
          );
        }
        return subs;
      }
    }

    if (typeof (RNIap as any).getProducts === 'function') {
      const productType =
        (RNIap as any).ProductType?.SUBSCRIPTION ||
        (RNIap as any).ProductType?.Subs ||
        (RNIap as any).PRODUCT_TYPE_SUBSCRIPTION;

      const subs = await (RNIap as any).getProducts({
        skus,
        type: productType,
      } as any);
      setProducts(subs);
      setProductBySku(new Map(subs.map((p: Subscription) => [(p as any).productId, p])));
      console.log('[IAP] requested skus:', skus);
      console.log('[IAP] subscriptions returned:', subs?.length ?? 0);
      if (subs?.length) {
        console.log('[IAP] first sub keys:', Object.keys(subs[0] as any));
        console.log(
          '[IAP] first sub offerDetails:',
          (subs[0] as any)?.subscriptionOfferDetails ??
            (subs[0] as any)?.subscriptionOfferDetailsAndroid ??
            (subs[0] as any)?.offers,
        );
      }
      if (!subs || subs.length === 0) {
        setError(
          'No subscriptions returned from Google Play. Ensure you installed from Play (Internal testing) and your account is in License Testing.',
        );
      }
      return subs;
    }

    throw new Error('Subscriptions API is unavailable in react-native-iap.');
  }, [setError]);

  const reloadProducts = useCallback(async () => {
    if (!isAndroid) return;
    setState((s) => ({ ...s, isLoading: true, lastError: null }));

    try {
      await loadSubscriptions();
      setState((s) => ({ ...s, productsLoaded: true }));
    } catch (e: any) {
      setError(`Failed to load subscriptions: ${e?.message || String(e)}`);
    } finally {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, [isAndroid, loadSubscriptions, setError]);

  const initIap = useCallback(async () => {
    if (!isAndroid) return;
    if (IAP_INITIALIZED || IAP_INITIALIZING) {
      console.log('[IAP] init skipped (already initialized)');
      return;
    }

    IAP_INITIALIZING = true;
    console.log('[IAP] init start');
    setState((s) => ({ ...s, isLoading: true, lastError: null }));

    try {
      await RNIap.enablePendingPurchasesAndroid?.();
      console.log('[IAP] pending purchases enabled');

      const ok = await RNIap.initConnection();
      console.log('[IAP] initConnection:', ok);
      setState((s) => ({ ...s, isConnected: !!ok }));
      IAP_INITIALIZED = true;

      // Optional: Android flush failed purchases
      try {
        await RNIap.flushFailedPurchasesCachedAsPendingAndroid?.();
      } catch {
        // ignore
      }

      // Load products
      try {
        await loadSubscriptions();
        setState((s) => ({ ...s, productsLoaded: true }));
      } catch (e: any) {
        setError(`Failed to load subscriptions: ${e?.message || String(e)}`);
      }
    } catch (e: any) {
      setError(`IAP initConnection failed: ${e?.message || String(e)}`);
      setState((s) => ({ ...s, isConnected: false }));
    } finally {
      IAP_INITIALIZING = false;
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, [isAndroid, loadSubscriptions, setError]);

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
      await refreshServerEntitlements();
    } catch (e: any) {
      setError(`Failed to read purchases: ${e?.message || String(e)}`);
    }
  }, [isAndroid, refreshServerEntitlements, setError]);

  const startListeners = useCallback(() => {
    if (!isAndroid) return;

    // Purchase update listener
    purchaseUpdateSub.current = RNIap.purchaseUpdatedListener(async (purchase: any) => {
      const purchaseToken = purchase.purchaseToken;
      const productId =
        (purchase.productId as string) || (purchase.productIds && purchase.productIds[0]) || '';
      const packageName = (purchase.packageNameAndroid as string) || undefined;

      if (!purchaseToken || !productId) {
        return;
      }

      await savePendingPurchase({
        purchaseToken,
        productId,
        packageName,
        transactionId: purchase.transactionId ?? undefined,
        createdAt: Date.now(),
      });

      let verifyOk = false;

      try {
        await verifyGooglePurchase({
          purchaseToken,
          productId,
          packageName,
          transactionId: purchase.transactionId ?? undefined,
        });

        await refreshServerEntitlements?.();

        verifyOk = true;

        const sku = normalizeSku(productId);
        if (sku) {
          setState((s) => ({ ...s, activeSku: sku }));
        }
      } catch (err: any) {
        console.log('[IAP] verify failed, will retry later', {
          sku: productId,
          token: toMaskedToken(purchaseToken),
          message: err?.message,
        });
      } finally {
        try {
          await finishTransaction({
            purchase,
            isConsumable: false,
          });
          console.log('[IAP] finishTransaction OK', {
            sku: productId,
            token: toMaskedToken(purchaseToken),
          });
        } catch (ackErr: any) {
          console.log('[IAP] finishTransaction FAILED', {
            sku: productId,
            token: toMaskedToken(purchaseToken),
            message: ackErr?.message,
          });
          return;
        }

        if (verifyOk) {
          await clearPendingPurchase();
        }
      }
    });

    // Purchase error listener
    purchaseErrorSub.current = RNIap.purchaseErrorListener((err: any) => {
      setError(`Purchase error: ${err?.message || JSON.stringify(err)}`);
    });
  }, [isAndroid, refreshServerEntitlements, setError]);

  const buySubscription = useCallback(
    async (sku: Sku) => {
      if (!isAndroid) {
        setError('Subscriptions are only supported on Android in this build.');
        return;
      }

      setState((s) => ({ ...s, isLoading: true, lastError: null }));

      try {
        const product = productBySku.get(sku) as any;

        const offerDetails =
          product?.subscriptionOfferDetails ||
          (product as any)?.subscriptionOfferDetailsAndroid ||
          (product as any)?.offers ||
          [];

        // Prefer a "base" offer when possible; otherwise fallback to first available offer
        const baseOffer =
          offerDetails?.find((offer: any) => offer?.pricingPhases?.pricingPhaseList?.length) ||
          offerDetails?.find((offer: any) => offer?.basePlanId) ||
          offerDetails?.[0];

        const offerToken: string | undefined = baseOffer?.offerToken;

        if (!offerToken) {
          setError(
            'Subscription offer token is unavailable for this product. Check Play Console base plan/offer configuration.',
          );
          return;
        }

        console.log('[IAP] buying sku:', sku, 'offerToken:', offerToken);

        await RNIap.requestSubscription({
          sku,
          subscriptionOffers: [{ sku, offerToken }],
        } as any);
      } catch (e: any) {
        setError(`requestSubscription failed: ${e?.message || String(e)}`);
      } finally {
        setState((s) => ({ ...s, isLoading: false }));
      }
    },
    [isAndroid, productBySku, setError],
  );

  useEffect(() => {
    let cancelled = false;

    async function retryPendingIfAny() {
      try {
        const pending = await loadPendingPurchase();
        if (!pending) return;

        const ageMs = Date.now() - pending.createdAt;
        if (ageMs > 48 * 60 * 60 * 1000) {
          await clearPendingPurchase();
          return;
        }

        console.log('[IAP] retry pending verify', {
          sku: pending.productId,
          token: toMaskedToken(pending.purchaseToken),
        });

        await verifyGooglePurchase({
          purchaseToken: pending.purchaseToken,
          productId: pending.productId,
          packageName: pending.packageName,
          transactionId: pending.transactionId,
        });

        await refreshServerEntitlements?.();

        await clearPendingPurchase();

        console.log('[IAP] pending verify OK, cleared', {
          sku: pending.productId,
          token: toMaskedToken(pending.purchaseToken),
        });
      } catch (err: any) {
        if (cancelled) return;
        console.log('[IAP] pending verify retry failed', err?.message);
      }
    }

    retryPendingIfAny();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAndroid) return;

    initIap();
    startListeners();
    refreshEntitlement();

    return () => {
      disconnect();
    };
  }, [isAndroid, initIap, startListeners, refreshEntitlement, disconnect]);

  return useMemo(
    () => ({
      ...state,
      buySubscription,
      refreshEntitlement,
      reloadProducts,
      products,
      productBySku,
    }),
    [state, buySubscription, refreshEntitlement, reloadProducts, products, productBySku],
  );
}
