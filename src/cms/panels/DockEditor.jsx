import { DOCK_TYPES, FIELD_PRESETS, uid } from '../model.js';
import { Btn, Field, inputClass, selectClass } from '../ui.jsx';
import { IconBtn } from './BeatEditor.jsx';

// What ends a stage — the control the visitor actually touches, and where each
// answer sends them. Branching lives here rather than in a separate screen,
// because "which button goes where" is the same thought as "what are the
// buttons".
// `onPatch` merges fields; `onReplace` swaps the whole dock, which is what
// changing its type does. Both are applied against the current value upstream
// rather than against this render's props, so same-tick edits compose.
export function DockEditor({ dock, stages, selfId, onPatch, onReplace }) {
  const set = onPatch;
  const targets = stages.filter((s) => s.id !== selfId);

  return (
    // Carded like a beat, because it is the same kind of thing — one more item
    // in the stage, and the last one. Bare fields on the stage background read
    // as loose settings rather than as the moment the visitor acts.
    <div className="overflow-hidden rounded-lg border border-white/10 bg-[var(--surface-3)] shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-2 border-b border-white/8 bg-[var(--surface-4)] px-2.5 py-1.5">
        <span className="text-[.8rem]" aria-hidden="true">🎬</span>
        <span className="flex-1 text-[.7rem] font-semibold uppercase tracking-wide text-white/50">Ends with</span>
        <span className="shrink-0 text-[.68rem] text-white/35">{DOCK_TYPES[dock.type]?.label}</span>
      </div>

      <div className="flex flex-col gap-3 p-2.5">
      <Field hint={DOCK_TYPES[dock.type]?.hint}>
        <select className={selectClass} value={dock.type} onChange={(e) => onReplace(switchType(dock, e.target.value))}>
          {Object.entries(DOCK_TYPES).map(([value, meta]) => (
            <option key={value} value={value}>{meta.label}</option>
          ))}
        </select>
      </Field>

      {dock.type === 'continue' && (
        <StageLink label="Then go to" value={dock.next} stages={targets} onChange={(next) => set({ next })} />
      )}

      {dock.type === 'buttons' && <ButtonsDock dock={dock} targets={targets} set={set} />}
      {dock.type === 'input' && <InputDock dock={dock} targets={targets} set={set} />}
      {dock.type === 'date' && (
        <>
          <KeyField dock={dock} set={set} placeholder="dob" />
          <Field label="Button text"><input className={inputClass} value={dock.cta || ''} onChange={(e) => set({ cta: e.target.value })} placeholder="Continue" /></Field>
          <StageLink label="Then go to" value={dock.next} stages={targets} onChange={(next) => set({ next })} />
        </>
      )}
      {dock.type === 'select' && <SelectDock dock={dock} targets={targets} set={set} />}
      {dock.type === 'cta' && <CtaDock dock={dock} targets={targets} set={set} />}

      {dock.type === 'end' && (
        <p className="rounded-lg border border-white/8 bg-white/[.04] px-3 py-2 text-[.72rem] leading-snug text-white/40">
          The reading stops here. The dock shows the waiting line and nothing else.
        </p>
      )}
      </div>
    </div>
  );
}

// Changing type keeps anything the new type can still use, so switching from a
// text input to a dropdown does not silently lose where it pointed.
function switchType(dock, type) {
  const carried = { next: dock.next, key: dock.key, cta: dock.cta, trust: dock.trust };
  if (type === 'buttons') return { type, options: dock.options || [makeOption(), makeOption()], trust: carried.trust || [] };
  if (type === 'input') return { type, key: carried.key || 'name', placeholder: dock.placeholder || '', inputType: dock.inputType || 'text', cta: carried.cta || 'Continue', next: carried.next || '' };
  if (type === 'date') return { type, key: carried.key || 'dob', cta: carried.cta || 'Continue', next: carried.next || '' };
  if (type === 'select') return { type, key: carried.key || '', options: dock.options || [{ id: uid(), label: '', value: '' }], cta: carried.cta || 'Continue', next: carried.next || '' };
  if (type === 'cta') return { type, label: dock.label || 'Continue', url: dock.url || '', next: carried.next || '', passKeys: dock.passKeys || [], trust: carried.trust || [] };
  if (type === 'continue') return { type, next: carried.next || '' };
  return { type };
}

