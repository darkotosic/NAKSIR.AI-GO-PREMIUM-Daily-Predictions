import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SubscriptionsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Subscriptions</Text>
        <Text style={styles.subtitle}>
          Subscriptions are currently hidden in the app experience. AI analysis is available
          without ads or subscription prompts.
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
});
