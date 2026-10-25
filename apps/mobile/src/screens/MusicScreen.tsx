import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { radioPlaylists, readPlaylist, type Track } from '../lib/audius';
import { colors } from '../lib/theme';

export function MusicScreen() {
  const [station, setStation] = useState(0);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [current, setCurrent] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
  }, []);

  useEffect(() => {
    const playlist = radioPlaylists[station];
    let live = true;
    setLoading(true);
    setError(null);
    readPlaylist(playlist.url, playlist.artist)
      .then((t) => live && setTracks(t))
      .catch((err) => live && setError(err instanceof Error ? err.message : 'Audius read failed'))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [station]);

  const play = (track: Track) => {
    if (current?.id === track.id) {
      status.playing ? player.pause() : player.play();
      return;
    }
    player.replace({ uri: track.streamUrl });
    player.play();
    setCurrent(track);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.stations}>
        {radioPlaylists.map((p, i) => (
          <Pressable
            key={p.url}
            onPress={() => setStation(i)}
            style={[styles.chip, i === station && styles.chipOn]}
          >
            <Text style={[styles.chipText, i === station && styles.chipTextOn]}>{p.name}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.primary} style={styles.pad} /> : null}
      <FlatList
        data={tracks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => play(item)} style={styles.track}>
            <Text style={[styles.title, current?.id === item.id && styles.on]}>{item.title}</Text>
            <Text style={styles.meta}>{item.artist}</Text>
          </Pressable>
        )}
      />
      {current ? (
        <View style={styles.now}>
          <Text style={styles.title} numberOfLines={1}>
            {status.playing ? 'Playing' : 'Paused'}: {current.title}
          </Text>
          <Text style={styles.meta}>Streams from Audius</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  pad: { padding: 24 },
  stations: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.surfaceLight, margin: 4 },
  chipOn: { backgroundColor: colors.primary },
  chipText: { color: colors.text },
  chipTextOn: { color: colors.background, fontWeight: '600' },
  track: { paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.surfaceLight },
  title: { color: colors.text },
  on: { color: colors.primary, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 12 },
  now: { padding: 12, backgroundColor: colors.surface },
  error: { color: colors.bad, padding: 12 },
});
