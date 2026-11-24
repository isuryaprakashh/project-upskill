import { bump, content, speakSeconds, week } from '@upskill/shared';
import type { ChecklistSession, DesignSession, LessonSession, OutlineSession, ReviewSession } from '@upskill/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Sketch } from '../../components/Sketch';
import { SpeakModal } from '../../components/SpeakModal';
import { Badge, Body, Button, Card, Check, H1, H2, Icon, ICONS, Muted, openUrl, Rich, Row, Screen, Segmented, st, toast } from '../../components/ui';
import { indexOf, leetcode, plain, sessionById, TRACK } from '../../lib/course';
import { updateProgress, useProgress } from '../../lib/progress';
import { C, mono } from '../../theme';

const PAGES = ['Warm-up', 'The idea', 'Picture it', 'Choose wisely', 'In code', 'Interview'];
const toggle = (key: 'tchk' | 'solved' | 'read', id: string, xp = 0) =>
  updateProgress((p) => { const on = !p[key][id]; return { ...p, [key]: { ...p[key], [id]: on }, xp: p.xp + (on ? xp : 0) }; });

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = sessionById(String(id));
  const router = useRouter();
  const p = useProgress();
  const [speak, setSpeak] = useState<string | null>(null);
  if (!s) return <Screen><H1>Not found</H1><Button title="Back" kind="secondary" onPress={() => router.back()} /></Screen>;

  const done = !!p.done[s.id];
  const finish = () => {
    if (done) { updateProgress((cur) => ({ ...cur, done: { ...cur.done, [s.id]: false } })); toast('Marked as not done'); return; }
    updateProgress((cur) => { const { [s.id]: _drop, ...pos } = cur.pos; return bump({ ...cur, done: { ...cur.done, [s.id]: true }, pos }, 30); });
    toast('Done. Nice work!');
    router.back();
  };
  const speakText = s.kind === 'design' ? s.speak : s.kind === 'review' ? `STAR story: ${s.star}` : `Explain “${plain(s.title)}” in ${speakSeconds(week(p))} seconds`;
  const header = (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44 }}>
          <Icon d={ICONS.back} color={C.ink3} /><Text style={{ color: C.ink3, fontSize: 14 }}>Back</Text>
        </Pressable>
        <Muted>{TRACK[s.track].name} · {indexOf(s) + 1} of {content.sessions[s.track].length}</Muted>
      </View>
      <H1>{s.title}</H1>
    </>
  );
  return (
    <>
      {s.kind === 'lesson'
        ? <Lesson s={s} header={header} done={done} onFinish={finish} onSpeak={() => setSpeak(speakText)} />
        : <Task s={s} header={header} done={done} onFinish={finish} onSpeak={() => setSpeak(speakText)} speakText={speakText} />}
      {speak && <SpeakModal prompt={speak} onClose={() => setSpeak(null)} />}
    </>
  );
}

function Note({ id }: { id: string }) {
  const p = useProgress();
  return (
    <Card>
      <Text style={st.ch}>One line: what tripped you up?</Text>
      <TextInput accessibilityLabel="Your note" multiline placeholder="I forgot to check the map before adding the number" placeholderTextColor={C.ink4}
        style={[st.input, { minHeight: 88, textAlignVertical: 'top' }]} value={p.notes[id] ?? ''}
        onChangeText={(v) => updateProgress((cur) => ({ ...cur, notes: { ...cur.notes, [id]: v } }))} />
    </Card>
  );
}

