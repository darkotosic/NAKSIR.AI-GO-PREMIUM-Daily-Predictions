import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { usePlayBilling } from '../../billing/usePlayBilling';
import { SUBS_SKUS, Sku } from '../../../../shared/billing_skus';

function asSku(v: unknown): Sku | null {
  return (SUBS_SKUS as readonly string[]).includes(String(v)) ? (String(v) as Sku) : null;
}

export default function SubscriptionsScreen() {
  const { isConnected, isLoading, activeSku, lastError, buySubscription, refreshEntitlement } =
    usePlayBilling();

  const options = useMemo(() => {
    return (SUBS_SKUS as readonly string[]).map((id) => ({
      sku: id as Sku,
      title: id,
    }));
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Go Premium</Text>
        <Text style={styles.subtitle}>
          Unlock AI in-depth analysis and premium features. Subscriptions are processed by Google
          Play.
        </Text>

        <View style={styles.row}>
          <Text style={styles.label}>Billing status:</Text>
          <Text style={styles.value}>{isConnected ? 'Connected' : 'Not connected'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Active plan:</Text>
          <Text style={styles.value}>{activeSku ?? 'None'}</Text>
        </View>

        {!!lastError && <Text style={styles.error}>{lastError}</Text>}

        <TouchableOpacity
          style={[styles.secondaryBtn, isLoading ? styles.btnDisabled : null]}
          onPress={refreshEntitlement}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? <ActivityIndicator /> : <Text style={styles.secondaryBtnText}>Refresh</Text>}
        </TouchableOpacity>

        <View style={styles.divider} />

        {options.map((opt) => {
          const isActive = asSku(activeSku) === opt.sku;

          return (
            <View key={opt.sku} style={styles.planRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planTitle}>{opt.title}</Text>
                <Text style={styles.planHint}>
                  {isActive ? 'Current subscription' : 'Tap to subscribe'}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (isLoading || isActive) ? styles.btnDisabled : null,
                ]}
                onPress={() => buySubscription(opt.sku)}
                disabled={isLoading || isActive}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={styles.primaryBtnText}>{isActive ? 'Active' : 'Subscribe'}</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        <Text style={styles.footnote}>
          Note: In-App Purchases require a Development Build (Expo Go will not work).
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#0b0c1f',
    borderWidth: 1,
    borderColor: '#6d28d9',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#a5b4fc',
    marginBottom: 14,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    color: '#a5b4fc',
    fontSize: 13,
  },
  value: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  error: {
    marginTop: 8,
    marginBottom: 10,
    color: '#fb923c',
    fontSize: 12,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.35)',
    marginVertical: 14,
  },
  planRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.18)',
  },
  planTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  planHint: {
    color: '#a5b4fc',
    fontSize: 12,
    marginTop: 2,
  },
  primaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#6d28d9',
    borderWidth: 1,
    borderColor: '#b06bff',
    minWidth: 110,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#f8fafc',
    fontWeight: '900',
    fontSize: 13,
  },
  secondaryBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(176, 107, 255, 0.55)',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  footnote: {
    marginTop: 14,
    color: '#a5b4fc',
    fontSize: 11,
    lineHeight: 15,
  },
});
