import { content, sessionById, TRACK } from '@upskill/shared';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, Icon, ICONS } from '../components/ui';
import { getSession, logout } from '../lib/api';
import { retrySync, updateProgress, useProgress, useSyncStatus } from '../lib/progress';

export function LibraryPage() {
  const { page } = useParams();
  const p = useProgress();
  const sync = useSyncStatus();
  const nav = useNavigate();
  const user = getSession()?.user;
  const notes = Object.keys(p.notes).filter((k) => (p.notes[k] ?? '').trim());
  const back = <Link className="back" to="/library" style={{ textDecoration: 'none' }}>{'←'} Library</Link>;

  if (page === 'reading') {
    return (
      <>
        {back}<h1>Reading list</h1><p className="sub">Articles you liked, in reading order.</p>
        <div className="grid g2" style={{ alignItems: 'start' }}>
          {content.library.map((sec) => (
            <div className="card" key={sec.section}>
              <h2 className="ch" style={{ margin: 0 }}>{sec.section}</h2>
              <p className="muted" style={{ margin: '0 0 6px' }}>{sec.by} {'·'} {sec.items.filter((i) => p.read[i.key]).length} of {sec.items.length}</p>
              <div className="list">{sec.items.map((i) => (
                <div className="li" key={i.key}><span className="mid"><a className="t" style={p.read[i.key] ? { color: 'var(--ink3)' } : undefined} href={i.url} target="_blank" rel="noopener noreferrer">{i.title}</a></span>
                  <Check on={!!p.read[i.key]} label={`Read ${i.title}`} onChange={() => updateProgress((cur) => ({ ...cur, read: { ...cur.read, [i.key]: !cur.read[i.key] } }))} /></div>
              ))}</div>
            </div>
          ))}
        </div>
      </>
    );
  }
  if (page === 'notes') {
    return (
      <>
        {back}<h1>Mistake notebook</h1><p className="sub">Your one-line notes. Read them before interviews.</p>
        {notes.length === 0 ? <div className="card empty">Your notes from each session show up here.</div> : (
          <div className="grid g2">{notes.map((k) => { const s = sessionById(k); return <div className="card" key={k}><p className="muted" style={{ margin: '0 0 4px' }}>{s ? `${TRACK[s.track].name} · ${s.title}` : ''}</p><p style={{ margin: 0 }}>{p.notes[k]}</p></div>; })}</div>
        )}
      </>
    );
  }
  if (page === 'how') {
    return (
      <>
        {back}<h1>How it works</h1><p className="sub">24 weeks, about 60 minutes a day.</p>
        <div className="card"><table className="tbl"><thead><tr><th>Day</th><th>Subject</th></tr></thead><tbody>
          <tr><td>Mon, Wed, Fri</td><td>DSA: learn, practice, one note</td></tr>
          <tr><td>Tue, Thu</td><td>System design + AWS: read, AWS service, hands-on lab</td></tr>
          <tr><td>Saturday</td><td>Build: React, React Native, the backend, Cloudflare</td></tr>
          <tr><td>Sunday</td><td>Research, or review + trends + apply sprint (alternating)</td></tr>
          <tr><td>Every day</td><td>10 minutes of speaking practice</td></tr>
        </tbody></table></div>
        <p className="muted" style={{ marginTop: 12 }}>Behind? No problem. Today always opens the next unfinished session of that day’s track.</p>
      </>
    );
  }
  if (page === 'account') {
    return (
      <>
        {back}<h1>Account</h1>
        <div className="card stack">
          <div><p className="muted" style={{ margin: 0 }}>Signed in as</p><p style={{ margin: 0, fontWeight: 600 }}>{user?.name}</p><p className="muted" style={{ margin: 0 }}>{user?.email}</p></div>
          <div className="row" style={{ justifyContent: 'space-between' }}><span>{sync === 'saved' ? 'All changes saved' : sync === 'syncing' ? 'Saving…' : 'Offline. Saved on this device.'}</span>{sync === 'offline' && <button className="btn s" onClick={() => void retrySync()}>Try again</button>}</div>
          <button className="btn s" onClick={async () => { await logout(); nav('/login', { replace: true }); }}>Sign out everywhere</button>
        </div>
      </>
    );
  }

  let read = 0, all = 0;
  content.library.forEach((s) => s.items.forEach((i) => { all++; if (p.read[i.key]) read++; }));
  const rows: [string, string, string, string, string][] = [
    ['reading', 'Reading list', `${read} of ${all} read`, ICONS.library, 'read'],
    ['notes', 'Mistake notebook', `${notes.length} note${notes.length === 1 ? '' : 's'} · read before interviews`, 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4', 'speak'],
    ['how', 'How Project Upskill works', 'The weekly rhythm in one page', 'M12 17v.01M12 13a2 2 0 1 0-2-2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'sd'],
    ['account', 'Account', user?.email ?? '', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', 'build'],
  ];
  return (
    <>
      <h1>Library</h1>
      <div className="card"><div className="list">{rows.map(([to, title, sub, icon, tone]) => (
        <Link className="li" key={to} to={`/library/${to}`}><span className={`tile t-${tone}`}><Icon d={icon} /></span><span className="mid"><span className="t">{title}</span><span className="s">{sub}</span></span><span className="chev">{'›'}</span></Link>
      ))}</div></div>
    </>
  );
}
