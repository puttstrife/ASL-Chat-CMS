import { useEffect, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { fetchTTS } from '../lib/api.js';
import { RainbowButton } from '../../shared/components/RainbowButton.jsx';
import { AudioActivity, MarisolAvatar, MarisolIdentity } from './VoiceCallComponents.jsx';

// Stage 0 — VSL phone-call opener (demo artifact).
// Flow: loading/connecting sequence → call auto-starts (scripted voice) → hand off to chat.
const LINES = [
  "Hi Elena... it's Marisol.",
  "I wasn't sure the connection would hold, so I'm glad I reached you.",
  'I had to call you. Something told me not to wait.',
  'What I’m about to tell you is confidential... and I don’t want to leave it half-spoken.',
  'The connection doesn’t feel completely stable, so I don’t think we have much time.',
  'Something came through when I sat with your reading.',
  "I don't usually call people this directly. But with you... I couldn't ignore it.",
  "There's something important here, Elena. And I'd like to show you what I'm sensing.",
  'Would it be okay if we moved to a private chat room?',
  'That way I can continue with you properly... and tell you everything without interruption.',
];

const CONNECT_STEPS = ['Connecting to Marisol…', 'Initializing your reading…', 'Securing a private line…', 'Connected.'];

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function CallScreen({ onConnect }) {
  const [phase, setPhase] = useState('loading'); // loading | active | ended
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);
  const [muted, setMuted] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const audioRef = useRef(null);
  const urlRef = useRef(null);

  const speaking = phase === 'active' && !muted && !needsTap;
  const finished = lineIdx >= LINES.length - 1;

  // ── Loading sequence → auto-start call ──
  useEffect(() => {
    if (phase !== 'loading') return;
    if (step < CONNECT_STEPS.length - 1) {
      const t = setTimeout(() => setStep((s) => s + 1), 850);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => startCall(), 650);
    return () => clearTimeout(t);
  }, [phase, step]);

  async function startCall() {
    setPhase('active');
    const blob = await fetchTTS(LINES.join('  '));
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    urlRef.current = url;
    const a = new Audio(url);
    audioRef.current = a;
    a.play().catch(() => setNeedsTap(true)); // redirect → autoplay may be blocked
  }

  // Call timer
  useEffect(() => {
    if (phase !== 'active') return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Caption pacing (demo: time-based)
  useEffect(() => {
    if (phase !== 'active' || finished || needsTap) return;
    const dur = Math.max(2400, 1000 + LINES[lineIdx].length * 45);
    const t = setTimeout(() => setLineIdx((i) => Math.min(i + 1, LINES.length - 1)), dur);
    return () => clearTimeout(t);
  }, [phase, lineIdx, finished, needsTap]);

  const connectAudio = () => { setNeedsTap(false); audioRef.current?.play().catch(() => {}); };
  const endCall = () => { audioRef.current?.pause(); setPhase('ended'); };
  const toggleMute = () => setMuted((m) => { if (audioRef.current) audioRef.current.muted = !m; return !m; });

  useEffect(() => () => { audioRef.current?.pause(); if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  // ── Loading / connecting ──
  if (phase === 'loading') {
    return (
      <section className="grid h-full place-items-center bg-[#080910] px-6 text-center">
        <div className="flex flex-col items-center gap-7">
          <MarisolAvatar sizeClass="size-32" ping dim />
          <MarisolIdentity />
          <div className="flex w-[240px] flex-col items-center gap-3">
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#b676ff] transition-all duration-700 ease-out" style={{ width: `${((step + 1) / CONNECT_STEPS.length) * 100}%` }} />
            </div>
            <p className="font-sans inline-flex items-center gap-2 text-[.7rem] text-white/60" key={step} style={{ animation: 'bubbleIn .35s ease' }}>
              <Loader2 className="size-4 animate-spin" /> {CONNECT_STEPS[step]}
            </p>
          </div>
        </div>
      </section>
    );
  }

  // ── Ended ──
  if (phase === 'ended') {
    return (
      <section className="grid h-full place-items-center bg-[#080910] px-6 text-center">
        <div className="flex flex-col items-center gap-5">
          <MarisolAvatar sizeClass="size-28" />
          <MarisolIdentity status={`Call ended · ${fmt(seconds)}`} statusClassName="text-white/45" />
          <RainbowButton onClick={() => onConnect?.()} className="font-sans px-6">Continue to private chat</RainbowButton>
        </div>
      </section>
    );
  }

  // ── Active call ──
  return (
    <section className="relative grid h-full grid-rows-[auto_1fr_auto] bg-[#080910]">
      <div className="pt-8">
        <MarisolIdentity status={`${fmt(seconds)} · connected`} nameClassName="text-4xl" statusClassName="mt-1 tabular-nums text-white/45" />
      </div>

      <div className="flex flex-col items-center justify-center gap-6 px-8 text-center">
        <MarisolAvatar sizeClass="size-36" active={speaking} />
        <AudioActivity active={speaking} />
        <p className="font-sans min-h-[3.6em] max-w-[300px] text-[.85rem] leading-relaxed text-white/85" key={lineIdx} style={{ animation: 'bubbleIn .4s ease' }}>
          {LINES[lineIdx]}
        </p>
      </div>

      <div className="flex flex-col items-center gap-5 px-6 pb-8">
        {finished && (
          <RainbowButton onClick={() => { audioRef.current?.pause(); onConnect?.(); }} className="font-sans w-full max-w-[320px]">
            Move to private chat
          </RainbowButton>
        )}
        <div className="flex items-center justify-center gap-6">
          <button onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className="grid size-[52px] place-items-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10">
            {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>
          <button onClick={endCall} aria-label="End call" className="grid size-16 place-items-center rounded-full bg-[#e5484d] text-white shadow-[0_10px_30px_rgba(229,72,77,0.4)] transition hover:scale-105 active:scale-95">
            <PhoneOff className="size-7" />
          </button>
          <button aria-label="Speaker" className="grid size-[52px] place-items-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10">
            <Volume2 className="size-5" />
          </button>
        </div>
      </div>

      {/* Redirect can't autoplay sound → one-tap to connect audio */}
      {needsTap && (
        <button onClick={connectAudio} className="absolute inset-0 z-30 grid place-items-center bg-[#050208]/80 backdrop-blur-sm">
          <span className="font-sans flex items-center gap-2 rounded-full border border-[var(--gold)]/40 bg-white/5 px-5 py-3 text-[.75rem] font-semibold text-white/85">
            <Volume2 className="size-5 text-[var(--gold)]" /> Tap to connect audio
          </span>
        </button>
      )}
    </section>
  );
}
