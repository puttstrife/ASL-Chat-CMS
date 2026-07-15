import { animate, motion, useMotionTemplate, useMotionValue } from 'motion/react';
import { useEffect } from 'react';
import { twMerge } from 'tailwind-merge';

// Animated conic-gradient border + inner glow spill.
// Adapted from hover.dev "AI Gradient Animation Card".
export const AIGradientBorder = ({ children, className, duration = 4 }) => {
  const turn = useMotionValue(0);

  useEffect(() => {
    const controls = animate(turn, 1, { ease: 'linear', duration, repeat: Infinity });
    return () => controls.stop();
  }, [duration, turn]);

  const gradient = useMotionTemplate`conic-gradient(from ${turn}turn, transparent 0%, #f472b600 5%, #f472b6 10%, #c084fc 18%, #818cf8 26%, #38bdf8 34%, #2dd4bf 42%, #fbbf24 46%, #fbbf2400 52%, transparent 56%)`;

  return (
    <div className={twMerge('relative p-px', className)}>
      <motion.div
        style={{ backgroundImage: gradient }}
        className="absolute inset-0 rounded-[inherit]"
      />
      <div className="relative h-full rounded-[inherit] overflow-clip">
        <div className="relative h-full">{children}</div>
        <motion.div
          style={{ backgroundImage: gradient }}
          className="ai-glow-spill-mask opacity-70 blur-2xl pointer-events-none absolute inset-[-40%] z-10 overflow-hidden"
        />
      </div>
    </div>
  );
};
