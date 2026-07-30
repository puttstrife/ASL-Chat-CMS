import { useCallback, useEffect, useRef } from 'react';
import { BUTTON_CLICK_SOUND, CHAT_ACTION_REVEAL_SOUND } from '../lib/sfx.js';

// Two sounds, following the pattern the Marisol build used: an Audio object
// held in a ref rather than constructed per play, and `currentTime` reset
// before each one so rapid repeats retrigger instead of being ignored.
//
//   send   — the visitor acts
//   reply  — a message from Selene lands
//
// `send` is driven by the action, not by a message appearing. Continue is a
// real interaction that produces no message of its own, so keying off the
// transcript left the most-pressed control in the funnel silent.
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

  const ping = (ref) => {
    const audio = ref.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  const playSend = useCallback(() => ping(send), []);

  useEffect(() => {
    // Only Selene's messages ring. The typing indicator is in the list but is
    // not an event worth hearing, and the visitor's own lines already sounded
    // when they acted.
    const heard = messages.filter((m) => m.who !== 'typing' && m.who !== 'user');
    const added = heard.length - seen.current;
    seen.current = heard.length;
    if (added > 0) ping(reply);
  }, [messages]);

  return playSend;
}
