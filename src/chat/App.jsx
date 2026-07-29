import { useMemo } from 'react';
import { AIGradientBorder } from './components/AIGradientBorder.jsx';
import { ChatCard } from './components/ChatCard.jsx';
import { useFunnel } from './hooks/useFunnel.js';
import { SCRIPTS, resolveScriptKey } from './scripts/index.js';

function Starfield() {
  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, () => {
        const isStatic = Math.random() < 0.3;
        const size = isStatic ? 1 + Math.random() * 0.5 : 1 + Math.random() * 2;
        return {
          left: Math.random() * 100,
          top: Math.random() * 100,
          size,
          d: 2 + Math.random() * 4,
          delay: Math.random() * 5,
        };
      }),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {stars.map((s, i) => (
        <span
          key={i}
          className="star"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, '--d': `${s.d}s`, animationDelay: `${s.delay}s` }}
        />
      ))}
    </div>
  );
}

// Dev-only switch between the flows in scripts/. Production picks the version
// from `?v=` alone, so a link can be shared without exposing the control.
function VersionSwitch({ value }) {
  return (
    <label className="fixed top-2 left-2 z-50 flex items-center gap-1.5 rounded-lg bg-black/70 px-2 py-1 font-mono text-[.65rem] text-white/60 backdrop-blur">
      version
      <select
        value={value}
        onChange={(e) => {
          const params = new URLSearchParams(window.location.search);
          params.set('v', e.target.value);
          window.location.search = params.toString();
        }}
        className="rounded bg-transparent text-white/90 outline-none"
      >
        {Object.keys(SCRIPTS).map((k) => <option key={k} value={k}>{k}</option>)}
      </select>
    </label>
  );
}

export default function App() {
  const scriptKey = useMemo(resolveScriptKey, []);
  const funnel = useFunnel(scriptKey);
  return (
    <>
      {import.meta.env.DEV && <VersionSwitch value={scriptKey} />}
      {/* ambient */}
      <div className="pointer-events-none fixed z-0 rounded-full blur-[90px]" style={{ width: 700, height: 700, top: '55vh', right: -150, background: 'radial-gradient(circle, rgba(72,38,160,0.28) 0%, transparent 70%)' }} />
      <div className="pointer-events-none fixed z-0 rounded-full blur-[90px]" style={{ width: 560, height: 560, top: '40vh', left: -120, background: 'radial-gradient(circle, rgba(14,110,130,0.24) 0%, transparent 70%)' }} />
      <Starfield />

      <main className="fixed inset-0 z-10 grid place-items-center sm:p-4">
        <AIGradientBorder
          className="h-dvh w-full max-w-[600px] rounded-none sm:h-[min(800px,100dvh-2rem)] sm:rounded-[22px]"
        >
          <ChatCard funnel={funnel} />
        </AIGradientBorder>
      </main>
    </>
  );
}
