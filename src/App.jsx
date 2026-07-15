import { useMemo } from 'react';
import { AIGradientBorder } from './components/AIGradientBorder.jsx';
import { ChatCard } from './components/ChatCard.jsx';
import { CallScreen } from './components/CallScreen.jsx';
import { useFunnel } from './hooks/useFunnel.js';

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
  const funnel = useFunnel();
  // Demo toggle: ?screen=call shows the Stage 0 call opener standalone.
  const isCall = new URLSearchParams(location.search).get('screen') === 'call';
  const goToChat = () => {
    const p = new URLSearchParams(location.search);
    p.delete('screen');
    location.search = p.toString();
  };
  return (
    <>
      {/* ambient */}
      <div className="pointer-events-none fixed z-0 rounded-full blur-[90px]" style={{ width: 700, height: 700, top: '55vh', right: -150, background: 'radial-gradient(circle, rgba(72,38,160,0.28) 0%, transparent 70%)' }} />
      <div className="pointer-events-none fixed z-0 rounded-full blur-[90px]" style={{ width: 560, height: 560, top: '40vh', left: -120, background: 'radial-gradient(circle, rgba(14,110,130,0.24) 0%, transparent 70%)' }} />
      <Starfield />

      <main className="fixed inset-0 z-10 grid place-items-center sm:p-4">
        <AIGradientBorder
          duration={14}
          className="h-dvh w-full max-w-[600px] rounded-none border border-neutral-700/40 sm:h-[min(800px,100dvh-2rem)] sm:rounded-[22px]"
        >
          {isCall ? <CallScreen onConnect={goToChat} /> : <ChatCard funnel={funnel} />}
        </AIGradientBorder>
      </main>
    </>
  );
}
