import { twMerge } from 'tailwind-merge';

// Static dark-purple stroke + soft inner glow spill (previously an animated rainbow border).
export const AIGradientBorder = ({ children, className }) => {
  return (
    <div className={twMerge('relative p-px', className)}>
      <div className="absolute inset-0 rounded-[inherit] bg-[#4c1d95]" />
      <div className="relative h-full rounded-[inherit] overflow-clip">
        <div className="relative h-full">{children}</div>
        <div className="ai-glow-spill-mask opacity-40 blur-2xl pointer-events-none absolute inset-[-40%] z-10 overflow-hidden bg-[#4c1d95]" />
      </div>
    </div>
  );
};
