import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Mic, MicOff, Phone, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import { CALL_CHUNKS, interpolate } from '../stages.js';
import { fetchTTS } from '../lib/api.js';
import { AudioBars, MarisolAvatar, PrimaryButton } from './UI.jsx';

import { BUTTON_CLICK_SOUND } from '../lib/sfx.js';

const FIRST_TTS_DELAY_MS = 900;
const CONNECTION_STEPS = [
  'Initializing private call…',
  'Securing connection…',
  'Connecting to Marisol…',
];
const CONNECTION_STEP_MS = 1100;

const formatDuration = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export function CallScreen({ context, onPrivateChat }) {
  const [phase, setPhase] = useState('intro');
  const [connectionStep, setConnectionStep] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [audioFailed, setAudioFailed] = useState(false);
  const [micMuted, setMicMuted] = useState(true);
  const [outputMuted, setOutputMuted] = useState(false);
  const audioRef = useRef(null);
  const urlRef = useRef(null);
  const acceptedAtRef = useRef(0);

  const chunks = useMemo(() => CALL_CHUNKS.map((chunk) => interpolate(chunk, context)), [context]);
  const caption = chunks[lineIndex] || chunks[chunks.length - 1];
  const speaking = phase === 'active' && !audioFailed && !outputMuted;

  useEffect(() => {
    if (phase !== 'connecting') return undefined;
    setConnectionStep(0);
    const timers = CONNECTION_STEPS.map((_, index) => setTimeout(() => {
      if (index < CONNECTION_STEPS.length - 1) {
        setConnectionStep(index + 1);
        return;
      }
      acceptedAtRef.current = Date.now();
      setPhase('active');
    }, CONNECTION_STEP_MS * (index + 1)));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'active') return undefined;
    const interval = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'active' || audioFailed) return undefined;
    let cancelled = false;
    const controller = new AbortController();

    const loadAndPlay = async () => {
      const blob = await fetchTTS(chunks[lineIndex], controller.signal);
      if (cancelled) return;
      if (!blob) {
        setAudioFailed(true);
        return;
      }

      if (lineIndex === 0) {
        const remainingDelay = Math.max(0, FIRST_TTS_DELAY_MS - (Date.now() - acceptedAtRef.current));
        if (remainingDelay) await new Promise((resolve) => setTimeout(resolve, remainingDelay));
        if (cancelled) return;
      }

      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = audioRef.current || new Audio();
      audio.pause();
      audio.src = url;
      audio.volume = 1;
      audio.muted = outputMuted;
      audioRef.current = audio;
      audio.onended = () => {
        if (cancelled) return;
        if (lineIndex >= chunks.length - 1) {
          setPhase('ended');
        } else {
          setLineIndex((index) => index + 1);
        }
      };
      audio.onerror = () => {
        if (!cancelled) {
          setAudioFailed(true);
        }
      };
      audio.play().catch(() => setAudioFailed(true));
    };

    loadAndPlay();
    return () => {
      cancelled = true;
      controller.abort();
      if (audioRef.current) {
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.pause();
      }
    };
  // outputMuted is applied separately so toggling it never restarts a chunk.
  }, [audioFailed, chunks, lineIndex, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = outputMuted;
  }, [outputMuted]);

  // Keep audio failures per-line: a failed/slow chunk falls back to a timed
  // caption, then the next line retries TTS fresh — one hiccup never silences
  // the rest of the call.
  useEffect(() => { setAudioFailed(false); }, [lineIndex]);

  useEffect(() => {
    if (phase !== 'active' || !audioFailed) return undefined;
    const duration = Math.max(2600, 900 + caption.length * 42);
    const timeout = setTimeout(() => {
      if (lineIndex >= chunks.length - 1) {
        setPhase('ended');
      } else {
        setLineIndex((index) => index + 1);
      }
    }, duration);
    return () => clearTimeout(timeout);
  }, [audioFailed, caption.length, chunks.length, lineIndex, phase]);

  useEffect(() => () => {
    audioRef.current?.pause();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const beginConnection = () => {
    const clickAudio = new Audio(BUTTON_CLICK_SOUND);
    clickAudio.volume = 0.62;
    clickAudio.playsInline = true;
    clickAudio.play().catch(() => {});
    setConnectionStep(0);
    setPhase('connecting');
  };

  if (phase === 'intro') {
    return (
      <section className="call-screen call-entry" aria-label="Start a private call with Marisol">
        <div className="call-intro-overlay" role="dialog" aria-modal="true" aria-labelledby="call-intro-title">
          <div className="call-intro-glass">
            <h1 id="call-intro-title">Marisol has something personal to share.</h1>
            <PrimaryButton className="call-intro-button" onClick={beginConnection}>
              <Phone aria-hidden="true" />
              I’m ready for Marisol’s call
            </PrimaryButton>
          </div>
        </div>
      </section>
    );
  }

  if (phase === 'connecting') {
    return (
      <section className="call-screen call-entry call-connecting" aria-label="Connecting a private call with Marisol">
        <div className="call-connecting-card">
          <MarisolAvatar size="medium" ping />
          <ShieldCheck className="call-connecting-shield" aria-hidden="true" />
          <div aria-live="polite">
            <h1 className="call-name">Marisol</h1>
            <p className="call-connecting-status">{CONNECTION_STEPS[connectionStep]}</p>
          </div>
          <div className="call-connection-progress" aria-hidden="true">
            {CONNECTION_STEPS.map((step, index) => (
              <span key={step} className={index <= connectionStep ? 'is-complete' : ''} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (phase === 'ended') {
    return (
      <section className="call-screen call-ended" aria-label="Call ended">
        <div className="call-center-stack">
          <MarisolAvatar size="medium" />
          <div>
            <h1 className="call-name">Marisol</h1>
            <p className="call-status">Call complete · {formatDuration(seconds)}</p>
          </div>
          <PrimaryButton className="call-private-chat-button" onClick={onPrivateChat}>
            <MessageCircle aria-hidden="true" />
            Continue to private chat
          </PrimaryButton>
        </div>
      </section>
    );
  }

  return (
    <section className="call-screen call-active" aria-label="Private audio call with Marisol">
      <header className="call-active-header">
        <MarisolAvatar size="small" active={speaking} />
        <div className="call-active-identity">
          <h1 className="call-name">Marisol</h1>
          <p className="call-status">{formatDuration(seconds)} · connected</p>
        </div>
      </header>

      <div className="call-active-main">
        <div className="call-controls">
          <div className="call-control-item">
            <button className={`call-control ${micMuted ? 'is-muted' : ''}`} onClick={() => setMicMuted((muted) => !muted)} aria-label={micMuted ? 'Unmute microphone' : 'Mute microphone'} aria-pressed={micMuted}>
              {micMuted ? <MicOff /> : <Mic />}
            </button>
            <span>{micMuted ? 'unmute' : 'mute'}</span>
          </div>
          <div className="call-control-item">
            <button className={`call-control ${outputMuted ? 'is-muted' : ''}`} onClick={() => setOutputMuted((muted) => !muted)} aria-label={outputMuted ? 'Turn on call audio' : 'Mute call audio'} aria-pressed={outputMuted}>
              {outputMuted ? <VolumeX /> : <Volume2 />}
            </button>
            <span>speaker</span>
          </div>
        </div>
        <AudioBars active={speaking} />
      </div>

    </section>
  );
}
