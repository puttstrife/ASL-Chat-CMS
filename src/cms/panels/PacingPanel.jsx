import { estimateFunnel, fmtDuration, fromWpm, toWpm } from '../estimate.js';
import { Field, Panel } from '../ui.jsx';

// How fast the reader types, and what that costs in session length.
//
// The two are the same decision, so they are shown together: dragging the speed
// moves the estimate immediately. A writer choosing a speed is really choosing
// how long a visitor sits there, and that trade should not be hidden behind a
// millisecond number.
const PRESETS = [
  { label: 'Unhurried', wpm: 50, note: 'Reads as a real person. Long sessions.' },
  { label: 'Natural', wpm: 110, note: 'Brisk, still believable.' },
  { label: 'Quick', wpm: 200, note: 'Obviously fast, keeps things moving.' },
  { label: 'Instant', wpm: 300, note: "Selene's setting. Fast over realistic." },
];

export function PacingPanel({ funnel, onPatch }) {
  const p = funnel.pacing;
  const midMs = (p.msPerCharMin + p.msPerCharMax) / 2;
  const wpm = toWpm(midMs);
  const est = estimateFunnel(funnel);

  // The spread between fastest and slowest keystroke is what stops every line
  // being timed identically, so it is held proportional rather than absolute.
  const setWpm = (nextWpm) => {
    const mid = fromWpm(Math.max(20, Math.min(600, nextWpm)));
    const spread = 0.25;
    onPatch({
      msPerCharMin: Math.max(5, Math.round(mid * (1 - spread))),
      msPerCharMax: Math.round(mid * (1 + spread)),
    });
  };

  return (
    <Panel title="Pace" subtitle="Typing speed, and what it costs in session length">
      <div className="flex flex-col gap-3.5">
        <div className="rounded-lg border border-white/8 bg-[#101119] p-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[.7rem] font-semibold uppercase tracking-wide text-white/45">Longest run</span>
            <span className="font-mono text-lg font-semibold text-[#8f74ff]">{fmtDuration(est.max)}</span>
          </div>
          <p className="mt-1 text-[.7rem] leading-snug text-white/35">
            Typical {fmtDuration(est.mid)} · fastest {fmtDuration(est.min)}. Measured down the longest
            path a visitor can take, so this is the worst case, not an average.
          </p>
        </div>

        <Field label={`Speed — ${wpm} wpm`}>
          <input
            type="range"
            min={20}
            max={400}
            step={5}
            value={wpm}
            onChange={(e) => setWpm(Number(e.target.value))}
            className="w-full accent-[#7c5cff]"
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => {
            const active = Math.abs(wpm - preset.wpm) < 12;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setWpm(preset.wpm)}
                className={`rounded-lg border px-2.5 py-2 text-left transition-colors ${
                  active ? 'border-[#7c5cff] bg-[#7c5cff]/12' : 'border-white/10 bg-white/[.03] hover:bg-white/[.06]'
                }`}
              >
                <span className="block text-[.78rem] font-semibold text-white/85">{preset.label}</span>
                <span className="block text-[.65rem] leading-snug text-white/35">{preset.note}</span>
              </button>
            );
          })}
        </div>

        <p className="text-[.7rem] leading-snug text-white/35">
          A message's wait scales with how long it is, so short replies land fast and long ones
          visibly take a while. A beat's own seconds act as a floor on top of that — never a
          replacement, so nothing flashes past.
        </p>
      </div>
    </Panel>
  );
}
