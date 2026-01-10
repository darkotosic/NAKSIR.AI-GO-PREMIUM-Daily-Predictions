import React, { useMemo } from 'react';
import { Image, SectionList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingState } from '@components/LoadingState';
import { ErrorState } from '@components/ErrorState';
import TelegramBanner from '@components/TelegramBanner';
import { NativeAdvanceAdCard } from '@ads/NativeAdvanceAdCard';

import { useCachedAiMatchesQuery } from '@hooks/useCachedAiMatchesQuery';
import type { CachedAiMatchItem } from '@api/cachedAi';
import type { RootStackParamList } from '@navigation/types';
import { padTwoDigits } from '@lib/time';

const COLORS = {
  background: '#040312',
  card: '#0b0c1f',
  text: '#f8fafc',
  muted: '#a5b4fc',
  neonViolet: '#8b5cf6',
  borderSoft: '#1f1f3a',
};

type Section = { title: string; data: CachedAiMatchItem[]; showAdAfter?: boolean };

const FLAG_OVERRIDES: Record<string, string> = {
  world: '🌍',
  europe: '🇪🇺',
  england: '🏴',
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
  const hh = padTwoDigits(d.getHours());
  const mm = padTwoDigits(d.getMinutes());
  return `${hh}:${mm}`;
}

const getKickoffSortValue = (kickoff?: string | number | null) => {
  if (!kickoff) return '';
  const date = new Date(kickoff);
  return Number.isNaN(date.getTime()) ? String(kickoff) : date.toISOString();
};

export default function InDepthAnalysisScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const query = useCachedAiMatchesQuery();
  const totalAnalyses = query.data?.total ?? 0;
  const headerPaddingTop = Math.max(insets.top, 12);

  const sections: Section[] = useMemo(() => {
    const items = Array.isArray(query.data?.items) ? query.data?.items : [];
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

    const sortedSections = Array.from(map.entries())
      .map(([title, data]) => ({
        title,
        data: data.sort((a, b) =>
          getKickoffSortValue(a.summary?.kickoff).localeCompare(
            getKickoffSortValue(b.summary?.kickoff),
          ),
        ),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));

    return sortedSections.map((section, index) => ({
      ...section,
      showAdAfter: (index + 1) % 3 === 0,
    }));
  }, [query.data]);

  if (query.isLoading) return <LoadingState message="Loading in-depth analysis..." />;
  if (query.isError) return <ErrorState message="Failed to load cached AI matches" />;

  if (!sections.length) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: COLORS.background, padding: 16, paddingTop: headerPaddingTop }}
      >
        <TelegramBanner />
        <View style={styles.headerRow}>
          <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '900' }}>
            In-Depth Analysis {totalAnalyses}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('TodayMatches')}
            style={styles.homeButton}
            activeOpacity={0.9}
          >
            <Text style={styles.homeButtonText}>Home</Text>
          </TouchableOpacity>
        </View>
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
          <View style={{ paddingHorizontal: 14, paddingTop: headerPaddingTop, paddingBottom: 6 }}>
            <TelegramBanner />
            <View style={styles.headerRow}>
              <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '900' }}>
                In-Depth Analysis {totalAnalyses}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('TodayMatches')}
                style={styles.homeButton}
                activeOpacity={0.9}
              >
                <Text style={styles.homeButtonText}>Home</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: COLORS.muted, marginTop: 2 }}>
              Full in-depth match analysis (tap Preview)
            </Text>
          </View>
        )}
        renderSectionHeader={({ section }) => (
          <View style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.background }}>
            <Text style={{ color: COLORS.muted, fontWeight: '900' }}>{section.title}</Text>
          </View>
        )}
        renderSectionFooter={({ section }) =>
          section.showAdAfter ? (
            <View style={styles.sectionAd}>
              <NativeAdvanceAdCard />
            </View>
          ) : null
        }
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
                  navigation.navigate('AIAnalysis', {
                    fixtureId: item.fixture_id,
                    summary: item.summary,
                    originTab: 'InDepthAnalysis',
                    fromMatchDetails: false,
                    fromPreview: true,
                  })
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

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  homeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.neonViolet,
    backgroundColor: '#0b1220',
  },
  homeButtonText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 12,
  },
  sectionAd: {
    marginHorizontal: 12,
    marginVertical: 8,
  },
});
