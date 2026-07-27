import { useEffect, useRef, useState } from 'react';
import { fetchVoiceToken } from '../lib/api.js';
import { RainbowButton } from '../../shared/components/RainbowButton.jsx';
import { AudioActivity, SeleneAvatar, SeleneIdentity } from './VoiceCallComponents.jsx';

// Opt-in "Talk to Selene live" — ElevenLabs Conversational AI.
// SDK loaded from CDN at mount (no extra bundle dep); for production,
// `npm i @elevenlabs/client` and import locally instead.
const SDK_URL = 'https://esm.sh/@elevenlabs/client@0.1.4';

export function LiveOverlay({ onClose }) {
  const [status, setStatus] = useState('Connecting…');
  const [speaking, setSpeaking] = useState(false);
  const convRef = useRef(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const signedUrl = await fetchVoiceToken();
        const { Conversation } = await import(/* @vite-ignore */ SDK_URL);
        if (!active) return;
        convRef.current = await Conversation.startSession({
          signedUrl,
          onStatusChange: ({ status }) => {
            if (status === 'connected') setStatus('Listening…');
            if (status === 'disconnected') onClose();
          },
          onModeChange: ({ mode }) => {
            setSpeaking(mode === 'speaking');
            setStatus(mode === 'speaking' ? 'Selene is speaking…' : 'Listening…');
          },
          onError: () => { setStatus('Connection lost. Returning to the thread.'); setTimeout(onClose, 1800); },
        });
      } catch {
        if (active) { setStatus('Live voice is unavailable right now. Selene will stay with you here.'); setTimeout(onClose, 2200); }
      }
    })();
    return () => { active = false; convRef.current?.endSession?.().catch(() => {}); };
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-[900] grid place-items-center bg-[radial-gradient(ellipse_80%_70%_at_50%_20%,rgba(93,40,148,0.4),transparent_68%)] backdrop-blur-xl">
      <div className="flex flex-col items-center gap-3.5 p-6 text-center">
        <SeleneAvatar sizeClass="size-32" active={speaking} />
        <SeleneIdentity status={status} nameClassName="text-4xl" statusClassName="min-h-[1.4em] text-[.75rem] text-white/70" />
        <AudioActivity active={speaking} className="my-1" />
        <RainbowButton onClick={onClose} className="font-sans px-6">End call</RainbowButton>
      </div>
    </div>
  );
}
