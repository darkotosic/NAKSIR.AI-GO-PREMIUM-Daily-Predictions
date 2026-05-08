import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { usePlayBilling } from '@billing/usePlayBilling';
import { formatMoney, microsToNumber, perDay, pickBestPriceString, pickMicrosAndCurrency } from '@billing/price_utils';
import { useEntitlements } from '@state/EntitlementsContext';
import { SUBS_SKUS, Sku } from '@shared/billing_skus';

const DAYS: Record<Sku, number> = {
  naksir_premium_7d: 7,
  naksir_premium_1m: 30,
  naksir_premium_1y: 365,
};

const LABEL: Record<Sku, { title: string; popular?: boolean }> = {
  naksir_premium_7d: { title: 'Weekly' },
  naksir_premium_1m: { title: 'Monthly', popular: true },
  naksir_premium_1y: { title: 'Yearly' },
};

const BENEFITS = [
  'No Ads',
  'Full access to instant AI predictions',
  'Full access to live match analysis',
];

export default function SubscriptionsScreen() {
  const {
    isLoading,
    lastError,
    buySubscription,
    refreshEntitlement,
    reloadProducts,
    products,
    productsLoaded,
  } = usePlayBilling();
  const { isPremium } = useEntitlements();

  const [selected, setSelected] = useState<Sku>('naksir_premium_1m');

  useEffect(() => {
    reloadProducts?.();
  }, [reloadProducts]);

  const productBySku = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of products || []) map.set((p as any).productId, p);
    return map;
  }, [products]);

  const selectedProduct = productBySku.get(selected);

  const { micros, currency } = selectedProduct
    ? pickMicrosAndCurrency(selectedProduct)
    : { micros: null, currency: null };

  const canBuy = !isLoading && !isPremium;

  return (
    <View style={styles.root}>
      <View style={styles.bg}>
        <View style={styles.topBar}>
          <View style={styles.premiumPill}>
            <Text style={styles.premiumPillText}>PREMIUM</Text>
          </View>
        </View>

        <Text style={styles.title}>
          GET FULL ACCESS{"\n"}
          <Text style={styles.titleAccent}>NO ADS</Text>
        </Text>

        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.sheetScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.benefits}>
              {BENEFITS.map((b) => (
                <View key={b} style={styles.benefitRow}>
                  <Text style={styles.check}>✓</Text>
                  <Text style={styles.benefitText}>{b}</Text>
                </View>
              ))}
            </View>

            <View style={{ height: 14 }} />

            {(SUBS_SKUS as readonly Sku[]).map((sku) => {
              const p = productBySku.get(sku);
              const best = p ? pickBestPriceString(p) : null;
              const { micros: m, currency: c } = p
                ? pickMicrosAndCurrency(p)
                : { micros: null, currency: null };

              const pd = m && c ? formatMoney(perDay(microsToNumber(m), DAYS[sku]), c) : null;
              const selectedRow = selected === sku;

              return (
                <TouchableOpacity
                  key={sku}
                  style={[styles.planRow, selectedRow ? styles.planRowSelected : null]}
                  onPress={() => setSelected(sku)}
                  activeOpacity={0.9}
                >
                  <View style={styles.radioOuter}>
                    {selectedRow ? <View style={styles.radioInner} /> : null}
                  </View>

                  <View style={{ flex: 1 }}>
                    {LABEL[sku].popular ? (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularText}>MOST POPULAR</Text>
                      </View>
                    ) : null}

                    <Text style={styles.planTitle}>{LABEL[sku].title}</Text>
                    <Text style={styles.planSub}>{best ? best : 'Loading price...'}</Text>
                  </View>

                  <View style={styles.priceBox}>
                    <Text style={styles.perDay}>{pd ? pd : '--'}</Text>
                    <Text style={styles.perDayLabel}>per Day</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {productsLoaded && (!products || products.length === 0) ? (
              <View style={styles.pricesWarn}>
                <Text style={styles.pricesWarnTitle}>Prices not available</Text>
                <Text style={styles.pricesWarnText}>
                  Subscriptions did not load from Google Play. Check SKU IDs and tester account.
                </Text>
                <TouchableOpacity
                  onPress={() => reloadProducts?.()}
                  activeOpacity={0.9}
                  style={styles.retryBtn}
                >
                  <Text style={styles.retryBtnText}>Retry loading prices</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {lastError ? <Text style={styles.warningText}>{lastError}</Text> : null}

            <Text style={styles.legal}>
              Auto-renewal can be turned off 24 hours before the end of the billing period. You can
              cancel any time on Google Play.
            </Text>

            <TouchableOpacity
              style={[styles.cta, !canBuy ? styles.ctaDisabled : null]}
              onPress={() => buySubscription(selected)}
              disabled={!canBuy}
              activeOpacity={0.9}
            >
              {isLoading ? <ActivityIndicator /> : <Text style={styles.ctaText}>{isPremium ? 'ACTIVE' : 'SUBSCRIBE'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => refreshEntitlement()}
              disabled={isLoading}
              style={styles.restore}
            >
              <Text style={styles.restoreText}>Restore purchase</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  bg: { flex: 1, paddingTop: 42, backgroundColor: '#0b0c1f' },
  topBar: { paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'flex-start' },
  premiumPill: { backgroundColor: '#facc15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  premiumPillText: { fontWeight: '900', color: '#000', letterSpacing: 1 },

  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    paddingHorizontal: 16,
    marginTop: 12,
    lineHeight: 36,
  },
  titleAccent: { color: '#facc15' },

  sheet: {
    marginTop: 18,
    backgroundColor: '#7c3aed',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 16,
    flex: 1,
  },
  sheetScroll: {
    paddingBottom: 24,
  },
  benefits: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 18, padding: 14 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  check: { color: '#22c55e', fontSize: 18, fontWeight: '900', width: 22 },
  benefitText: { color: '#fff', fontWeight: '700' },

  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 12,
    gap: 12,
  },
  planRowSelected: { borderColor: '#fff' },

  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#a78bfa' },

  popularBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#a78bfa',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  popularText: { color: '#000', fontWeight: '900', fontSize: 10, letterSpacing: 0.6 },

  planTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  planSub: { color: 'rgba(255,255,255,0.75)', marginTop: 4, fontWeight: '700' },

  priceBox: { alignItems: 'flex-end', minWidth: 96 },
  perDay: { color: '#fff', fontWeight: '900', fontSize: 18 },
  perDayLabel: { color: 'rgba(255,255,255,0.8)', fontWeight: '700', marginTop: 2, fontSize: 12 },

  warningText: { color: '#facc15', fontWeight: '800', marginTop: 10, lineHeight: 18 },
  pricesWarn: {
    marginTop: 8,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pricesWarnTitle: { color: '#fff', fontWeight: '900' },
  pricesWarnText: { color: 'rgba(255,255,255,0.8)', marginTop: 6, lineHeight: 16, fontWeight: '700' },
  retryBtn: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#facc15',
    paddingVertical: 10,
    alignItems: 'center',
  },
  retryBtnText: { color: '#facc15', fontWeight: '900', letterSpacing: 0.5 },

  legal: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2, lineHeight: 15 },
  cta: {
    marginTop: 12,
    backgroundColor: '#2a004f',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: '#fff', fontWeight: '900', letterSpacing: 1 },

  restore: { marginTop: 10, alignItems: 'center', paddingVertical: 10 },
  restoreText: { color: 'rgba(255,255,255,0.85)', fontWeight: '800' },
});
