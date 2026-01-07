import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { openRateApp } from '@lib/rateApp';
import { useI18n } from '@lib/i18n';

const COLORS = {
  card: '#0b0c1f',
  neonViolet: '#8b5cf6',
  text: '#f8fafc',
};

export default function RateAppButton({ style }: { style?: ViewStyle }) {
  const { t } = useI18n();

  return (
    <TouchableOpacity
      onPress={openRateApp}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={t('common.rateAppLabel')}
      style={[styles.btn, style]}
    >
      <Text style={styles.txt}>{t('common.rateApp')}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.neonViolet,
    backgroundColor: COLORS.card,
  },
  txt: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
