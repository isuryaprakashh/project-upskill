import { useEffect, useState, useSyncExternalStore } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';
import { getSession, subscribeSession } from './lib/api';
import { startProgress } from './lib/progress';
import { AuthPage } from './pages/Auth';
import { CareerPage } from './pages/Career';
import { LibraryPage } from './pages/Library';
import { SessionPage } from './pages/Session';
import { TodayPage } from './pages/Today';
import { TracksPage } from './pages/Tracks';

export function App() {
  const session = useSyncExternalStore(subscribeSession, getSession);
  const [ready, setReady] = useState(false);
  const userId = session?.user.id;

  useEffect(() => {
    setReady(false);
    void startProgress().finally(() => setReady(true));
  }, [userId]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <AuthPage mode="login" />} />
        <Route path="/register" element={session ? <Navigate to="/" replace /> : <AuthPage mode="register" />} />
        <Route element={session ? (ready ? <Shell /> : <div className="authwrap"><p className="muted">Loading your progress…</p></div>) : <Navigate to="/login" replace />}>
          <Route path="/" element={<TodayPage />} />
          <Route path="/tracks" element={<TracksPage />} />
          <Route path="/s/:id" element={<SessionPage />} />
          <Route path="/career" element={<CareerPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/library/:page" element={<LibraryPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