/* ---------- full DSA lesson ---------- */
function Lesson({ s, header, done, onFinish, onSpeak }: { s: LessonSession; header: React.ReactNode; done: boolean; onFinish: () => void; onSpeak: () => void }) {
  const p = useProgress();
  const saved = p.pos[s.id];
  const [tab, setTab] = useState<'learn' | 'practice' | 'notes'>((saved?.t as 'learn' | 'practice' | 'notes') ?? 'learn');
  const [step, setStep] = useState(saved?.s ?? 0);
  const L = s.lesson;
  useEffect(() => {
    if (!done) updateProgress((cur) => ({ ...cur, pos: { ...cur.pos, [s.id]: { t: tab, s: step } } }));
  }, [tab, step, s.id, done]);
  const last = step === PAGES.length - 1;

  const footer = tab === 'learn'
    ? <>{step > 0 && <Button title="Back" kind="secondary" onPress={() => setStep(step - 1)} style={{ flex: 1 }} />}<Button title={last ? 'Practice →' : 'Next'} onPress={() => (last ? (setStep(0), setTab('practice')) : setStep(step + 1))} style={{ flex: 1 }} /></>
    : tab === 'practice' ? <Button title="Notes →" onPress={() => setTab('notes')} style={{ flex: 1 }} />
    : <Button title={done ? 'Mark as not done' : 'Finish lesson'} onPress={onFinish} style={{ flex: 1 }} />;

  return (
    <Screen footer={footer}>
      {header}
      <Segmented value={tab} onChange={setTab} options={[['learn', 'Learn'], ['practice', 'Practice'], ['notes', 'Notes']]} />
      {tab === 'learn' && <>
        <View style={{ flexDirection: 'row', gap: 4 }}>{PAGES.map((_, i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? C.primary : C.line }} />)}</View>
        <Muted>Step {step + 1} of {PAGES.length} · {PAGES[step]}</Muted>
        {step === 0 && <Quiz s={s} />}
        {step === 1 && <>
          <Text style={{ fontSize: 21, fontWeight: '700', color: C.ink, lineHeight: 28 }}>{L.question}</Text>
          <Body style={{ color: C.ink2 }}>{L.hook}</Body>
          <Rich text={L.plain} />
          <Card><Text style={st.ch}>What it is</Text>{L.what.map((w) => <Rich key={w} text={`•  ${w}`} style={{ marginBottom: 4 }} />)}</Card>
        </>}
        {step === 2 && <>
          <Card><Sketch svg={L.sketchSvg} /><Text style={{ fontStyle: 'italic', color: C.ink2, marginTop: 6 }}>{L.caption}</Text></Card>
          <Card><Text style={st.ch}>{L.steps.title}</Text>{L.steps.items.map((x, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: C.primary, fontSize: 12, fontWeight: '700' }}>{i + 1}</Text></View>
              <Body style={{ flex: 1, fontSize: 15 }}>{x}</Body>
            </View>
          ))}</Card>
        </>}
        {step === 3 && <>
          <Card><Text style={st.ch}>When to use what</Text>{L.table.rows.map((r, i) => (
            <View key={i} style={{ paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
              <Body style={{ fontWeight: '600', fontSize: 15 }}>{r[0]}</Body>
              {r.slice(1).map((c, j) => <Muted key={j}>{L.table.head[j + 1]}: {c}</Muted>)}
            </View>
          ))}</Card>
          <Card style={{ gap: 8 }}><Text style={st.ch}>Trade-off: {L.tradeoff.question}</Text>
            <Body style={{ fontSize: 15 }}><Text style={{ fontWeight: '700' }}>{L.tradeoff.left[0]}: </Text>{L.tradeoff.left[1]}</Body>
            <Body style={{ fontSize: 15 }}><Text style={{ fontWeight: '700' }}>{L.tradeoff.right[0]}: </Text>{L.tradeoff.right[1]}</Body>
          </Card>
        </>}
        {step === 4 && <>
          <Card><Text style={st.ch}>In code · {L.code.label}</Text><ScrollView horizontal><Text style={{ fontFamily: mono, fontSize: 12.5, color: C.ink, lineHeight: 20 }} selectable>{L.code.text}</Text></ScrollView></Card>
          <View style={{ backgroundColor: C.primarySoft, borderRadius: 8, padding: 12 }}><Text style={{ color: C.primary, fontSize: 12, fontWeight: '700' }}>In one line</Text><Body>{L.oneLine}</Body></View>
        </>}
        {step === 5 && <>
          <Card><Text style={st.ch}>Say it in an interview</Text>{L.recap.map((r, i) => <Body key={r} style={{ fontSize: 15, marginBottom: 4 }}>{i + 1}. {r}</Body>)}</Card>
          <Button title="Practise saying it out loud" kind="secondary" icon={ICONS.mic} onPress={onSpeak} />
        </>}
      </>}
      {tab === 'practice' && s.problems.map((pr) => <Problem key={pr.num} pr={pr} />)}
      {tab === 'notes' && <Note id={s.id} />}
    </Screen>
  );
}

