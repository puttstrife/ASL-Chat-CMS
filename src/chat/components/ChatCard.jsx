import { useEffect, useRef, useState } from 'react';
import { FiSend, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { RainbowButton } from '../../shared/components/RainbowButton.jsx';
import { Bubble, BubbleContent, BubbleReactions } from './Bubble.jsx';
import { Reactable } from './ReactionPicker.jsx';

export function ChatCard({ funnel }) {
  const { messages, dock, chooseButton, submitInput, submitDate, submitSelect, advance } = funnel;
  const scrollRef = useRef(null);
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(false);
  // What the visitor has reacted with, keyed by message id. Session-only,
  // like everything else the funnel holds.
  const [reactions, setReactions] = useState({});
  const react = (id, emoji) =>
    setReactions((r) => {
      const next = { ...r };
      if (emoji) next[id] = emoji; else delete next[id];
      return next;
    });

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, dock]);

  // Looping ambient bed. Browsers block autoplay until the page has been
  // interacted with, so fall back to starting on the first user gesture.
  useEffect(() => {
    const audio = new Audio('/audio/ambient.mp3');
    audio.loop = true;
    audio.volume = 0.12; // ambient bed — sits well under the reading
    audioRef.current = audio;

    const start = () => audio.play().catch(() => {});
    start();
    window.addEventListener('pointerdown', start, { once: true });
    window.addEventListener('keydown', start, { once: true });

    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
      audio.pause();
      audio.src = '';
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  return (
    <section className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto] bg-[#080910]">
      {/* Header */}
      <header className="flex items-center gap-3 rounded-b-3xl bg-[#1a043d] px-3 py-2.5">
        <img
          src="/images/chat/selene-avatar.png"
          alt="Selene"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/chat/sabrina-avatar.png'; }}
          className="size-12 shrink-0 rounded-full object-cover shadow-[0_0_16px_rgba(190,108,255,0.5)]"
          style={{ objectPosition: 'center 18%' }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="font-sans text-xl font-semibold leading-tight text-[var(--gold)]">Selene</p>
          <p className="font-sans inline-flex items-center gap-1.5 text-[.7rem] text-white/55">
            <span className="live-dot size-2.5 shrink-0 rounded-full bg-[#38c878]" aria-hidden="true" />
            <span className="sr-only">Live session. </span>
            Astrological Portrait Reader
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          aria-pressed={muted}
          className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10"
        >
          {muted ? <FiVolumeX className="size-4.5" /> : <FiVolume2 className="size-4.5" />}
        </button>
      </header>

      {/* Messages */}
      {/* gap-4 rather than gap-2: a reaction badge hangs off the bottom of its
          bubble and needs clearance from the next one. */}
      <div ref={scrollRef} className="no-scrollbar no-callout flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-3.5">
        {messages.map((m) => (
          <Message key={m.id} m={m} reaction={reactions[m.id]} onReact={(e) => react(m.id, e)} />
        ))}
      </div>

      {/* Dock */}
      <div className="shrink-0 border-t border-white/8 bg-[#0c0d14]/96 px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
        <Dock dock={dock} onButton={chooseButton} onSubmit={submitInput} onDate={submitDate} onSelect={submitSelect} onContinue={advance} />
      </div>
    </section>
  );
}

function Message({ m, reaction, onReact }) {
  if (m.who === 'typing') {
    return (
      <div className="flex max-w-max flex-col gap-1 self-start">
        <div className="bubble-in inline-flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-white/8 bg-white/8 px-3.5 py-3">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2 rounded-full bg-white/60" style={{ animation: 'typingDot 1.2s infinite ease-in-out', animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
        <p className="font-sans px-1 text-[.7rem] text-white/45" role="status">{m.label || 'Selene is typing'}</p>
      </div>
    );
  }
  if (m.who === 'traits') {
    // What she has read off the chart so far. The list grows between the
    // first sketch and the neck, so it reads as notes taken while working.
    return (
      <Reactable reaction={reaction} onReact={onReact}>
        <div className="bubble-in w-fit max-w-full rounded-2xl rounded-tl-md border border-white/10 bg-white/8 px-4 py-3">
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {m.traits.map((t) => (
              <li key={t} className="font-sans flex items-baseline gap-2 text-[.95rem] leading-snug text-white/85">
                <span aria-hidden="true" className="text-[var(--gold)]">·</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </Reactable>
    );
  }
  if (m.who === 'sketch') {
    return (
      <Reactable reaction={reaction} onReact={onReact} className="w-[82%]">
      <figure className="bubble-in m-0 flex w-full flex-col gap-2">
        {/* The finished portrait stays blurred until the full reading is unlocked. */}
        <div className="relative overflow-hidden rounded-2xl rounded-tl-md border border-white/10 bg-white/5">
          <img
            src={m.src}
            alt={
              m.locked ? 'Your completed soulmate sketch, blurred until unlocked'
                : m.complete ? 'Your completed soulmate sketch'
                : 'Your soulmate sketch, still forming'
            }
            className={`block w-full object-cover transition-all duration-700 ${m.locked ? 'blur-md scale-105' : 'blur-0 scale-100'}`}
          />
          {m.locked && (
            <div className="absolute inset-0 flex items-end justify-center pb-6">
              <span className="font-sans rounded-md bg-black/55 px-3.5 py-1.5 text-[.7rem] font-medium uppercase tracking-[0.18em] text-[var(--gold)] backdrop-blur-sm">
                Details Redacted
              </span>
            </div>
          )}
        </div>
      </figure>
      </Reactable>
    );
  }
  const sent = m.who === 'user';
  const bubble = (
    <Bubble
      variant={sent ? 'default' : 'muted'}
      align={sent ? 'end' : 'start'}
      // Selene's bubbles sit in the reaction wrapper, which caps the width
      // already. Bubble's own percentage cap has to come off entirely: against
      // a wrapper that is itself sizing to the bubble it resolves circularly,
      // and the browser settles that by collapsing the bubble — which is what
      // was breaking words down the middle.
      className={`${m.reaction ? 'mb-3' : ''} ${sent ? '' : 'max-w-none'}`}
    >
      {/* Flat corner on the sender's side, mirroring the typing indicator. */}
      <BubbleContent className={sent ? 'rounded-tr-md' : 'rounded-tl-md'}>{m.text}</BubbleContent>
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

  // The visitor's own messages aren't reactable — you don't react to yourself.
  if (sent) return bubble;
  return (
    <Reactable reaction={reaction} onReact={onReact}>
      {bubble}
    </Reactable>
  );
}

function Dock({ dock, onButton, onSubmit, onDate, onSelect, onContinue }) {
  if (dock.type === 'buttons') {
    return (
      <div className="flex flex-col gap-2">
        {dock.buttons.map((b, i) =>
          b.variant === 'gold' ? (
            <button
              key={i}
              onClick={() => onButton(b)}
              className="font-sans inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-8 text-[1rem] font-bold text-[#1a1408] shadow-[0_0_28px_rgba(223,167,58,0.35)] transition-[filter,transform] hover:brightness-105 active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0d14]"
            >
              {b.label}
              {b.arrow && <span aria-hidden="true">→</span>}
            </button>
          ) : i === 0 ? (
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
        {dock.trust && (
          <ul className="font-sans m-0 flex list-none flex-wrap items-center justify-center gap-x-3 gap-y-1 p-0 pt-1 text-[.62rem] text-white/45">
            {dock.trust.map((t) => <li key={t}>{t}</li>)}
          </ul>
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
    return (
      <InputRow
        placeholder={dock.placeholder}
        cta={dock.cta}
        inputType={dock.inputType}
        onSend={(v) => onSubmit(dock.key, v, dock.next)}
      />
    );
  }
  if (dock.type === 'date') {
    return <DateRow cta={dock.cta} onSend={(parts) => onDate(dock.key, parts, dock.next)} />;
  }
  if (dock.type === 'select') {
    return <SelectRow options={dock.options} cta={dock.cta} onSend={(opt) => onSelect(dock.key, opt, dock.next)} />;
  }
  return null;
}

function SelectRow({ options, cta, onSend }) {
  const [chosen, setChosen] = useState(null);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => { e.preventDefault(); if (chosen) onSend(chosen); }}
    >
      {options.map((o) => {
        const active = chosen?.value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => setChosen(o)}
            className={`font-sans inline-flex h-12 w-full items-center justify-center rounded-xl border px-8 text-[.85rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c1d95] ${
              active
                ? 'border-[#4c1d95] bg-[#1d1430] text-white'
                : 'border-white/10 bg-[#15161c] text-white/50 hover:bg-[#1b1c24] hover:text-white/70'
            }`}
          >
            {o.label}
          </button>
        );
      })}
      <RainbowButton type="submit" disabled={!chosen} className="font-sans w-full">{cta}</RainbowButton>
    </form>
  );
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 90 }, (_, i) => THIS_YEAR - 18 - i);
const selectClass =
  // Extra right padding keeps the chevron off the field's edge — the browser
  // draws it inside the padding box, so px-3 alone crowds it.
  'font-sans h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#15161c] pl-3 pr-7 text-[.85rem] text-white/85 outline-none focus-visible:ring-2 focus-visible:ring-[#4c1d95]';

function DateRow({ cta = 'Continue', onSend }) {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  // Clamp the day list to the selected month (leap years included).
  const daysInMonth = month && year ? new Date(Number(year), Number(month), 0).getDate() : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const complete = month && day && year && Number(day) <= daysInMonth;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => { e.preventDefault(); if (complete) onSend({ month: Number(month), day: Number(day), year: Number(year) }); }}
    >
      <div className="flex gap-2">
        <select aria-label="Month" className={selectClass} value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">Month</option>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select aria-label="Day" className={selectClass} value={day} onChange={(e) => setDay(e.target.value)}>
          <option value="">Day</option>
          {days.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select aria-label="Year" className={selectClass} value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">Year</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <RainbowButton type="submit" disabled={!complete} className="font-sans w-full">{cta}</RainbowButton>
    </form>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function InputRow({ placeholder, cta, inputType, onSend }) {
  const [value, setValue] = useState('');
  const taRef = useRef(null);
  useEffect(() => { taRef.current?.focus(); }, []);
  const grow = (el) => { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; };

  const isEmail = inputType === 'email';
  const valid = isEmail ? EMAIL_RE.test(value.trim()) : Boolean(value.trim());
  const send = () => { if (!valid) return; setValue(''); onSend(value.trim()); };

  const fieldClass =
    'no-scrollbar font-sans max-h-[120px] min-h-[48px] w-full flex-1 resize-none rounded-[999px] border border-[var(--gold)]/20 bg-white/5 px-4.5 py-3 text-[.9rem] leading-tight text-white/90 outline-none placeholder:font-semibold placeholder:text-white/60';

  // Email gets a real input so mobile shows the right keyboard and the
  // browser can autofill; everything else stays a growing textarea.
  const field = isEmail ? (
    <input
      ref={taRef}
      type="email"
      inputMode="email"
      autoComplete="email"
      value={value}
      placeholder={placeholder}
      onChange={(e) => setValue(e.target.value)}
      className={fieldClass}
    />
  ) : (
    <textarea
      ref={taRef}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => { setValue(e.target.value); grow(e.target); }}
      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
      className={fieldClass}
    />
  );

  // Stages that name a CTA stack a full-width button under the field;
  // the rest keep the compact send icon beside it.
  if (cta) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex flex-col gap-2">
        {field}
        <RainbowButton type="submit" disabled={!valid} className="font-sans w-full">{cta}</RainbowButton>
      </form>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2">
      {field}
      <RainbowButton type="submit" aria-label="Send" className="size-12 shrink-0 rounded-full px-0">
        <FiSend className="size-5" />
      </RainbowButton>
    </form>
  );
}
