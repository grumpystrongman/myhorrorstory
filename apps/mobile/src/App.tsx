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
  { title: 'Static Between Stations', risk: 'High Signal Drift' },
  { title: 'Black Chapel Ledger', risk: 'Escalation Locked' },
  { title: 'The Harvest Men', risk: 'Group Event Pressure' },
  { title: 'Signal From Kharon-9', risk: 'Telemetry Anomaly' },
  { title: 'Midnight Lockbox (Short Mode)', risk: 'Rapid Burn Run' }
];

const inboxPreview = [
  { from: 'Archive Operator', channel: 'SIGNAL', text: 'Incoming clip marked 9s dead-air window.' },
  { from: 'Unknown Caller', channel: 'VOICE', text: 'No callback route. Number remains masked.' },
  { from: 'Field Witness', channel: 'SMS', text: 'Repeated digits found in waveform marker.' }
];

export default function App(): JSX.Element {
  const [controls, setControls] = useState(defaultMobileControlState);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroPanel}>
          <Text style={styles.brand}>MYHORRORSTORY MOBILE OPERATOR</Text>
          <Text style={styles.title}>Investigation Field Console</Text>
          <Text style={styles.subtitle}>
            Review active files, monitor incoming transmissions, and control live session playback from your
            phone.
          </Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>STATUS: LINKED TO CASE RELAY</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Active Cases</Text>
          {stories.map((story) => (
            <View style={styles.storyRow} key={story.title}>
              <Text style={styles.storyTitle}>{story.title}</Text>
              <Text style={styles.storyRisk}>{story.risk}</Text>
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Signal Inbox</Text>
          {inboxPreview.map((message) => (
            <View style={styles.feedRow} key={`${message.from}-${message.channel}`}>
              <View style={styles.feedTop}>
                <Text style={styles.feedFrom}>{message.from}</Text>
                <Text style={styles.feedChannel}>{message.channel}</Text>
              </View>
              <Text style={styles.feedText}>{message.text}</Text>
            </View>
          ))}
          <Text style={styles.mutedText}>Audio cipher hint: repeated code appears after speed shift.</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Accessibility And Pairing</Text>
          <Pressable onPress={() => setControls((current) => toggleSubtitles(current))} style={styles.controlWide}>
            <Text style={styles.controlLabel}>
              {controls.subtitles ? 'Disable' : 'Enable'} Subtitles
            </Text>
          </Pressable>
          <Text style={styles.listItem}>Subtitles: {controls.subtitles ? 'Enabled' : 'Disabled'}</Text>
          <Text style={styles.listItem}>High contrast mobile mode</Text>
          <Text style={styles.listItem}>Readable type scale for long clue logs</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Evidence Board Controls</Text>
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
    backgroundColor: '#070b12'
  },
  container: {
    padding: 20,
    gap: 14
  },
  heroPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#4b6a8f',
    backgroundColor: '#101925',
    padding: 16,
    gap: 8
  },
  brand: {
    color: '#9fb0c7',
    letterSpacing: 2,
    fontSize: 12,
    fontWeight: '600'
  },
  title: {
    color: '#edf2fa',
    fontSize: 32,
    fontWeight: '700'
  },
  subtitle: {
    color: '#b0bdd0',
    fontSize: 15,
    lineHeight: 22
  },
  statusPill: {
    marginTop: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d8a953',
    backgroundColor: '#131014',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  statusPillText: {
    color: '#f1c77a',
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '600'
  },
  panel: {
    backgroundColor: '#131b28',
    borderColor: '#364d69',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8
  },
  panelTitle: {
    color: '#edf2fa',
    fontWeight: '700',
    fontSize: 18
  },
  storyRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#415b7a',
    backgroundColor: '#0f1520',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 3
  },
  storyTitle: {
    color: '#edf2fa',
    fontSize: 15,
    fontWeight: '600'
  },
  storyRisk: {
    color: '#c3cfde',
    fontSize: 12
  },
  feedRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#415b7a',
    backgroundColor: '#0f1520',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 5
  },
  feedTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  feedFrom: {
    color: '#edf2fa',
    fontWeight: '600',
    fontSize: 13
  },
  feedChannel: {
    color: '#f1c77a',
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '700'
  },
  feedText: {
    color: '#c3cfde',
    fontSize: 14
  },
  mutedText: {
    color: '#a8b4c8',
    fontSize: 13
  },
  listItem: {
    color: '#edf2fa',
    fontSize: 15
  },
  controlRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  control: {
    backgroundColor: '#2a3a50',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3f5a78'
  },
  controlWide: {
    backgroundColor: '#2a3a50',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3f5a78',
    alignItems: 'center'
  },
  controlLabel: {
    color: '#edf2fa',
    fontSize: 14,
    fontWeight: '600'
  }
});
