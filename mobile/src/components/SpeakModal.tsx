import { bump, speakSeconds, today, week } from '@upskill/shared';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { updateProgress, useProgress } from '../lib/progress';
import { C } from '../theme';
import { Body, Button, H2, Muted, st, toast } from './ui';

const SCALES: [string, string][] = [['Pace', 'Not too fast or slow'], ['Few filler words', 'Fewer "um", "like", "basically"'], ['Clarity', 'Would a friend understand?']];
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function SpeakModal({ prompt, onClose }: { prompt: string; onClose: () => void }) {
  const p = useProgress();
  const secs = speakSeconds(week(p));
  const [left, setLeft] = useState(secs);
  const [running, setRunning] = useState(false);
  const [rating, setRating] = useState([0, 0, 0]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((v) => {
      if (v <= 1) { setRunning(false); toast('Time! Stop recording.'); return 0; }
      return v - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [running]);

  const save = () => {
    updateProgress((cur) => bump({ ...cur, speak: { ...cur.speak, [today()]: { p: prompt, r: rating, s: secs } } }, 15));
    toast('Saved. Same time tomorrow!');
    onClose();
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={{ backgroundColor: C.surface }} contentContainerStyle={{ padding: 20, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <H2>Speaking · {secs} s</H2>
          <Button title="Close" kind="ghost" onPress={onClose} />
        </View>
        <Body style={{ fontWeight: '600' }}>{prompt}</Body>
        <Muted>Open your phone’s voice recorder, press record, then start the timer. Talk as if explaining to a friend.</Muted>
        <Text style={{ fontSize: 48, fontWeight: '600', textAlign: 'center', color: C.ink, marginVertical: 8 }} accessibilityLabel={`${left} seconds left`}>{fmt(left)}</Text>
        <Button title={running ? 'Stop' : left < secs && left > 0 ? 'Resume' : 'Start timer'} onPress={() => setRunning((r) => !r)} />
        <Text style={[st.ch, { marginTop: 12 }]}>Listen once, then rate yourself</Text>
        {SCALES.map(([name, hint], i) => (
          <View key={name} style={{ gap: 6 }}>
            <Muted><Text style={{ color: C.ink, fontWeight: '600' }}>{name}</Text> · {hint}</Muted>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[1, 2, 3, 4, 5].map((v) => {
                const on = rating[i] === v;
                return (
                  <Pressable key={v} accessibilityRole="button" accessibilityLabel={`${name} ${v}`} accessibilityState={{ selected: on }} onPress={() => setRating((r) => r.map((x, k) => (k === i ? v : x)))}
                    style={{ flex: 1, minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: on ? C.primary : C.line2, backgroundColor: on ? C.primary : C.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontWeight: '700', color: on ? C.primaryInk : C.ink }}>{v}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        <Button title="Save to my log" onPress={save} disabled={rating.includes(0)} style={{ marginTop: 12 }} />
      </ScrollView>
    </Modal>
  );
}
