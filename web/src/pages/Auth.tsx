import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, login, register } from '../lib/api';
import { startProgress } from '../lib/progress';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const isNew = mode === 'register';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (isNew && password.length < 8) { setError('Use at least 8 characters for your password.'); return; }
    setBusy(true);
    const t = setTimeout(() => setSlow(true), 4000);
    try {
      if (isNew) await register(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
      await startProgress();
      nav('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      clearTimeout(t);
      setSlow(false);
      setBusy(false);
    }
  };

  return (
    <div className="authwrap">
      <form className="authcard card" onSubmit={submit} noValidate>
        <div className="brand" style={{ marginBottom: 20 }}><span className="logo" aria-hidden="true">U</span>Project Upskill</div>
        <h1>{isNew ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted" style={{ margin: '0 0 18px' }}>{isNew ? 'Your progress syncs across web and mobile.' : 'Sign in to pick up where you left off.'}</p>
        {error && <p className="err" role="alert">{error}</p>}
        {isNew && (
          <div className="field"><label htmlFor="name">Name</label><input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
        )}
        <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" autoComplete={isNew ? 'new-password' : 'current-password'} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <button className="btn p w lg" disabled={busy || !email || !password || (isNew && !name)}>{busy ? 'One moment…' : isNew ? 'Create account' : 'Sign in'}</button>
        {slow && <p className="muted" role="status" style={{ margin: '12px 0 0', textAlign: 'center' }}>The server is waking up. This can take up to a minute the first time.</p>}
        <p className="muted" style={{ margin: '16px 0 0', textAlign: 'center' }}>
          {isNew ? <>Already have an account? <Link to="/login">Sign in</Link></> : <>New here? <Link to="/register">Create an account</Link></>}
        </p>
      </form>
    </div>
  );
}
