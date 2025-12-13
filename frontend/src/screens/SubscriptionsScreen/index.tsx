import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { BILLING_SKUS, BillingSku, usePlayBilling } from '../../billing/usePlayBilling';

const COLORS = {
  background: '#040312',
  card: '#0b0c1f',
  neonPurple: '#b06bff',
  neonViolet: '#8b5cf6',
  neonOrange: '#fb923c',
  text: '#f8fafc',
  muted: '#a5b4fc',
  accentBlue: '#0ea5e9',
  borderSoft: '#1f1f3a',
};

const SUBSCRIPTION_GROUPS: {
  title: string;
  items: { sku: BillingSku; title: string; description: string }[];
}[] = [
  {
    title: '1 DAY ACCESS',
    items: [
      {
        sku: BILLING_SKUS.DAY_1_5,
        title: '1 Day Access – 5 AI Analyses',
        description: 'Get up to 5 AI-powered match analyses within 24 hours.',
      },
      {
        sku: BILLING_SKUS.DAY_1_10,
        title: '1 Day Access – 10 AI Analyses',
        description: 'Unlock up to 10 detailed AI match analyses for one full day.',
      },
      {
        sku: BILLING_SKUS.DAY_1_UNLIMITED,
        title: '1 Day Access – Unlimited AI Analyses',
        description: 'Enjoy unlimited AI match analyses for the next 24 hours.',
      },
    ],
  },
  {
    title: '7 DAY ACCESS',
    items: [
      {
        sku: BILLING_SKUS.DAY_7_5,
        title: '7 Day Access – 5 AI Analyses per Day',
        description: 'Access up to 5 AI match analyses daily for 7 consecutive days.',
      },
      {
        sku: BILLING_SKUS.DAY_7_10,
        title: '7 Day Access – 10 AI Analyses per Day',
        description: 'Get up to 10 AI match analyses each day for a full week.',
      },
      {
        sku: BILLING_SKUS.DAY_7_UNLIMITED,
        title: '7 Day Access – Unlimited AI Analyses',
        description: 'Unlimited AI match analyses available every day for 7 days.',
      },
    ],
  },
  {
    title: '30 DAY ACCESS',
    items: [
      {
        sku: BILLING_SKUS.DAY_30_5,
        title: '30 Day Access – 5 AI Analyses per Day',
        description: 'Up to 5 AI match analyses daily with full 30-day access.',
      },
      {
        sku: BILLING_SKUS.DAY_30_10,
        title: '30 Day Access – 10 AI Analyses per Day',
        description: 'Receive up to 10 AI match analyses per day for 30 days.',
      },
      {
        sku: BILLING_SKUS.DAY_30_UNLIMITED,
        title: '30 Day Access – Unlimited AI Analyses',
        description: 'Unlimited AI match analyses every day for 30 days.',
      },
    ],
  },
];

const SubscriptionsScreen: React.FC = () => {
  const { connected, loading, error, products, buy } = usePlayBilling();
  const [localError, setLocalError] = useState<string | null>(null);
  const [processingSku, setProcessingSku] = useState<BillingSku | null>(null);

  const productMap = useMemo(() => {
    const map = new Map<BillingSku, any>();

    (products || []).forEach((product: any) => {
      const productId = (product?.productId || product?.id || '') as BillingSku;
      if (productId) {
        map.set(productId, product);
      }
    });

    return map;
  }, [products]);

  const getPriceLabel = useCallback(
    (sku: BillingSku) => {
      const product = productMap.get(sku);
      const price = product?.priceString || product?.localizedPrice || product?.price;
      return price ? String(price) : 'Price unavailable';
    },
    [productMap]
  );

  const handleBuy = useCallback(
    async (sku: BillingSku) => {
      try {
        setLocalError(null);
        setProcessingSku(sku);
        await buy(sku);
      } catch (e: any) {
        setLocalError(e?.message || 'Unable to start subscription purchase');
      } finally {
        setProcessingSku(null);
      }
    },
    [buy]
  );

  const renderStatus = () => (
    <View style={styles.statusCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.statusTitle}>Google Play Subscriptions</Text>
        <Text style={styles.statusSubtitle}>
          Choose a plan and subscribe directly through the Google Play Store.
        </Text>
        <Text style={[styles.statusBadge, connected ? styles.badgeConnected : styles.badgePending]}>
          {connected ? 'Play Store connected' : 'Connecting to Play Store…'}
        </Text>
      </View>
      {loading && <ActivityIndicator color={COLORS.neonPurple} />}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {renderStatus()}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {localError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{localError}</Text>
        </View>
      )}

      {SUBSCRIPTION_GROUPS.map((group) => (
        <View key={group.title} style={styles.groupBox}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          {group.items.map((item) => {
            const isProcessing = processingSku === item.sku;
            return (
              <View key={item.sku} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDescription}>{item.description}</Text>
                  <Text style={styles.cardPrice}>{getPriceLabel(item.sku)}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.button, (!connected || isProcessing) && styles.buttonDisabled]}
                  onPress={() => handleBuy(item.sku)}
                  disabled={!connected || isProcessing}
                  activeOpacity={0.85}
                >
                  <Text style={styles.buttonText}>{isProcessing ? 'Processing…' : 'Subscribe'}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  statusCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  statusSubtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 12,
    overflow: 'hidden',
  },
  badgeConnected: {
    color: COLORS.neonOrange,
    backgroundColor: '#1b0f1c',
    borderWidth: 1,
    borderColor: '#5b193c',
  },
  badgePending: {
    color: COLORS.muted,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  errorBox: {
    backgroundColor: '#2a0f1f',
    borderColor: '#7f1d34',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    color: '#fecdd3',
    fontWeight: '700',
  },
  groupBox: {
    marginTop: 18,
  },
  groupTitle: {
    color: COLORS.neonViolet,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardDescription: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  cardPrice: {
    color: COLORS.accentBlue,
    fontWeight: '800',
    fontSize: 15,
  },
  button: {
    backgroundColor: COLORS.neonPurple,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.text,
    fontWeight: '800',
  },
});

export default SubscriptionsScreen;
