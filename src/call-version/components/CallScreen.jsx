import { useEffect, useMemo, useRef, useState } from 'react';
import { AlarmClock, MessageCircle, Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { CALL_CHUNKS, interpolate } from '../stages.js';
import { fetchTTS } from '../lib/api.js';
import { AudioBars, MarisolAvatar, PrimaryButton } from './UI.jsx';

const IOS_RINGTONE = new URL('../../../COMCell_Ouverture ringtone iphone (ID 1699)_BigSoundBank.com.wav', import.meta.url).href;
const ANDROID_RINGTONE = new URL('../../../kettle.mp3', import.meta.url).href;
const BUTTON_CLICK_SOUND = new URL('../../../506054__mellau__button-click-1.wav', import.meta.url).href;
const SILENT_AUDIO = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA';

const formatDuration = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function detectMobilePlatform() {
  const uaPlatform = navigator.userAgentData?.platform || navigator.platform || '';
  const userAgent = navigator.userAgent || '';
  const isIPadOS = uaPlatform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/i.test(userAgent) || /iOS/i.test(uaPlatform) || isIPadOS) return 'ios';
  if (/Android/i.test(userAgent) || /Android/i.test(uaPlatform)) return 'android';
  return 'android';
}

function IOSAnswerSlider({ onAnswer }) {
  const [value, setValue] = useState(0);
  const answeredRef = useRef(false);

  const updateValue = (event) => {
    const nextValue = Number(event.target.value);
    setValue(nextValue);
    if (nextValue >= 92 && !answeredRef.current) {
      answeredRef.current = true;
      onAnswer();
    }
  };

  return (
    <div className="ios-answer-slider" style={{ '--slide-progress': `${value}%` }}>
      <span className="ios-answer-label" style={{ opacity: 1 - value / 100 }} aria-hidden="true">slide to answer</span>
      <span
        className="ios-answer-knob"
        style={{ left: `calc(4px + ${value}% - ${value * 0.72}px)` }}
        aria-hidden="true"
      >
        <Phone />
      </span>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={value}
        aria-label="Slide to answer"
        onChange={updateValue}
        onPointerUp={() => { if (!answeredRef.current) setValue(0); }}
        onKeyUp={(event) => {
          if (event.key === 'Escape' && !answeredRef.current) setValue(0);
        }}
      />
    </div>
  );
}

export function CallScreen({ context, onPrivateChat }) {
  const [phase, setPhase] = useState('ringing');
  const [lineIndex, setLineIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [audioFailed, setAudioFailed] = useState(false);
  const [micMuted, setMicMuted] = useState(true);
  const [outputMuted, setOutputMuted] = useState(false);
  const [endedReason, setEndedReason] = useState('completed');
  const [platform] = useState(detectMobilePlatform);
  const audioRef = useRef(null);
  const urlRef = useRef(null);
  const ringtoneRef = useRef(null);
  const buttonClickRef = useRef(null);

  const chunks = useMemo(() => CALL_CHUNKS.map((chunk) => interpolate(chunk, context)), [context]);
  const caption = chunks[lineIndex] || chunks[chunks.length - 1];
  const speaking = phase === 'active' && !audioFailed && !outputMuted;

  useEffect(() => {
    const buttonClick = new Audio(BUTTON_CLICK_SOUND);
    buttonClick.preload = 'auto';
    buttonClick.volume = 0.62;
    buttonClick.load();
    buttonClickRef.current = buttonClick;

    return () => {
      buttonClick.pause();
      if (buttonClickRef.current === buttonClick) buttonClickRef.current = null;
    };
  }, []);

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

      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = audioRef.current || new Audio();
      audio.pause();
      audio.src = url;
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

  const stopRinging = () => {
    ringtoneRef.current?.pause();
    if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;
    navigator.vibrate?.(0);
  };

  const acceptCall = () => {
    if (buttonClickRef.current) {
      buttonClickRef.current.currentTime = 0;
      buttonClickRef.current.play().catch(() => {});
    }
    const voiceAudio = audioRef.current || new Audio();
    voiceAudio.src = SILENT_AUDIO;
    voiceAudio.muted = false;
    voiceAudio.play().catch(() => {});
    audioRef.current = voiceAudio;
    stopRinging();
    setPhase('active');
  };

  const declineCall = () => {
    stopRinging();
    setEndedReason('declined');
    setPhase('ended');
  };

  const endCall = () => {
    audioRef.current?.pause();
    setEndedReason('manual');
    setPhase('ended');
  };

  if (phase === 'ringing') {
    return (
      <section className="call-screen call-ringing" aria-label="Incoming call from Marisol">
        <div className="call-ringing-content">
          <div className="call-caller-identity">
            <h1 className="call-name">Marisol</h1>
            <p className="call-ringing-detail">Private audio call</p>
          </div>
        </div>
        <div className="call-incoming-footer">
          <div className="call-incoming-utilities" aria-hidden="true">
            <div><AlarmClock /><span>Remind Me</span></div>
            <div><MessageCircle /><span>Message</span></div>
          </div>
          {platform === 'ios' ? (
            <IOSAnswerSlider onAnswer={acceptCall} />
          ) : (
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
          )}
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

      <footer className="call-active-footer">
        <div className="call-control-item call-control-item-end">
          <button className="call-control call-control-end" onClick={endCall} aria-label="End call">
            <PhoneOff />
          </button>
          <span>end</span>
        </div>
      </footer>

    </section>
  );
}
