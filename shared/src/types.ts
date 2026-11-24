export type TrackId = 'dsa' | 'sd' | 'build' | 'research' | 'review' | 'speak' | 'read';

export interface Track { id: TrackId; name: string; full: string; icon: string; days: string }

export interface QuizQuestion { q: string; options: string[]; answer: number; why: string }

export interface Problem {
  num: number; slug: string; title: string; level: 'Easy' | 'Medium' | 'Hard';
  ask?: string; hints?: string[]; solution?: string; complexity?: string; mistake?: string; boss?: boolean;
}

export interface Lesson {
  topic: string; question: string; hook: string; plain: string; what: string[];
  sketchSvg: string; caption: string;
  steps: { title: string; items: string[] };
  table: { head: string[]; rows: string[][] };
  tradeoff: { question: string; left: [string, string]; right: [string, string]; position: number };
  code: { label: string; text: string };
  oneLine: string; recap: string[];
}

export interface LessonSession { id: string; track: 'dsa'; kind: 'lesson'; title: string; minutes: number; boss: boolean; quizLabel: string; quiz: QuizQuestion[]; problems: Problem[]; lesson: Lesson }
export interface OutlineSession { id: string; track: 'dsa'; kind: 'outline'; title: string; learn: string; problems: Problem[] }
export interface DesignSession { id: string; track: 'sd'; kind: 'design'; title: string; articles: { title: string; url: string; key: string }[]; aws: string; awsWhat: string; lab: string[]; speak: string }
export interface ChecklistSession { id: string; track: 'build' | 'research'; kind: 'checklist'; title: string; why: string; steps: string[]; result: string; template?: string | null }
export interface ReviewSession { id: string; track: 'review'; kind: 'review'; title: string; star: string }

export type Session = LessonSession | OutlineSession | DesignSession | ChecklistSession | ReviewSession;
export type SessionTrack = 'dsa' | 'sd' | 'build' | 'research' | 'review';

export interface LibrarySection { section: string; by: string; items: { title: string; url: string; key: string }[] }

export interface Content {
  version: number; weeks: number; tracks: Track[];
  sessions: Record<SessionTrack, Session[]>;
  library: LibrarySection[];
  whereToLook: { heading: string; items: { name: string; url: string }[] }[];
  templates: { title: string; text: string }[];
}

/** Everything tracked for one learner. The backend stores exactly this shape. */
export interface ProgressData {
  done: Record<string, boolean>;
  solved: Record<string, boolean>;
  notes: Record<string, string>;
  read: Record<string, boolean>;
  tchk: Record<string, boolean>;
  pos: Record<string, { t: string; s: number }>;
  speak: Record<string, { p: string; r: number[]; s: number }>;
  days: Record<string, number>;
  xp: number; streak: number; last: number | null; start: number | null;
  /** Goes up by one on every reset, so a reset wins over older copies on other devices. */
  epoch?: number;
}

export type JobStatus = 'Saved' | 'Applied' | 'OA' | 'Interview' | 'Offer' | 'Rejected';
export interface Job { id: string; company: string; role: string; loc: string; status: JobStatus; link: string; referral: string; applied: string; follow: string; notes: string; updatedAt: string }
export type JobInput = Omit<Job, 'id' | 'updatedAt'>;

export type HackStatus = 'Interested' | 'Registered' | 'Submitted' | 'Result';
export interface Hackathon { id: string; name: string; platform: string; status: HackStatus; deadline: string; team: string; link: string; notes: string; updatedAt: string }
export type HackathonInput = Omit<Hackathon, 'id' | 'updatedAt'>;

export interface User { id: string; email: string; name: string; createdAt: string; isAdmin?: boolean }

export interface AdminUserRow { id: string; email: string; name: string; createdAt: string; progressUpdatedAt: string | null; done: number; solved: number; xp: number; streak: number; jobs: number }
export interface AdminStats {
  totals: { users: number; newThisWeek: number; activeThisWeek: number; activeToday: number; sessionsDone: number; problemsSolved: number; jobsTracked: number };
  signups: { date: string; count: number }[];
}
