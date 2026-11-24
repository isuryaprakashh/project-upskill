import { content, currentStreak, nextSession, speakSeconds, today, trackFor, week } from '@upskill/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SpeakModal } from '../../components/SpeakModal';
import { Bar, Card, H1, Icon, Muted, openUrl, Row, Screen, st } from '../../components/ui';
import { listJobs } from '../../lib/api';
import { DAY_NAMES, nextRead, sessionMeta, speakPrompt, todayTrack, TRACK, trackProgress } from '../../lib/course';
import { useProgress } from '../../lib/progress';
import { C, TRACK_COLOR } from '../../theme';

export default function Today() {
  const p = useProgress();
  const router = useRouter();
  const [speaking, setSpeaking] = useState(false);
  const [applied, setApplied] = useState(0);
  const now = new Date();
  const wd = now.getDay();
  const wk = week(p);
  const track = todayTrack(p);
  const s = nextSession(content, p, track);
  const pos = s ? p.pos[s.id] : undefined;
  const t = today();
  const streak = currentStreak(p);
  const monday = t - ((wd + 6) % 7);
  const read = nextRead(p);
  const hour = now.getHours();

  useEffect(() => {
    listJobs().then((jobs) => setApplied(jobs.filter((j) => j.applied && t - Math.floor(Date.parse(j.applied) / 86400000) < 7).length)).catch(() => {});
  }, [t]);

  const start = s ? (pos ? `Continue${s.kind === 'lesson' && pos.t === 'learn' ? ` at step ${pos.s + 1} of 6` : ''}` : s.kind === 'lesson' ? 'Start lesson' : 'Start session') : '';

  return (
    <Screen>
      <H1>{hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}</H1>
      <Muted style={{ marginTop: -8 }}>{DAY_NAMES[wd]}, week {wk} of 24</Muted>

      <View style={{ backgroundColor: C.primary, borderRadius: 14, padding: 18, gap: 6 }}>
        <Text style={{ color: '#fff', opacity: 0.85, fontSize: 13 }}>{TRACK[track].full} · {track === 'build' || track === 'research' ? '90 min' : '45–60 min'}</Text>
        <Text style={{ color: '#fff', fontSize: 21, fontWeight: '700' }}>{s ? s.title : 'Track complete'}</Text>
        <Text style={{ color: '#fff', opacity: 0.85, fontSize: 13 }}>{s ? sessionMeta(s) : 'Pick another track from Up next.'}</Text>
        {s && (
          <Pressable accessibilityRole="button" onPress={() => router.push(`/session/${s.id}`)} style={{ marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: C.primary, fontWeight: '700', fontSize: 15 }}>{start}</Text>
          </Pressable>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1, gap: 2 }}>
          <Muted>Streak</Muted>
          <Text style={{ fontSize: 30, fontWeight: '700', color: C.ink }}>{streak}</Text>
          <Muted>day{streak === 1 ? '' : 's'} in a row</Muted>
        </Card>
        <Card style={{ flex: 1, gap: 4, backgroundColor: TRACK_COLOR.speak.soft, borderColor: 'transparent' }} onPress={() => setSpeaking(true)}>
          <Text style={{ fontSize: 13, color: TRACK_COLOR.speak.ink }}>Speaking · {speakSeconds(wk)} s</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: TRACK_COLOR.speak.ink }} numberOfLines={4}>{speakPrompt(p)}</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: TRACK_COLOR.speak.ink, marginTop: 'auto' }}>{p.speak[t] ? 'Done today ✓' : '● Record'}</Text>
        </Card>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1, gap: 2 }} onPress={() => router.push('/career')}>
          <Muted>Applied this week</Muted>
          <Text style={{ fontSize: 30, fontWeight: '700', color: C.ink }}>{applied}<Text style={{ fontSize: 16, color: C.ink3 }}>/5</Text></Text>
          <Muted>Sunday apply sprint</Muted>
        </Card>
        <Card style={{ flex: 1 }}>
          <Muted>This week</Muted>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 10 }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => {
              const day = monday + i;
              const tk = trackFor((i + 1) % 7, wk);
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <View style={{ width: '100%', height: 28, borderRadius: 6, backgroundColor: p.days[day] ? TRACK_COLOR[tk].c : C.surface2, borderWidth: day === t ? 2 : 0, borderColor: C.ink }} />
                  <Text style={{ fontSize: 12, color: day === t ? C.ink : C.ink3, fontWeight: day === t ? '700' : '400' }}>{l}</Text>
                </View>
              );
            })}
          </View>
        </Card>
      </View>

      <Card onPress={() => router.push('/tracks')} style={{ gap: 10 }}>
        <Muted>Your tracks</Muted>
        {(['dsa', 'sd', 'build', 'research', 'speak', 'read'] as const).map((k) => {
          const pr = trackProgress(p, k);
          return (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ width: 100, fontSize: 13, color: C.ink }}>{TRACK[k].name}</Text>
              <Bar pct={pr.pct} color={TRACK_COLOR[k].c} />
              <Text style={[st.muted, { width: 52, textAlign: 'right' }]}>{pr.text}</Text>
            </View>
          );
        })}
      </Card>

      <Card>
        <Text style={st.ch}>Up next</Text>
        {(['dsa', 'sd', 'build', wk % 2 === 1 ? 'research' : 'review'] as const).map((k) => {
          const n = nextSession(content, p, k);
          if (!n || n === s) return null;
          return <Row key={k} title={n.title} sub={`${TRACK[k].name} · ${TRACK[k].days}`} onPress={() => router.push(`/session/${n.id}`)} left={<Icon d={TRACK[k].icon} color={TRACK_COLOR[k].c} />} right={<Text style={{ color: C.ink4, fontSize: 20 }}>›</Text>} />;
        })}
      </Card>

      {read && (
        <Card onPress={() => openUrl(read.url)} style={{ gap: 4 }}>
          <Muted>Read next</Muted>
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>{read.title}</Text>
          <Muted>{read.by} ↗</Muted>
        </Card>
      )}
      {speaking && <SpeakModal prompt={speakPrompt(p)} onClose={() => setSpeaking(false)} />}
    </Screen>
  );
}
