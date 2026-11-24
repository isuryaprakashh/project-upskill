import { content, dayOf, isoOf, today } from '@upskill/shared';
import type { Hackathon, HackathonInput, HackStatus, Job, JobInput, JobStatus } from '@upskill/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Badge, Button, Card, Field, H1, H2, Muted, openUrl, Row, Screen, Segmented, st, toast } from '../../components/ui';
import { ApiError, deleteHackathon, deleteJob, listHackathons, listJobs, saveHackathon, saveJob } from '../../lib/api';
import { C } from '../../theme';

const JOB_STATUS: JobStatus[] = ['Saved', 'Applied', 'OA', 'Interview', 'Offer', 'Rejected'];
const HACK_STATUS: HackStatus[] = ['Interested', 'Registered', 'Submitted', 'Result'];
const TONE: Record<string, string> = { Applied: 'primary', OA: 'warn', Interview: 'warn', Offer: 'ok', Rejected: 'bad', Registered: 'primary', Submitted: 'warn', Result: 'ok' };
const nowDay = () => today();
const dayNum = dayOf;
const iso = isoOf;
const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : 'Something went wrong');

type Tab = 'jobs' | 'hacks' | 'tpl' | 'where';

export default function Career() {
  const [tab, setTab] = useState<Tab>('jobs');
  return (
    <Screen>
      <H1>Career</H1>
      <Segmented value={tab} onChange={setTab} options={[['jobs', 'My tracker'], ['hacks', 'Hackathons'], ['tpl', 'Templates'], ['where', 'Where to look']]} />
      {tab === 'jobs' && <Jobs />}
      {tab === 'hacks' && <Hacks />}
      {tab === 'tpl' && content.templates.map((t) => <Card key={t.title}><Text style={st.ch}>{t.title}</Text><Text selectable style={{ fontSize: 14, color: C.ink, lineHeight: 21 }}>{t.text}</Text><Muted style={{ marginTop: 6 }}>Press and hold to copy.</Muted></Card>)}
      {tab === 'where' && content.whereToLook.map((w) => <Card key={w.heading}><Text style={st.ch}>{w.heading}</Text>{w.items.map((i) => <Row key={i.url} title={`${i.name} ↗`} onPress={() => openUrl(i.url)} />)}</Card>)}
    </Screen>
  );
}

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: C.ink2 }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {options.map((o) => (
          <Pressable key={o} accessibilityRole="radio" accessibilityState={{ checked: o === value }} onPress={() => onChange(o)}
            style={{ paddingHorizontal: 12, minHeight: 38, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: o === value ? C.primary : C.line2, backgroundColor: o === value ? C.primarySoft : C.surface }}>
            <Text style={{ color: o === value ? C.primary : C.ink, fontWeight: '500' }}>{o}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={{ backgroundColor: C.surface }} contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><H2>{title}</H2><Button title="Close" kind="ghost" onPress={onClose} /></View>
        {children}
      </ScrollView>
    </Modal>
  );
}

function Jobs() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [edit, setEdit] = useState<{ id?: string; v: JobInput } | null>(null);
  const load = useCallback(() => { listJobs().then(setJobs).catch((e) => { setJobs([]); fail(e); }); }, []);
  useFocusEffect(load);
  const t = nowDay();
  const week = (jobs ?? []).filter((j) => { const a = dayNum(j.applied); return a !== null && t - a < 7; }).length;
  const due = (j: Job) => { const f = dayNum(j.follow); return f !== null && f <= t && (j.status === 'Applied' || j.status === 'OA'); };
  const set = (patch: Partial<JobInput>) => setEdit((e) => (e ? { ...e, v: { ...e.v, ...patch } } : e));
  const save = async () => {
    if (!edit) return;
    if (!edit.v.company.trim() || !edit.v.role.trim()) { toast('Add a company and role'); return; }
    try { await saveJob(edit.v, edit.id); setEdit(null); toast('Saved'); load(); } catch (e) { fail(e); }
  };
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[[`${week}/5`, 'applied this week'], [String((jobs ?? []).filter((j) => j.status !== 'Rejected' && j.status !== 'Offer').length), 'active'], [String((jobs ?? []).filter(due).length), 'follow-ups due']].map(([v, l]) => (
          <Card key={l} style={{ flex: 1, padding: 12 }}><Text style={{ fontSize: 19, fontWeight: '700', color: C.ink }}>{v}</Text><Muted>{l}</Muted></Card>
        ))}
      </View>
      <Button title="+ Add job" onPress={() => setEdit({ v: { company: '', role: '', loc: 'Remote', status: 'Saved', link: '', referral: '', applied: '', follow: '', notes: '' } })} />
      <Card>
        {jobs === null ? <Muted>Loading…</Muted> : jobs.length === 0 ? <Muted style={{ textAlign: 'center', paddingVertical: 16 }}>No jobs yet. Save one as soon as you see it; apply in your Sunday sprint.</Muted> :
          jobs.map((j) => <Row key={j.id} title={`${j.company} · ${j.role}`} sub={`${j.loc}${j.referral ? ' · referral' : ''}${j.applied ? ` · applied ${j.applied}` : ''}`}
            onPress={() => setEdit({ id: j.id, v: { company: j.company, role: j.role, loc: j.loc, status: j.status, link: j.link, referral: j.referral, applied: j.applied, follow: j.follow, notes: j.notes } })}
            right={<View style={{ alignItems: 'flex-end', gap: 4 }}>{due(j) && <Badge tone="bad">Follow up</Badge>}<Badge tone={TONE[j.status]}>{j.status}</Badge></View>} />)}
      </Card>
      {edit && (
        <Sheet title={edit.id ? 'Edit job' : 'Add job'} onClose={() => setEdit(null)}>
          <Field label="Company" value={edit.v.company} onChangeText={(v) => set({ company: v })} />
          <Field label="Role" value={edit.v.role} onChangeText={(v) => set({ role: v })} />
          <Choice label="Location" value={edit.v.loc} options={['Remote', 'India', 'Hybrid', 'Other']} onChange={(v) => set({ loc: v })} />
          <Choice label="Status" value={edit.v.status} options={JOB_STATUS} onChange={(status) => set(status === 'Applied' ? { status, applied: edit.v.applied || iso(t), follow: edit.v.follow || iso(t + 7) } : { status })} />
          <Field label="Job link" value={edit.v.link} onChangeText={(v) => set({ link: v })} autoCapitalize="none" keyboardType="url" />
          <Field label="Referral (person’s name, if any)" value={edit.v.referral} onChangeText={(v) => set({ referral: v })} />
          <Field label="Applied on (YYYY-MM-DD)" value={edit.v.applied} onChangeText={(v) => set({ applied: v })} />
          <Field label="Follow up on (YYYY-MM-DD)" value={edit.v.follow} onChangeText={(v) => set({ follow: v })} />
          <Field label="Notes" value={edit.v.notes} onChangeText={(v) => set({ notes: v })} multiline />
          <Button title="Save" onPress={save} />
          {edit.id && <Button title="Delete" kind="secondary" onPress={async () => { try { await deleteJob(edit.id!); setEdit(null); toast('Deleted'); load(); } catch (e) { fail(e); } }} />}
        </Sheet>
      )}
    </>
  );
}