const makeOption = () => ({ id: uid(), label: '', next: '' });

function StageLink({ label, value, stages, onChange, allowEmpty = true }) {
  const missing = value && !stages.some((s) => s.id === value);
  return (
    <Field label={label}>
      <select
        className={`${selectClass} ${missing ? 'border-[#ff6b7d]/50' : ''}`}
        value={missing ? '' : value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {allowEmpty && <option value="">— nowhere (stops here) —</option>}
        {stages.map((s) => <option key={s.id} value={s.id}>{s.title || s.id}</option>)}
      </select>
      {missing && <span className="text-[.68rem] text-[#ff9aa7]">Points at a stage that no longer exists.</span>}
    </Field>
  );
}

function KeyField({ dock, set, placeholder }) {
  return (
    <Field label="Save the answer as" hint={`Used later as {${dock.key || placeholder}} in any message.`}>
      <input className={inputClass} value={dock.key || ''} onChange={(e) => set({ key: e.target.value.replace(/[^a-z0-9_]/gi, '').toLowerCase() })} placeholder={placeholder} />
    </Field>
  );
}

function ButtonsDock({ dock, targets, set }) {
  const options = dock.options || [];
  const setOpt = (i, patch) => set({ options: options.map((o, j) => (j === i ? { ...o, ...patch } : o)) });

  // Each answer sits one step up from the dock card holding it, as an overlay
  // rather than another token — these nest, and the scale should not grow a
  // level per depth.
  return (
    <div className="flex flex-col gap-2.5">
      {options.map((o, i) => (
        <div key={o.id} className="rounded-lg border border-white/10 bg-white/[.04] p-2.5">
          <div className="flex items-center gap-1.5">
            <input
              className={inputClass}
              value={o.label}
              onChange={(e) => setOpt(i, { label: e.target.value })}
              placeholder={i === 0 ? 'Yes' : 'No'}
            />
            <IconBtn label="Remove answer" danger onClick={() => set({ options: options.filter((_, j) => j !== i) })}>✕</IconBtn>
          </div>
          <div className="mt-2 grid gap-2">
            <StageLink label="Goes to" value={o.next} stages={targets} onChange={(next) => setOpt(i, { next })} />
            <details className="text-[.72rem]">
              <summary className="cursor-pointer text-white/35 hover:text-white/60">Also remember an answer…</summary>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Field label="Save as">
                  <input className={inputClass} value={o.setKey || ''} onChange={(e) => setOpt(i, { setKey: e.target.value.replace(/[^a-z0-9_]/gi, '').toLowerCase() })} placeholder="gender" />
                </Field>
                <Field label="Value" hint="Comma-separate to pick one at random, held for the session.">
                  <input
                    className={inputClass}
                    value={o.setRandom ? o.setRandom.join(', ') : o.setValue || ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw.includes(',')) setOpt(i, { setRandom: raw.split(',').map((s) => s.trim()).filter(Boolean), setValue: undefined });
                      else setOpt(i, { setValue: raw, setRandom: undefined });
                    }}
                    placeholder="man"
                  />
                </Field>
              </div>
            </details>
          </div>
        </div>
      ))}
      <Btn className="self-start" onClick={() => set({ options: [...options, makeOption()] })}>+ Add answer</Btn>
      <TrustEditor trust={dock.trust} set={set} />
    </div>
  );
}

