import { animate, motion, useMotionTemplate, useMotionValue } from 'motion/react';
import { useEffect } from 'react';

export function GradientFrame({ children }) {
  const turn = useMotionValue(0);
  useEffect(() => {
    const controls = animate(turn, 1, { ease: 'linear', duration: 14, repeat: Infinity });
    return () => controls.stop();
  }, [turn]);
  const gradient = useMotionTemplate`conic-gradient(from ${turn}turn, transparent 0%, #f472b600 5%, #f472b6 10%, #c084fc 18%, #818cf8 26%, #38bdf8 34%, #2dd4bf 42%, #fbbf24 46%, #fbbf2400 52%, transparent 56%)`;

  return (
    <div className="call-frame">
      <motion.div style={{ backgroundImage: gradient }} className="call-frame-border" />
      <div className="call-frame-clip">
        <div className="call-frame-content">{children}</div>
        <motion.div style={{ backgroundImage: gradient }} className="call-frame-glow" />
      </div>
    </div>
  );
}

export function MarisolAvatar({ size = 'large', active = false, ping = false }) {
  return (
    <div className={`call-avatar-wrap call-avatar-${size}`}>
      {ping && <span className="call-avatar-ping" />}
      <img
        src="/images/chat/marisol-avatar.png"
        alt="Marisol"
        className={active ? 'is-active' : ''}
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = '/images/chat/sabrina-avatar.png';
        }}
      />
    </div>
  );
}

export function AudioBars({ active = false }) {
  return (
    <div className={`call-audio-bars ${active ? 'is-active' : ''}`} aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => <span key={index} style={{ animationDelay: `${index * 0.08}s` }} />)}
    </div>
  );
}

export function PrimaryButton({ className = '', children, ...props }) {
  return <button className={`call-primary-button ${className}`} {...props}>{children}</button>;
}
