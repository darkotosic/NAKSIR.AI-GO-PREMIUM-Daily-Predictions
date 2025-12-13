import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const playStoreUrl = 'https://play.google.com/store/apps/dev?id=6165954326742483653';
const manageUrl = 'https://play.google.com/store/account/subscriptions';

const plans = [
  { title: '1 Day Access – 10 AI Analyses', productId: 'naksir_day_1_0' },
  { title: '1 Day Access – Unlock', productId: 'naksir_day_1_unlock' },
  { title: '1 Day Access – Unlimited AI Analyses', productId: 'naksir_day_1_unlimited' },
  { title: '7 Day Access – 10 AI Analyses', productId: 'naksir_day_7_0' },
  { title: '7 Day Access – Unlock', productId: 'naksir_day_7_unlock' },
  { title: '7 Day Access – Unlimited AI Analyses', productId: 'naksir_day_7_unlimited' },
  { title: '30 Day Access – 10 AI Analyses', productId: 'naksir_day_30_0' },
  { title: '30 Day Access – Unlimited AI Analyses', productId: 'naksir_day_30_unlimited' },
];

const GoPremiumScreen: React.FC = () => (
  <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Text style={styles.title}>Naksir Go Premium</Text>
    <Text style={styles.subtitle}>
      Pick the same Google Play subscriptions we ship for Naksir AI Analyses. Each plan matches the
      Play Store product IDs so you can verify or manage your purchase directly from your Google account.
    </Text>

    <View style={styles.card}>
      <Text style={styles.cardTitle}>Premium perks</Text>
      <Text style={styles.cardItem}>• Up to Unlimited AI analyses per day (plan dependent)</Text>
      <Text style={styles.cardItem}>• Key factors, DC + Goals, probabilities, and risk notes</Text>
      <Text style={styles.cardItem}>• Correct scores, corners, yellow cards, and value signals</Text>
      <Text style={styles.cardItem}>• Instant access in the mobile app after purchase</Text>
    </View>

    <Text style={styles.sectionLabel}>Available subscriptions</Text>
    <View style={styles.planGrid}>
      {plans.map((plan) => (
        <View key={plan.productId} style={styles.planCard}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <Text style={styles.planId}>{plan.productId}</Text>
        </View>
      ))}
    </View>

    <View style={styles.actions}>
      <TouchableOpacity style={styles.button} onPress={() => Linking.openURL(playStoreUrl)}>
        <Text style={styles.buttonText}>Open Play Store</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => Linking.openURL(manageUrl)}
      >
        <Text style={styles.secondaryText}>Manage subscriptions</Text>
      </TouchableOpacity>
    </View>

    <Text style={styles.hint}>
      Tip: Purchases are tied to your Google account. After subscribing, reopen the app to refresh
      your premium status.
    </Text>
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040312',
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#cbd5e1',
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#0b0c1f',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    borderColor: '#1f1f3a',
    borderWidth: 1,
  },
  cardTitle: {
    color: '#f8fafc',
    fontWeight: '800',
    marginBottom: 8,
  },
  cardItem: {
    color: '#e2e8f0',
    marginBottom: 4,
  },
  sectionLabel: {
    color: '#cbd5e1',
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  planGrid: {
    gap: 12,
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: '#0b0c1f',
    borderRadius: 14,
    padding: 14,
    borderColor: '#1f1f3a',
    borderWidth: 1,
  },
  planTitle: {
    color: '#f8fafc',
    fontWeight: '700',
    marginBottom: 6,
  },
  planId: {
    color: '#94a3b8',
    fontSize: 12,
  },
  actions: {
    gap: 12,
  },
  button: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: '#8b5cf6',
    borderWidth: 1,
  },
  secondaryText: {
    color: '#8b5cf6',
    fontWeight: '700',
    fontSize: 15,
  },
  hint: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 16,
    lineHeight: 18,
  },
});

export default GoPremiumScreen;
