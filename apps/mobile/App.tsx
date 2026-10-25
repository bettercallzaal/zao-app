import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { colors } from './src/lib/theme';
import { EstateScreen } from './src/screens/EstateScreen';
import { FeedScreen } from './src/screens/FeedScreen';
import { MusicScreen } from './src/screens/MusicScreen';

const tabs = [
  { key: 'feed', label: 'Feed', Screen: FeedScreen },
  { key: 'music', label: 'Music', Screen: MusicScreen },
  { key: 'estate', label: 'Estate', Screen: EstateScreen },
] as const;

export default function App() {
  const [tab, setTab] = useState(0);
  const { Screen } = tabs[tab];
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <Text style={styles.header}>The ZAO</Text>
      <View style={styles.body}>
        <Screen />
      </View>
      <View style={styles.tabs}>
        {tabs.map((t, i) => (
          <Pressable key={t.key} onPress={() => setTab(i)} style={styles.tab}>
            <Text style={[styles.tabText, i === tab && styles.tabOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { color: colors.primary, fontSize: 20, fontWeight: '700', padding: 12 },
  body: { flex: 1 },
  tabs: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.surfaceLight },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { color: colors.muted },
  tabOn: { color: colors.primary, fontWeight: '600' },
});
