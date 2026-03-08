import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  defaultMobileControlState,
  panBy,
  pauseAudio,
  playAudio,
  toggleMuted,
  toggleSubtitles,
  zoomBy
} from './control-state';

const stories = [
  'Static Between Stations',
  'Black Chapel Ledger',
  'The Harvest Men',
  'Signal From Kharon-9'
];

export default function App(): JSX.Element {
  const [controls, setControls] = useState(defaultMobileControlState);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.brand}>MYHORRORSTORY</Text>
        <Text style={styles.title}>Mobile Investigation Hub</Text>
        <Text style={styles.subtitle}>Resume cases, sync with party sessions, and receive chapter events.</Text>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Active Cases</Text>
          {stories.map((story) => (
            <Text style={styles.listItem} key={story}>
              {story}
            </Text>
          ))}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Accessibility</Text>
          <Pressable onPress={() => setControls((current) => toggleSubtitles(current))} style={styles.control}>
            <Text style={styles.controlLabel}>
              {controls.subtitles ? 'Disable' : 'Enable'} Subtitles
            </Text>
          </Pressable>
          <Text style={styles.listItem}>Subtitles: {controls.subtitles ? 'Enabled' : 'Disabled'}</Text>
          <Text style={styles.listItem}>Dyslexia-friendly typography</Text>
          <Text style={styles.listItem}>High contrast mode</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Board Controls</Text>
          <View style={styles.controlRow}>
            <Pressable onPress={() => setControls((current) => zoomBy(current, 10))} style={styles.control}>
              <Text style={styles.controlLabel}>Zoom In</Text>
            </Pressable>
            <Pressable onPress={() => setControls((current) => zoomBy(current, -10))} style={styles.control}>
              <Text style={styles.controlLabel}>Zoom Out</Text>
            </Pressable>
          </View>
          <View style={styles.controlRow}>
            <Pressable onPress={() => setControls((current) => panBy(current, 0, -24))} style={styles.control}>
              <Text style={styles.controlLabel}>Pan Up</Text>
            </Pressable>
            <Pressable onPress={() => setControls((current) => panBy(current, 0, 24))} style={styles.control}>
              <Text style={styles.controlLabel}>Pan Down</Text>
            </Pressable>
          </View>
          <View style={styles.controlRow}>
            <Pressable onPress={() => setControls((current) => panBy(current, -24, 0))} style={styles.control}>
              <Text style={styles.controlLabel}>Pan Left</Text>
            </Pressable>
            <Pressable onPress={() => setControls((current) => panBy(current, 24, 0))} style={styles.control}>
              <Text style={styles.controlLabel}>Pan Right</Text>
            </Pressable>
          </View>
          <Text style={styles.listItem}>Zoom: {controls.zoom}%</Text>
          <Text style={styles.listItem}>
            Pan: x {controls.panX}, y {controls.panY}
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Audio Controls</Text>
          <View style={styles.controlRow}>
            <Pressable onPress={() => setControls((current) => playAudio(current))} style={styles.control}>
              <Text style={styles.controlLabel}>Play</Text>
            </Pressable>
            <Pressable onPress={() => setControls((current) => pauseAudio(current))} style={styles.control}>
              <Text style={styles.controlLabel}>Pause</Text>
            </Pressable>
            <Pressable onPress={() => setControls((current) => toggleMuted(current))} style={styles.control}>
              <Text style={styles.controlLabel}>{controls.muted ? 'Unmute' : 'Mute'}</Text>
            </Pressable>
          </View>
          <Text style={styles.listItem}>Audio: {controls.playing ? 'Playing' : 'Paused'}</Text>
          <Text style={styles.listItem}>Muted: {controls.muted ? 'Yes' : 'No'}</Text>
        </View>

        <StatusBar style="light" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0d1017'
  },
  container: {
    padding: 20,
    gap: 14
  },
  brand: {
    color: '#b6ada0',
    letterSpacing: 4
  },
  title: {
    color: '#f5f1e8',
    fontSize: 34,
    fontWeight: '700'
  },
  subtitle: {
    color: '#b6ada0',
    fontSize: 16
  },
  panel: {
    backgroundColor: '#1a1f2c',
    borderColor: '#31394f',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8
  },
  panelTitle: {
    color: '#f5f1e8',
    fontWeight: '700',
    fontSize: 18
  },
  listItem: {
    color: '#f5f1e8',
    fontSize: 15
  },
  controlRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  control: {
    backgroundColor: '#2c3547',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8
  },
  controlLabel: {
    color: '#f5f1e8',
    fontSize: 14,
    fontWeight: '600'
  }
});
