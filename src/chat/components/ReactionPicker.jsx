import { useEffect, useRef, useState } from 'react';

// Messenger-style reactions on Selene's messages: hover on a pointer device,
// long-press on touch, then tap one. Tapping the one already chosen removes
// it. Nothing persists — this is expression, not data.

// The four a chat app is expected to have, plus the ones Selene already uses
// when she reacts to the visitor — so the palette stays in the reading's
// register rather than importing a generic emoji set wholesale.
export const REACTIONS = ['❤️', '😮', '😢', '👍', '💜', '✨', '🌙'];

const LONG_PRESS_MS = 400;

export function Reactable({ reaction, onReact, className = '', children }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const timer = useRef(null);
  const longPressed = useRef(false);

  // Any touch outside closes it, the way a popover should.
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const startPress = (e) => {
    if (e.pointerType === 'mouse') return; // mouse gets hover instead
    longPressed.current = false;
    timer.current = setTimeout(() => { longPressed.current = true; setOpen(true); }, LONG_PRESS_MS);
  };
  const endPress = () => clearTimeout(timer.current);

  const choose = (emoji) => {
    onReact(emoji === reaction ? null : emoji);
    setOpen(false);
  };

  // The row spans the full width so the picker can sit in the empty space
  // beside the bubble rather than on top of the message above it.
  return (
    <div
      ref={wrap}
      className="relative flex w-full items-center"
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={() => { endPress(); setOpen(false); }}
      onPointerCancel={endPress}
      onMouseEnter={(e) => { if (e.nativeEvent.sourceCapabilities?.firesTouchEvents !== true) setOpen(true); }}
      // A long-press on touch also raises the context menu; suppress it so the
      // picker is what appears.
      onContextMenu={(e) => { if (longPressed.current) e.preventDefault(); }}
    >
      <div className={`relative w-fit max-w-full ${className}`}>
        {children}

        {reaction && (
          <button
            type="button"
            aria-label={`Your reaction: ${reaction}. Tap to remove.`}
            onClick={() => onReact(null)}
            className="absolute -bottom-2.5 right-2 z-20 grid size-6 place-items-center rounded-full border border-white/10 bg-[#161720] text-[.75rem] leading-none ring-2 ring-[#080910]"
            style={{ animation: 'bubbleIn .3s cubic-bezier(.2,.7,.3,1)' }}
          >
            {reaction}
          </button>
        )}
      </div>

      {open && (
        <div
          role="group"
          aria-label="React to this message"
          // Above the bubble and pushed right, so it lands in the empty column
          // beside the messages rather than over the text of either one.
          className="absolute bottom-full right-0 z-30 mb-1 flex items-center gap-0.5 rounded-full border border-white/10 bg-[#1c1d26] px-1.5 py-1 shadow-[0_8px_28px_rgba(0,0,0,0.55)]"
          style={{ animation: 'bubbleIn .16s cubic-bezier(.2,.7,.3,1)' }}
        >
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`React ${emoji}`}
              aria-pressed={reaction === emoji}
              onClick={() => choose(emoji)}
              className={`grid size-8 place-items-center rounded-full text-[1.05rem] leading-none transition-transform hover:scale-125 ${
                reaction === emoji ? 'bg-white/15' : ''
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

    </div>
  );
}