function Quiz({ s }: { s: LessonSession }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = s.quiz[i];
  // Mix up the answer order in a fixed way per question, so the right answer isn't always first.
  const order = useMemo(() => {
    if (!q) return [];
    const n = q.options.length;
    const shift = [...q.q].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % n;
    return q.options.map((_, k) => (k + shift) % n);
  }, [q]);
  if (!q) return <Card><Text style={st.ch}>{s.quizLabel}</Text><Body>Warm-up done. Tap Next.</Body></Card>;
  return (
    <Card style={{ gap: 8 }}>
      <Text style={st.ch}>{s.quizLabel} · {i + 1} of {s.quiz.length}</Text>
      <Body style={{ fontWeight: '600' }}>{q.q}</Body>
      {order.map((k) => {
        const right = picked !== null && k === q.answer;
        const wrong = picked === k && k !== q.answer;
        return (
          <Pressable key={k} accessibilityRole="button" disabled={picked !== null} onPress={() => { setPicked(k); if (k === q.answer) updateProgress((p) => ({ ...p, xp: p.xp + 10 })); }}
            style={{ borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 46, borderColor: right ? C.ok : wrong ? C.bad : C.line2, backgroundColor: right ? C.okSoft : wrong ? C.badSoft : C.surface }}>
            <Text style={{ fontSize: 15, fontWeight: '500', color: right ? C.ok : wrong ? C.bad : C.ink }}>{q.options[k]}</Text>
          </Pressable>
        );
      })}
      {picked !== null && <>
        <View style={{ borderRadius: 8, padding: 10, backgroundColor: picked === q.answer ? C.okSoft : C.badSoft }}>
          <Text style={{ color: picked === q.answer ? C.ok : C.bad, fontSize: 14 }}><Text style={{ fontWeight: '700' }}>{picked === q.answer ? 'Correct. ' : 'Not quite. '}</Text>{q.why}</Text>
        </View>
        <Button title={i < s.quiz.length - 1 ? 'Next question' : 'Finish warm-up'} kind="secondary" onPress={() => { setPicked(null); setI(i + 1); }} />
      </>}
    </Card>
  );
}

function Problem({ pr }: { pr: LessonSession['problems'][number] }) {
  const p = useProgress();
  const [hints, setHints] = useState(0);
  const [showSol, setShowSol] = useState(false);
  const all = pr.hints ?? [];
  const key = `lc${pr.num}`;
  return (
    <Card style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Badge tone={pr.level === 'Easy' ? 'ok' : pr.level === 'Medium' ? 'warn' : 'bad'}>{pr.level}</Badge><Muted>#{pr.num}{pr.boss ? ' · boss: 25-minute target' : ''}</Muted></View>
      <H2>{pr.title}</H2>
      <Body style={{ fontSize: 15 }}>{pr.ask}</Body>
      <Button title="Solve on LeetCode ↗" onPress={() => openUrl(leetcode(pr.slug))} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title={hints >= all.length ? 'No more hints' : `Hint ${hints + 1}`} kind="secondary" disabled={hints >= all.length} onPress={() => setHints(hints + 1)} style={{ flex: 1 }} />
        <Button title="Solution" kind="secondary" disabled={showSol} onPress={() => setShowSol(true)} style={{ flex: 1 }} />
      </View>
      {all.slice(0, hints).map((h, i) => <View key={i} style={{ backgroundColor: C.warnSoft, borderRadius: 8, padding: 10 }}><Text style={{ color: C.warn, fontSize: 14 }}><Text style={{ fontWeight: '700' }}>Hint {i + 1}: </Text>{h}</Text></View>)}
      {showSol && <View style={{ gap: 6 }}>
        <ScrollView horizontal style={{ backgroundColor: C.surface2, borderRadius: 8, padding: 10 }}><Text style={{ fontFamily: mono, fontSize: 12, color: C.ink, lineHeight: 19 }} selectable>{pr.solution}</Text></ScrollView>
        <Muted><Text style={{ fontWeight: '700' }}>Complexity: </Text>{pr.complexity}</Muted>
        <Muted><Text style={{ fontWeight: '700' }}>Common mistake: </Text>{pr.mistake}</Muted>
      </View>}
      <Check on={!!p.solved[key]} onChange={() => toggle('solved', key, 20)}>I solved it</Check>
    </Card>
  );
}

