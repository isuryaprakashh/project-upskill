import { content, dayOf, isoOf, today } from '@upskill/shared';
import type { Hackathon, HackathonInput, HackStatus, Job, JobInput, JobStatus } from '@upskill/shared';
import { useCallback, useEffect, useState } from 'react';
import { copy, Sheet, toast } from '../components/ui';
import { ApiError, deleteHackathon, deleteJob, listHackathons, listJobs, saveHackathon, saveJob } from '../lib/api';

const JOB_STATUS: JobStatus[] = ['Saved', 'Applied', 'OA', 'Interview', 'Offer', 'Rejected'];
const HACK_STATUS: HackStatus[] = ['Interested', 'Registered', 'Submitted', 'Result'];
const TONE: Record<string, string> = { Applied: 'b-p', OA: 'b-warn', Interview: 'b-warn', Offer: 'b-ok', Rejected: 'b-bad', Registered: 'b-p', Submitted: 'b-warn', Result: 'b-ok' };
const TABS = [['jobs', 'My tracker'], ['hacks', 'Hackathons'], ['tpl', 'Templates'], ['where', 'Where to look']] as const;
const dayNum = dayOf;
const iso = isoOf;
const nowDay = () => today();
const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : 'Something went wrong');

const newJob = (): JobInput => ({ company: '', role: '', loc: 'Remote', status: 'Saved', link: '', referral: '', applied: '', follow: '', notes: '' });
const newHack = (): HackathonInput => ({ name: '', platform: '', status: 'Interested', deadline: '', team: '', link: '', notes: '' });

export function CareerPage() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('jobs');
  return (
    <>
      <h1>Career</h1>
      <div className="seg" role="tablist">{TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>
      {tab === 'jobs' && <Jobs />}
      {tab === 'hacks' && <Hackathons />}
      {tab === 'tpl' && <div className="stack">{content.templates.map((t) => <div className="card" key={t.title}><div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}><h2 className="ch" style={{ margin: 0 }}>{t.title}</h2><button className="btn s" style={{ minHeight: 32 }} onClick={() => copy(t.text)}>Copy</button></div><pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13.5 }}>{t.text}</pre></div>)}</div>}
      {tab === 'where' && <>
        <div className="grid g2">{content.whereToLook.map((w) => <div className="card" key={w.heading}><h2 className="ch">{w.heading}</h2><div className="list">{w.items.map((i) => <a className="li" key={i.url} href={i.url} target="_blank" rel="noopener noreferrer"><span className="mid"><span className="t">{i.name}</span></span><span className="chev">{'↗'}</span></a>)}</div></div>)}</div>
        <p className="muted" style={{ marginTop: 12 }}>One good referral usually beats 20 cold applications. Save jobs during the week, then apply in one Sunday sprint.</p>
      </>}
    </>
  );
}

