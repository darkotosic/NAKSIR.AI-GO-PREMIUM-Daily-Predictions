import React, { useMemo } from 'react';
import { SectionList, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import LoadingState from '@components/LoadingState';
import ErrorState from '@components/ErrorState';

import { useCachedAiMatchesQuery } from '@hooks/useCachedAiMatchesQuery';
import type { CachedAiMatchItem } from '@api/cachedAi';
import type { RootStackParamList } from '@navigation/types';
import { useI18n } from '@lib/i18n';

const COLORS = {
  background: '#040312',
  card: '#0b0c1f',
  text: '#f8fafc',
  muted: '#a5b4fc',
  neonViolet: '#8b5cf6',
  borderSoft: '#1f1f3a',
};

type Section = { title: string; data: CachedAiMatchItem[] };

export default function NaksirAIScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t, formatTime } = useI18n();
  const query = useCachedAiMatchesQuery();

  const sections: Section[] = useMemo(() => {
    const items = query.data?.items ?? [];
    const map = new Map<string, CachedAiMatchItem[]>();

    for (const it of items) {
      const leagueName = it?.summary?.league?.name ?? t('common.league');
      const country = it?.summary?.league?.country ?? '';
      const title = country ? `${country}: ${leagueName}` : leagueName;

      const arr = map.get(title) ?? [];
      arr.push(it);
      map.set(title, arr);
    }

    return Array.from(map.entries())
      .map(([title, data]) => ({
        title,
        data: data.sort((a, b) => (a.summary?.kickoff ?? '').localeCompare(b.summary?.kickoff ?? '')),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [query.data, t]);

  if (query.isLoading) return <LoadingState message={t('naksirAi.loading')} />;
  if (query.isError) return <ErrorState message={t('naksirAi.error')} />;

  if (!sections.length) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background, padding: 16 }}>
        <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '900' }}>{t('naksirAi.title')}</Text>
        <Text style={{ color: COLORS.muted, marginTop: 8 }}>
          {t('naksirAi.empty')}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 }}>
        <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '900' }}>{t('naksirAi.title')}</Text>
        <Text style={{ color: COLORS.muted, marginTop: 2 }}>
          {t('naksirAi.cachedSubtitle')}
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, idx) => String(item.fixture_id ?? idx)}
        renderSectionHeader={({ section }) => (
          <View style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.background }}>
            <Text style={{ color: COLORS.muted, fontWeight: '900' }}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const home = item.summary?.teams?.home?.name ?? t('common.home');
          const away = item.summary?.teams?.away?.name ?? t('common.away');
          const time = item.summary?.kickoff ? formatTime(item.summary.kickoff) : t('common.kickoffTbd');

          return (
            <View
              style={{
                marginHorizontal: 12,
                marginVertical: 6,
                backgroundColor: COLORS.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.borderSoft,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <View style={{ width: 52 }}>
                <Text style={{ color: COLORS.text, fontWeight: '900' }}>{time}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.text, fontWeight: '900' }} numberOfLines={1}>
                  {home}
                </Text>
                <Text style={{ color: COLORS.text, fontWeight: '900' }} numberOfLines={1}>
                  {away}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('AIAnalysis', { fixtureId: item.fixture_id, summary: item.summary })
                }
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: COLORS.neonViolet,
                }}
              >
                <Text style={{ color: COLORS.neonViolet, fontWeight: '900' }}>{t('naksirAi.preview')}</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
