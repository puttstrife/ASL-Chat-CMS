import { useMemo } from 'react';
import { AIGradientBorder } from './components/AIGradientBorder.jsx';
import { ChatCard } from './components/ChatCard.jsx';
import { useFunnel } from './hooks/useFunnel.js';
import { useTabBadge } from './hooks/useTabBadge.js';
import { listFunnels } from '../cms/store.js';

function Starfield() {
  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, () => {
        const isStatic = Math.random() < 0.3;
        const size = isStatic ? 1 + Math.random() * 0.5 : 1 + Math.random() * 2;
        return { left: Math.random() * 100, top: Math.random() * 100, size, d: 2 + Math.random() * 4, delay: Math.random() * 5 };
      }),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {stars.map((s, i) => (
        <span key={i} className="star" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, '--d': `${s.d}s`, animationDelay: `${s.delay}s` }} />
      ))}
    </div>
  );
}

// The player. `?f=<id>` picks which funnel to run; without one it plays the
// first that exists, so a bare URL still shows something.
export default function App() {
  const funnel = useMemo(() => {
    const all = listFunnels();
    const wanted = new URLSearchParams(window.location.search).get('f');
    return all.find((f) => f.id === wanted) || all[0] || null;
  }, []);

  const engine = useFunnel(funnel);
  const unread = useTabBadge(engine.messages, funnel?.persona);

  if (!funnel) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#08090e] p-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-lg font-semibold text-white/85">No funnel to play</h1>
          <p className="mt-2 text-[.85rem] leading-relaxed text-white/40">
            Nothing has been built in this browser yet. Open the editor at <code className="text-white/70">#/admin</code> to
            make one, or import a funnel file there.
          </p>
          <a href="#/admin" className="mt-4 inline-block rounded-lg bg-[#7c5cff] px-4 py-2 text-[.8rem] font-semibold text-white">
            Open the editor
          </a>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="pointer-events-none fixed z-0 rounded-full blur-[90px]" style={{ width: 700, height: 700, top: '55vh', right: -150, background: 'radial-gradient(circle, rgba(72,38,160,0.28) 0%, transparent 70%)' }} />
      <div className="pointer-events-none fixed z-0 rounded-full blur-[90px]" style={{ width: 560, height: 560, top: '40vh', left: -120, background: 'radial-gradient(circle, rgba(14,110,130,0.24) 0%, transparent 70%)' }} />
      <Starfield />

      <main className="fixed inset-0 z-10 grid place-items-center sm:p-4">
        <AIGradientBorder className="h-dvh w-full max-w-[600px] rounded-none p-0 sm:h-[min(800px,100dvh-2rem)] sm:rounded-[22px] sm:p-px">
          <ChatCard funnel={engine} persona={funnel.persona} audio={funnel.audio} unread={unread} />
        </AIGradientBorder>
      </main>
    </>
  );
}