function Hacks() {
  const [items, setItems] = useState<Hackathon[] | null>(null);
  const [edit, setEdit] = useState<{ id?: string; v: HackathonInput } | null>(null);
  const load = useCallback(() => { listHackathons().then(setItems).catch((e) => { setItems([]); fail(e); }); }, []);
  useFocusEffect(load);
  const t = nowDay();
  const set = (patch: Partial<HackathonInput>) => setEdit((e) => (e ? { ...e, v: { ...e.v, ...patch } } : e));
  const save = async () => {
    if (!edit) return;
    if (!edit.v.name.trim()) { toast('Add a name'); return; }
    try { await saveHackathon(edit.v, edit.id); setEdit(null); toast('Saved'); load(); } catch (e) { fail(e); }
  };
  return (
    <>
      <Button title="+ Add hackathon" onPress={() => setEdit({ v: { name: '', platform: '', status: 'Interested', deadline: '', team: '', link: '', notes: '' } })} />
      <Card>
        {items === null ? <Muted>Loading…</Muted> : items.length === 0 ? <Muted style={{ textAlign: 'center', paddingVertical: 16 }}>No hackathons yet. Check Devfolio and Unstop on review Sundays.</Muted> :
          items.map((h) => {
            const d = dayNum(h.deadline); const left = d !== null ? d - t : null;
            return <Row key={h.id} title={h.name} sub={`${h.platform}${h.deadline ? ` · deadline ${h.deadline}` : ''}`}
              onPress={() => setEdit({ id: h.id, v: { name: h.name, platform: h.platform, status: h.status, deadline: h.deadline, team: h.team, link: h.link, notes: h.notes } })}
              right={<View style={{ alignItems: 'flex-end', gap: 4 }}>{left !== null && left >= 0 && left <= 7 && h.status !== 'Result' && <Badge tone="warn">{`${left}d left`}</Badge>}<Badge tone={TONE[h.status]}>{h.status}</Badge></View>} />;
          })}
      </Card>
      {edit && (
        <Sheet title={edit.id ? 'Edit hackathon' : 'Add hackathon'} onClose={() => setEdit(null)}>
          <Field label="Name" value={edit.v.name} onChangeText={(v) => set({ name: v })} />
          <Field label="Platform" value={edit.v.platform} onChangeText={(v) => set({ platform: v })} />
          <Choice label="Status" value={edit.v.status} options={HACK_STATUS} onChange={(status) => set({ status })} />
          <Field label="Deadline (YYYY-MM-DD)" value={edit.v.deadline} onChangeText={(v) => set({ deadline: v })} />
          <Field label="Team" value={edit.v.team} onChangeText={(v) => set({ team: v })} />
          <Field label="Link" value={edit.v.link} onChangeText={(v) => set({ link: v })} autoCapitalize="none" keyboardType="url" />
          <Field label="Notes" value={edit.v.notes} onChangeText={(v) => set({ notes: v })} multiline />
          <Button title="Save" onPress={save} />
          {edit.id && <Button title="Delete" kind="secondary" onPress={async () => { try { await deleteHackathon(edit.id!); setEdit(null); toast('Deleted'); load(); } catch (e) { fail(e); } }} />}
        </Sheet>
      )}
    </>
  );
}