function Jobs() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [filter, setFilter] = useState<'All' | JobStatus>('All');
  const [editing, setEditing] = useState<{ id?: string; v: JobInput } | null>(null);
  const load = useCallback(() => { listJobs().then(setJobs).catch((e) => { setJobs([]); fail(e); }); }, []);
  useEffect(load, [load]);
  const t = nowDay();
  const list = (jobs ?? []).filter((j) => filter === 'All' || j.status === filter);
  const week = (jobs ?? []).filter((j) => { const a = dayNum(j.applied); return a !== null && t - a < 7; }).length;
  const due = (j: Job) => { const f = dayNum(j.follow); return f !== null && f <= t && (j.status === 'Applied' || j.status === 'OA'); };

  const save = async () => {
    if (!editing) return;
    if (!editing.v.company.trim() || !editing.v.role.trim()) { toast('Add a company and role'); return; }
    try { await saveJob(editing.v, editing.id); setEditing(null); toast('Saved'); load(); } catch (e) { fail(e); }
  };
  const set = (patch: Partial<JobInput>) => setEditing((e) => (e ? { ...e, v: { ...e.v, ...patch } } : e));

  return (
    <>
      <div className="kpi" style={{ marginBottom: 12 }}>
        <div><b>{week}/5</b><span>applied this week</span></div>
        <div><b>{(jobs ?? []).filter((j) => j.status !== 'Rejected' && j.status !== 'Offer').length}</b><span>active</span></div>
        <div><b>{(jobs ?? []).filter(due).length}</b><span>follow-ups due</span></div>
      </div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap' }}>
        <div className="seg" style={{ margin: 0, flex: 1, minWidth: 0 }}>{(['All', ...JOB_STATUS] as const).map((x) => <button key={x} className={filter === x ? 'on' : ''} onClick={() => setFilter(x)}>{x}</button>)}</div>
        <button className="btn p" onClick={() => setEditing({ v: newJob() })}>+ Add job</button>
      </div>
      <div className="card">
        {jobs === null ? <div className="empty">Loading…</div> : list.length === 0 ? <div className="empty">No jobs yet. Save one as soon as you see it; apply in your Sunday sprint.</div> : (
          <div className="list">{list.map((j) => (
            <button className="li" key={j.id} onClick={() => setEditing({ id: j.id, v: { company: j.company, role: j.role, loc: j.loc, status: j.status, link: j.link, referral: j.referral, applied: j.applied, follow: j.follow, notes: j.notes } })}>
              <span className="mid"><span className="t">{j.company} {'·'} {j.role}</span><span className="s">{j.loc}{j.referral ? ' · referral' : ''}{j.applied ? ` · applied ${j.applied}` : ''}</span></span>
              {due(j) && <span className="badge b-bad">Follow up</span>}<span className={`badge ${TONE[j.status] ?? ''}`}>{j.status}</span>
            </button>
          ))}</div>
        )}
      </div>
      {editing && (
        <Sheet title={editing.id ? 'Edit job' : 'Add job'} onClose={() => setEditing(null)}>
          <div className="field"><label htmlFor="jc">Company</label><input id="jc" value={editing.v.company} onChange={(e) => set({ company: e.target.value })} /></div>
          <div className="field"><label htmlFor="jr">Role</label><input id="jr" value={editing.v.role} onChange={(e) => set({ role: e.target.value })} /></div>
          <div className="f2">
            <div className="field"><label htmlFor="jl">Location</label><select id="jl" value={editing.v.loc} onChange={(e) => set({ loc: e.target.value })}>{['Remote', 'India', 'Hybrid', 'Other'].map((x) => <option key={x}>{x}</option>)}</select></div>
            <div className="field"><label htmlFor="js">Status</label><select id="js" value={editing.v.status} onChange={(e) => { const status = e.target.value as JobStatus; set(status === 'Applied' ? { status, applied: editing.v.applied || iso(t), follow: editing.v.follow || iso(t + 7) } : { status }); }}>{JOB_STATUS.map((x) => <option key={x}>{x}</option>)}</select></div>
          </div>
          <div className="field"><label htmlFor="jk">Job link</label><input id="jk" type="url" value={editing.v.link} onChange={(e) => set({ link: e.target.value })} /></div>
          <div className="field"><label htmlFor="jf">Referral (person’s name, if any)</label><input id="jf" value={editing.v.referral} onChange={(e) => set({ referral: e.target.value })} /></div>
          <div className="f2">
            <div className="field"><label htmlFor="ja">Applied on</label><input id="ja" type="date" value={editing.v.applied} onChange={(e) => set({ applied: e.target.value })} /></div>
            <div className="field"><label htmlFor="jw">Follow up on</label><input id="jw" type="date" value={editing.v.follow} onChange={(e) => set({ follow: e.target.value })} /></div>
          </div>
          <div className="field"><label htmlFor="jn">Notes</label><textarea id="jn" value={editing.v.notes} onChange={(e) => set({ notes: e.target.value })} /></div>
          <div className="row">
            {editing.id && <button className="btn s" onClick={async () => { try { await deleteJob(editing.id!); setEditing(null); toast('Deleted'); load(); } catch (e) { fail(e); } }}>Delete</button>}
            <button className="btn p" style={{ flex: 1 }} onClick={save}>Save</button>
          </div>
        </Sheet>
      )}
    </>
  );
}