function InputDock({ dock, targets, set }) {
  return (
    <>
      <Field label="Asking for">
        <select
          className={selectClass}
          value={FIELD_PRESETS.some((p) => p.key === dock.key) ? dock.key : 'custom'}
          onChange={(e) => {
            const preset = FIELD_PRESETS.find((p) => p.key === e.target.value);
            if (!preset || preset.key === 'custom') return set({ key: '' });
            set({ key: preset.key, placeholder: preset.placeholder, inputType: preset.inputType });
          }}
        >
          {FIELD_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <KeyField dock={dock} set={set} placeholder="name" />
        <Field label="Keyboard type">
          <select className={selectClass} value={dock.inputType || 'text'} onChange={(e) => set({ inputType: e.target.value })}>
            <option value="text">Text</option>
            <option value="email">Email (validated)</option>
            <option value="tel">Phone</option>
            <option value="number">Number</option>
          </select>
        </Field>
      </div>
      <Field label="Placeholder">
        <input className={inputClass} value={dock.placeholder || ''} onChange={(e) => set({ placeholder: e.target.value })} placeholder="Enter your first name" />
      </Field>
      <Field label="Button text">
        <input className={inputClass} value={dock.cta || ''} onChange={(e) => set({ cta: e.target.value })} placeholder="Continue" />
      </Field>
      <StageLink label="Then go to" value={dock.next} stages={targets} onChange={(next) => set({ next })} />
    </>
  );
}

function SelectDock({ dock, targets, set }) {
  const options = dock.options || [];
  const setOpt = (i, patch) => set({ options: options.map((o, j) => (j === i ? { ...o, ...patch } : o)) });
  return (
    <>
      <KeyField dock={dock} set={set} placeholder="choice" />
      <div className="flex flex-col gap-1.5">
        {options.map((o, i) => (
          <div key={o.id} className="flex gap-1.5">
            <input className={inputClass} value={o.label} onChange={(e) => setOpt(i, { label: e.target.value, value: e.target.value })} placeholder="Option text" />
            <IconBtn label="Remove option" danger onClick={() => set({ options: options.filter((_, j) => j !== i) })}>✕</IconBtn>
          </div>
        ))}
        <Btn className="self-start" onClick={() => set({ options: [...options, { id: uid(), label: '', value: '' }] })}>+ Add option</Btn>
      </div>
      <Field label="Button text">
        <input className={inputClass} value={dock.cta || ''} onChange={(e) => set({ cta: e.target.value })} placeholder="Continue" />
      </Field>
      <StageLink label="Then go to" value={dock.next} stages={targets} onChange={(next) => set({ next })} />
    </>
  );
}

function CtaDock({ dock, targets, set }) {
  const keys = dock.passKeys || [];
  return (
    <>
      <Field label="Button text">
        <input className={inputClass} value={dock.label || ''} onChange={(e) => set({ label: e.target.value })} placeholder="Unlock My Full Sketch" />
      </Field>
      <Field
        label="Send them to"
        hint="Leave empty to play another stage instead — useful while the real page is still being built."
      >
        <input className={inputClass} value={dock.url || ''} onChange={(e) => set({ url: e.target.value })} placeholder="https://example.com/offer/" />
      </Field>
      {!dock.url && <StageLink label="No link, so play" value={dock.next} stages={targets} onChange={(next) => set({ next })} />}
      <Field label="Pass answers along" hint="Added to the link as ?name=…&email=… so the next page knows who arrived.">
        <input
          className={inputClass}
          value={keys.join(', ')}
          onChange={(e) => set({ passKeys: e.target.value.split(',').map((s) => s.trim().replace(/[^a-z0-9_]/gi, '').toLowerCase()).filter(Boolean) })}
          placeholder="name, email, dob"
        />
      </Field>
      <TrustEditor trust={dock.trust} set={set} />
    </>
  );
}

function TrustEditor({ trust = [], set }) {
  return (
    <Field label="Reassurance lines" hint="Small centred text under the button.">
      <div className="flex flex-col gap-1.5">
        {trust.map((t, i) => (
          <div key={i} className="flex gap-1.5">
            <input
              className={inputClass}
              value={t}
              onChange={(e) => set({ trust: trust.map((x, j) => (j === i ? e.target.value : x)) })}
              placeholder="Delivered in 24 hours"
            />
            <IconBtn label="Remove line" danger onClick={() => set({ trust: trust.filter((_, j) => j !== i) })}>✕</IconBtn>
          </div>
        ))}
        <Btn className="self-start" onClick={() => set({ trust: [...trust, ''] })}>+ Add line</Btn>
      </div>
    </Field>
  );
}
