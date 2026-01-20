import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { openRateApp } from '../lib/rateApp';

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#b06bff',
  },
  text: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default function RateAppButton({ style }: { style?: ViewStyle }) {
  return (
    <Pressable onPress={openRateApp} style={[styles.button, style]}>
      <Text style={styles.text}>Rate app</Text>
    </Pressable>
  );
}
