import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const NaksirAccountScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Naksir Account</Text>
    <Text style={styles.subtitle}>Sign-in and profile features are coming soon.</Text>
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
    marginBottom: 8,
  },
  subtitle: {
    color: '#cbd5e1',
  },
});

export default NaksirAccountScreen;
