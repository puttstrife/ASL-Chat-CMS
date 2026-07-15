import { useEffect, useRef, useState } from 'react';
import { FiSend } from 'react-icons/fi';
import { useCallFunnel } from '../hooks/useCallFunnel.js';
import { PrimaryButton } from './UI.jsx';
import { RainbowButton } from '../../components/RainbowButton.jsx';

export function PrivateChat({ context }) {
  const funnel = useCallFunnel(context);
  const scrollRef = useRef(null);

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
        <Dock dock={funnel.dock} onChoose={funnel.choose} onSubmit={funnel.submit} onAdvance={funnel.advance} />
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
      {message.text}
      {message.reaction && <span className="chat-reaction" aria-label={`Marisol reacted ${message.reaction}`}>{message.reaction}</span>}
    </div>
  );
}

function Dock({ dock, onChoose, onSubmit, onAdvance }) {
  if (dock.type === 'buttons') {
    return (
      <div className="call-options">
        {dock.buttons.map((button) => (
          button.next === '12' ? (
            <RainbowButton key={button.label} className="call-rainbow-option" onClick={() => onChoose(button)}>
              {button.label}
            </RainbowButton>
          ) : (
            <button key={button.label} className="call-option" onClick={() => onChoose(button)}>{button.label}</button>
          )
        ))}
      </div>
    );
  }
  if (dock.type === 'continue') {
    return <PrimaryButton className="call-primary-wide" onClick={() => onAdvance(dock.next)}>Continue</PrimaryButton>;
  }
  if (dock.type === 'input') {
    return <ChatInput placeholder={dock.placeholder} onSend={(value) => onSubmit(dock.key, value, dock.next)} />;
  }
  if (dock.type === 'terminal') {
    return <div className="call-terminal">This private thread remains open.</div>;
  }
  return <div className="call-terminal">Marisol is with you…</div>;
}

function ChatInput({ placeholder, onSend }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const send = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
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
