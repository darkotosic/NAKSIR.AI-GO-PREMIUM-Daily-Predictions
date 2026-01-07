import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MatchAnalysis } from '@naksir-types/analysis';
import { useI18n } from '@lib/i18n';

interface Props {
  analysis?: MatchAnalysis;
  onPress: () => void;
}

export const AnalysisPreview: React.FC<Props> = ({ analysis, onPress }) => {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{t('analysis.previewTitle')}</Text>
        <Text style={styles.subtitle} numberOfLines={3}>
        {(analysis as any)?.preview || analysis?.summary || t('analysis.previewFallback')}
        </Text>
      </View>
      <TouchableOpacity onPress={onPress} style={styles.button}>
        <Text style={styles.buttonText}>{t('common.open')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: '#cbd5e1',
    marginTop: 4,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
  },
  buttonText: {
    color: '#f8fafc',
    fontWeight: '700',
  },
});
