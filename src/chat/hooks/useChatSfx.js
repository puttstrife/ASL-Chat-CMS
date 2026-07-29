import { useEffect, useRef } from 'react';
import { BUTTON_CLICK_SOUND, CHAT_ACTION_REVEAL_SOUND } from '../lib/sfx.js';

// Two sounds, following the pattern the Marisol build used: an Audio object
// held in a ref rather than constructed per play, and `currentTime` reset
// before each one so rapid repeats retrigger instead of being ignored.
//
//   send   — the visitor acts: a name, a date, a tapped answer
//   reply  — a message from Selene lands
//
// Both follow the header's mute toggle, which until now only governed the
// ambient bed.

export function useChatSfx(messages, muted) {
  const send = useRef(null);
  const reply = useRef(null);
  const seen = useRef(0);

  useEffect(() => {
    const make = (src, volume) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = volume;
      audio.load();
      return audio;
    };
    send.current = make(BUTTON_CLICK_SOUND, 0.5);
    reply.current = make(CHAT_ACTION_REVEAL_SOUND, 0.32);

    return () => {
      send.current?.pause();
      reply.current?.pause();
      send.current = null;
      reply.current = null;
    };
  }, []);

  useEffect(() => {
    [send.current, reply.current].forEach((a) => { if (a) a.muted = muted; });
  }, [muted]);

  useEffect(() => {
    // The typing indicator is a message in the list but not an event worth
    // hearing, so it is skipped — otherwise every line would sound twice.
    const real = messages.filter((m) => m.who !== 'typing');
    const added = real.length - seen.current;
    seen.current = real.length;
    if (added <= 0) return;

    const last = real[real.length - 1];
    const audio = last.who === 'user' ? send.current : reply.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, [messages]);
}
