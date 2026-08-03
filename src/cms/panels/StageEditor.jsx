import { useConfirm } from '../Confirm.jsx';
import { BEAT_TYPES, describeBeat, makeStage } from '../model.js';
import { Btn, inputClass } from '../ui.jsx';
import { BeatEditor, IconBtn } from './BeatEditor.jsx';
import { DockEditor } from './DockEditor.jsx';

// The stage list. Stages are shown in order with the selected one expanded,
// rather than as a separate list-then-detail screen — a writer moving through a
// script is reading it, and jumping between two panes to do that breaks the
// thread.
// `onChange` takes a producer of the next funnel, never a rebuilt one — see the
// note where it is passed in. Every helper below is written that way so edits
// made in the same tick compose instead of overwriting one another.
export function StageList({ funnel, selectedId, onSelect, onChange, onPreview, previewing }) {
  const mapStages = (fn) => onChange((prev) => ({ ...prev, stages: fn(prev.stages, prev) }));

  const addStage = () => {
    const stage = makeStage({ title: `Stage ${funnel.stages.length + 1}`, beats: [BEAT_TYPES.line.make()] });
    mapStages((stages) => [...stages, stage]);
    onSelect(stage.id);
  };

  // `patch` may be an object or a producer taking the stage's previous value —
  // the beat list needs the latter, since reordering reads what is there now.
  const patchStage = (id, patch) =>
    mapStages((stages) => stages.map((s) => (s.id === id ? { ...s, ...(typeof patch === 'function' ? patch(s) : patch) } : s)));

  const removeStage = (id) =>
    onChange((prev) => {
      // Anything pointing at the deleted stage is cleared rather than left
      // dangling, so the funnel stays playable.
      const cleaned = prev.stages
        .filter((s) => s.id !== id)
        .map((s) => {
          const d = { ...s.dock };
          if (d.next === id) d.next = '';
          if (d.options) d.options = d.options.map((o) => (o.next === id ? { ...o, next: '' } : o));
          return { ...s, dock: d };
        });
      return {
        ...prev,
        stages: cleaned,
        startStage: prev.startStage === id ? cleaned[0]?.id || '' : prev.startStage,
      };
    });

  const moveStage = (index, dir) =>
    mapStages((stages) => {
      const next = [...stages];
      const target = index + dir;
      if (target < 0 || target >= next.length) return stages;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  return (
    <div className="flex flex-col gap-2">
      {funnel.stages.map((stage, i) => (
        <StageCard
          key={stage.id}
          stage={stage}
          index={i}
          funnel={funnel}
          expanded={stage.id === selectedId}
          isStart={stage.id === funnel.startStage}
          previewing={previewing}
          onPreview={onPreview}
          onSelect={() => onSelect(stage.id === selectedId ? null : stage.id)}
          onChange={(patch) => patchStage(stage.id, patch)}
          onRemove={() => removeStage(stage.id)}
          onMove={(dir) => moveStage(i, dir)}
          onMakeStart={() => onChange((prev) => ({ ...prev, startStage: stage.id }))}
          isFirst={i === 0}
          isLast={i === funnel.stages.length - 1}
        />
      ))}
      <Btn variant="primary" className="self-start" onClick={addStage}>+ Add stage</Btn>
    </div>
  );
}

function StageCard({ stage, index, funnel, expanded, isStart, previewing, onPreview, onSelect, onChange, onRemove, onMove, onMakeStart, isFirst, isLast }) {
  const beats = stage.beats || [];
  const lineCount = beats.filter((b) => b.type === 'line').length;
  const confirm = useConfirm();

  const mapBeats = (fn) => onChange((prev) => ({ beats: fn(prev.beats || []) }));
  const addBeat = (type) => mapBeats((b) => [...b, BEAT_TYPES[type].make()]);
  const moveBeat = (i, dir) =>
    mapBeats((b) => {
      const next = [...b];
      const t = i + dir;
      if (t < 0 || t >= next.length) return b;
      [next[i], next[t]] = [next[t], next[i]];
      return next;
    });

  const keys = collectKeysBefore(funnel, stage.id);

  return (
    <section className={`overflow-hidden rounded-xl border transition-colors ${expanded ? 'border-[#7c5cff]/40 bg-[var(--surface-2)]' : 'border-white/8 bg-[var(--surface-1)]'}`}>
      <header className="flex items-center gap-2 px-3 py-2">
        <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-white/6 font-mono text-[.68rem] text-white/40">{index + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[.85rem] font-semibold text-white/85">{stage.title || 'Untitled stage'}</span>
            <span className="block truncate text-[.68rem] text-white/30">
              {lineCount} message{lineCount === 1 ? '' : 's'} · ends with {stage.dock?.type || 'nothing'}
            </span>
          </span>
        </button>
        {isStart && <span className="shrink-0 rounded border border-[#7c5cff]/40 bg-[#7c5cff]/12 px-1.5 py-0.5 text-[.6rem] font-semibold uppercase tracking-wide text-[#a892ff]">Start</span>}
        <div className="flex shrink-0 items-center gap-0.5">
          <IconBtn label="Move up" disabled={isFirst} onClick={onMove.bind(null, -1)}>↑</IconBtn>
          <IconBtn label="Move down" disabled={isLast} onClick={onMove.bind(null, 1)}>↓</IconBtn>
          {/* There is no undo, and autosave is immediate — so a mis-click here
              is unrecoverable. Say what is about to be lost, and quote it. */}
          <IconBtn
            label="Delete stage"
            danger
            onClick={async () => {
              const ok = await confirm({
                title: `Delete “${stage.title || 'this stage'}”?`,
                summary: beats.length
                  ? `Everything in it goes too — ${beats.length} ${beats.length === 1 ? 'item' : 'items'}:`
                  : 'This stage is empty.',
                items: beats.map(describeBeat),
                confirmLabel: 'Delete stage',
              });
              if (ok) onRemove();
            }}
          >
            ✕
          </IconBtn>
        </div>
      </header>

      {expanded && (
        <div className="flex flex-col gap-4 border-t border-white/8 p-3">
          <div className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-[.7rem] font-semibold uppercase tracking-wide text-white/45">Stage name</span>
              <input className={inputClass} value={stage.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="What happens here" />
            </label>
            {!isStart && <Btn onClick={onMakeStart}>Start here</Btn>}
          </div>

          <div>
            <p className="mb-1.5 text-[.7rem] font-semibold uppercase tracking-wide text-white/45">What plays</p>
            <ul className="flex list-none flex-col gap-2 p-0">
              {beats.map((beat, i) => (
                <BeatEditor
                  key={beat.id}
                  beat={beat}
                  keys={keys}
                  onChange={(next) => mapBeats((b) => b.map((x, j) => (j === i ? next : x)))}
                  onRemove={() => mapBeats((b) => b.filter((_, j) => j !== i))}
                  onMove={(dir) => moveBeat(i, dir)}
                  onPreview={() => onPreview(stage.id, i)}
                  isPreviewing={previewing?.stageId === stage.id && previewing?.beatIndex === i}
                  isFirst={i === 0}
                  isLast={i === beats.length - 1}
                />
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(BEAT_TYPES).map(([type, meta]) => (
                <Btn key={type} onClick={() => addBeat(type)}>{meta.icon} {meta.label}</Btn>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[.7rem] font-semibold uppercase tracking-wide text-white/45">Then the visitor acts</p>
            <DockEditor
              dock={stage.dock || { type: 'none' }}
              stages={funnel.stages}
              selfId={stage.id}
              onPatch={(patch) => onChange((prev) => ({ dock: { ...prev.dock, ...patch } }))}
              onReplace={(dock) => onChange(() => ({ dock }))}
            />
          </div>
        </div>
      )}
    </section>
  );
}

// Only keys captured at or before this stage in list order — offering {email}
// in the message that asks for it would be a trap.
function collectKeysBefore(funnel, stageId) {
  const keys = [];
  for (const s of funnel.stages) {
    if (s.id === stageId) break;
    const d = s.dock || {};
    if (['input', 'date', 'select'].includes(d.type) && d.key) keys.push(d.key);
    if (d.type === 'buttons') for (const o of d.options || []) if (o.setKey) keys.push(o.setKey);
  }
  return [...new Set(keys)];
}
