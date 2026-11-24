import { content, nextSession, speakSeconds, today, trackFor, week } from '@upskill/shared';
import type { ProgressData, Session, SessionTrack, Track, TrackId } from '@upskill/shared';

export const TRACK: Record<TrackId, Track> = Object.fromEntries(content.tracks.map((t) => [t.id, t])) as Record<TrackId, Track>;
export const SESSION_TRACKS: SessionTrack[] = ['dsa', 'sd', 'build', 'research', 'review'];

const byId = new Map<string, Session>();
SESSION_TRACKS.forEach((t) => content.sessions[t].forEach((s) => byId.set(s.id, s)));
export const sessionById = (id: string) => byId.get(id) ?? null;
export const indexOf = (s: Session) => content.sessions[s.track].indexOf(s);

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const todayTrack = (p: ProgressData) => trackFor(new Date().getDay(), week(p));
export const plain = (t: string) => t.replace(/["“”]/g, '');

export function speakPrompt(p: ProgressData, s: Session | null = nextSession(content, p, todayTrack(p))): string {
  if (!s) return 'Explain the last thing you learned';
  if (s.kind === 'design') return s.speak;
  if (s.kind === 'review') return `STAR story: ${s.star}`;
  return `Explain “${plain(s.title)}” in ${speakSeconds(week(p))} seconds`;
}

export function sessionMeta(s: Session): string {
  const n = indexOf(s) + 1;
  const total = content.sessions[s.track].length;
  if (s.kind === 'lesson') return `Lesson ${n} of ${total} · learn, practice, one note`;
  if (s.kind === 'outline') return `Lesson ${n} of ${total} · ${s.problems.length ? `${s.problems.length} problem${s.problems.length > 1 ? 's' : ''}` : 'concept review'}`;
  if (s.kind === 'design') return `Session ${n} of ${total} · read, AWS, lab`;
  if (s.kind === 'checklist') return `${s.track === 'build' ? 'Saturday' : 'Weekend'} ${n} of ${total} · ${s.steps.length} steps`;
  return `Review ${n} of ${total}`;
}

export function trackProgress(p: ProgressData, id: TrackId): { pct: number; text: string } {
  if (id === 'speak') { const n = Object.keys(p.speak).length; return { pct: Math.min(100, (n / 168) * 100), text: `${n}/168` }; }
  if (id === 'read') {
    let all = 0, read = 0;
    content.library.forEach((s) => s.items.forEach((i) => { all++; if (p.read[i.key]) read++; }));
    return { pct: (read / all) * 100, text: `${read}/${all}` };
  }
  const list = content.sessions[id];
  const done = list.filter((s) => p.done[s.id]).length;
  return { pct: (done / list.length) * 100, text: `${done}/${list.length}` };
}

export function nextRead(p: ProgressData) {
  for (const sec of content.library) for (const it of sec.items) if (!it.title.startsWith('All his articles') && !p.read[it.key]) return { ...it, by: sec.by };
  return null;
}

export const leetcode = (slug: string) => `https://leetcode.com/problems/${slug}/`;
export { today };
