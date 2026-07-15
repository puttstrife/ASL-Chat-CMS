import { useMemo, useState } from 'react';
import { CallScreen } from './components/CallScreen.jsx';
import { PrivateChat } from './components/PrivateChat.jsx';
import { GradientFrame } from './components/UI.jsx';

function Starfield() {
  const stars = useMemo(
    () => Array.from({ length: 90 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1 + Math.random() * 2,
      duration: 2 + Math.random() * 4,
      delay: Math.random() * 5,
    })),
    []
  );

  return (
    <div className="call-stars" aria-hidden="true">
      {stars.map((star, index) => (
        <span
          key={index}
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            '--star-duration': `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export function CallVersionApp() {
  const params = useMemo(() => new URLSearchParams(location.search), []);
  const context = useMemo(() => ({
    name: (params.get('name') || 'Elena').trim().slice(0, 60),
    city: (params.get('city') || 'General Santos').trim().slice(0, 80),
  }), [params]);
  const [screen, setScreen] = useState('call');

  return (
    <>
      <div className="call-ambient call-ambient-right" aria-hidden="true" />
      <div className="call-ambient call-ambient-left" aria-hidden="true" />
      <Starfield />
      <main className="call-shell">
        <GradientFrame>
          {screen === 'call' ? (
            <CallScreen context={context} onPrivateChat={() => setScreen('chat')} />
          ) : (
            <PrivateChat context={context} />
          )}
        </GradientFrame>
      </main>
    </>
  );
}
