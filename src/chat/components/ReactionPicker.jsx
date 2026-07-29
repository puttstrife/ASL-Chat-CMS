import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Messenger-style reactions on Selene's messages: hover on a pointer device,
// long-press on touch, then tap one. Tapping the one already chosen removes
// it. Nothing persists — this is expression, not data.

// The four a chat app is expected to have, plus the ones Selene already uses
// when she reacts to the visitor — so the palette stays in the reading's
// register rather than importing a generic emoji set wholesale.
export const REACTIONS = ['❤️', '😮', '😢', '👍', '💜', '✨', '🌙'];

const LONG_PRESS_MS = 400;

export function Reactable({ reaction, onReact, className = 'max-w-[82%]', children }) {
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(0);
  const inner = useRef(null);
  const pickerRef = useRef(null);
  // The first message sits at the top of the scroll area, where a picker
  // above it would disappear behind the header — so it flips below.
  const [below, setBelow] = useState(false);
  const wrap = useRef(null);
  const timer = useRef(null);
  const longPressed = useRef(false);

  const show = () => {
    const row = wrap.current?.getBoundingClientRect();
    const scroller = wrap.current?.closest('.no-scrollbar')?.getBoundingClientRect();
    setBelow(Boolean(row && scroller && row.top - scroller.top < 52));
    setOpen(true);
  };

  // Sit just past the end of the bubble, so it reads as belonging to that
  // message — but never so far right that it runs off the card. Measured
  // after it renders, since its width depends on how many reactions there are.
  useLayoutEffect(() => {
    if (!open) return;
    const row = wrap.current?.getBoundingClientRect();
    const bubble = inner.current?.getBoundingClientRect();
    const picker = pickerRef.current?.getBoundingClientRect();
    if (!row || !bubble || !picker) return;
    setLeft(Math.min(bubble.width + 8, Math.max(0, row.width - picker.width)));
  }, [open]);

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
    timer.current = setTimeout(() => { longPressed.current = true; show(); }, LONG_PRESS_MS);
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
      onMouseEnter={(e) => { if (e.nativeEvent.sourceCapabilities?.firesTouchEvents !== true) show(); }}
      // A long-press on touch also raises the context menu; suppress it so the
      // picker is what appears.
      onContextMenu={(e) => { if (longPressed.current) e.preventDefault(); }}
    >
      {/* Hugs the bubble, so the badge and the picker anchor to the message
          rather than to the far edge of the card. */}
      <div ref={inner} className={`relative w-fit ${className}`}>
        {children}

        {reaction && (
          <button
            type="button"
            aria-label={`Your reaction: ${reaction}. Tap to remove.`}
            onClick={() => onReact(null)}
            // Mirrors the badge on the visitor's own bubbles, which hangs off
            // the corner nearest their side — so Selene's hangs off the left.
            className="absolute -bottom-2.5 left-2 z-20 grid size-6 place-items-center rounded-full border border-white/10 bg-[#161720] text-[.75rem] leading-none ring-2 ring-[#080910]"
            style={{ animation: 'bubbleIn .3s cubic-bezier(.2,.7,.3,1)' }}
          >
            {reaction}
          </button>
        )}
      </div>

      {open && (
        <div
          ref={pickerRef}
          role="group"
          aria-label="React to this message"
          // Above the bubble and pushed right, so it lands in the empty column
          // beside the messages rather than over the text of either one.
          style={{ left, animation: 'bubbleIn .16s cubic-bezier(.2,.7,.3,1)' }}
          className={`absolute z-30 flex items-center gap-0.5 rounded-full border border-white/10 bg-[#1c1d26] px-1.5 py-1 shadow-[0_8px_28px_rgba(0,0,0,0.55)] ${
            below ? 'top-full mt-1' : 'bottom-full mb-1'
          }`}
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
