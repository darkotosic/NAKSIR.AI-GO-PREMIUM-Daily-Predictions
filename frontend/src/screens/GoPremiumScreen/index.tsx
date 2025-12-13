import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const GoPremiumScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Naksir Go Premium – coming soon</Text>
    <Text style={styles.subtitle}>
      Subscription with AI analyses and value bet signals. Be the first to try the premium experience.
    </Text>
    <TouchableOpacity
      style={styles.button}
      onPress={() => Linking.openURL('https://play.google.com/store/apps/dev?id=7884136048861881941')}
    >
      <Text style={styles.buttonText}>Open Play Store</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#040312',
    justifyContent: 'center',
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  subtitle: {
    color: '#cbd5e1',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#8b5cf6',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default GoPremiumScreen;
