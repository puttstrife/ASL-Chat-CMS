import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Facebook-style reactions on Selene's messages, with the two interaction
// models Messenger itself uses:
//
//   Pointer devices — hovering a message reveals a small smiley beside it;
//   clicking that opens the picker. Nothing appears until you go looking.
//
//   Touch — no affordance to tap. Long-press the message: the rest of the
//   conversation dims, the message lifts, and the picker opens above it.
//   Slide onto a reaction and lift to pick, with no second tap.
//
// Tapping the reaction you already chose removes it. Nothing persists; this is
// expression, not data.

// The four a chat app is expected to have, plus the ones Selene already uses
// when she reacts to the visitor — so the palette stays in the reading's
// register rather than importing a generic emoji set wholesale. Names are for
// screen readers; on screen the lift says which one you are on.
export const REACTIONS = [
  { emoji: '❤️', name: 'Love' },
  { emoji: '😮', name: 'Wow' },
  { emoji: '😢', name: 'Sad' },
  { emoji: '👍', name: 'Like' },
  { emoji: '✨', name: 'Yes' },
  { emoji: '🌙', name: 'Quiet' },
];

const LONG_PRESS_MS = 350;

// Whether this device actually has a hovering cursor. iOS leaves
// `sourceCapabilities` undefined on its synthetic mouse events, so testing
// that showed the desktop smiley on phones; the media query does not lie.
const CAN_HOVER =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

// A short tick when the picker opens and when one is chosen. Ignored by
// browsers that don't support it, which is most desktops.
const buzz = (ms) => navigator.vibrate?.(ms);

