import { useMemo } from 'react';
import { AIGradientBorder } from './components/AIGradientBorder.jsx';
import { ChatCard } from './components/ChatCard.jsx';
import { useFunnel } from './hooks/useFunnel.js';
import { useTabBadge } from './hooks/useTabBadge.js';
import { resolveScriptKey } from './scripts/index.js';

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

export default function App() {
  const scriptKey = useMemo(resolveScriptKey, []);
  const funnel = useFunnel(scriptKey);
  useTabBadge(funnel.messages);
  return (
    <>
      {/* ambient */}
      <div className="pointer-events-none fixed z-0 rounded-full blur-[90px]" style={{ width: 700, height: 700, top: '55vh', right: -150, background: 'radial-gradient(circle, rgba(72,38,160,0.28) 0%, transparent 70%)' }} />
      <div className="pointer-events-none fixed z-0 rounded-full blur-[90px]" style={{ width: 560, height: 560, top: '40vh', left: -120, background: 'radial-gradient(circle, rgba(14,110,130,0.24) 0%, transparent 70%)' }} />
      <Starfield />

      <main className="fixed inset-0 z-10 grid place-items-center sm:p-4">
        <AIGradientBorder
          // No stroke on a phone: the card is full-bleed there, so the frame
          // has no card to outline, and a 1px edge at viewport width lands on
          // a device pixel on one side and between two on the other — which
          // reads as a heavier left edge.
          className="h-dvh w-full max-w-[600px] rounded-none p-0 sm:h-[min(800px,100dvh-2rem)] sm:rounded-[22px] sm:p-px"
        >
          <ChatCard funnel={funnel} />
        </AIGradientBorder>
      </main>
    </>
  );
}
