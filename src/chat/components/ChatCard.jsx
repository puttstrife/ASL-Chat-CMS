import { useEffect, useRef, useState } from 'react';
import { FiSend, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { RainbowButton } from '../../shared/components/RainbowButton.jsx';
import { Bubble, BubbleContent, BubbleReactions } from './Bubble.jsx';
import { Reactable } from './ReactionPicker.jsx';
import { useChatSfx } from '../hooks/useChatSfx.js';

// The chat surface. Everything that used to be Selene — the name, the face, the
// role, the colours, the line shown while she is mid-flow — now comes from the
// funnel's `persona`, so one component renders every reader the CMS can make.
export function ChatCard({ funnel, persona, audio: audioConfig, unread = 0, sound = true }) {
  const { messages, dock, chooseButton, submitInput, submitDate, submitSelect, advance, finish } = funnel;
  const scrollRef = useRef(null);
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [reactions, setReactions] = useState({});
  const react = (id, emoji) =>
    setReactions((r) => {
      const next = { ...r };
      if (emoji) next[id] = emoji; else delete next[id];
      return next;
    });

  const playSend = useChatSfx(messages, muted || !sound);
  const withSound = (fn) => (...args) => { playSend(); return fn(...args); };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, dock]);

  // Looping ambient bed, configured per funnel. Off entirely in the editor
  // preview — a track restarting every time someone retypes a line would be
  // unbearable; the Music panel has its own opt-in listen button instead.
  const bedSrc = audioConfig?.enabled === false ? null : audioConfig?.src;
  const bedVolume = audioConfig?.volume ?? 0.05;

  useEffect(() => {
    if (!sound || !bedSrc) return undefined;
    const audio = new Audio(bedSrc);
    audio.loop = true;
    audio.volume = bedVolume;
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
    // Volume is applied separately below, so nudging it does not tear down and
    // restart the track from the beginning.
  }, [sound, bedSrc]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = bedVolume;
  }, [bedVolume]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const accent = persona?.accent || '#dfa73a';

  return (
    <section
      className="grid h-full grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] bg-[#080910]"
      style={{ '--gold': accent }}
    >
      <header
        className="relative z-20 flex items-center gap-3 rounded-b-3xl px-3 py-2.5"
        style={{ background: persona?.header || '#1a043d' }}
      >
        <div className="relative shrink-0">
          <Avatar persona={persona} />
          {unread > 0 && (
            <span
              aria-label={`${unread} new messages`}
              className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-[#f0334b] px-1 text-[.55rem] font-bold leading-4 text-white ring-2 sm:hidden"
              style={{ animation: 'reactionLand .3s cubic-bezier(.2,1.5,.4,1)', '--tw-ring-color': persona?.header || '#1a043d' }}
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="font-sans truncate text-xl font-semibold leading-tight" style={{ color: accent }}>
            {persona?.name || 'Untitled'}
          </p>
          <p className="font-sans inline-flex items-center gap-1.5 truncate text-[.7rem] text-white/55">
            <span className="live-dot size-2.5 shrink-0 rounded-full bg-[#38c878]" aria-hidden="true" />
            <span className="sr-only">Live session. </span>
            {persona?.role || ''}
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

      <div ref={scrollRef} className="no-scrollbar no-callout isolate flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-3.5">
        {messages.map((m) => (
          <Message key={m.id} m={m} accent={accent} reaction={reactions[m.id]} onReact={withSound((e) => react(m.id, e))} />
        ))}
      </div>

      <div className="shrink-0 border-t border-white/8 bg-[#0c0d14]/96 px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
        <Dock
          dock={dock}
          persona={persona}
          onButton={withSound(chooseButton)}
          onSubmit={withSound(submitInput)}
          onDate={withSound(submitDate)}
          onSelect={withSound(submitSelect)}
          onContinue={withSound(advance)}
          onFinish={withSound(finish)}
        />
      </div>
    </section>
  );
}

// An uploaded avatar is a data URL; a stock one is a path. Either can be
// missing or broken, and a broken face in the header is worse than no face, so
// it falls back to the persona's initial on the header colour.
function Avatar({ persona }) {
  const [failed, setFailed] = useState(false);
  const src = persona?.avatar;
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div
        className="grid size-12 place-items-center rounded-full text-lg font-semibold text-white/80 shadow-[0_0_16px_rgba(190,108,255,0.5)]"
        style={{ background: 'rgba(255,255,255,0.12)' }}
        aria-hidden="true"
      >
        {(persona?.name || '?').trim().charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={persona?.name || ''}
      onError={() => setFailed(true)}
      className="size-12 rounded-full object-cover shadow-[0_0_16px_rgba(190,108,255,0.5)]"
      style={{ objectPosition: 'center 18%' }}
    />
  );
}

function Message({ m, accent, reaction, onReact }) {
  if (m.who === 'typing') {
    return (
      <div className="flex max-w-max flex-col gap-1 self-start">
        <div className="bubble-in inline-flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-white/8 bg-white/8 px-3.5 py-3">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2 rounded-full bg-white/60" style={{ animation: 'typingDot 1.2s infinite ease-in-out', animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
        <p className="font-sans px-1 text-[.7rem] text-white/45" role="status">{m.label}</p>
      </div>
    );
  }
  if (m.who === 'list') {
    return (
      <Reactable reaction={reaction} onReact={onReact}>
        <div className="bubble-in w-fit max-w-full rounded-2xl rounded-tl-md border border-white/10 bg-white/8 px-4 py-3">
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {m.items.map((t, i) => (
              <li key={i} className="font-sans flex items-baseline gap-2 text-[.95rem] leading-snug text-white/85">
                <span aria-hidden="true" style={{ color: accent }}>·</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </Reactable>
    );
  }
  if (m.who === 'image') {
    return (
      <Reactable reaction={reaction} onReact={onReact} className="w-[82%]">
        <figure className="bubble-in m-0 flex w-full flex-col gap-2">
          <SketchImage src={m.src} locked={m.locked} accent={accent} />
        </figure>
      </Reactable>
    );
  }

  const sent = m.who === 'user';
  const bubble = (
    <Bubble
      variant={sent ? 'default' : 'muted'}
      align={sent ? 'end' : 'start'}
      className={`${m.reaction ? 'mb-3' : ''} ${sent ? '' : 'max-w-none'}`}
    >
      <BubbleContent
        className={sent ? 'rounded-tr-md' : 'rounded-tl-md backdrop-blur-xl'}
        style={sent ? undefined : {
          background: 'linear-gradient(160deg, rgba(255,255,255,0.10), rgba(255,255,255,0.045))',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 24px rgba(0,0,0,0.28)',
        }}
      >
        {m.text}
      </BubbleContent>
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

  if (sent) return bubble;
  return <Reactable reaction={reaction} onReact={onReact}>{bubble}</Reactable>;
}

// A sketch that has not been drawn yet, or whose file is not on this deploy,
// should still occupy the space it will occupy — a broken-image glyph makes a
// half-built funnel look broken rather than unfinished, which matters most on a
// demo where the artwork has not been supplied.
function SketchImage({ src, locked, accent }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const missing = !src || failed;

  return (
    <div className="relative overflow-hidden rounded-2xl rounded-tl-md border border-white/10 bg-white/5">
      {missing ? (
        <div
          className="grid aspect-[4/5] w-full place-items-center border border-dashed border-white/12"
          style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 12px, transparent 12px 24px)' }}
        >
          <div className="flex flex-col items-center gap-1.5 px-6 text-center">
            <span className="text-2xl opacity-30" aria-hidden="true">🖼️</span>
            <p className="font-sans text-[.72rem] leading-snug text-white/35">
              {src ? 'Artwork not added yet' : 'No image set for this step'}
            </p>
          </div>
        </div>
      ) : (
        <img
          src={src}
          onError={() => setFailed(true)}
          alt={locked ? 'Blurred until unlocked' : ''}
          className={`block w-full object-cover transition-all duration-700 ${locked ? 'blur-md scale-105' : 'blur-0 scale-100'}`}
        />
      )}
      {locked && (
        <div className="absolute inset-0 flex items-end justify-center pb-6">
          <span
            className="font-sans rounded-md bg-black/55 px-3.5 py-1.5 text-[.7rem] font-medium uppercase tracking-[0.18em] backdrop-blur-sm"
            style={{ color: accent }}
          >
            Details Redacted
          </span>
        </div>
      )}
    </div>
  );
}

function TrustRow({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="font-sans m-0 flex list-none flex-col items-center gap-0.5 p-0 pt-1.5 text-center text-[.68rem] leading-snug text-white/45">
      {items.filter(Boolean).map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  );
}

function Dock({ dock, persona, onButton, onSubmit, onDate, onSelect, onContinue, onFinish }) {
  if (dock.type === 'cta') {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onFinish(dock)}
          className="font-sans inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl px-8 text-[1rem] font-bold text-[#1a1408] shadow-[0_0_28px_rgba(223,167,58,0.35)] transition-[filter,transform] hover:brightness-105 active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0d14]"
          style={{ background: 'var(--gold)' }}
        >
          {dock.label || 'Continue'}
          <span aria-hidden="true">→</span>
        </button>
        <TrustRow items={dock.trust} />
      </div>
    );
  }
  if (dock.type === 'buttons') {
    return (
      <div className="flex flex-col gap-2">
        {(dock.options || []).map((b, i) =>
          i === 0 ? (
            <RainbowButton key={b.id || i} onClick={() => onButton(b)} className="font-sans w-full">
              {b.label}
            </RainbowButton>
          ) : (
            <button
              key={b.id || i}
              onClick={() => onButton(b)}
              className="font-sans inline-flex h-12 w-full items-center justify-center rounded-xl border border-white/10 bg-[#15161c] px-8 text-[.85rem] font-semibold text-white/50 transition-colors hover:bg-[#1b1c24] hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c084fc] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0d14]"
            >
              {b.label}
            </button>
          )
        )}
        <TrustRow items={dock.trust} />
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
        key={dock.key}
        placeholder={dock.placeholder}
        cta={dock.cta}
        inputType={dock.inputType}
        onSend={(v) => onSubmit(dock.key, v, dock.next)}
      />
    );
  }
  if (dock.type === 'date') {
    return <DateRow key={dock.key} cta={dock.cta} onSend={(parts) => onDate(dock.key, parts, dock.next)} />;
  }
  if (dock.type === 'select') {
    return <SelectRow key={dock.key} options={dock.options || []} cta={dock.cta} onSend={(opt) => onSelect(dock.key, opt, dock.next)} />;
  }
  return (
    <p className="font-sans m-0 py-2.5 text-center text-[.8rem] italic text-white/40">
      {persona?.name || ''} {persona?.idleText || 'is with you…'}
    </p>
  );
}

function SelectRow({ options, cta, onSend }) {
  const [chosen, setChosen] = useState(null);
  return (
    <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); if (chosen) onSend(chosen); }}>
      {options.map((o, i) => {
        const active = chosen === o;
        return (
          <button
            key={o.id || i}
            type="button"
            aria-pressed={active}
            onClick={() => setChosen(o)}
            className={`font-sans inline-flex h-12 w-full items-center justify-center rounded-xl border px-8 text-[.85rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c1d95] ${
              active ? 'border-[#4c1d95] bg-[#1d1430] text-white' : 'border-white/10 bg-[#15161c] text-white/50 hover:bg-[#1b1c24] hover:text-white/70'
            }`}
          >
            {o.label}
          </button>
        );
      })}
      <RainbowButton type="submit" disabled={!chosen} className="font-sans w-full">{cta || 'Continue'}</RainbowButton>
    </form>
  );
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 90 }, (_, i) => THIS_YEAR - 18 - i);
const selectClass =
  'select-chevron font-sans h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#15161c] pl-3 pr-8 text-[.85rem] text-white/85 outline-none focus-visible:ring-2 focus-visible:ring-[#4c1d95]';

function DateRow({ cta = 'Continue', onSend }) {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
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
    'no-scrollbar font-sans max-h-[120px] min-h-[48px] w-full flex-1 resize-none rounded-[999px] border bg-white/5 px-4.5 py-3 text-[.9rem] leading-tight text-white/90 outline-none placeholder:font-semibold placeholder:text-white/60';
  const fieldStyle = { borderColor: 'color-mix(in srgb, var(--gold) 20%, transparent)' };

  const field = isEmail || inputType === 'tel' || inputType === 'number' ? (
    <input
      ref={taRef}
      type={inputType === 'number' ? 'number' : inputType}
      inputMode={isEmail ? 'email' : inputType === 'tel' ? 'tel' : inputType === 'number' ? 'numeric' : undefined}
      autoComplete={isEmail ? 'email' : inputType === 'tel' ? 'tel' : undefined}
      value={value}
      placeholder={placeholder}
      onChange={(e) => setValue(e.target.value)}
      className={fieldClass}
      style={fieldStyle}
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
      style={fieldStyle}
    />
  );

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
