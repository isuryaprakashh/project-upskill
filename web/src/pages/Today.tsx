import { content, currentStreak, nextSession, speakSeconds, today, trackFor, week } from '@upskill/shared';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SpeakSheet } from '../components/SpeakSheet';
import { Icon } from '../components/ui';
import { listJobs } from '../lib/api';
import { DAY_NAMES, nextRead, sessionMeta, speakPrompt, todayTrack, TRACK, trackProgress } from '../lib/course';
import { useProgress } from '../lib/progress';

export function TodayPage() {
  const p = useProgress();
  const nav = useNavigate();
  const [speaking, setSpeaking] = useState(false);
  const [applied, setApplied] = useState<number | null>(null);
  const now = new Date();
  const wd = now.getDay();
  const wk = week(p);
  const track = todayTrack(p);
  const s = nextSession(content, p, track);
  const pos = s ? p.pos[s.id] : undefined;
  const t = today();
  const streak = currentStreak(p);
  const spoke = p.speak[t];
  const hour = now.getHours();
  const monday = t - ((wd + 6) % 7);
  const read = nextRead(p);

  useEffect(() => {
    listJobs().then((jobs) => setApplied(jobs.filter((j) => j.applied && t - Math.floor(Date.parse(j.applied) / 86400000) < 7).length)).catch(() => setApplied(null));
  }, [t]);

  const start = s ? (pos ? `Continue${s.kind === 'lesson' && pos.t === 'learn' ? ` at step ${pos.s + 1} of 6` : ''}` : s.kind === 'lesson' ? 'Start lesson' : 'Start session') : '';

  return (
    <>
      <div className="phead">
        <h1>{hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}</h1>
        <span className="meta">{DAY_NAMES[wd]}, week {wk} of 24</span>
      </div>
      <div className="bento">
        <div className="tl hero">
          <span className="k">{TRACK[track].full} {'·'} {track === 'build' || track === 'research' ? '90 min' : '45–60 min'}</span>
          <span className="tt">{s ? s.title : 'Track complete'}</span>
          <span className="d">{s ? sessionMeta(s) : 'Pick another track from Up next.'}</span>
          {s && <button className="hbtn" onClick={() => nav(`/s/${s.id}`)}>{start}</button>}
        </div>
        <div className="tl"><span className="k">Streak</span><span className="v">{streak}</span><span className="d">day{streak === 1 ? '' : 's'} in a row</span></div>
        <button className="tl spk" onClick={() => setSpeaking(true)}>
          <span className="k">Speaking {'·'} {speakSeconds(wk)} s</span>
          <span className="tt" style={{ fontSize: 14 }}>{speakPrompt(p)}</span>
          <span className="foot">{spoke ? 'Done today ✓' : '● Record'}</span>
        </button>
        <Link className="tl" to="/career" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="k">Applied this week</span>
          <span className="v">{applied ?? 0}<span style={{ fontSize: 16, color: 'var(--ink3)' }}>/5</span></span>
          <span className="d">Sunday apply sprint</span>
        </Link>
        <div className="tl">
          <span className="k">This week</span>
          <div className="wk7">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => {
              const day = monday + i;
              const tk = trackFor((i + 1) % 7, wk);
              return <span key={i} className={day === t ? 'now' : ''}><i className={p.days[day] ? `c-${tk}` : ''} title={TRACK[tk].name} />{l}</span>;
            })}
          </div>
        </div>
        <Link className="tl w2 tall" to="/tracks" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="k">Your tracks</span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 8, width: '100%' }}>
            {(['dsa', 'sd', 'build', 'research', 'speak', 'read'] as const).map((k) => {
              const pr = trackProgress(p, k);
              return <span className="row" key={k}><span style={{ width: 92, fontSize: 13 }}>{TRACK[k].name}</span><span className="bar"><i className={`c-${k}`} style={{ width: `${pr.pct}%` }} /></span><span className="muted" style={{ width: 50, textAlign: 'right' }}>{pr.text}</span></span>;
            })}
          </span>
        </Link>
        <div className="tl w2 tall">
          <span className="k">Up next</span>
          <div className="list" style={{ marginTop: 2 }}>
            {(['dsa', 'sd', 'build', wk % 2 === 1 ? 'research' : 'review'] as const).map((k) => {
              const n = nextSession(content, p, k);
              if (!n || n === s) return null;
              return (
                <Link className="li" key={k} to={`/s/${n.id}`}>
                  <span className={`tile t-${k}`}><Icon d={TRACK[k].icon} /></span>
                  <span className="mid"><span className="t">{n.title}</span><span className="s">{TRACK[k].name} {'·'} {TRACK[k].days}</span></span>
                  <span className="chev">{'›'}</span>
                </Link>
              );
            })}
          </div>
        </div>
        {read && (
          <a className="tl d2" style={{ textDecoration: 'none', color: 'inherit' }} href={read.url} target="_blank" rel="noopener noreferrer">
            <span className="k">Read next</span><span className="tt" style={{ fontSize: 14 }}>{read.title}</span><span className="d" style={{ marginTop: 'auto' }}>{read.by} {'↗'}</span>
          </a>
        )}
      </div>
      {speaking && <SpeakSheet prompt={speakPrompt(p)} onClose={() => setSpeaking(false)} />}
    </>
  );
}
