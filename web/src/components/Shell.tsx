import { currentStreak, week } from '@upskill/shared';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { getSession } from '../lib/api';
import { useProgress, useSyncStatus } from '../lib/progress';
import { Icon, ICONS, Toast } from './ui';

const NAV: [string, string, string][] = [['/', 'Today', ICONS.today], ['/tracks', 'Tracks', ICONS.tracks], ['/career', 'Career', ICONS.career], ['/library', 'Library', ICONS.library]];

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');
  const flip = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('upskill-theme', next); } catch { /* ignore */ }
    setDark(!dark);
  };
  return { dark, flip };
}

export function Shell() {
  const p = useProgress();
  const sync = useSyncStatus();
  const { dark, flip } = useTheme();
  const loc = useLocation();
  const full = loc.pathname.startsWith('/s/');
  const streak = currentStreak(p);
  useEffect(() => {
    document.body.classList.toggle('full', full);
    return () => document.body.classList.remove('full');
  }, [full]);
  const nav = getSession()?.user.isAdmin ? [...NAV, ['/admin', 'Admin', 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z'] as [string, string, string]] : NAV;
  const links = nav.map(([to, label, icon]) => (
    <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => 'navb' + (isActive ? ' on' : '')} style={{ textDecoration: 'none' }}>
      <Icon d={icon} /><span>{label}</span>
    </NavLink>
  ));
  const syncText = sync === 'saved' ? 'All changes saved' : sync === 'syncing' ? 'Saving…' : 'Offline. Saved on this device';

  return (
    <div>
      <aside className="side" aria-label="Main">
        <div className="brand"><span className="logo" aria-hidden="true">U</span>Project Upskill</div>
        {links}
        <div className="foot">
          <NavLink to="/library/account" className="acct" style={{ textDecoration: 'none' }}><span className="avatar" aria-hidden="true">{(getSession()?.user.name ?? '?').slice(0, 1).toUpperCase()}</span><span><b>{getSession()?.user.name}</b><span>Account and settings</span></span></NavLink>
          <button className="btn s w" style={{ marginBottom: 12 }} onClick={flip}><Icon d={dark ? ICONS.sun : ICONS.moon} />{dark ? 'Light mode' : 'Dark mode'}</button>
          <div>Week {week(p)} of 24</div>
          <div>{streak}-day streak</div>
          <div className="sync" aria-live="polite">{syncText}</div>
        </div>
      </aside>
      <header className="topbar">
        <div className="in">
          <div className="brand"><span className="logo" aria-hidden="true">U</span>Project Upskill</div>
          <div className="row" style={{ gap: 6 }}>
            <span className={'badge' + (streak ? ' t-speak' : '')}>{streak}-day streak</span>
            <button className="btn g" style={{ minHeight: 44, minWidth: 44, padding: 0 }} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={flip}><Icon d={dark ? ICONS.sun : ICONS.moon} /></button>
            <NavLink to="/library/account" className="avatar" aria-label="Account and settings" style={{ textDecoration: 'none' }}>{(getSession()?.user.name ?? '?').slice(0, 1).toUpperCase()}</NavLink>
          </div>
        </div>
      </header>
      <main className="main"><Outlet /></main>
      {!full && <nav className="bnav" aria-label="Main"><div className="in">{links}</div></nav>}
      <Toast />
    </div>
  );
}
