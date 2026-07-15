import { useEffect, useRef, useState } from 'react';
import { FiSend } from 'react-icons/fi';
import { useCallFunnel } from '../hooks/useCallFunnel.js';
import { PrimaryButton } from './UI.jsx';
import { RainbowButton } from '../../shared/components/RainbowButton.jsx';
import { AuroraText } from '../../shared/components/AuroraText.jsx';
import { SparklesText } from './SparklesText.jsx';

import { BUTTON_CLICK_SOUND, CHAT_ACTION_REVEAL_SOUND } from '../lib/sfx.js';

function getDockSignature(dock) {
  if (dock.type === 'buttons') return `buttons:${dock.buttons.map((button) => button.label).join('|')}`;
  return `${dock.type}:${dock.key || dock.next || ''}`;
}

const SPARKLE_PHRASES = [
  'certain desires are ready to surface',
  'truly meant to reach you',
  'the thing you want is still there',
  'There is something I can do for you',
  'Thirteen openings',
  'what’s meant for you finally finds its way through',
];

export function PrivateChat({ context }) {
  const funnel = useCallFunnel(context);
  const scrollRef = useRef(null);
  const revealAudioRef = useRef(null);
  const clickAudioRef = useRef(null);
  const lastDockSignatureRef = useRef('');
  const dockSignature = getDockSignature(funnel.dock);

  useEffect(() => {
    const audio = new Audio(CHAT_ACTION_REVEAL_SOUND);
    const clickAudio = new Audio(BUTTON_CLICK_SOUND);
    audio.preload = 'auto';
    audio.volume = 0.48;
    audio.load();
    clickAudio.preload = 'auto';
    clickAudio.volume = 0.58;
    clickAudio.load();
    revealAudioRef.current = audio;
    clickAudioRef.current = clickAudio;

    return () => {
      audio.pause();
      clickAudio.pause();
      if (revealAudioRef.current === audio) revealAudioRef.current = null;
      if (clickAudioRef.current === clickAudio) clickAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!['buttons', 'continue', 'input'].includes(funnel.dock.type)) return;
    if (dockSignature === lastDockSignatureRef.current) return;
    lastDockSignatureRef.current = dockSignature;

    const audio = revealAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, [dockSignature, funnel.dock.type]);

  const playClickSound = () => {
    const audio = clickAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [funnel.messages, funnel.dock]);

  return (
    <section className="private-chat" aria-label="Private chat with Marisol">
      <header className="private-chat-header">
        <img
          src="/images/chat/marisol-avatar.png"
          alt="Marisol"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = '/images/chat/sabrina-avatar.png';
          }}
        />
        <div className="private-chat-title">
          <h1>Marisol</h1>
          <p><span>✓</span> Private thread connected</p>
        </div>
      </header>

      <div ref={scrollRef} className="private-chat-messages" aria-live="polite">
        {funnel.messages.map((message) => <Message key={message.id} message={message} />)}
      </div>

      <div className="private-chat-dock">
        <div
          key={dockSignature}
          className={['buttons', 'continue', 'input'].includes(funnel.dock.type) ? 'chat-action-drawer' : ''}
        >
          <Dock
            dock={funnel.dock}
            onChoose={funnel.choose}
            onSubmit={funnel.submit}
            onAdvance={funnel.advance}
            onClickSound={playClickSound}
          />
        </div>
      </div>
    </section>
  );
}

function Message({ message }) {
  if (message.who === 'typing') {
    return <div className="chat-typing" aria-label="Marisol is typing"><span /><span /><span /></div>;
  }
  if (message.who === 'reading') {
    return <div className="chat-reading">Sitting with your words</div>;
  }
  return (
    <div className={`chat-bubble chat-bubble-${message.who} ${message.reaction ? 'has-reaction' : ''}`}>
      {message.who === 'marisol'
        ? <MarisolText text={message.text} name={message.name} auroraValues={message.auroraValues} />
        : message.text}
      {message.reaction && <span className="chat-reaction" aria-label={`Marisol reacted ${message.reaction}`}>{message.reaction}</span>}
    </div>
  );
}

function MarisolText({ text, name, auroraValues = [] }) {
  const decorations = [
    ...(name ? [{ type: 'name', value: name }] : []),
    ...auroraValues.map((value) => ({ type: 'name', value })),
    ...SPARKLE_PHRASES.map((value) => ({ type: 'sparkles', value })),
  ];
  const parts = [];
  let cursor = 0;

  while (cursor < text.length) {
    let match = null;
    for (const decoration of decorations) {
      const index = text.indexOf(decoration.value, cursor);
      if (index !== -1 && (!match || index < match.index || (index === match.index && decoration.value.length > match.value.length))) {
        match = { ...decoration, index };
      }
    }

    if (!match) {
      parts.push(text.slice(cursor));
      break;
    }
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    parts.push(match.type === 'name'
      ? <AuroraText key={`${match.index}-${match.value}`} className="call-aurora-name">{match.value}</AuroraText>
      : <SparklesText key={`${match.index}-${match.value}`}>{match.value}</SparklesText>);
    cursor = match.index + match.value.length;
  }

  return parts;
}

function Dock({ dock, onChoose, onSubmit, onAdvance, onClickSound }) {
  if (dock.type === 'buttons') {
    return (
      <div className="call-options">
        {dock.buttons.map((button) => (
          button.next === '12' ? (
            <RainbowButton key={button.label} className="call-rainbow-option" onClick={() => { onClickSound(); onChoose(button); }}>
              {button.label}
            </RainbowButton>
          ) : (
            <button key={button.label} className="call-option" onClick={() => { onClickSound(); onChoose(button); }}>{button.label}</button>
          )
        ))}
      </div>
    );
  }
  if (dock.type === 'continue') {
    return <PrimaryButton className="call-primary-wide" onClick={() => { onClickSound(); onAdvance(dock.next); }}>Continue</PrimaryButton>;
  }
  if (dock.type === 'input') {
    return <ChatInput placeholder={dock.placeholder} onClickSound={onClickSound} onSend={(value) => onSubmit(dock.key, value, dock.next)} />;
  }
  if (dock.type === 'terminal') {
    return <div className="call-terminal">This private thread remains open.</div>;
  }
  return <div className="call-terminal">Marisol is with you…</div>;
}

function ChatInput({ placeholder, onSend, onClickSound }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const send = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onClickSound();
    setValue('');
    onSend(trimmed);
  };

  return (
    <form className="call-input-form" onSubmit={(event) => { event.preventDefault(); send(); }}>
      <textarea
        ref={inputRef}
        className="call-input"
        rows={1}
        maxLength={800}
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          setValue(event.target.value);
          event.target.style.height = 'auto';
          event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`;
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            send();
          }
        }}
      />
      <button className="call-send" type="submit" aria-label="Send"><FiSend /></button>
    </form>
  );
}
