import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { FiSend } from 'react-icons/fi';
import VoicemailPlayer from 'react-voicemail-player';
import 'react-voicemail-player/dist/react-voicemail-player.css';
import { fetchTTS } from '../lib/api.js';
import { RainbowButton } from './RainbowButton.jsx';
import { AudioActivity, MarisolAvatar, MarisolIdentity } from './VoiceCallComponents.jsx';

// Stage 3: the chat collapses into this full voice-memo view — Marisol's
// avatar + autoplaying voicemail player, with the burden input at the bottom.
// Submitting returns to chat mode (Stage 4).
export function VoiceScreen({ text, enabled = true, placeholder, onSubmit }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  const [ended, setEnded] = useState(false); // input appears only after the memo finishes
  const [value, setValue] = useState('');
  const urlRef = useRef(null);
  const audioElRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!text || !enabled) { setFailed(true); return; }
      const blob = await fetchTTS(text);
      if (!active) return;
      if (!blob) { setFailed(true); return; }
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setSrc(url);
    })();
    return () => { active = false; if (urlRef.current) URL.revokeObjectURL(urlRef.current); };
  }, [text, enabled]);

  // Autoplay once loaded; reveal the input only when the memo finishes playing.
  useEffect(() => {
    const a = audioElRef.current;
    if (!src || !a) return;
    a.play().catch(() => {});
    const onEnd = () => setEnded(true);
    a.addEventListener('ended', onEnd);
    return () => a.removeEventListener('ended', onEnd);
  }, [src]);

  // If there's no audio to play, don't trap the user — allow the input.
  useEffect(() => { if (failed) setEnded(true); }, [failed]);

  const showInput = ended;
  useEffect(() => { if (showInput) taRef.current?.focus(); }, [showInput]);

  const send = () => { const v = value.trim(); if (!v) return; setValue(''); onSubmit(v); };

  return (
    <section className="grid h-full grid-rows-[minmax(0,1fr)_auto] bg-[#080910]">
      <div className="flex flex-col items-center justify-center gap-5 px-6 py-6 text-center">
        <MarisolAvatar sizeClass="size-32" active={!ended && Boolean(src)} ping />

        <MarisolIdentity
          status={(
            <span className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.24em] text-[#d8b4fe]/90">
            <span className="size-2 rounded-full bg-[#c084fc] shadow-[0_0_10px_#c084fc]" style={{ animation: 'dotPulse 1.2s ease-in-out infinite' }} />
            Marisol speaking
            </span>
          )}
        />

        <AudioActivity active={!ended && Boolean(src)} className="-my-1" />

        <div className="marisol-voicemail w-full max-w-[360px]">
          {src ? (
            <VoicemailPlayer>
              {(ref) => (
                <audio ref={(el) => { ref(el); audioElRef.current = el; }} src={src} preload="auto" />
              )}
            </VoicemailPlayer>
          ) : (
            <div className="font-sans flex items-center justify-center gap-2 py-4 text-[15px] text-white/60">
              {failed ? 'Voice memo unavailable.' : (<><Loader2 className="size-5 animate-spin" /> Preparing voice memo…</>)}
            </div>
          )}
        </div>
      </div>

      {/* Burden input — appears only once the memo finishes playing */}
      <div className="border-t border-white/8 bg-[#0c0d14]/96 px-3.5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {showInput ? (
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2.5">
            <textarea
              ref={taRef}
              rows={1}
              value={value}
              placeholder={placeholder || 'Type it here, in your own words...'}
              onChange={(e) => { setValue(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              className="no-scrollbar font-sans max-h-[120px] min-h-[48px] w-full flex-1 resize-none rounded-[999px] border border-[var(--gold)]/20 bg-white/5 px-4.5 py-3 text-[18px] leading-tight text-white/90 outline-none placeholder:font-semibold placeholder:text-white/60"
            />
            <RainbowButton type="submit" aria-label="Send" className="size-12 shrink-0 rounded-full px-0">
              <FiSend className="size-5" />
            </RainbowButton>
          </form>
        ) : (
          <p className="font-sans py-2 text-center text-[15px] italic text-white/45">Listening to Marisol…</p>
        )}
      </div>
    </section>
  );
}
