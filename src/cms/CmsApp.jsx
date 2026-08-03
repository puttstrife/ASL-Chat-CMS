import { useEffect, useRef, useState } from 'react';
import { estimateFunnel, fmtDuration } from './estimate.js';
import { danglingLinks } from './model.js';
import { PacingPanel } from './panels/PacingPanel.jsx';
import { PersonaPanel } from './panels/PersonaPanel.jsx';
import { PreviewPanel } from './panels/PreviewPanel.jsx';
import { StageList } from './panels/StageEditor.jsx';
import * as store from './store.js';
import { Btn, inputClass } from './ui.jsx';

export default function CmsApp() {
  const [funnels, setFunnels] = useState([]);
  const [openId, setOpenId] = useState(null);

  useEffect(() => { setFunnels(store.listFunnels()); }, []);

  const open = funnels.find((f) => f.id === openId) || null;

  const refresh = () => setFunnels(store.listFunnels());

  return (
    // The editor owns the viewport and scrolls its own panes; the list is an
    // ordinary page that grows. Giving both `min-h-dvh` let the editor's own
    // `h-dvh` stack on top of it, so the body scrolled instead of the panes.
    <div className={`bg-[#08090e] text-white/90 ${open ? 'h-dvh overflow-hidden' : 'min-h-dvh'}`}>
      {open ? (
        <Editor
          funnel={open}
          onBack={() => { setOpenId(null); refresh(); }}
          // Always a producer, never a finished object: two edits landing in
          // one tick must both apply, and only the previous-state form can
          // guarantee that.
          onChange={(produce) => setFunnels((all) => all.map((f) => (f.id === open.id ? produce(f) : f)))}
        />
      ) : (
        <FunnelList funnels={funnels} onOpen={setOpenId} onRefresh={refresh} />
      )}
    </div>
  );
}

function FunnelList({ funnels, onOpen, onRefresh }) {
  const fileRef = useRef(null);
  const [error, setError] = useState('');

  const create = () => { const f = store.createFunnel(); onRefresh(); onOpen(f.id); };

  const importFile = async (file) => {
    if (!file) return;
    setError('');
    try {
      await store.importFunnel(file);
      onRefresh();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 px-5 py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Chat funnels</h1>
          <p className="mt-1 text-[.82rem] text-white/40">
            Each one is a reader with their own face, voice and script.
          </p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
          <Btn onClick={() => fileRef.current?.click()}>Import</Btn>
          <Btn variant="primary" onClick={create}>+ New funnel</Btn>
        </div>
      </header>

      {error && <p className="rounded-lg border border-[#ff6b7d]/25 bg-[#ff6b7d]/10 px-3 py-2 text-[.78rem] text-[#ff9aa7]">{error}</p>}

      <p className="rounded-lg border border-white/8 bg-[#0e0f16] px-3.5 py-2.5 text-[.75rem] leading-relaxed text-white/40">
        Funnels are saved in <strong className="text-white/60">this browser only</strong> — not on a server. Clearing
        site data loses them, and nobody else can see them. Use Export to hand one to someone, or to keep a backup.
      </p>

      <ul className="flex list-none flex-col gap-2 p-0">
        {funnels.map((f) => {
          const est = estimateFunnel(f);
          const broken = danglingLinks(f).length;
          return (
            <li key={f.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-[#0e0f16] p-3 transition-colors hover:border-white/15">
              <button type="button" onClick={() => onOpen(f.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                {f.persona?.avatar ? (
                  <img src={f.persona.avatar} alt="" className="size-11 shrink-0 rounded-full object-cover" style={{ objectPosition: 'center 18%' }} />
                ) : (
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/8 text-white/50">
                    {(f.persona?.name || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{f.name}</span>
                  <span className="block truncate text-[.74rem] text-white/35">
                    {f.persona?.name} · {f.stages.length} stages · about {fmtDuration(est.max)}
                    {broken > 0 && <span className="text-[#ff9aa7]"> · {broken} broken link{broken === 1 ? '' : 's'}</span>}
                  </span>
                </span>
              </button>
              <div className="flex shrink-0 gap-1.5">
                <Btn onClick={() => store.exportFunnel(f)}>Export</Btn>
                <Btn onClick={() => { store.duplicateFunnel(f.id); onRefresh(); }}>Duplicate</Btn>
                <Btn
                  variant="danger"
                  onClick={() => {
                    if (confirm(`Delete “${f.name}”? This cannot be undone.`)) { store.deleteFunnel(f.id); onRefresh(); }
                  }}
                >
                  Delete
                </Btn>
              </div>
            </li>
          );
        })}
      </ul>

      {!funnels.length && (
        <p className="rounded-xl border border-dashed border-white/12 px-4 py-10 text-center text-[.85rem] text-white/30">
          Nothing here yet. Make a funnel, or import one.
        </p>
      )}
    </div>
  );
}

const TABS = [
  { id: 'script', label: 'Script' },
  { id: 'reader', label: 'Reader' },
];

function Editor({ funnel, onBack, onChange }) {
  const [tab, setTab] = useState('script');
  const [selectedStage, setSelectedStage] = useState(funnel.stages[0]?.id || null);
  const [saved, setSaved] = useState(true);

  // Autosave, debounced. A CMS that needs a Save button invites losing work to
  // a closed tab, and there is no server round-trip to make saving expensive.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSaved(false);
    const t = setTimeout(() => { store.saveFunnel(funnel); setSaved(true); }, 600);
    return () => clearTimeout(t);
  }, [funnel]);

  const broken = danglingLinks(funnel);

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-white/8 bg-[#0b0c12] px-4 py-2.5">
        <Btn onClick={onBack}>← All funnels</Btn>
        <input
          className={`${inputClass} max-w-xs flex-1`}
          value={funnel.name}
          onChange={(e) => { const name = e.target.value; onChange((prev) => ({ ...prev, name })); }}
        />
        <span className={`text-[.7rem] ${saved ? 'text-white/25' : 'text-[#a892ff]'}`}>{saved ? 'Saved' : 'Saving…'}</span>
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1 text-[.75rem] font-semibold transition-colors ${
                tab === t.id ? 'bg-[#7c5cff] text-white' : 'text-white/45 hover:text-white/80'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]">
        <div className="min-h-0 overflow-y-auto p-4">
          {broken.length > 0 && (
            <p className="mb-3 rounded-lg border border-[#ff6b7d]/25 bg-[#ff6b7d]/10 px-3 py-2 text-[.76rem] text-[#ff9aa7]">
              {broken.length} link{broken.length === 1 ? '' : 's'} point at a stage that no longer exists — a visitor
              reaching {broken.length === 1 ? 'it' : 'them'} would stop there.
            </p>
          )}

          {tab === 'script' ? (
            <StageList funnel={funnel} selectedId={selectedStage} onSelect={setSelectedStage} onChange={onChange} />
          ) : (
            <div className="flex max-w-xl flex-col gap-4">
              <PersonaPanel
                persona={funnel.persona}
                onPatch={(patch) => onChange((prev) => ({ ...prev, persona: { ...prev.persona, ...patch } }))}
              />
              <PacingPanel
                funnel={funnel}
                onPatch={(patch) => onChange((prev) => ({ ...prev, pacing: { ...prev.pacing, ...patch } }))}
              />
            </div>
          )}
        </div>

        <aside className="hidden min-h-0 border-l border-white/8 bg-[#0a0b11] p-3.5 lg:block">
          <PreviewPanel funnel={funnel} />
        </aside>
      </div>
    </div>
  );
}
