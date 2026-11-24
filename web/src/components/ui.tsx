import { useEffect, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';

export function Icon({ d }: { d: string }) {
  return (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export const ICONS = {
  today: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  tracks: 'M4 6h16M4 12h16M4 18h10',
  career: 'M3 8h18v12H3zM8 8V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V8M3 13h18',
  library: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
};

/** Turns **words** into highlighted text. */
export function Rich({ text }: { text: string }) {
  const parts = text.split('**');
  return <>{parts.map((p, i) => (i % 2 ? <span key={i} className="hl">{p}</span> : p))}</>;
}

export function Check({ on, onChange, children, label }: { on: boolean; onChange: () => void; children?: ReactNode; label?: string }) {
  return (
    <button className="chk" aria-pressed={on} aria-label={label} onClick={onChange} style={children ? undefined : { width: 'auto', padding: 4 }}>
      <span className="bx" />
      {children && <span className="ct">{children}</span>}
    </button>
  );
}

/* ---------- toast ---------- */
let message = '';
let timer: ReturnType<typeof setTimeout> | null = null;
const subs = new Set<() => void>();
export function toast(m: string) {
  message = m;
  subs.forEach((s) => s());
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { message = ''; subs.forEach((s) => s()); }, 2200);
}
export function Toast() {
  const m = useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => message);
  return <div className={'toast' + (m ? ' on' : '')} role="status" aria-live="polite">{m}</div>;
}

/* ---------- sheet (modal) ---------- */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="sheet on" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="btn g" aria-label="Close" onClick={onClose}>{'✕'}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied');
  } catch {
    toast('Select the text and copy it');
  }
}

export const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : '#');
