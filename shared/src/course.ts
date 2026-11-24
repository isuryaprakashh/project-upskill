import { content } from './content';
import { nextSession, speakSeconds, trackFor, week } from './logic';
import type { ProgressData, Session, SessionTrack, Track, TrackId } from './types';

export const TRACK = Object.fromEntries(content.tracks.map((t) => [t.id, t])) as Record<TrackId, Track>;
export const SESSION_TRACKS: SessionTrack[] = ['dsa', 'sd', 'build', 'research', 'review'];
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const LESSON_STEPS = ['Warm-up', 'The idea', 'Picture it', 'Choose wisely', 'In code', 'Interview'];

const byId = new Map<string, Session>();
const position = new Map<Session, number>();
SESSION_TRACKS.forEach((t) => content.sessions[t].forEach((s, i) => { byId.set(s.id, s); position.set(s, i); }));

export const sessionById = (id: string) => byId.get(id) ?? null;
export const indexOf = (s: Session) => position.get(s) ?? -1;
export const todayTrack = (p: ProgressData, now = new Date()) => trackFor(now.getDay(), week(p));
export const plain = (t: string) => t.replace(/["“”]/g, '');
export const leetcode = (slug: string) => `https://leetcode.com/problems/${slug}/`;
export const isWebUrl = (u: string) => /^https?:\/\//i.test(u);

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

/** The label on the big "start" button. */
export function startLabel(s: Session, p: ProgressData): string {
  const pos = p.pos[s.id];
  if (pos) return `Continue${s.kind === 'lesson' && pos.t === 'learn' ? ` at step ${pos.s + 1} of 6` : ''}`;
  return s.kind === 'lesson' ? 'Start lesson' : 'Start session';
}

const LIBRARY_TOTAL = content.library.reduce((n, s) => n + s.items.length, 0);
export function trackProgress(p: ProgressData, id: TrackId): { pct: number; text: string } {
  if (id === 'speak') { const n = Object.keys(p.speak).length; return { pct: Math.min(100, (n / 168) * 100), text: `${n}/168` }; }
  if (id === 'read') {
    let read = 0;
    for (const s of content.library) for (const i of s.items) if (p.read[i.key]) read++;
    return { pct: (read / LIBRARY_TOTAL) * 100, text: `${read}/${LIBRARY_TOTAL}` };
  }
  const list = content.sessions[id];
  let done = 0;
  for (const s of list) if (p.done[s.id]) done++;
  return { pct: (done / list.length) * 100, text: `${done}/${list.length}` };
}

export function nextRead(p: ProgressData) {
  for (const sec of content.library) for (const it of sec.items) if (!it.title.startsWith('All his articles') && !p.read[it.key]) return { ...it, by: sec.by };
  return null;
}

/** The checklist keys a session uses. Research keeps its original keys so old progress still counts. */
export function checklistKeys(s: Session): string[] {
  if (s.kind === 'design') return s.lab.map((_, j) => `${s.id}-${j}`);
  if (s.kind === 'checklist') return s.steps.map((_, j) => (s.track === 'research' ? `research-${indexOf(s)}-${j}` : `${s.id}-${j}`));
  if (s.kind === 'review') return REVIEW_STEPS(s.star).map((_, j) => `${s.id}-${j}`);
  return [];
}
export const REVIEW_STEPS = (star: string) => [
  'Re-solve 2 problems from your notebook',
  'Skim the top stories on Hacker News for 10 minutes and note one trend',
  'Apply sprint: 20 minutes, aim for 5 applications',
  `Speak: tell the STAR story “${star}” in 2 minutes`,
  'Glance at next week in Tracks',
];

/** Day number (days since 1970) for a YYYY-MM-DD string, or null. */
export const dayOf = (iso: string) => (iso ? Math.floor(Date.parse(iso) / 86400000) : null);
export const isoOf = (day: number) => new Date(day * 86400000).toISOString().slice(0, 10);