/* ---------- every other kind of session ---------- */
type TaskSession = OutlineSession | DesignSession | ChecklistSession | ReviewSession;
function Task({ s, header, done, onFinish, onSpeak, speakText }: { s: TaskSession; header: React.ReactNode; done: boolean; onFinish: () => void; onSpeak: () => void; speakText: string }) {
  const p = useProgress();
  const steps = (ids: string[], items: string[]) => items.map((x, j) => <Check key={ids[j]} on={!!p.tchk[ids[j]]} onChange={() => toggle('tchk', ids[j])}>{x}</Check>);
  const ri = s.track === 'research' ? indexOf(s) : -1;
  return (
    <Screen footer={<Button title={done ? 'Mark as not done' : 'Mark as done'} onPress={onFinish} style={{ flex: 1 }} />}>
      {header}
      {s.kind === 'outline' && <>
        <Card><Text style={st.ch}>Learn</Text><Body>{s.learn}</Body></Card>
        {s.problems.length > 0 && <Card><Text style={st.ch}>Practice</Text>
          {s.problems.map((pr) => <Row key={pr.num} title={`${pr.num}. ${pr.title} ↗`} sub={pr.level} onPress={() => openUrl(leetcode(pr.slug))} right={<Check on={!!p.solved[`lc${pr.num}`]} onChange={() => toggle('solved', `lc${pr.num}`, 20)} label={`Solved ${pr.title}`} />} />)}
          <Muted style={{ marginTop: 8 }}>Try first. Stuck for 20 minutes? Read the official editorial, then re-solve it tomorrow.</Muted>
        </Card>}
      </>}
      {s.kind === 'design' && <>
        <Card><Text style={st.ch}>1 · Read</Text>{s.articles.map((a) => <Row key={a.key} title={`${a.title} ↗`} sub="Harshit Khosla · Vidya" onPress={() => openUrl(a.url)} right={<Check on={!!p.read[a.key]} onChange={() => toggle('read', a.key)} label={`Read ${a.title}`} />} />)}</Card>
        <Card><Text style={st.ch}>2 · AWS: {s.aws}</Text><Body>{s.awsWhat}</Body></Card>
        <Card><Text style={st.ch}>3 · Hands-on</Text>{steps(s.lab.map((_, j) => `${s.id}-${j}`), s.lab)}<Muted>Set a billing alert before your first lab, and clean up after each one.</Muted></Card>
      </>}
      {s.kind === 'checklist' && <Card>
        <Body style={{ marginBottom: 8 }}>{s.why}</Body>
        {steps(s.steps.map((_, j) => (s.track === 'research' ? `research-${ri}-${j}` : `${s.id}-${j}`)), s.steps)}
        {s.template ? <Text selectable style={{ backgroundColor: C.surface2, borderRadius: 8, padding: 10, marginTop: 8, fontSize: 13, color: C.ink }}>{s.template}</Text> : null}
        <Muted style={{ marginTop: 8 }}>Result: {s.result}</Muted>
      </Card>}
      {s.kind === 'review' && <Card>
        {steps([0, 1, 2, 3, 4].map((j) => `${s.id}-${j}`), ['Re-solve 2 problems from your notebook', 'Skim the top stories on Hacker News for 10 minutes and note one trend', 'Apply sprint: 20 minutes, aim for 5 applications', `Speak: tell the STAR story “${s.star}” in 2 minutes`, 'Glance at next week in Tracks'])}
        <Button title="Open Hacker News ↗" kind="secondary" onPress={() => openUrl('https://news.ycombinator.com/')} />
      </Card>}
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}><Text style={st.ch}>Speak it</Text><Muted>{speakText}</Muted></View>
        <Button title="Speak" kind="secondary" icon={ICONS.mic} onPress={onSpeak} />
      </Card>
      <Note id={s.id} />
    </Screen>
  );
}
