import type { AdminStats, AdminUserRow } from '@upskill/shared';
import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { adminStats, adminUsers, ApiError, getSession } from '../lib/api';

const ago = (iso: string | null) => {
  if (!iso) return 'Never';
  const m = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (m < 60) return m <= 1 ? 'Just now' : `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'Yesterday' : `${d} days ago`;
};
const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

type Sort = 'createdAt' | 'progressUpdatedAt' | 'done' | 'xp';

export function AdminPage() {
  const me = getSession()?.user;
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('createdAt');

  useEffect(() => {
    if (!me?.isAdmin) return;
    Promise.all([adminStats(), adminUsers()])
      .then(([s, u]) => { setStats(s); setUsers(u); })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Couldn’t load the dashboard'));
  }, [me?.isAdmin]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = (users ?? []).filter((u) => !needle || u.email.toLowerCase().includes(needle) || u.name.toLowerCase().includes(needle));
    const key = (u: AdminUserRow) => (sort === 'done' ? u.done : sort === 'xp' ? u.xp : Date.parse((sort === 'createdAt' ? u.createdAt : u.progressUpdatedAt) ?? '0') || 0);
    return [...list].sort((a, b) => key(b) - key(a));
  }, [users, q, sort]);

  if (!me?.isAdmin) return <Navigate to="/" replace />;

  const t = stats?.totals;
  const peak = Math.max(1, ...(stats?.signups.map((s) => s.count) ?? [1]));
  const tiles: [string, number | undefined, string][] = [
    ['Learners', t?.users, `${t?.newThisWeek ?? 0} new this week`],
    ['Active this week', t?.activeThisWeek, `${t?.activeToday ?? 0} today`],
    ['Sessions done', t?.sessionsDone, 'across everyone'],
    ['Problems solved', t?.problemsSolved, `${t?.jobsTracked ?? 0} job${t?.jobsTracked === 1 ? '' : 's'} tracked`],
  ];

  return (
    <>
      <div className="phead"><h1>Admin</h1><span className="meta">Read-only overview of Project Upskill</span></div>
      {error && <p className="err" role="alert">{error}</p>}
      <div className="bento">
        {tiles.map(([k, v, d]) => (
          <div className="tl" key={k}><span className="k">{k}</span><span className="v">{v ?? '–'}</span><span className="d">{d}</span></div>
        ))}
        <div className="tl w2 d2" style={{ gridColumn: '1 / -1' }}>
          <span className="k">Sign-ups, last 14 days</span>
          <div className="spark" role="img" aria-label={`Sign-ups per day: ${(stats?.signups ?? []).map((s) => `${s.date} ${s.count}`).join(', ')}`}>
            {(stats?.signups ?? []).map((s) => (
              <span key={s.date} title={`${s.date}: ${s.count}`}><i style={{ height: `${(s.count / peak) * 100}%` }} /><b>{new Date(s.date).getDate()}</b></span>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 10 }}>
          <h2 className="ch" style={{ margin: 0 }}>Learners {users ? `(${rows.length})` : ''}</h2>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <label className="sr" htmlFor="aq">Search learners</label>
            <input id="aq" type="search" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 220 }} />
            <label className="sr" htmlFor="as">Sort by</label>
            <select id="as" value={sort} onChange={(e) => setSort(e.target.value as Sort)} style={{ width: 'auto' }}>
              <option value="createdAt">Newest</option>
              <option value="progressUpdatedAt">Last active</option>
              <option value="done">Most sessions</option>
              <option value="xp">Most XP</option>
            </select>
          </div>
        </div>
        {users === null ? <div className="empty">{error ? '' : 'Loading…'}</div> : rows.length === 0 ? <div className="empty">No learners match.</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl admin-tbl">
              <thead><tr><th>Learner</th><th>Joined</th><th>Last active</th><th className="num">Sessions</th><th className="num">Solved</th><th className="num">XP</th><th className="num">Streak</th><th className="num">Jobs</th></tr></thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td><b style={{ display: 'block', fontWeight: 600 }}>{u.name}</b><span className="muted">{u.email}</span></td>
                    <td>{date(u.createdAt)}</td>
                    <td>{ago(u.progressUpdatedAt)}</td>
                    <td className="num">{u.done}</td><td className="num">{u.solved}</td><td className="num">{u.xp}</td><td className="num">{u.streak}</td><td className="num">{u.jobs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
