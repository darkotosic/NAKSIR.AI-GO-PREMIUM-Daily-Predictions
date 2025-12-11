import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MatchListItem } from '@types/match';

interface Props {
  match: MatchListItem;
  onPress: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
}

export const MatchCard: React.FC<Props> = ({ match, onPress, onToggleFavorite, isFavorite }) => {
  const summary = match.summary;
  const league = summary?.league;
  const teams = summary?.teams;
  const kickoffDate = summary?.kickoff ? new Date(summary.kickoff) : undefined;
  const kickoffLabel = kickoffDate
    ? kickoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Kickoff TBD';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.leagueText}>{league?.name || 'League'}</Text>
          <Text style={styles.metaText}>{league?.country || 'Country'}</Text>
        </View>
        {league?.logo ? <Image source={{ uri: league.logo }} style={styles.logo} /> : null}
      </View>

      <View style={styles.teamsRow}>
        <View style={styles.teamColumn}>
          {teams?.home?.logo ? (
            <Image source={{ uri: teams.home.logo }} style={styles.teamLogo} />
          ) : null}
          <Text style={styles.teamName} numberOfLines={1}>
            {teams?.home?.name || 'Home'}
          </Text>
        </View>

        <View style={styles.centerColumn}>
          <Text style={styles.kickoff}>{kickoffLabel}</Text>
          {onToggleFavorite ? (
            <TouchableOpacity onPress={onToggleFavorite} style={styles.favoriteButton}>
              <Text style={styles.favoriteText}>{isFavorite ? '★' : '☆'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={[styles.teamColumn, styles.alignEnd]}>
          {teams?.away?.logo ? (
            <Image source={{ uri: teams.away.logo }} style={styles.teamLogo} />
          ) : null}
          <Text style={styles.teamName} numberOfLines={1}>
            {teams?.away?.name || 'Away'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0b0c1f',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1f1f3a',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  leagueText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  metaText: {
    color: '#94a3b8',
    marginTop: 2,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamColumn: {
    flex: 1,
    alignItems: 'flex-start',
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  teamLogo: {
    width: 48,
    height: 48,
    marginBottom: 8,
  },
  teamName: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
    maxWidth: 110,
  },
  centerColumn: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  kickoff: {
    color: '#a5b4fc',
    fontWeight: '700',
  },
  favoriteButton: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#111827',
  },
  favoriteText: {
    color: '#fbbf24',
    fontSize: 18,
  },
});
