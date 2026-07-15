import React from 'react';
import { cn } from '../lib/utils.js';

// The single button used everywhere (magicui v3 Rainbow Button, TS → JSX).
// Locked to a light fill + dark text so it never inverts with the OS theme
// (the previous dark: variant turned it white-on-white in dark mode).
// Size/shape tweaks come via className (tailwind-merge lets them win).
export const RainbowButton = React.forwardRef(({ children, className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        'group relative inline-flex h-12 animate-rainbow cursor-pointer items-center justify-center rounded-xl border-0 bg-[length:200%] px-8 py-2 text-[.85rem] font-bold text-[#0c0d14] transition-colors [background-clip:padding-box,border-box,border-box] [background-origin:border-box] [border:calc(0.08*1rem)_solid_transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c084fc] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0d14] disabled:pointer-events-none disabled:opacity-50',
        // rainbow glow beneath
        'before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,hsl(var(--color-1)),hsl(var(--color-5)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)))] before:[filter:blur(calc(0.8*1rem))]',
        // light fill (consistent, high-contrast dark text — WCAG AAA)
        'bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,hsl(var(--color-1)),hsl(var(--color-5)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)))]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
RainbowButton.displayName = 'RainbowButton';
