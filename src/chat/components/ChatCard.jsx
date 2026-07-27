import { useEffect, useRef, useState } from 'react';
import { FiPhone, FiSend, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { LiveOverlay } from './LiveOverlay.jsx';
import { RainbowButton } from '../../shared/components/RainbowButton.jsx';
import { Bubble, BubbleContent, BubbleReactions } from './Bubble.jsx';
import { VoiceScreen } from './VoiceScreen.jsx';

export function ChatCard({ funnel }) {
  const { messages, dock, config, chooseButton, submitInput, advance, memoModal, submitMemo } = funnel;
  const scrollRef = useRef(null);
  const [live, setLive] = useState(false);
  const [muted, setMuted] = useState(false); // placeholder — no audio wired up yet

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, dock]);

  // Stage 3: chat collapses into the full voice-memo view.
  if (memoModal) {
    return (
      <VoiceScreen
        text={memoModal.text}
        enabled={memoModal.enabled}
        placeholder={memoModal.input?.placeholder}
        onSubmit={submitMemo}
      />
    );
  }

  return (
    <section className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto] bg-[#080910]">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-white/8 bg-[#0c0d14]/95 px-3 py-2.5">
        <img
          src="/images/chat/selene-avatar.png"
          alt="Selene"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/chat/sabrina-avatar.png'; }}
          className="size-12 shrink-0 rounded-full object-cover shadow-[0_0_16px_rgba(190,108,255,0.5)]"
          style={{ objectPosition: 'center 18%' }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="font-script text-3xl leading-tight text-[var(--gold)]">Selene</p>
          <p className="font-sans inline-flex items-center gap-1.5 text-[.7rem] text-white/55">
            <span className="grid size-4 place-items-center rounded-full bg-[#38c878] text-[.45rem] font-black text-[#04130a]">✓</span>
            Following your pattern
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            aria-pressed={muted}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10"
          >
            {muted ? <FiVolumeX className="size-4.5" /> : <FiVolume2 className="size-4.5" />}
          </button>
          {config.liveEnabled && (
            <RainbowButton onClick={() => setLive(true)} aria-label="Talk to Selene live" className="font-sans h-10 gap-1.5 rounded-full px-4 text-sm">
              <FiPhone className="size-4" /> Live
            </RainbowButton>
          )}
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3.5">
        {messages.map((m) => <Message key={m.id} m={m} />)}
      </div>

      {/* Dock */}
      <div className="shrink-0 border-t border-white/8 bg-[#0c0d14]/96 px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
        <Dock dock={dock} onButton={chooseButton} onSubmit={submitInput} onContinue={advance} />
      </div>

      {live && <LiveOverlay onClose={() => setLive(false)} />}
    </section>
  );
}

function Message({ m }) {
  if (m.who === 'memo-label') {
    return (
      <div className="font-sans mx-auto my-1 inline-flex items-center gap-2 text-[.6rem] font-bold uppercase tracking-[0.2em] text-[#d8b4fe]/85">
        <span className="size-1.5 rounded-full bg-[#c084fc] shadow-[0_0_12px_#c084fc]" style={{ animation: 'dotPulse 1.2s ease-in-out infinite' }} />
        {m.text}
      </div>
    );
  }
  if (m.who === 'typing') {
    return (
      <div className="bubble-in inline-flex max-w-max items-center gap-1.5 self-start rounded-2xl rounded-tl-md border border-white/8 bg-white/8 px-3.5 py-3">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2 rounded-full bg-white/60" style={{ animation: 'typingDot 1.2s infinite ease-in-out', animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
    );
  }
  if (m.who === 'reading-pending') {
    return (
      <div className="bubble-in max-w-[82%] self-start rounded-2xl border border-[#d8b4fe]/18 bg-[#090a10]/90 px-3.5 py-3 shadow-[0_16px_48px_rgba(75,28,137,0.24)]">
        <p className="font-sans inline-flex items-center gap-2.5 text-[.625rem] font-bold uppercase tracking-[0.16em] text-[#d8b4fe]/80">
          <span className="size-2 rounded-full bg-[#c084fc] shadow-[0_0_14px_rgba(192,132,252,0.82)]" style={{ animation: 'dotPulse 1.2s ease-in-out infinite' }} />
          Sitting with your words
        </p>
      </div>
    );
  }
  const sent = m.who === 'user';
  return (
    <Bubble variant={sent ? 'default' : 'muted'} align={sent ? 'end' : 'start'} className={m.reaction ? 'mb-3' : ''}>
      <BubbleContent>{m.text}</BubbleContent>
      {m.reaction && (
        <BubbleReactions
          className="size-7 p-0 border border-white/10 bg-[#161720] text-[.75rem] leading-none ring-0"
          style={{ animation: 'bubbleIn .3s cubic-bezier(.2,.7,.3,1)' }}
        >
          {m.reaction}
        </BubbleReactions>
      )}
    </Bubble>
  );
}

function Dock({ dock, onButton, onSubmit, onContinue }) {
  if (dock.type === 'buttons') {
    return (
      <div className="flex flex-col gap-2">
        {dock.buttons.map((b, i) =>
          i === 0 ? (
            <RainbowButton key={i} onClick={() => onButton(b)} className="font-sans w-full">
              {b.label}
            </RainbowButton>
          ) : (
            <button
              key={i}
              onClick={() => onButton(b)}
              className="font-sans inline-flex h-12 w-full items-center justify-center rounded-xl border border-white/10 bg-[#15161c] px-8 text-[.85rem] font-semibold text-white/50 transition-colors hover:bg-[#1b1c24] hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c084fc] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0d14]"
            >
              {b.label}
            </button>
          )
        )}
      </div>
    );
  }
  if (dock.type === 'continue') {
    return (
      <RainbowButton onClick={() => onContinue(dock.next)} className="font-sans w-full">
        Continue
      </RainbowButton>
    );
  }
  if (dock.type === 'input') {
    return <InputRow placeholder={dock.placeholder} onSend={(v) => onSubmit(dock.key, v, dock.next)} />;
  }
  return null;
}

function InputRow({ placeholder, onSend }) {
  const [value, setValue] = useState('');
  const taRef = useRef(null);
  useEffect(() => { taRef.current?.focus(); }, []);
  const grow = (el) => { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; };
  const send = () => { const v = value.trim(); if (!v) return; setValue(''); onSend(v); };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); send(); }}
      className="flex items-end gap-2"
    >
      <textarea
        ref={taRef}
        rows={1}
        value={value}
        placeholder={placeholder}
        onChange={(e) => { setValue(e.target.value); grow(e.target); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        className="no-scrollbar font-sans max-h-[120px] min-h-[48px] w-full flex-1 resize-none rounded-[999px] border border-[var(--gold)]/20 bg-white/5 px-4.5 py-3 text-[.9rem] leading-tight text-white/90 outline-none placeholder:font-semibold placeholder:text-white/60"
      />
      <RainbowButton type="submit" aria-label="Send" className="size-12 shrink-0 rounded-full px-0">
        <FiSend className="size-5" />
      </RainbowButton>
    </form>
  );
}
