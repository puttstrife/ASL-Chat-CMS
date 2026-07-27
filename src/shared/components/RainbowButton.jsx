import React from 'react';
import { cn } from '../lib/utils.js';

// The single button used everywhere. Light fill + dark text so it never
// inverts with the OS theme, ringed with a simple dark-purple stroke
// (previously an animated rainbow gradient).
// Size/shape tweaks come via className (tailwind-merge lets them win).
export const RainbowButton = React.forwardRef(({ children, className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        'group relative inline-flex h-12 cursor-pointer items-center justify-center rounded-xl border-2 border-[#4c1d95] bg-white px-8 py-2 text-[16px] font-bold text-[#0c0d14] transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c1d95] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0d14] disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
RainbowButton.displayName = 'RainbowButton';
