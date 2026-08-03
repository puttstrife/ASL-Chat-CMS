import { useRef, useState } from 'react';
import { BEAT_TYPES } from '../model.js';
import { Btn, inputClass, readImageFile, textareaClass } from '../ui.jsx';

// One beat — a message, a pause, an image or a list. Beats play top to bottom,
// which is why the ordering controls sit on every row rather than behind a menu.
export function BeatEditor({ beat, keys, onChange, onRemove, onMove, onPreview, isPreviewing, isFirst, isLast }) {
  const meta = BEAT_TYPES[beat.type] || {};
  return (
    <li
      className={`overflow-hidden rounded-lg border bg-[var(--surface-3)] shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-colors ${
        isPreviewing ? 'border-[#7c5cff]/60' : 'border-white/10'
      }`}
    >
      <div className="flex items-center gap-2 border-b border-white/8 bg-[var(--surface-4)] px-2.5 py-1.5">
        <span className="text-[.8rem]" aria-hidden="true">{meta.icon}</span>
        <span className="flex-1 text-[.7rem] font-semibold uppercase tracking-wide text-white/50">{meta.label || beat.type}</span>
        {/* Play the reading from this beat, rather than sitting through
            everything before it to check one line. */}
        <button
          type="button"
          onClick={onPreview}
          title="Play the preview from here"
          className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[.68rem] font-semibold transition-colors ${
            isPreviewing
              ? 'border-[#7c5cff] bg-[#7c5cff] text-white'
              : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/85'
          }`}
        >
          ▶ Preview
        </button>
        <div className="flex items-center gap-0.5">
          <IconBtn label="Move up" disabled={isFirst} onClick={() => onMove(-1)}>↑</IconBtn>
          <IconBtn label="Move down" disabled={isLast} onClick={() => onMove(1)}>↓</IconBtn>
          <IconBtn label="Delete beat" danger onClick={onRemove}>✕</IconBtn>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-2.5">
        {beat.type === 'line' && (
          <>
            <textarea
              className={textareaClass}
              value={beat.text}
              onChange={(e) => onChange({ ...beat, text: e.target.value })}
              placeholder="What they say…"
            />
            <div className="flex items-center justify-between gap-3">
              <KeyHints keys={keys} onInsert={(k) => onChange({ ...beat, text: `${beat.text}{${k}}` })} />
              <label className="flex shrink-0 items-center gap-1.5 text-[.7rem] text-white/40">
                hold at least
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={beat.seconds ?? 0}
                  onChange={(e) => onChange({ ...beat, seconds: Number(e.target.value) })}
                  className="w-14 rounded-md border border-white/10 bg-[var(--field)] px-1.5 py-1 text-center text-white/80 outline-none focus:border-[#7c5cff]"
                />
                s
              </label>
            </div>
          </>
        )}

        {beat.type === 'pause' && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-[.7rem] text-white/40">Label — shown under the dots</span>
              <input
                className={inputClass}
                value={beat.label || ''}
                onChange={(e) => onChange({ ...beat, label: e.target.value })}
                placeholder="is drawing"
              />
            </label>
            <label className="flex shrink-0 items-center gap-1.5 text-[.7rem] text-white/40">
              for
              <input
                type="number"
                min={0}
                step={0.5}
                value={beat.seconds ?? 0}
                onChange={(e) => onChange({ ...beat, seconds: Number(e.target.value) })}
                className="w-14 rounded-md border border-white/10 bg-[var(--field)] px-1.5 py-1 text-center text-white/80 outline-none focus:border-[#7c5cff]"
              />
              s
            </label>
          </div>
        )}

        {beat.type === 'image' && <ImageBeat beat={beat} keys={keys} onChange={onChange} />}

        {beat.type === 'list' && (
          <ListBeat beat={beat} onChange={onChange} />
        )}
      </div>
    </li>
  );
}

function ImageBeat({ beat, keys, onChange }) {
  const fileRef = useRef(null);
  const [error, setError] = useState('');

  const upload = async (file) => {
    if (!file) return;
    setError('');
    try {
      onChange({ ...beat, src: await readImageFile(file) });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-[var(--field)]">
          {beat.src ? (
            <img src={beat.src} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-[.6rem] text-white/25">empty</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <input
            className={inputClass}
            value={beat.src?.startsWith('data:') ? '' : beat.src || ''}
            onChange={(e) => onChange({ ...beat, src: e.target.value })}
            placeholder={beat.src?.startsWith('data:') ? 'Uploaded image' : '/images/… or https://…'}
            disabled={beat.src?.startsWith('data:')}
          />
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
            <Btn onClick={() => fileRef.current?.click()}>Upload</Btn>
            {beat.src && <Btn variant="danger" onClick={() => onChange({ ...beat, src: '' })}>Clear</Btn>}
            <label className="ml-auto flex items-center gap-1.5 text-[.7rem] text-white/40">
              <input
                type="checkbox"
                checked={Boolean(beat.locked)}
                onChange={(e) => onChange({ ...beat, locked: e.target.checked })}
                className="accent-[#7c5cff]"
              />
              blur it
            </label>
          </div>
        </div>
      </div>
      {keys.length > 0 && (
        <p className="text-[.68rem] leading-snug text-white/30">
          A path can use an answer — <code className="text-white/45">/images/{'{'}gender{'}'}/face.webp</code> picks a
          different file per answer. Uploads cannot vary this way.
        </p>
      )}
      {error && <p className="rounded-lg border border-[#ff6b7d]/25 bg-[#ff6b7d]/10 px-2.5 py-1.5 text-[.72rem] text-[#ff9aa7]">{error}</p>}
    </div>
  );
}

function ListBeat({ beat, onChange }) {
  const items = beat.items || [];
  const setItem = (i, v) => onChange({ ...beat, items: items.map((x, j) => (j === i ? v : x)) });
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex gap-1.5">
          <input className={inputClass} value={item} onChange={(e) => setItem(i, e.target.value)} placeholder="One point…" />
          <IconBtn label="Remove" danger onClick={() => onChange({ ...beat, items: items.filter((_, j) => j !== i) })}>✕</IconBtn>
        </div>
      ))}
      <Btn className="self-start" onClick={() => onChange({ ...beat, items: [...items, ''] })}>+ Add point</Btn>
    </div>
  );
}

function KeyHints({ keys, onInsert }) {
  if (!keys.length) return <span className="text-[.68rem] text-white/25">Answers you capture will appear here to insert.</span>;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <span className="text-[.68rem] text-white/30">insert:</span>
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onInsert(k)}
          className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[.65rem] text-white/55 transition-colors hover:bg-white/10 hover:text-white/80"
        >
          {`{${k}}`}
        </button>
      ))}
    </div>
  );
}

export function IconBtn({ children, label, danger, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid size-6 place-items-center rounded text-[.7rem] transition-colors disabled:opacity-20 ${
        danger ? 'text-white/35 hover:bg-[#ff6b7d]/15 hover:text-[#ff6b7d]' : 'text-white/40 hover:bg-white/10 hover:text-white/80'
      }`}
      {...props}
    >
      {children}
    </button>
  );
}
