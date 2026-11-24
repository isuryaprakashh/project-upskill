import { content, currentStreak, DAY_NAMES, isNewLearner, nextRead, nextSession, sessionMeta, speakPrompt, speakSeconds, startLabel, today, todayPlan, TRACK, trackProgress, week, weekPlan } from '@upskill/shared';
import type { ProgressData } from '@upskill/shared';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SpeakSheet } from '../components/SpeakSheet';
import { Icon, Sheet } from '../components/ui';
import { getSession, listJobs } from '../lib/api';
import { updateProgress, useProgress } from '../lib/progress';

interface Completed { id: string; prev: ProgressData }

export function TodayPage() {
  const p = useProgress();
  const nav = useNavigate();
  const loc = useLocation();
  const user = getSession()?.user;
  const [speaking, setSpeaking] = useState(false);
  const [jobs, setJobs] = useState<{ total: number; week: number } | null>(null);
  const welcomeKey = `upskill-welcomed:${user?.id}`;
  const [welcome, setWelcome] = useState(() => { try { return !localStorage.getItem(welcomeKey); } catch { return false; } });
  const [completed, setCompleted] = useState<Completed | null>(() => (loc.state as { completed?: Completed } | null)?.completed ?? null);

  const now = new Date();
  const t = today();
  const plan = todayPlan(p, now);
  const s = plan.session;
  const fresh = isNewLearner(p);
  const streak = currentStreak(p);
  const monday = t - ((now.getDay() + 6) % 7);
  const read = nextRead(p);
  const first = (user?.name ?? '').split(' ')[0];
  const hour = now.getHours();

  useEffect(() => {
    listJobs().then((list) => setJobs({ total: list.length, week: list.filter((j) => j.applied && t - Math.floor(Date.parse(j.applied) / 86400000) < 7).length })).catch(() => setJobs(null));
  }, [t]);
  useEffect(() => { if (loc.state) nav('.', { replace: true, state: null }); }, [loc.state, nav]);

  const closeWelcome = () => { try { localStorage.setItem(welcomeKey, '1'); } catch { /* ignore */ } setWelcome(false); };

  const steps: [string, boolean, string][] = [
    ['Finish your first lesson', !fresh, s ? `/s/${s.id}` : '/tracks'],
    ['Practise speaking for 60 seconds', Object.keys(p.speak).length > 0, ''],
    ['Read your first article', Object.values(p.read).some(Boolean), read?.url ?? ''],
    ['Save a job you like', (jobs?.total ?? 0) > 0, '/career'],
  ];
  const stepsDone = steps.filter((x) => x[1]).length;
  const showStart = stepsDone < steps.length && week(p) <= 2;
  const doneSession = completed ? content.sessions[(['dsa', 'sd', 'build', 'research', 'review'] as const).find((k) => content.sessions[k].some((x) => x.id === completed.id)) ?? 'dsa'].find((x) => x.id === completed.id) : null;

  return (
    <>
      <div className="phead">
        <h1>{fresh ? `Welcome${first ? `, ${first}` : ''}` : `${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}${first ? `, ${first}` : ''}`}</h1>
        <span className="meta">{DAY_NAMES[now.getDay()]}, week {week(p)} of 24</span>
      </div>

      {completed && doneSession && (
        <div className="done-banner" role="status">
          <span className="done-ico" aria-hidden="true"><Icon d="M5 12l5 5 9-10" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>Session complete: {doneSession.title}</b>
            <span>+30 XP · {streak}-day streak{s ? ` · Next: ${s.title}` : ''}</span>
          </div>
          <button className="btn g" onClick={() => { updateProgress(() => completed.prev); setCompleted(null); }}>Undo</button>
          <button className="btn g" aria-label="Dismiss" onClick={() => setCompleted(null)}>✕</button>
        </div>
      )}

      <div className="bento">
        <div className="tl hero">
          <span className="k">{plan.why}</span>
          <span className="tt">{s ? s.title : 'All done'}</span>
          <span className="d">{s ? `${TRACK[plan.track].full} · ${sessionMeta(s)}` : 'Every session in the course is finished.'}</span>
          {s && <button className="hbtn" onClick={() => nav(`/s/${s.id}`)}>{startLabel(s, p)}</button>}
        </div>

        {showStart ? (
          <div className="tl w2 tall">
            <span className="k">Getting started · {stepsDone} of {steps.length}</span>
            <div className="bar" style={{ flex: 'none', margin: '8px 0 4px' }}><i style={{ width: `${(stepsDone / steps.length) * 100}%`, background: 'var(--primary)' }} /></div>
            <div className="list">
              {steps.map(([label, ok, to], i) => (
                <button key={label} className="li" onClick={() => { if (i === 1) setSpeaking(true); else if (to.startsWith('http')) window.open(to, '_blank', 'noopener'); else if (to) nav(to); }}>
                  <span className={'gs-dot' + (ok ? ' on' : '')} aria-hidden="true">{ok ? '✓' : i + 1}</span>
                  <span className="mid"><span className="t" style={ok ? { color: 'var(--ink3)', textDecoration: 'line-through' } : undefined}>{label}</span></span>
                  {!ok && <span className="chev">›</span>}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="tl"><span className="k">Streak</span><span className="v">{streak}</span><span className="d">{streak === 0 ? 'Finish a session to start one' : `day${streak === 1 ? '' : 's'} in a row`}</span></div>
            <button className="tl spk" onClick={() => setSpeaking(true)}>
              <span className="k">Speaking · {speakSeconds(week(p))} s</span>
              <span className="tt" style={{ fontSize: 14 }}>{speakPrompt(p)}</span>
              <span className="foot">{p.speak[t] ? 'Done today ✓' : '● Record'}</span>
            </button>
          </>
        )}

        <div className="tl w2 tall">
          <span className="k">Your week</span>
          <div className="weeklist">
            {weekPlan(p).map((d, i) => {
              const day = monday + i;
              const isToday = day === t;
              const studied = !!p.days[day];
              return (
                <div key={d.day} className={'wl' + (isToday ? ' now' : '')}>
                  <span className="wl-day">{d.day.slice(0, 3)}</span>
                  <span className={`wl-dot c-${d.track}`} aria-hidden="true" />
                  <span className="wl-what">{TRACK[d.track].name}<span className="muted"> · {d.minutes}</span></span>
                  <span className="wl-state">{studied ? '✓' : isToday ? 'Today' : ''}</span>
                </div>
              );
            })}
          </div>
          <span className="d" style={{ marginTop: 8 }}>Plus 10 minutes of speaking every day.</span>
        </div>

        {!fresh && (
          <>
            <Link className="tl w2 tall" to="/tracks" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="k">Your progress</span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 8, width: '100%' }}>
                {(['dsa', 'sd', 'build', 'research', 'speak', 'read'] as const).map((k) => {
                  const pr = trackProgress(p, k);
                  return <span className="row" key={k}><span style={{ width: 104, fontSize: 13 }}>{TRACK[k].name}</span><span className="bar"><i className={`c-${k}`} style={{ width: `${pr.pct}%` }} /></span><span className="muted" style={{ width: 50, textAlign: 'right' }}>{pr.text}</span></span>;
                })}
              </span>
            </Link>
            <div className="tl w2 tall">
              <span className="k">Also this week</span>
              <div className="list" style={{ marginTop: 2 }}>
                {(['dsa', 'sd', 'build', week(p) % 2 === 1 ? 'research' : 'review'] as const).map((k) => {
                  const n = nextSession(content, p, k);
                  if (!n || n === s) return null;
                  return (
                    <Link className="li" key={k} to={`/s/${n.id}`}>
                      <span className={`tile t-${k}`}><Icon d={TRACK[k].icon} /></span>
                      <span className="mid"><span className="t">{n.title}</span><span className="s">{TRACK[k].name} · {TRACK[k].days}</span></span>
                      <span className="chev">›</span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <Link className="tl d2" to="/career" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="k">Job applications this week</span>
              <span className="v">{jobs?.week ?? 0}<span style={{ fontSize: 16, color: 'var(--ink3)' }}> of 5</span></span>
              <span className="d">Apply in one sprint on Sundays</span>
            </Link>
          </>
        )}
        {read && (
          <a className="tl d2" style={{ textDecoration: 'none', color: 'inherit' }} href={read.url} target="_blank" rel="noopener noreferrer">
            <span className="k">Read next</span><span className="tt" style={{ fontSize: 14 }}>{read.title}</span><span className="d" style={{ marginTop: 'auto' }}>{read.by} ↗</span>
          </a>
        )}
      </div>

      {welcome && (
        <Sheet title="Welcome to Project Upskill" onClose={closeWelcome}>
          <p className="muted" style={{ margin: '0 0 14px' }}>A 24-week plan from “where do I start?” to interview-ready. Here’s all you need to know:</p>
          <ol className="welcome-steps">
            <li><b>One session a day.</b> About 45 minutes. This page always shows the next one.</li>
            <li><b>A different subject each day.</b> Coding, system design, a project you build, and research or review on Sundays.</li>
            <li><b>10 minutes of speaking.</b> Explain what you learned out loud. It builds interview confidence.</li>
            <li><b>Behind? That’s fine.</b> Nothing expires. You always continue where you stopped, on any device.</li>
          </ol>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn s" style={{ flex: 1 }} onClick={closeWelcome}>Look around first</button>
            {s && <button className="btn p" style={{ flex: 1 }} onClick={() => { closeWelcome(); nav(`/s/${s.id}`); }}>Start Lesson 1</button>}
          </div>
        </Sheet>
      )}
      {speaking && <SpeakSheet prompt={speakPrompt(p)} onClose={() => setSpeaking(false)} />}
    </>
  );
}

