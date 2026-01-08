import React, { useMemo } from 'react';
import { Image, SectionList, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { LoadingState } from '@components/LoadingState';
import { ErrorState } from '@components/ErrorState';
import TelegramBanner from '@components/TelegramBanner';

import { useCachedAiMatchesQuery } from '@hooks/useCachedAiMatchesQuery';
import type { CachedAiMatchItem } from '@api/cachedAi';
import type { RootStackParamList } from '@navigation/types';

const COLORS = {
  background: '#040312',
  card: '#0b0c1f',
  text: '#f8fafc',
  muted: '#a5b4fc',
  neonViolet: '#8b5cf6',
  borderSoft: '#1f1f3a',
};

type Section = { title: string; data: CachedAiMatchItem[] };

const FLAG_OVERRIDES: Record<string, string> = {
  world: '🌍',
  europe: '🇪🇺',
  england: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  scotland: '🏴',
  wales: '🏴',
  'united states': '🇺🇸',
  usa: '🇺🇸',
  germany: '🇩🇪',
  france: '🇫🇷',
  spain: '🇪🇸',
  italy: '🇮🇹',
  portugal: '🇵🇹',
  brazil: '🇧🇷',
  argentina: '🇦🇷',
  serbia: '🇷🇸',
  croatia: '🇭🇷',
  netherlands: '🇳🇱',
  turkey: '🇹🇷',
  greece: '🇬🇷',
};

const getFlagEmoji = (country?: string) => {
  if (!country) return '🏳️';
  const key = country.trim().toLowerCase();
  return FLAG_OVERRIDES[key] ?? '🏳️';
};

function formatKickoff(kickoff?: string) {
  if (!kickoff) return '--:--';
  const d = new Date(kickoff);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function NaksirAIScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const query = useCachedAiMatchesQuery();
  const totalAnalyses = query.data?.total ?? 0;

  const sections: Section[] = useMemo(() => {
    const items = query.data?.items ?? [];
    const map = new Map<string, CachedAiMatchItem[]>();

    for (const it of items) {
      const leagueName = it?.summary?.league?.name ?? 'Unknown League';
      const country = it?.summary?.league?.country ?? '';
      const flag = getFlagEmoji(country);
      const title = country ? `${flag} ${country}: ${leagueName}` : `${flag} ${leagueName}`;

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
  }, [query.data]);

  if (query.isLoading) return <LoadingState message="Loading Naksir AI list..." />;
  if (query.isError) return <ErrorState message="Failed to load cached AI matches" />;

  if (!sections.length) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background, padding: 16 }}>
        <TelegramBanner />
        <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '900' }}>
          Naksir AI {totalAnalyses}
        </Text>
        <Text style={{ color: COLORS.muted, marginTop: 8 }}>
          No AI analyses yet for the next 2 days.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <SectionList
        sections={sections}
        keyExtractor={(item, idx) => String(item.fixture_id ?? idx)}
        ListHeaderComponent={() => (
          <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 }}>
            <TelegramBanner />
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '900' }}>
              Naksir AI {totalAnalyses}
            </Text>
            <Text style={{ color: COLORS.muted, marginTop: 2 }}>
              Full In-Depth match analysis (tap Preview)
            </Text>
          </View>
        )}
        renderSectionHeader={({ section }) => (
          <View style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.background }}>
            <Text style={{ color: COLORS.muted, fontWeight: '900' }}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const home = item.summary?.teams?.home?.name ?? 'Home';
          const away = item.summary?.teams?.away?.name ?? 'Away';
          const homeLogo = item.summary?.teams?.home?.logo;
          const awayLogo = item.summary?.teams?.away?.logo;
          const time = formatKickoff(item.summary?.kickoff);

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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {homeLogo ? <Image source={{ uri: homeLogo }} style={{ width: 18, height: 18 }} /> : null}
                  <Text style={{ color: COLORS.text, fontWeight: '900' }} numberOfLines={1}>
                    {home}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {awayLogo ? <Image source={{ uri: awayLogo }} style={{ width: 18, height: 18 }} /> : null}
                  <Text style={{ color: COLORS.text, fontWeight: '900' }} numberOfLines={1}>
                    {away}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('AIAnalysis', { fixtureId: item.fixture_id, summary: item.summary })
                }
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  borderRadius: 7,
                  borderWidth: 1,
                  borderColor: COLORS.neonViolet,
                }}
              >
                <Text style={{ color: COLORS.neonViolet, fontWeight: '300' }}>PREVIEW</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
