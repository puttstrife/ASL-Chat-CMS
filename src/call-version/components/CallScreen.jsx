import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { CALL_CHUNKS, interpolate } from '../stages.js';
import { fetchTTS } from '../lib/api.js';
import { AudioBars, MarisolAvatar, PrimaryButton } from './UI.jsx';

const IOS_RINGTONE = new URL('../../../COMCell_Ouverture ringtone iphone (ID 1699)_BigSoundBank.com.wav', import.meta.url).href;
const ANDROID_RINGTONE = new URL('../../../kettle.mp3', import.meta.url).href;

const CONNECT_STEPS = [
  'Connecting to Marisol…',
  'Initializing your reading…',
  'Securing a private line…',
  'Connected.',
];

const formatDuration = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function detectMobilePlatform() {
  const uaPlatform = navigator.userAgentData?.platform || navigator.platform || '';
  const userAgent = navigator.userAgent || '';
  const isIPadOS = uaPlatform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/i.test(userAgent) || /iOS/i.test(uaPlatform) || isIPadOS) return 'ios';
  if (/Android/i.test(userAgent) || /Android/i.test(uaPlatform)) return 'android';
  return 'android';
}

export function CallScreen({ context, onPrivateChat }) {
  const [phase, setPhase] = useState('ringing');
  const [connectStep, setConnectStep] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [needsTap, setNeedsTap] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [outputMuted, setOutputMuted] = useState(false);
  const [endedReason, setEndedReason] = useState('completed');
  const [platform] = useState(detectMobilePlatform);
  const audioRef = useRef(null);
  const urlRef = useRef(null);
  const ringtoneRef = useRef(null);

  const chunks = useMemo(() => CALL_CHUNKS.map((chunk) => interpolate(chunk, context)), [context]);
  const caption = chunks[lineIndex] || chunks[chunks.length - 1];
  const speaking = phase === 'active' && !needsTap && !audioFailed && !outputMuted;

  useEffect(() => {
    if (phase !== 'ringing') return undefined;
    const ringtone = new Audio(platform === 'ios' ? IOS_RINGTONE : ANDROID_RINGTONE);
    ringtone.loop = true;
    ringtone.volume = 0.68;
    ringtoneRef.current = ringtone;
    ringtone.play().catch(() => {});

    const vibrationPattern = [550, 350, 550, 1200];
    if (platform === 'android') navigator.vibrate?.(vibrationPattern);
    const vibrationInterval = platform === 'android'
      ? setInterval(() => navigator.vibrate?.(vibrationPattern), 2800)
      : null;

    return () => {
      if (vibrationInterval) clearInterval(vibrationInterval);
      ringtone.pause();
      ringtone.currentTime = 0;
      if (ringtoneRef.current === ringtone) ringtoneRef.current = null;
      navigator.vibrate?.(0);
    };
  }, [phase, platform]);

  useEffect(() => {
    if (phase !== 'connecting') return undefined;
    if (connectStep < CONNECT_STEPS.length - 1) {
      const timeout = setTimeout(() => setConnectStep((step) => step + 1), 800);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => setPhase('active'), 550);
    return () => clearTimeout(timeout);
  }, [connectStep, phase]);

  useEffect(() => {
    if (phase !== 'active') return undefined;
    const interval = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'active' || audioFailed) return undefined;
    let cancelled = false;

    const loadAndPlay = async () => {
      const blob = await fetchTTS(chunks[lineIndex]);
      if (cancelled) return;
      if (!blob) {
        setAudioFailed(true);
        return;
      }

      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audio.muted = outputMuted;
      audioRef.current = audio;
      audio.onended = () => {
        if (cancelled) return;
        if (lineIndex >= chunks.length - 1) {
          setEndedReason('completed');
          setPhase('ended');
        } else {
          setLineIndex((index) => index + 1);
        }
      };
      audio.onerror = () => {
        if (!cancelled) {
          setNeedsTap(false);
          setAudioFailed(true);
        }
      };
      audio.play().then(() => setNeedsTap(false)).catch(() => setNeedsTap(true));
    };

    loadAndPlay();
    return () => {
      cancelled = true;
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

  useEffect(() => {
    if (phase !== 'active' || !audioFailed) return undefined;
    const duration = Math.max(2600, 900 + caption.length * 42);
    const timeout = setTimeout(() => {
      if (lineIndex >= chunks.length - 1) {
        setEndedReason('completed');
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

  const connectAudio = () => {
    audioRef.current?.play()
      .then(() => setNeedsTap(false))
      .catch(() => {
        setNeedsTap(false);
        setAudioFailed(true);
      });
  };

  const stopRinging = () => {
    ringtoneRef.current?.pause();
    if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;
    navigator.vibrate?.(0);
  };

  const acceptCall = () => {
    stopRinging();
    setConnectStep(0);
    setPhase('connecting');
  };

  const declineCall = () => {
    stopRinging();
    setEndedReason('declined');
    setPhase('ended');
  };

  if (phase === 'ringing') {
    return (
      <section className="call-screen call-ringing" aria-label="Incoming call from Marisol">
        <div className="call-ringing-content">
          <p className="call-eyebrow">Incoming private call</p>
          <MarisolAvatar size="large" ping />
          <div>
            <h1 className="call-name">Marisol</h1>
            <p className="call-ringing-status">Marisol is calling…</p>
          </div>
        </div>
        <div className="call-ringing-actions">
          <div className="call-ringing-action">
            <button className="call-control call-control-decline" onClick={declineCall} aria-label="Decline call"><PhoneOff /></button>
            <span>Decline</span>
          </div>
          <div className="call-ringing-action">
            <button className="call-control call-control-accept" onClick={acceptCall} aria-label="Accept call"><Phone /></button>
            <span>Accept</span>
          </div>
        </div>
      </section>
    );
  }

  if (phase === 'connecting') {
    return (
      <section className="call-screen call-connecting" aria-label="Connecting call">
        <div className="call-center-stack">
          <MarisolAvatar size="large" ping />
          <div><h1 className="call-name">Marisol</h1><p className="call-status">Private audio call</p></div>
          <div className="call-connect-progress">
            <div className="call-connect-track"><div className="call-connect-fill" style={{ width: `${((connectStep + 1) / CONNECT_STEPS.length) * 100}%` }} /></div>
            <p className="call-connect-label" key={connectStep}><span className="call-spinner" />{CONNECT_STEPS[connectStep]}</p>
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
            <p className="call-status">{endedReason === 'completed' ? 'Call complete' : endedReason === 'declined' ? 'Call declined' : 'Call ended'}{endedReason === 'declined' ? '' : ` · ${formatDuration(seconds)}`}</p>
          </div>
          <PrimaryButton onClick={onPrivateChat}>Continue to private chat</PrimaryButton>
        </div>
      </section>
    );
  }

  return (
    <section className="call-screen call-active" aria-label="Private audio call with Marisol">
      <header className="call-active-header">
        <h1 className="call-name">Marisol</h1>
        <p className="call-status">{formatDuration(seconds)} · connected</p>
      </header>

      <div className="call-active-main">
        <MarisolAvatar size="large" active={speaking} />
        <AudioBars active={speaking} />
      </div>

      <footer className="call-active-footer">
        <div className="call-controls">
          <button className={`call-control ${micMuted ? 'is-muted' : ''}`} onClick={() => setMicMuted((muted) => !muted)} aria-label={micMuted ? 'Unmute microphone' : 'Mute microphone'} aria-pressed={micMuted}>
            {micMuted ? <MicOff /> : <Mic />}
          </button>
          <button className={`call-control ${outputMuted ? 'is-muted' : ''}`} onClick={() => setOutputMuted((muted) => !muted)} aria-label={outputMuted ? 'Turn on call audio' : 'Mute call audio'} aria-pressed={outputMuted}>
            {outputMuted ? <VolumeX /> : <Volume2 />}
          </button>
        </div>
      </footer>

      {needsTap && (
        <button className="call-audio-gate" onClick={connectAudio}>
          <span><Volume2 size={20} /> Tap to connect audio</span>
        </button>
      )}
    </section>
  );
}
