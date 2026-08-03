import { useRef, useState } from 'react';
import { Btn, Field, inputClass, Panel, readImageFile } from '../ui.jsx';

// Who is doing the talking. This is the whole point of the CMS: the same engine
// plays a different person depending on what is set here.
// `onPatch` takes only the changed fields, never a rebuilt persona. Emitting a
// whole object here meant two fields edited in the same tick each merged onto
// the same stale prop, and the second silently threw the first away.
export function PersonaPanel({ persona, onPatch }) {
  const fileRef = useRef(null);
  const [error, setError] = useState('');

  const set = (patch) => onPatch(patch);

  const upload = async (file) => {
    if (!file) return;
    setError('');
    try {
      set({ avatar: await readImageFile(file, { maxKb: 400 }) });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <Panel title="Who is talking" subtitle="Name, face and voice of this reader">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative size-16 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5"
            title="Upload an avatar"
          >
            {persona.avatar ? (
              <img src={persona.avatar} alt="" className="size-full object-cover" style={{ objectPosition: 'center 18%' }} />
            ) : (
              <span className="grid size-full place-items-center text-xl text-white/40">
                {(persona.name || '?').trim().charAt(0).toUpperCase()}
              </span>
            )}
            <span className="absolute inset-0 grid place-items-center bg-black/60 text-[.6rem] font-semibold uppercase tracking-wide text-white opacity-0 transition-opacity group-hover:opacity-100">
              Change
            </span>
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Field label="Name">
              <input className={inputClass} value={persona.name} onChange={(e) => set({ name: e.target.value })} placeholder="Selene" />
            </Field>
            <Field label="Role / subtitle">
              <input className={inputClass} value={persona.role} onChange={(e) => set({ role: e.target.value })} placeholder="Astrological Portrait Reader" />
            </Field>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
        <div className="flex flex-wrap items-center gap-2">
          <Btn onClick={() => fileRef.current?.click()}>Upload avatar</Btn>
          {persona.avatar && <Btn variant="danger" onClick={() => set({ avatar: '' })}>Remove</Btn>}
        </div>
        {error && <p className="rounded-lg border border-[#ff6b7d]/25 bg-[#ff6b7d]/10 px-3 py-2 text-[.75rem] text-[#ff9aa7]">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Typing label" hint={`Shows as “${persona.name || 'Name'} ${persona.typingLabel || 'is typing'}”`}>
            <input className={inputClass} value={persona.typingLabel} onChange={(e) => set({ typingLabel: e.target.value })} placeholder="is typing" />
          </Field>
          <Field label="Waiting label" hint={`Shows as “${persona.name || 'Name'} ${persona.idleText || 'is with you…'}”`}>
            <input className={inputClass} value={persona.idleText} onChange={(e) => set({ idleText: e.target.value })} placeholder="is with you…" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Accent colour" hint="Name, CTA button, list bullets">
            <ColorInput value={persona.accent} onChange={(v) => set({ accent: v })} />
          </Field>
          <Field label="Header colour">
            <ColorInput value={persona.header} onChange={(v) => set({ header: v })} />
          </Field>
        </div>
      </div>
    </Panel>
  );
}

function ColorInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="size-9 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0.5"
      />
      <input className={inputClass} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="#dfa73a" />
    </div>
  );
}