function Hackathons() {
  const [items, setItems] = useState<Hackathon[] | null>(null);
  const [editing, setEditing] = useState<{ id?: string; v: HackathonInput } | null>(null);
  const load = useCallback(() => { listHackathons().then(setItems).catch((e) => { setItems([]); fail(e); }); }, []);
  useEffect(load, [load]);
  const t = nowDay();
  const set = (patch: Partial<HackathonInput>) => setEditing((e) => (e ? { ...e, v: { ...e.v, ...patch } } : e));
  const save = async () => {
    if (!editing) return;
    if (!editing.v.name.trim()) { toast('Add a name'); return; }
    try { await saveHackathon(editing.v, editing.id); setEditing(null); toast('Saved'); load(); } catch (e) { fail(e); }
  };
  return (
    <>
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 10 }}><button className="btn p" onClick={() => setEditing({ v: newHack() })}>+ Add hackathon</button></div>
      <div className="card">
        {items === null ? <div className="empty">Loading…</div> : items.length === 0 ? <div className="empty">No hackathons yet. Check Devfolio and Unstop on review Sundays.</div> : (
          <div className="list">{items.map((h) => {
            const d = dayNum(h.deadline); const left = d !== null ? d - t : null;
            return (
              <button className="li" key={h.id} onClick={() => setEditing({ id: h.id, v: { name: h.name, platform: h.platform, status: h.status, deadline: h.deadline, team: h.team, link: h.link, notes: h.notes } })}>
                <span className="mid"><span className="t">{h.name}</span><span className="s">{h.platform}{h.deadline ? ` · deadline ${h.deadline}` : ''}</span></span>
                {left !== null && left >= 0 && left <= 7 && h.status !== 'Result' && <span className="badge b-warn">{left}d left</span>}<span className={`badge ${TONE[h.status] ?? ''}`}>{h.status}</span>
              </button>
            );
          })}</div>
        )}
      </div>
      {editing && (
        <Sheet title={editing.id ? 'Edit hackathon' : 'Add hackathon'} onClose={() => setEditing(null)}>
          <div className="field"><label htmlFor="hn">Name</label><input id="hn" value={editing.v.name} onChange={(e) => set({ name: e.target.value })} /></div>
          <div className="f2">
            <div className="field"><label htmlFor="hp">Platform</label><input id="hp" value={editing.v.platform} onChange={(e) => set({ platform: e.target.value })} /></div>
            <div className="field"><label htmlFor="hs">Status</label><select id="hs" value={editing.v.status} onChange={(e) => set({ status: e.target.value as HackStatus })}>{HACK_STATUS.map((x) => <option key={x}>{x}</option>)}</select></div>
          </div>
          <div className="f2">
            <div className="field"><label htmlFor="hd">Deadline</label><input id="hd" type="date" value={editing.v.deadline} onChange={(e) => set({ deadline: e.target.value })} /></div>
            <div className="field"><label htmlFor="ht">Team</label><input id="ht" value={editing.v.team} onChange={(e) => set({ team: e.target.value })} /></div>
          </div>
          <div className="field"><label htmlFor="hk">Link</label><input id="hk" type="url" value={editing.v.link} onChange={(e) => set({ link: e.target.value })} /></div>
          <div className="field"><label htmlFor="hno">Notes</label><textarea id="hno" value={editing.v.notes} onChange={(e) => set({ notes: e.target.value })} /></div>
          <div className="row">
            {editing.id && <button className="btn s" onClick={async () => { try { await deleteHackathon(editing.id!); setEditing(null); toast('Deleted'); load(); } catch (e) { fail(e); } }}>Delete</button>}
            <button className="btn p" style={{ flex: 1 }} onClick={save}>Save</button>
          </div>
        </Sheet>
      )}
    </>
  );
}