export function Reactable({ reaction, onReact, className = 'max-w-[82%]', children }) {
  const [open, setOpen] = useState(false);
  const [touchMode, setTouchMode] = useState(false); // long-pressed, not clicked
  const [hovered, setHovered] = useState(false);
  const [left, setLeft] = useState(0);
  const [active, setActive] = useState(-1); // which one the finger is over

  const wrap = useRef(null);
  const inner = useRef(null);
  const picker = useRef(null);
  const timer = useRef(null);
  const longPressed = useRef(false);

  const close = () => { setOpen(false); setTouchMode(false); setActive(-1); };

  // On a pointer device the picker sits beside the bubble, just past its end,
  // but never so far right that it runs off the card. Measured after it
  // renders, since its width depends on how many reactions there are.
  useLayoutEffect(() => {
    if (!open || touchMode) return;
    const row = wrap.current?.getBoundingClientRect();
    const bubble = inner.current?.getBoundingClientRect();
    const box = picker.current?.getBoundingClientRect();
    if (!row || !bubble || !box) return;
    setLeft(Math.min(bubble.width + 8, Math.max(0, row.width - box.width)));
  }, [open, touchMode]);

  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (!wrap.current?.contains(e.target)) close(); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const choose = (emoji) => {
    buzz(12);
    onReact(emoji === reaction ? null : emoji);
    close();
  };

  // ── Touch: long-press, slide, lift ──
  const startPress = (e) => {
    if (e.pointerType === 'mouse') return; // pointer devices use the smiley
    longPressed.current = false;
    timer.current = setTimeout(() => {
      longPressed.current = true;
      buzz(8);
      setTouchMode(true);
      setOpen(true);
    }, LONG_PRESS_MS);
  };

  // While the finger is still down, whichever reaction it is over becomes
  // active — so lifting picks it, no second tap.
  const trackFinger = (e) => {
    if (!open || !longPressed.current || !picker.current) return;
    const i = [...picker.current.children].findIndex((el) => {
      const r = el.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right;
    });
    if (i !== active) { setActive(i); if (i >= 0) buzz(5); }
  };

  const endPress = () => {
    clearTimeout(timer.current);
    if (open && longPressed.current && active >= 0) choose(REACTIONS[active].emoji);
  };

  const items = (
    <div
      ref={picker}
      role="group"
      aria-label="React to this message"
      style={{
        left: touchMode ? undefined : left,
        animation: 'bubbleIn .16s cubic-bezier(.2,.7,.3,1)',
      }}
      className={`absolute z-50 flex items-center gap-0 rounded-full border border-white/10 bg-[#1c1d26] px-1 py-1 shadow-[0_8px_28px_rgba(0,0,0,0.55)] ${
        touchMode ? 'bottom-full left-0 mb-3' : 'top-1/2 -translate-y-1/2'
      }`}
    >
      {REACTIONS.map(({ emoji, name }, i) => (
        <button
          key={emoji}
          type="button"
          aria-label={`React ${name}`}
          aria-pressed={reaction === emoji}
          onClick={() => choose(emoji)}
          onMouseEnter={() => setActive(i)}
          className={`grid size-8 shrink-0 place-items-center rounded-full text-[1.35rem] leading-none transition-transform duration-150 ${
            active === i ? 'scale-[1.45] -translate-y-1.5' : ''
          } ${reaction === emoji ? 'bg-white/15' : ''}`}
          // Each pops in just after the one before it.
          style={{ animation: `reactionPop .26s ${i * 28}ms backwards cubic-bezier(.2,1.4,.4,1)` }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* Long-pressing dims the rest of the conversation so the message being
          reacted to is the only thing lit. */}
      {open && touchMode && (
        <div className="fixed inset-0 z-40 bg-black/55" style={{ animation: 'fadeIn .18s ease-out' }} />
      )}

      <div
        ref={wrap}
        className="relative flex w-full items-center"
        onPointerDown={startPress}
        onPointerMove={trackFinger}
        onPointerUp={endPress}
        onPointerCancel={() => { clearTimeout(timer.current); close(); }}
        onMouseEnter={() => { if (CAN_HOVER) setHovered(true); }}
        onMouseLeave={() => { setHovered(false); if (!touchMode) close(); }}
        // A long-press on touch also raises the context menu; suppress it so
        // the picker is what appears.
        onContextMenu={(e) => { if (longPressed.current) e.preventDefault(); }}
        style={{ touchAction: open ? 'none' : undefined }}
      >
        {/* Hugs the bubble, so the badge and the picker anchor to the message
            rather than to the far edge of the card. */}
        {/* No `w-fit`: as a flex item this already hugs its content, and
            asking for fit-content here while the bubble inside asks for a
            percentage of it makes the two depend on each other. */}
        <div
          ref={inner}
          className={`relative min-w-0 transition-transform duration-200 ${className} ${
            open && touchMode ? 'z-50 scale-[1.04]' : ''
          }`}
        >
          {children}

          {reaction && (
            <button
              type="button"
              aria-label={`Your reaction: ${reaction}. Tap to remove.`}
              onClick={() => onReact(null)}
              // Mirrors the badge on the visitor's own bubbles, which hangs off
              // the corner nearest their side — so Selene's hangs off the left.
              className="absolute -bottom-2.5 left-2 z-20 grid size-6 place-items-center rounded-full border border-white/10 bg-[#161720] text-[.75rem] leading-none ring-2 ring-[#080910]"
              style={{ animation: 'reactionLand .34s cubic-bezier(.2,1.5,.4,1)' }}
            >
              {reaction}
            </button>
          )}

          {/* Pointer devices only: the thing you click to open the picker.
              Anchored to the bubble, not the row, or it lands off the card. */}
          {CAN_HOVER && hovered && !open && (
            <button
              type="button"
              aria-label="React to this message"
              onClick={() => setOpen(true)}
              style={{ animation: 'bubbleIn .14s ease-out' }}
              className="absolute left-full top-1/2 ml-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-white/35 transition-colors hover:bg-white/10 hover:text-white/70"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" strokeLinecap="round" />
                <path d="M9 9.5h.01M15 9.5h.01" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {open && items}
      </div>
    </>
  );
}
