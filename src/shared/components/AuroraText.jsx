import React, { memo } from 'react';

// magicui AuroraText (TS → JSX). Default palette retinted to Selene's
// mystic gold→violet. Needs the `animate-aurora` utility (see index.css).
export const AuroraText = memo(
  ({ children, className = '', colors = ['#F2D58A', '#c084fc', '#8b7bff', '#f0abfc'], speed = 1 }) => {
    const gradientStyle = {
      backgroundImage: `linear-gradient(135deg, ${colors.join(', ')}, ${colors[0]})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      animationDuration: `${10 / speed}s`,
    };
    return (
      <span className={`relative inline-block ${className}`}>
        <span className="sr-only">{children}</span>
        <span
          className="relative animate-aurora bg-[length:200%_auto] bg-clip-text font-semibold text-transparent"
          style={gradientStyle}
          aria-hidden="true"
        >
          {children}
        </span>
      </span>
    );
  }
);
AuroraText.displayName = 'AuroraText';
