import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { checkSurface, estateSurfaces, type SurfaceCheck } from '../lib/estate';
import { colors } from '../lib/theme';

export function EstateScreen() {
  const [checks, setChecks] = useState<Record<string, SurfaceCheck>>({});
  const [checking, setChecking] = useState(false);

  const run = useCallback(async () => {
    setChecking(true);
    const results = await Promise.all(
      estateSurfaces.map(async (s) => [s.url, await checkSurface(s.url)] as const),
    );
    setChecks(Object.fromEntries(results));
    setChecking(false);
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <FlatList
      style={styles.list}
      data={estateSurfaces}
      keyExtractor={(s) => s.url}
      refreshControl={<RefreshControl refreshing={checking} onRefresh={run} />}
      ListHeaderComponent={
        <Text style={styles.note}>
          Placeholder. Public web surfaces only, checked from this phone. No private or internal
          status is shown here.
        </Text>
      }
      renderItem={({ item }) => {
        const check = checks[item.url];
        const up = check?.status != null && check.status < 400;
        return (
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: check ? (up ? colors.ok : colors.bad) : colors.muted }]} />
            <View style={styles.grow}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.url}</Text>
            </View>
            <Text style={styles.meta}>
              {check ? `${check.status ?? 'no answer'} - ${check.ms} ms` : 'checking'}
            </Text>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  note: { color: colors.muted, padding: 12, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.surface, marginHorizontal: 8, marginBottom: 6, borderRadius: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  grow: { flex: 1 },
  name: { color: colors.text, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 12 },
});
