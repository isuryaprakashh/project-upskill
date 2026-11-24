import { bump, content, speakSeconds, week } from '@upskill/shared';
import type { ChecklistSession, DesignSession, LessonSession, OutlineSession, ReviewSession, Session } from '@upskill/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SpeakSheet } from '../components/SpeakSheet';
import { Check, copy, Icon, ICONS, Rich, toast } from '../components/ui';
import { indexOf, leetcode, plain, sessionById, TRACK } from '../lib/course';
import { updateProgress, useProgress } from '../lib/progress';

const PAGES = ['Warm-up', 'The idea', 'Picture it', 'Choose wisely', 'In code', 'Interview'];
const toggle = (key: 'tchk' | 'solved' | 'read', id: string, xp = 0) =>
  updateProgress((p) => {
    const on = !p[key][id];
    return { ...p, [key]: { ...p[key], [id]: on }, xp: p.xp + (on ? xp : 0) };
  });

export function SessionPage() {
  const { id = '' } = useParams();
  const s = sessionById(id);
  const nav = useNavigate();
  const p = useProgress();
  const [speak, setSpeak] = useState<string | null>(null);

  useEffect(() => { window.scrollTo(0, 0); }, [id]);
  if (!s) return <div className="card empty">That session doesn’t exist. <Link to="/tracks">See all tracks</Link></div>;

  const T = TRACK[s.track];
  const done = !!p.done[s.id];
  const finish = () => {
    if (done) { updateProgress((cur) => ({ ...cur, done: { ...cur.done, [s.id]: false } })); toast('Marked as not done'); return; }
    updateProgress((cur) => { const { [s.id]: _drop, ...pos } = cur.pos; return bump({ ...cur, done: { ...cur.done, [s.id]: true }, pos }, 30); });
    toast('Done. Nice work!');
    nav('/');
  };
  const speakText = s.kind === 'design' ? s.speak : s.kind === 'review' ? `STAR story: ${s.star}` : `Explain “${plain(s.title)}” in ${speakSeconds(week(p))} seconds`;

  return (
    <>
      <div className="crumb">
        <button className="back" onClick={() => nav(-1)}>{'←'} Back</button>
        <span className="muted">{T.name} {'·'} {indexOf(s) + 1} of {content.sessions[s.track].length}</span>
      </div>
      <h1>{s.title}</h1>
      {s.kind === 'lesson'
        ? <LessonView s={s} done={done} onFinish={finish} onSpeak={() => setSpeak(speakText)} />
        : <TaskView s={s} done={done} onFinish={finish} onSpeak={() => setSpeak(speakText)} speakText={speakText} />}
      {speak && <SpeakSheet prompt={speak} onClose={() => setSpeak(null)} />}
    </>
  );
}

function Note({ id }: { id: string }) {
  const p = useProgress();
  return (
    <div className="card">
      <h2 className="ch"><label htmlFor="note">One line: what tripped you up?</label></h2>
      <textarea id="note" placeholder="I forgot to check the map before adding the number" value={p.notes[id] ?? ''} onChange={(e) => updateProgress((cur) => ({ ...cur, notes: { ...cur.notes, [id]: e.target.value } }))} />
    </div>
  );
}

