import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface Props {
  message?: string;
}

export const LoadingState: React.FC<Props> = ({ message }) => (
  <View style={styles.container}>
    <ActivityIndicator color="#8b5cf6" size="large" />
    {message ? <Text style={styles.message}>{message}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  message: {
    marginTop: 8,
    color: '#cbd5e1',
  },
});
