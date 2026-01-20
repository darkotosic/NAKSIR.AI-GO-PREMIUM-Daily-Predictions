import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { getTodayTickets } from '../api/btts';
import type { Ticket } from '../types/btts';

export default function TicketsScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setError(null);
    getTodayTickets()
      .then((data) => {
        if (isActive) {
          setTickets(data ?? []);
        }
      })
      .catch((err: Error) => {
        if (isActive) {
          setError(err.message);
          setTickets([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : tickets.length === 0 ? (
        <Text style={styles.emptyText}>No tickets available.</Text>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item, index) => `${item.id ?? index}`}
          renderItem={({ item }) => (
            <View style={styles.ticketCard}>
              <Text style={styles.ticketTitle}>Ticket #{item.id ?? 'N/A'}</Text>
              {item.created_at ? <Text style={styles.ticketMeta}>Created: {item.created_at}</Text> : null}
              {item.picks?.map((pick, idx) => (
                <Text key={`${item.id ?? 'ticket'}-${idx}`} style={styles.ticketPick}>
                  • Match {pick.match_id ?? 'N/A'} — {pick.selection ?? 'N/A'}
                </Text>
              ))}
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  loader: {
    marginTop: 24,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
  },
  listContent: {
    paddingBottom: 24,
  },
  ticketCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  ticketTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  ticketMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  ticketPick: {
    marginTop: 6,
    fontSize: 12,
    color: '#374151',
  },
});