/* ---------- full DSA lesson ---------- */
function LessonView({ s, done, onFinish, onSpeak }: { s: LessonSession; done: boolean; onFinish: () => void; onSpeak: () => void }) {
  const p = useProgress();
  const saved = p.pos[s.id];
  const [tab, setTab] = useState<'learn' | 'practice' | 'notes'>((saved?.t as 'learn' | 'practice' | 'notes') ?? 'learn');
  const [step, setStep] = useState(saved?.s ?? 0);
  const L = s.lesson;

  useEffect(() => {
    if (!done) updateProgress((cur) => ({ ...cur, pos: { ...cur.pos, [s.id]: { t: tab, s: step } } }));
    window.scrollTo(0, 0);
  }, [tab, step, s.id, done]);

  const last = step === PAGES.length - 1;
  return (
    <>
      <div className="seg" role="tablist">
        {(['learn', 'practice', 'notes'] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}
      </div>
      {tab === 'learn' && (
        <div className="lgrid">
          <ol className="rail" aria-label="Lesson steps">
            {PAGES.map((name, i) => <li key={name}><button className={i === step ? 'on' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined} onClick={() => setStep(i)}><b>{i < step ? '✓' : i + 1}</b>{name}</button></li>)}
          </ol>
          <div className="lmain">
            <div className="prog">{PAGES.map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
            <p className="pname">Step {step + 1} of {PAGES.length} {'·'} {PAGES[step]}</p>
            <div className="stack">
              {step === 0 && <Quiz s={s} />}
              {step === 1 && <>
                <div><p className="q">{L.question}</p><p className="lead">{L.hook}</p><p className="para"><Rich text={L.plain} /></p></div>
                <div className="card"><h2 className="ch">What it is</h2><ul className="what">{L.what.map((w) => <li key={w}><Rich text={w} /></li>)}</ul></div>
              </>}
              {step === 2 && <>
                {/* The sketch is our own trusted course content, drawn as SVG. */}
                <div className="card"><div dangerouslySetInnerHTML={{ __html: L.sketchSvg }} /><p className="cap">{L.caption}</p></div>
                <div className="card"><h2 className="ch">{L.steps.title}</h2>{L.steps.items.map((x, i) => <div className="step" key={i}><b>{i + 1}</b><span>{x}</span></div>)}</div>
              </>}
              {step === 3 && <>
                <div className="card"><h2 className="ch">When to use what</h2>
                  <table className="tbl"><thead><tr>{L.table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{L.table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>
                </div>
                <div className="card"><h2 className="ch">Trade-off: {L.tradeoff.question}</h2>
                  <div className="dial"><i style={{ width: `${L.tradeoff.position}%` }} /><em style={{ left: `${L.tradeoff.position}%` }} /></div>
                  <div className="two"><div><b>{L.tradeoff.left[0]}</b>{L.tradeoff.left[1]}</div><div><b>{L.tradeoff.right[0]}</b>{L.tradeoff.right[1]}</div></div>
                </div>
              </>}
              {step === 4 && <>
                <div className="card"><h2 className="ch">In code {'·'} {L.code.label}</h2><pre>{L.code.text}</pre></div>
                <div className="one"><small>In one line</small><span>{L.oneLine}</span></div>
              </>}
              {step === 5 && <>
                <div className="card"><h2 className="ch">Say it in an interview</h2><ol className="recap">{L.recap.map((r) => <li key={r}>{r}</li>)}</ol></div>
                <button className="btn s" onClick={onSpeak}><Icon d={ICONS.mic} />Practise saying it out loud</button>
              </>}
            </div>
            <div className="foot2">
              {step > 0 && <button className="btn s" onClick={() => setStep(step - 1)}>Back</button>}
              <button className="btn p" onClick={() => (last ? (setStep(0), setTab('practice')) : setStep(step + 1))}>{last ? 'Practice →' : 'Next'}</button>
            </div>
          </div>
        </div>
      )}
      {tab === 'practice' && (
        <div className="lmain">
          <div className="stack">{s.problems.map((pr) => <ProblemCard key={pr.num} pr={pr} />)}</div>
          <div className="foot2"><button className="btn p" onClick={() => setTab('notes')}>Notes {'→'}</button></div>
        </div>
      )}
      {tab === 'notes' && (
        <div className="lmain">
          <Note id={s.id} />
          <div className="foot2"><button className="btn p" onClick={onFinish}>{done ? 'Mark as not done' : 'Finish lesson'}</button></div>
        </div>
      )}
    </>
  );
}

function Quiz({ s }: { s: LessonSession }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = s.quiz[i];
  const order = useMemo(() => (q ? q.options.map((_, k) => k).sort(() => Math.random() - 0.5) : []), [q]);
  if (!q) return <div className="card"><h2 className="ch">{s.quizLabel}</h2><p style={{ margin: 0 }}>Warm-up done. Tap Next.</p></div>;
  const pick = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    if (k === q.answer) updateProgress((p) => ({ ...p, xp: p.xp + 10 }));
  };
  return (
    <div className="card">
      <h2 className="ch">{s.quizLabel} {'·'} {i + 1} of {s.quiz.length}</h2>
      <p style={{ fontWeight: 600, margin: '0 0 12px' }}>{q.q}</p>
      <div className="opts">
        {order.map((k) => <button key={k} className={'opt' + (picked !== null && k === q.answer ? ' ok' : picked === k ? ' no' : '')} disabled={picked !== null} onClick={() => pick(k)}>{q.options[k]}</button>)}
      </div>
      {picked !== null && <>
        <div className={'callout ' + (picked === q.answer ? 'b-ok' : 'b-bad')} style={{ marginTop: 10 }}><b>{picked === q.answer ? 'Correct. ' : 'Not quite. '}</b>{q.why}</div>
        <button className="btn s w" style={{ marginTop: 10 }} onClick={() => { setPicked(null); setI(i + 1); }}>{i < s.quiz.length - 1 ? 'Next question' : 'Finish warm-up'}</button>
      </>}
    </div>
  );
}

function ProblemCard({ pr }: { pr: LessonSession['problems'][number] }) {
  const p = useProgress();
  const [hints, setHints] = useState(0);
  const [showSol, setShowSol] = useState(false);
  const [left, setLeft] = useState(1500);
  const [running, setRunning] = useState(false);
  const t = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!running) return;
    t.current = setInterval(() => setLeft((v) => (v <= 1 ? (setRunning(false), 0) : v - 1)), 1000);
    return () => { if (t.current) clearInterval(t.current); };
  }, [running]);
  const key = `lc${pr.num}`;
  const all = pr.hints ?? [];
  return (
    <div className="card">
      <div className="row"><span className={`lvl ${pr.level}`}>{pr.level}</span><span className="muted">#{pr.num}</span></div>
      <h2 style={{ marginTop: 6 }}>{pr.title}</h2>
      <p style={{ margin: '4px 0 0' }}>{pr.ask}</p>
      {pr.boss && <div className="row callout b-warn" style={{ justifyContent: 'space-between', marginTop: 10 }}><span>Boss timer</span><b className="mono">{left === 0 ? 'Time!' : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`}</b><button className="btn s" style={{ minHeight: 32 }} onClick={() => setRunning((r) => !r)}>{running ? 'Pause' : 'Start'}</button></div>}
      <a className="btn p w" style={{ marginTop: 12, textDecoration: 'none' }} href={leetcode(pr.slug)} target="_blank" rel="noopener noreferrer">Solve on LeetCode {'↗'}</a>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn s" style={{ flex: 1 }} disabled={hints >= all.length} onClick={() => setHints(hints + 1)}>{hints >= all.length ? 'No more hints' : `Hint ${hints + 1}`}</button>
        <button className="btn s" style={{ flex: 1 }} disabled={showSol} onClick={() => setShowSol(true)}>Solution</button>
      </div>
      {all.slice(0, hints).map((h, i) => <div className="callout b-warn" style={{ marginTop: 8 }} key={i}><b>Hint {i + 1}:</b> {h}</div>)}
      {showSol && <div style={{ marginTop: 10 }}><pre>{pr.solution}</pre><p className="muted" style={{ margin: '8px 0 0' }}><b>Complexity:</b> {pr.complexity}</p><p className="muted" style={{ margin: '4px 0 0' }}><b>Common mistake:</b> {pr.mistake}</p></div>}
      <div style={{ marginTop: 6 }}><Check on={!!p.solved[key]} onChange={() => toggle('solved', key, 20)}>I solved it</Check></div>
    </div>
  );
}

/* ---------- every other kind of session ---------- */
type Task = OutlineSession | DesignSession | ChecklistSession | ReviewSession;
function TaskView({ s, done, onFinish, onSpeak, speakText }: { s: Task; done: boolean; onFinish: () => void; onSpeak: () => void; speakText: string }) {
  const p = useProgress();
  const steps = (ids: string[], items: string[]) => items.map((x, j) => <Check key={ids[j]} on={!!p.tchk[ids[j]]} onChange={() => toggle('tchk', ids[j])}>{x}</Check>);
  const researchIndex = s.track === 'research' ? indexOf(s as Session) : -1;
  return (
    <div className="lmain">
      <div className="stack">
        {s.kind === 'outline' && <>
          <div className="card"><h2 className="ch">Learn</h2><p style={{ margin: 0 }}>{s.learn}</p></div>
          {s.problems.length > 0 && <div className="card"><h2 className="ch">Practice</h2><div className="list">
            {s.problems.map((pr) => <div className="li" key={pr.num}><span className={`lvl ${pr.level}`}>{pr.level}</span><span className="mid"><a className="t" href={leetcode(pr.slug)} target="_blank" rel="noopener noreferrer">{pr.num}. {pr.title} {'↗'}</a></span><Check on={!!p.solved[`lc${pr.num}`]} onChange={() => toggle('solved', `lc${pr.num}`, 20)} label={`Solved ${pr.title}`} /></div>)}
          </div><p className="muted" style={{ margin: '8px 0 0' }}>Try first. Stuck for 20 minutes? Read the official editorial, then re-solve it tomorrow.</p></div>}
        </>}
        {s.kind === 'design' && <>
          <div className="card"><h2 className="ch">1 {'·'} Read</h2><div className="list">
            {s.articles.map((a) => <div className="li" key={a.key}><span className="mid"><a className="t" href={a.url} target="_blank" rel="noopener noreferrer">{a.title} {'↗'}</a><span className="s">Harshit Khosla {'·'} Vidya</span></span><Check on={!!p.read[a.key]} onChange={() => toggle('read', a.key)} label={`Read ${a.title}`} /></div>)}
          </div></div>
          <div className="card"><h2 className="ch">2 {'·'} AWS: {s.aws}</h2><p style={{ margin: 0 }}>{s.awsWhat}</p></div>
          <div className="card"><h2 className="ch">3 {'·'} Hands-on</h2>{steps(s.lab.map((_, j) => `${s.id}-${j}`), s.lab)}<p className="muted" style={{ margin: '6px 0 0' }}>Set a billing alert before your first lab, and clean up after each one.</p></div>
        </>}
        {s.kind === 'checklist' && <div className="card">
          <p style={{ margin: '0 0 8px' }}>{s.why}</p>
          {steps(s.steps.map((_, j) => (s.track === 'research' ? `research-${researchIndex}-${j}` : `${s.id}-${j}`)), s.steps)}
          {s.template && <><pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, marginTop: 8 }}>{s.template}</pre><button className="btn s" style={{ marginTop: 8 }} onClick={() => copy(s.template!)}>Copy template</button></>}
          <p className="muted" style={{ margin: '8px 0 0' }}>Result: {s.result}</p>
        </div>}
        {s.kind === 'review' && <div className="card">
          {steps([0, 1, 2, 3, 4].map((j) => `${s.id}-${j}`), ['Re-solve 2 problems from your notebook', 'Skim the top stories on Hacker News for 10 minutes and note one trend', 'Apply sprint: 20 minutes, aim for 5 applications', `Speak: tell the STAR story “${s.star}” in 2 minutes`, 'Glance at next week in Tracks'])}
          <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}><a className="btn s" style={{ textDecoration: 'none' }} href="https://news.ycombinator.com/" target="_blank" rel="noopener noreferrer">Open Hacker News {'↗'}</a><Link className="btn s" style={{ textDecoration: 'none' }} to="/career">Open career</Link></div>
        </div>}
        <div className="card"><div className="row" style={{ justifyContent: 'space-between' }}><div><h2 className="ch" style={{ margin: '0 0 2px' }}>Speak it</h2><p className="muted" style={{ margin: 0 }}>{speakText}</p></div><button className="btn s" aria-label="Practise speaking" onClick={onSpeak}><Icon d={ICONS.mic} /></button></div></div>
        <Note id={s.id} />
      </div>
      <div className="foot2"><button className="btn p" onClick={onFinish}>{done ? 'Mark as not done' : 'Mark as done'}</button></div>
    </div>
  );
}
