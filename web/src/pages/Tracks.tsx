import { content, nextSession, speakSeconds, week } from '@upskill/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SpeakSheet } from '../components/SpeakSheet';
import { Icon } from '../components/ui';
import { SESSION_TRACKS, speakPrompt, TRACK } from '../lib/course';
import { useProgress } from '../lib/progress';

const TABS = [...SESSION_TRACKS, 'speak'] as const;
type Tab = (typeof TABS)[number];
const dateOf = (day: string) => new Date(Number(day) * 86400000).toISOString().slice(0, 10);

export function TracksPage() {
  const p = useProgress();
  const [tab, setTab] = useState<Tab>('dsa');
  const [speaking, setSpeaking] = useState(false);
  const T = TRACK[tab];

  return (
    <>
      <h1>Tracks</h1>
      <div className="seg" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{TRACK[t].name}</button>)}
      </div>
      {tab === 'speak' ? (
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <div><h2>Speaking</h2><p className="muted" style={{ margin: 0 }}>{T.days} {'·'} {speakSeconds(week(p))} seconds this phase</p></div>
            <button className="btn p" onClick={() => setSpeaking(true)}>Start</button>
          </div>
          {Object.keys(p.speak).length === 0 ? <div className="empty">Your speaking log will show up here.</div> : (
            <div className="list">
              {Object.keys(p.speak).sort((a, b) => Number(b) - Number(a)).map((d) => {
                const x = p.speak[d];
                return <div className="li" key={d}><span className="tile t-speak"><Icon d={T.icon} /></span><span className="mid"><span className="t">{x.p}</span><span className="s">{dateOf(d)} {'·'} pace {x.r[0]}, fillers {x.r[1]}, clarity {x.r[2]}</span></span></div>;
              })}
            </div>
          )}
        </div>
      ) : (() => {
        const list = content.sessions[tab];
        const done = list.filter((s) => p.done[s.id]).length;
        const next = nextSession(content, p, tab);
        return (
          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <div><h2>{T.full}</h2><p className="muted" style={{ margin: 0 }}>{T.days} {'·'} {done} of {list.length} done</p></div>
              <span className={`tile t-${tab}`}><Icon d={T.icon} /></span>
            </div>
            <div className="bar" style={{ margin: '8px 0 6px' }}><i className={`c-${tab}`} style={{ width: `${(done / list.length) * 100}%` }} /></div>
            <div className="list">
              {list.map((s, i) => (
                <Link className="li" key={s.id} to={`/s/${s.id}`}>
                  <span className="muted" style={{ width: 26, textAlign: 'right' }}>{i + 1}</span>
                  <span className="mid"><span className="t">{s.title}</span>{s.kind === 'design' && <span className="s">AWS: {s.aws}</span>}{s.kind === 'review' && <span className="s">STAR: {s.star}</span>}</span>
                  {p.done[s.id] ? <span className="badge b-ok">Done</span> : s === next ? <span className="badge b-p">Next</span> : null}
                  <span className="chev">{'›'}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}
      {speaking && <SpeakSheet prompt={speakPrompt(p)} onClose={() => setSpeaking(false)} />}
    </>
  );
}
