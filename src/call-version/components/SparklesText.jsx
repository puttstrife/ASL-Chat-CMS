import { memo } from 'react';

const SPARKLES = [
  { x: '4%', y: '5%', delay: '0s', scale: '.72' },
  { x: '23%', y: '82%', delay: '.7s', scale: '.55' },
  { x: '48%', y: '-8%', delay: '1.2s', scale: '.68' },
  { x: '72%', y: '84%', delay: '.35s', scale: '.5' },
  { x: '94%', y: '10%', delay: '1.55s', scale: '.7' },
];

// A deliberately restrained, inline version of Magic UI's Sparkles Text.
// It is used only for phrases explicitly selected in the private-chat script.
export const SparklesText = memo(({ children, className = '' }) => (
  <span className={`call-sparkles-text ${className}`}>
    <span className="sr-only">{children}</span>
    <span className="call-sparkles-visual" aria-hidden="true">
      {children}
      {SPARKLES.map((sparkle, index) => (
        <span
          key={index}
          className="call-sparkle"
          style={{
            '--sparkle-x': sparkle.x,
            '--sparkle-y': sparkle.y,
            '--sparkle-delay': sparkle.delay,
            '--sparkle-scale': sparkle.scale,
          }}
        >
          ✦
        </span>
      ))}
    </span>
  </span>
));

SparklesText.displayName = 'SparklesText';
