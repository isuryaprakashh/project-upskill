import { content, nextSession, speakSeconds, week } from '@upskill/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SpeakModal } from '../../components/SpeakModal';
import { Badge, Bar, Button, Card, H1, H2, Icon, Muted, Row, Screen, Segmented } from '../../components/ui';
import { speakPrompt, TRACK } from '../../lib/course';
import { useProgress } from '../../lib/progress';
import { C, TRACK_COLOR } from '../../theme';

type Tab = 'dsa' | 'sd' | 'build' | 'research' | 'review' | 'speak';
const dateOf = (day: string) => new Date(Number(day) * 86400000).toISOString().slice(0, 10);

export default function Tracks() {
  const p = useProgress();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('dsa');
  const [speaking, setSpeaking] = useState(false);
  const T = TRACK[tab];

  return (
    <Screen>
      <H1>Tracks</H1>
      <Segmented value={tab} onChange={setTab} options={(['dsa', 'sd', 'build', 'research', 'review', 'speak'] as Tab[]).map((t) => [t, TRACK[t].name])} />
      {tab === 'speak' ? (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View><H2>Speaking</H2><Muted>{T.days} · {speakSeconds(week(p))} seconds this phase</Muted></View>
            <Button title="Start" onPress={() => setSpeaking(true)} />
          </View>
          {Object.keys(p.speak).length === 0 ? <Muted style={{ textAlign: 'center', paddingVertical: 20 }}>Your speaking log will show up here.</Muted> :
            Object.keys(p.speak).sort((a, b) => Number(b) - Number(a)).map((d) => {
              const x = p.speak[d];
              return <Row key={d} title={x.p} sub={`${dateOf(d)} · pace ${x.r[0]}, fillers ${x.r[1]}, clarity ${x.r[2]}`} left={<Icon d={T.icon} color={TRACK_COLOR.speak.c} />} />;
            })}
        </Card>
      ) : (() => {
        const list = content.sessions[tab];
        const done = list.filter((s) => p.done[s.id]).length;
        const next = nextSession(content, p, tab);
        return (
          <Card>
            <H2>{T.full}</H2>
            <Muted>{T.days} · {done} of {list.length} done</Muted>
            <View style={{ marginVertical: 10, flexDirection: 'row' }}><Bar pct={(done / list.length) * 100} color={TRACK_COLOR[tab].c} /></View>
            {list.map((s, i) => (
              <Row key={s.id} title={s.title} sub={s.kind === 'design' ? `AWS: ${s.aws}` : s.kind === 'review' ? `STAR: ${s.star}` : undefined}
                onPress={() => router.push(`/session/${s.id}`)}
                left={<Text style={{ width: 24, textAlign: 'right', color: C.ink3 }}>{i + 1}</Text>}
                right={p.done[s.id] ? <Badge tone="ok">Done</Badge> : s === next ? <Badge tone="primary">Next</Badge> : undefined} />
            ))}
          </Card>
        );
      })()}
      {speaking && <SpeakModal prompt={speakPrompt(p)} onClose={() => setSpeaking(false)} />}
    </Screen>
  );
}
