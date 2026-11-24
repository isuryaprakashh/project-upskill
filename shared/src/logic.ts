import type { Content, ProgressData, Session, SessionTrack } from './types';

export const emptyProgress = (): ProgressData => ({ done: {}, solved: {}, notes: {}, read: {}, tchk: {}, pos: {}, speak: {}, days: {}, xp: 0, streak: 0, last: null, start: null, epoch: 0 });

/** Days since 1 Jan 1970 in the device's own time zone. */
export function today(now = new Date()): number {
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
}

export function week(p: ProgressData, t = today()): number {
  const start = p.start ?? t;
  return Math.max(1, Math.min(24, Math.floor((t - start) / 7) + 1));
}

/** Which track is scheduled for a weekday (0 = Sunday). */
export function trackFor(weekday: number, wk: number): SessionTrack {
  if (weekday === 1 || weekday === 3 || weekday === 5) return 'dsa';
  if (weekday === 2 || weekday === 4) return 'sd';
  if (weekday === 6) return 'build';
  return wk % 2 === 1 ? 'research' : 'review';
}

export function nextSession(content: Content, p: ProgressData, track: SessionTrack): Session | null {
  return content.sessions[track].find((s) => !p.done[s.id]) ?? null;
}

export function currentStreak(p: ProgressData, t = today()): number {
  if (p.last == null) return 0;
  return p.last === t || p.last === t - 1 ? p.streak : 0;
}

export const speakSeconds = (wk: number) => (wk <= 8 ? 60 : wk <= 16 ? 120 : 180);

/** Returns a new progress object with XP added and today's streak counted. */
export function bump(p: ProgressData, xp: number, t = today()): ProgressData {
  const next: ProgressData = { ...p, xp: p.xp + xp, days: { ...p.days, [t]: 1 } };
  if (p.last !== t) {
    next.streak = p.last === t - 1 ? p.streak + 1 : 1;
    next.last = t;
  }
  if (next.start == null) next.start = t;
  return next;
}

/**
 * Combines progress from two devices so nothing is lost:
 * anything done on either device stays done, and the longer note wins.
 */
export function mergeProgress(a: ProgressData, b: ProgressData): ProgressData {
  // After a reset, the newer copy replaces the older one instead of merging with it.
  const ea = a.epoch ?? 0, eb = b.epoch ?? 0;
  if (ea !== eb) return ea > eb ? a : b;
  const or = (x: Record<string, boolean>, y: Record<string, boolean>) => {
    const out: Record<string, boolean> = { ...x };
    for (const k of Object.keys(y)) out[k] = !!(x[k] || y[k]);
    return out;
  };
  const notes: Record<string, string> = { ...a.notes };
  for (const k of Object.keys(b.notes)) if ((b.notes[k] ?? '').length > (notes[k] ?? '').length) notes[k] = b.notes[k];
  const newer = (a.last ?? -1) >= (b.last ?? -1) ? a : b;
  const starts = [a.start, b.start].filter((v): v is number => v != null);
  // pos: keep the further-along position for each lesson
  const pos: ProgressData['pos'] = { ...b.pos };
  for (const k of Object.keys(a.pos)) { const x = a.pos[k], y = b.pos[k]; if (!y || x.s >= y.s) pos[k] = x; }
  for (const k of Object.keys(pos)) if (a.done[k] || b.done[k]) delete pos[k];
  return {
    done: or(a.done, b.done), solved: or(a.solved, b.solved), read: or(a.read, b.read), tchk: or(a.tchk, b.tchk),
    notes, pos, speak: { ...b.speak, ...a.speak }, days: { ...b.days, ...a.days },
    xp: Math.max(a.xp, b.xp), streak: newer.streak, last: newer.last, start: starts.length ? Math.min(...starts) : null, epoch: ea,
  };
}
