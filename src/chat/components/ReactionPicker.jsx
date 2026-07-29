import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Facebook-style reactions on Selene's messages.
//
// Pointer devices: hover the message, click one.
// Touch: long-press to open, then slide onto a reaction and lift to pick it —
// without a second tap. Whichever one you are over lifts.
//
// The names are for screen readers only; on screen the lift is enough, and a
// label floating over the message above was more noise than help.
//
// Tapping the reaction you already chose removes it. Nothing persists; this is
// expression, not data.

// The four a chat app is expected to have, plus the ones Selene already uses
// when she reacts to the visitor — so the palette stays in the reading's
// register rather than importing a generic emoji set wholesale.
export const REACTIONS = [
  { emoji: '❤️', name: 'Love' },
  { emoji: '😮', name: 'Wow' },
  { emoji: '😢', name: 'Sad' },
  { emoji: '👍', name: 'Like' },
  { emoji: '💜', name: 'Held' },
  { emoji: '✨', name: 'Yes' },
  { emoji: '🌙', name: 'Quiet' },
];

const LONG_PRESS_MS = 350;

// A short tick when the picker opens and when one is chosen. Ignored by
// browsers that don't support it, which is most desktops.
const buzz = (ms) => navigator.vibrate?.(ms);

export function Reactable({ reaction, onReact, className = 'max-w-[82%]', children }) {
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(0);
  const [active, setActive] = useState(-1); // which one the finger is over

  const wrap = useRef(null);
  const inner = useRef(null);
  const picker = useRef(null);
  const timer = useRef(null);
  const longPressed = useRef(false);

  const close = () => { setOpen(false); setActive(-1); };

  // Sit just past the end of the bubble, so it reads as belonging to that
  // message — but never so far right that it runs off the card. Measured after
  // it renders, since its width depends on how many reactions there are.
  useLayoutEffect(() => {
    if (!open) return;
    const row = wrap.current?.getBoundingClientRect();
    const bubble = inner.current?.getBoundingClientRect();
    const box = picker.current?.getBoundingClientRect();
    if (!row || !bubble || !box) return;
    setLeft(Math.min(bubble.width + 8, Math.max(0, row.width - box.width)));
  }, [open]);

  // Any touch outside closes it, the way a popover should.
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
    if (e.pointerType === 'mouse') return; // pointer devices get hover
    longPressed.current = false;
    timer.current = setTimeout(() => {
      longPressed.current = true;
      buzz(8);
      setOpen(true);
    }, LONG_PRESS_MS);
  };

  // While the finger is still down, whichever reaction it is over becomes
  // active — so lifting picks it, no second tap.
  const trackFinger = (e) => {
    if (!open || !longPressed.current || !picker.current) return;
    const items = [...picker.current.children];
    const i = items.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right;
    });
    if (i !== active) { setActive(i); if (i >= 0) buzz(5); }
  };

  const endPress = () => {
    clearTimeout(timer.current);
    if (open && longPressed.current && active >= 0) choose(REACTIONS[active].emoji);
  };

  return (
    <div
      ref={wrap}
      className="relative flex w-full items-center"
      onPointerDown={startPress}
      onPointerMove={trackFinger}
      onPointerUp={endPress}
      onPointerCancel={() => { clearTimeout(timer.current); close(); }}
      onPointerLeave={() => { clearTimeout(timer.current); close(); }}
      onMouseEnter={(e) => { if (e.nativeEvent.sourceCapabilities?.firesTouchEvents !== true) setOpen(true); }}
      // A long-press on touch also raises the context menu; suppress it so the
      // picker is what appears.
      onContextMenu={(e) => { if (longPressed.current) e.preventDefault(); }}
      style={{ touchAction: open ? 'none' : undefined }}
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
            style={{ animation: 'reactionLand .34s cubic-bezier(.2,1.5,.4,1)' }}
          >
            {reaction}
          </button>
        )}
      </div>

      {open && (
        <div
          ref={picker}
          role="group"
          aria-label="React to this message"
          // Centred on the bubble it belongs to, sitting in the empty column
          // beside it rather than above the message before it.
          style={{ left, animation: 'bubbleIn .16s cubic-bezier(.2,.7,.3,1)' }}
          className="absolute top-1/2 z-30 flex -translate-y-1/2 items-center gap-0.5 rounded-full border border-white/10 bg-[#1c1d26] px-1.5 py-1 shadow-[0_8px_28px_rgba(0,0,0,0.55)]"
        >
          {REACTIONS.map(({ emoji, name }, i) => (
            <button
              key={emoji}
              type="button"
              aria-label={`React ${name}`}
              aria-pressed={reaction === emoji}
              onClick={() => choose(emoji)}
              onMouseEnter={() => setActive(i)}
              className={`relative grid size-8 shrink-0 place-items-center rounded-full text-[1.05rem] leading-none transition-transform duration-150 ${
                active === i ? 'scale-[1.45] -translate-y-1.5' : ''
              } ${reaction === emoji ? 'bg-white/15' : ''}`}
              // Each pops in just after the one before it.
              style={{ animation: `reactionPop .26s ${i * 28}ms backwards cubic-bezier(.2,1.4,.4,1)` }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
