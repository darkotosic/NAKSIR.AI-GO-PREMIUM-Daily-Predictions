import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import TelegramBanner from '@components/TelegramBanner';
import { usePlayBilling } from '@billing/usePlayBilling';
import { SUBS_SKUS, Sku } from '@shared/billing_skus';

const LABEL: Record<Sku, { title: string; subtitle: string }> = {
  naksir_premium_7d: { title: 'Premium 7 days', subtitle: 'Full access • No ads' },
  naksir_premium_1m: { title: 'Premium 1 month', subtitle: 'Full access • No ads' },
  naksir_premium_1y: { title: 'Premium 1 year', subtitle: 'Best value • Full access • No ads' },
};

export default function SubscriptionsScreen() {
  const { isLoading, activeSku, lastError, buySubscription, refreshEntitlement } =
    usePlayBilling();

  const rows = useMemo(() => [...SUBS_SKUS], []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TelegramBanner />

      <View style={styles.card}>
        <Text style={styles.title}>Go Premium</Text>
        <Text style={styles.subtitle}>
          Premium unlocks the full app experience with no ads. Choose a plan below.
        </Text>

        {lastError ? <Text style={styles.error}>{lastError}</Text> : null}

        <View style={{ gap: 10 }}>
          {rows.map((sku) => {
            const isActive = activeSku === sku;
            return (
              <View key={sku} style={[styles.planCard, isActive ? styles.planCardActive : null]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>{LABEL[sku].title}</Text>
                  <Text style={styles.planSubtitle}>{LABEL[sku].subtitle}</Text>
                  {isActive ? <Text style={styles.activeTag}>Active</Text> : null}
                </View>

                <TouchableOpacity
                  disabled={isLoading || isActive}
                  onPress={() => buySubscription(sku)}
                  style={[styles.buyBtn, isLoading || isActive ? styles.buyBtnDisabled : null]}
                >
                  {isLoading ? (
                    <ActivityIndicator />
                  ) : (
                    <Text style={styles.buyBtnText}>{isActive ? 'Current' : 'Buy'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={() => refreshEntitlement()}
          disabled={isLoading}
          style={[styles.restoreBtn, isLoading ? styles.restoreBtnDisabled : null]}
        >
          <Text style={styles.restoreText}>Restore purchase</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  card: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#0b0c1f',
    borderWidth: 1,
    borderColor: '#6d28d9',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#f8fafc', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#a5b4fc', marginBottom: 14, lineHeight: 18 },
  error: { color: '#fb7185', marginBottom: 10, fontSize: 12 },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#312e81',
    backgroundColor: '#05051a',
  },
  planCardActive: { borderColor: '#22c55e' },
  planTitle: { color: '#f8fafc', fontWeight: '800', fontSize: 15 },
  planSubtitle: { color: '#a5b4fc', fontSize: 12, marginTop: 3 },
  activeTag: { color: '#22c55e', fontSize: 12, marginTop: 6, fontWeight: '700' },
  buyBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b06bff',
  },
  buyBtnDisabled: { opacity: 0.55 },
  buyBtnText: { color: '#b06bff', fontWeight: '800' },
  restoreBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  restoreBtnDisabled: { opacity: 0.55 },
  restoreText: { color: '#cbd5e1', fontWeight: '700' },
});
