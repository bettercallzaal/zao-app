import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { type Post, readChannel } from '../lib/api';
import { colors } from '../lib/theme';

export function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (next?: string) => {
    setLoading(true);
    setError(null);
    try {
      const page = await readChannel(next);
      setPosts((prev) => (next ? [...prev, ...page.posts] : page.posts));
      setCursor(page.nextCursor);
    } catch (err) {
      // Raw error text on screen during beta, per the playbook's debugging tip.
      setError(err instanceof Error ? err.message.slice(0, 140) : 'Feed read failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <FlatList
      style={styles.list}
      data={posts}
      keyExtractor={(p) => p.hash}
      refreshControl={
        <RefreshControl refreshing={loading && !posts.length} onRefresh={() => load()} />
      }
      onEndReached={() => cursor && !loading && load(cursor)}
      ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
      ListEmptyComponent={
        loading ? <ActivityIndicator color={colors.primary} style={styles.pad} /> : null
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            {item.avatar ? <Image source={{ uri: item.avatar }} style={styles.avatar} /> : null}
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                @{item.username} - {new Date(item.timestamp).toLocaleString()}
              </Text>
            </View>
          </View>
          <Text style={styles.text}>{item.text}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  pad: { padding: 24 },
  card: { backgroundColor: colors.surface, margin: 8, marginBottom: 0, padding: 12, borderRadius: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  name: { color: colors.text, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 12 },
  text: { color: colors.text, lineHeight: 20 },
  error: { color: colors.bad, padding: 12 },
});
