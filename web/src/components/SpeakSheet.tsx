import { bump, speakSeconds, today, week } from '@upskill/shared';
import { useEffect, useRef, useState } from 'react';
import { updateProgress, useProgress } from '../lib/progress';
import { Sheet, toast } from './ui';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const SCALES: [string, string][] = [['Pace', 'Not too fast or slow'], ['Few filler words', 'Fewer "um", "like", "basically"'], ['Clarity', 'Would a friend understand?']];

export function SpeakSheet({ prompt, onClose }: { prompt: string; onClose: () => void }) {
  const p = useProgress();
  const secs = speakSeconds(week(p));
  const [left, setLeft] = useState(secs);
  const [running, setRunning] = useState(false);
  const [rating, setRating] = useState([0, 0, 0]);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) { setRunning(false); toast('Time! Stop recording.'); return 0; }
        return v - 1;
      });
    }, 1000);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [running]);

  const save = () => {
    updateProgress((cur) => bump({ ...cur, speak: { ...cur.speak, [today()]: { p: prompt, r: rating, s: secs } } }, 15));
    toast('Saved. Same time tomorrow!');
    onClose();
  };

  return (
    <Sheet title={`Speaking · ${secs} s`} onClose={onClose}>
      <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{prompt}</p>
      <p className="muted" style={{ margin: 0 }}>Open your phone’s voice recorder, press record, then start the timer. Talk as if explaining to a friend.</p>
      <div className="timer" aria-live="off">{fmt(left)}</div>
      <button className="btn p w lg" onClick={() => setRunning((r) => !r)}>{running ? 'Stop' : left < secs && left > 0 ? 'Resume' : 'Start timer'}</button>
      <h2 className="ch" style={{ marginTop: 18 }}>Listen once, then rate yourself</h2>
      {SCALES.map(([name, hint], i) => (
        <div key={name}>
          <p className="muted" style={{ margin: '10px 0 6px' }}><b style={{ color: 'var(--ink)' }}>{name}</b> {'·'} {hint}</p>
          <div className="rate">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} className={rating[i] === v ? 'on' : ''} aria-label={`${name} ${v}`} aria-pressed={rating[i] === v} onClick={() => setRating((r) => r.map((x, k) => (k === i ? v : x)))}>{v}</button>
            ))}
          </div>
        </div>
      ))}
      <button className="btn p w lg" style={{ marginTop: 18 }} disabled={rating.includes(0)} onClick={save}>Save to my log</button>
    </Sheet>
  );
}
