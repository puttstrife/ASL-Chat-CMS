import { useEffect, useRef, useState } from 'react';
import { FiSend, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { RainbowButton } from '../../shared/components/RainbowButton.jsx';
import { Bubble, BubbleContent, BubbleReactions } from './Bubble.jsx';

export function ChatCard({ funnel }) {
  const { messages, dock, chooseButton, submitInput, submitDate, submitSelect, advance } = funnel;
  const scrollRef = useRef(null);
  const [muted, setMuted] = useState(false); // placeholder — no audio wired up yet

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, dock]);

  return (
    <section className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto] bg-[#080910]">
      {/* Header */}
      <header className="flex items-center gap-3 rounded-b-3xl bg-[#0c0d14]/95 px-3 py-2.5">
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
      <div ref={scrollRef} className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3.5">
        {messages.map((m) => <Message key={m.id} m={m} />)}
      </div>

      {/* Dock */}
      <div className="shrink-0 border-t border-white/8 bg-[#0c0d14]/96 px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
        <Dock dock={dock} onButton={chooseButton} onSubmit={submitInput} onDate={submitDate} onSelect={submitSelect} onContinue={advance} />
      </div>
    </section>
  );
}

function Message({ m }) {
  if (m.who === 'status') {
    return (
      <div className="font-sans mx-auto my-1 inline-flex items-center gap-2 text-[.6rem] font-bold uppercase tracking-[0.2em] text-[#d8b4fe]/85">
        <span className="size-1.5 rounded-full bg-[#c084fc] shadow-[0_0_12px_#c084fc]" style={{ animation: 'dotPulse 1.2s ease-in-out infinite' }} />
        {m.text}
      </div>
    );
  }
  if (m.who === 'typing') {
    return (
      <div className="flex max-w-max flex-col gap-1 self-start">
        <div className="bubble-in inline-flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-white/8 bg-white/8 px-3.5 py-3">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2 rounded-full bg-white/60" style={{ animation: 'typingDot 1.2s infinite ease-in-out', animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
        <p className="font-sans px-1 text-[.7rem] text-white/45" role="status">Selene is typing</p>
      </div>
    );
  }
  if (m.who === 'sketch') {
    return (
      <figure className="bubble-in m-0 flex w-full max-w-[82%] flex-col gap-2 self-start">
        <img
          src={m.src}
          alt={m.final ? 'Your completed soulmate sketch' : 'Your soulmate sketch, still forming'}
          className="w-full rounded-2xl rounded-tl-md border border-white/10 bg-white/5 object-cover"
        />
        {m.caption && (
          <figcaption className="font-sans px-1 text-[.7rem] uppercase tracking-[0.14em] text-[#d8b4fe]/70">
            {m.caption}
          </figcaption>
        )}
      </figure>
    );
  }
  if (m.who === 'reveal') {
    return (
      <div className="bubble-in w-full max-w-[82%] self-start rounded-2xl border border-[var(--gold)]/25 bg-[#0c0a16]/90 px-4 py-4 text-center shadow-[0_16px_48px_rgba(75,28,137,0.24)]">
        <h2 className="font-script m-0 text-3xl leading-tight text-[var(--gold)]">{m.headline}</h2>
        <p className="font-sans mt-1.5 mb-0 text-[.8rem] leading-snug text-white/60">{m.body}</p>
      </div>
    );
  }
  const sent = m.who === 'user';
  return (
    <Bubble variant={sent ? 'default' : 'muted'} align={sent ? 'end' : 'start'} className={m.reaction ? 'mb-3' : ''}>
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
}

function Dock({ dock, onButton, onSubmit, onDate, onSelect, onContinue }) {
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
    return <InputRow placeholder={dock.placeholder} cta={dock.cta} onSend={(v) => onSubmit(dock.key, v, dock.next)} />;
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
  'font-sans h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#15161c] px-3 text-[.85rem] text-white/85 outline-none focus-visible:ring-2 focus-visible:ring-[#4c1d95]';

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

function InputRow({ placeholder, cta, onSend }) {
  const [value, setValue] = useState('');
  const taRef = useRef(null);
  useEffect(() => { taRef.current?.focus(); }, []);
  const grow = (el) => { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; };
  const send = () => { const v = value.trim(); if (!v) return; setValue(''); onSend(v); };

  const field = (
    <textarea
      ref={taRef}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => { setValue(e.target.value); grow(e.target); }}
      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
      className="no-scrollbar font-sans max-h-[120px] min-h-[48px] w-full flex-1 resize-none rounded-[999px] border border-[var(--gold)]/20 bg-white/5 px-4.5 py-3 text-[.9rem] leading-tight text-white/90 outline-none placeholder:font-semibold placeholder:text-white/60"
    />
  );

  // Stages that name a CTA stack a full-width button under the field;
  // the rest keep the compact send icon beside it.
  if (cta) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex flex-col gap-2">
        {field}
        <RainbowButton type="submit" disabled={!value.trim()} className="font-sans w-full">{cta}</RainbowButton>
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
