import { content, sessionById, TRACK } from '@upskill/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Body, Button, Card, Check, H1, Icon, ICONS, Muted, openUrl, Row, Screen, st } from '../../components/ui';
import { getSession, logout } from '../../lib/api';
import { retrySync, updateProgress, useProgress, useSyncStatus } from '../../lib/progress';
import { C } from '../../theme';

export default function More() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const p = useProgress();
  const sync = useSyncStatus();
  const router = useRouter();
  const back = (
    <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44 }}>
      <Icon d={ICONS.back} color={C.ink3} /><Text style={{ color: C.ink3, fontSize: 14 }}>Library</Text>
    </Pressable>
  );

  if (page === 'reading') {
    return (
      <Screen>
        {back}<H1>Reading list</H1><Muted>Articles you liked, in reading order.</Muted>
        {content.library.map((sec) => (
          <Card key={sec.section}>
            <Text style={st.ch}>{sec.section}</Text>
            <Muted>{sec.by} · {sec.items.filter((i) => p.read[i.key]).length} of {sec.items.length}</Muted>
            {sec.items.map((i) => (
              <Row key={i.key} title={i.title} onPress={() => openUrl(i.url)}
                right={<Check on={!!p.read[i.key]} label={`Read ${i.title}`} onChange={() => updateProgress((cur) => ({ ...cur, read: { ...cur.read, [i.key]: !cur.read[i.key] } }))} />} />
            ))}
          </Card>
        ))}
      </Screen>
    );
  }
  if (page === 'notes') {
    const ids = Object.keys(p.notes).filter((k) => (p.notes[k] ?? '').trim());
    return (
      <Screen>
        {back}<H1>Mistake notebook</H1><Muted>Your one-line notes. Read them before interviews.</Muted>
        {ids.length === 0 ? <Card><Muted style={{ textAlign: 'center' }}>Your notes from each session show up here.</Muted></Card> :
          ids.map((k) => { const s = sessionById(k); return <Card key={k}><Muted>{s ? `${TRACK[s.track].name} · ${s.title}` : ''}</Muted><Body>{p.notes[k]}</Body></Card>; })}
      </Screen>
    );
  }
  if (page === 'account') {
    const user = getSession()?.user;
    return (
      <Screen>
        {back}<H1>Account</H1>
        <Card style={{ gap: 12 }}>
          <View><Muted>Signed in as</Muted><Body style={{ fontWeight: '700' }}>{user?.name}</Body><Muted>{user?.email}</Muted></View>
          <Body style={{ fontSize: 15 }}>{sync === 'saved' ? 'All changes saved' : sync === 'syncing' ? 'Saving…' : 'Offline. Saved on this phone.'}</Body>
          {sync === 'offline' && <Button title="Try again" kind="secondary" onPress={() => void retrySync()} />}
          <Button title="Sign out everywhere" kind="secondary" onPress={() => void logout()} />
        </Card>
      </Screen>
    );
  }
  return (
    <Screen>
      {back}<H1>How it works</H1><Muted>24 weeks, about 60 minutes a day.</Muted>
      <Card>
        {[['Mon, Wed, Fri', 'DSA: learn, practice, one note'], ['Tue, Thu', 'System design + AWS: read, AWS service, hands-on lab'], ['Saturday', 'Build: React, React Native, the backend, Cloudflare'], ['Sunday', 'Research, or review + trends + apply sprint (alternating)'], ['Every day', '10 minutes of speaking practice']].map(([d, s]) => (
          <View key={d} style={{ paddingVertical: 8, borderTopWidth: d === 'Mon, Wed, Fri' ? 0 : 1, borderTopColor: C.line }}>
            <Body style={{ fontWeight: '700', fontSize: 15 }}>{d}</Body><Muted>{s}</Muted>
          </View>
        ))}
      </Card>
      <Muted>Behind? No problem. Today always opens the next unfinished session of that day’s track.</Muted>
    </Screen>
  );
}
