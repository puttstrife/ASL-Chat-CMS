// Where funnels live.
//
// localStorage for now, deliberately: it needs no backend, no keys and no
// deploy, so a writer can open the editor and have something working in the
// first minute. The trade is real and worth stating plainly — a funnel lives in
// ONE browser on ONE machine. Clearing site data loses it. Two people cannot
// edit the same funnel.
//
// Export/import is the bridge until that changes: every funnel can be saved to
// a .json file and loaded on another machine. When this moves to a real
// database, only this file should need rewriting — nothing above it knows where
// a funnel came from.

import { makeFunnel, uid, withDefaults } from './model.js';
import { SEED_FUNNELS } from './seed.js';

const KEY = 'chat-cms:funnels:v1';
const SEEDED = 'chat-cms:seeded:v1';

const read = () => {
  try {
    return (JSON.parse(localStorage.getItem(KEY)) || []).map(withDefaults);
  } catch {
    return [];
  }
};

// Embedded avatars and audio make the quota a real ceiling rather than a
// theoretical one, and a failed write must not look like a successful save —
// so this throws something a person can act on and the editor surfaces it.
const write = (funnels) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(funnels));
  } catch (e) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22) {
      throw new Error(
        'Out of browser storage — this change was NOT saved. Uploaded music and avatars are stored inside the funnel, so delete or export a funnel you are not using, or swap a big upload for a file path.'
      );
    }
    throw e;
  }
  return funnels;
};

// The two Selene readings are loaded once, on first run, so the editor opens
// with something real in it rather than an empty list — and so the data model
// is proven against a script that actually shipped.
export function listFunnels() {
  if (!localStorage.getItem(SEEDED)) {
    localStorage.setItem(SEEDED, '1');
    const existing = read();
    if (!existing.length) return write(SEED_FUNNELS.map(withDefaults));
  }
  return read();
}

export const getFunnel = (id) => listFunnels().find((f) => f.id === id) || null;

export function saveFunnel(funnel) {
  const stamped = { ...funnel, updatedAt: new Date().toISOString() };
  const all = listFunnels();
  const i = all.findIndex((f) => f.id === stamped.id);
  if (i === -1) all.push(stamped);
  else all[i] = stamped;
  write(all);
  return stamped;
}

export function createFunnel(name = 'Untitled funnel') {
  const funnel = makeFunnel({ name });
  write([...listFunnels(), funnel]);
  return funnel;
}

export function duplicateFunnel(id) {
  const source = getFunnel(id);
  if (!source) return null;

  // Stage ids have to be regenerated or the copy's links would point back at
  // the original's stages — but every dock that referenced an old id has to be
  // repointed at the new one in the same pass.
  const remap = {};
  const stages = source.stages.map((s) => {
    const next = { ...s, id: uid() };
    remap[s.id] = next.id;
    return next;
  });
  for (const stage of stages) {
    const d = { ...stage.dock };
    if (d.next && remap[d.next]) d.next = remap[d.next];
    if (d.options) d.options = d.options.map((o) => (o.next && remap[o.next] ? { ...o, next: remap[o.next] } : o));
    stage.dock = d;
  }

  const copy = {
    ...source,
    id: uid(),
    name: `${source.name} (copy)`,
    startStage: remap[source.startStage] || stages[0]?.id,
    stages,
  };
  write([...listFunnels(), copy]);
  return copy;
}

export function deleteFunnel(id) {
  write(listFunnels().filter((f) => f.id !== id));
}

// ── The bridge out of one browser ──

export function exportFunnel(funnel) {
  const blob = new Blob([JSON.stringify(funnel, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${funnel.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importFunnel(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed.stages || !Array.isArray(parsed.stages)) {
    throw new Error('That file does not look like a funnel — no stages in it.');
  }
  // A fresh id, so importing a funnel you already have makes a second copy
  // rather than silently overwriting the one you are working on.
  const funnel = withDefaults({ ...parsed, id: uid(), name: parsed.name || 'Imported funnel' });
  write([...listFunnels(), funnel]);
  return funnel;
}
