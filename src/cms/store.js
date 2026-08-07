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
//
// This is also the schema boundary. Records are versioned and migrated on read
// (see MIGRATIONS below), because a funnel now carries a channel id that
// external systems know about and that must survive every future shape change.

import { makeFunnel, uid, withDefaults } from './model.js';
import { SEED_FUNNELS } from './seed.js';
import { trackingOptions } from './trackingConfig.js';
import { ensureTracking, makeTracking, slugify } from '../services/cpvOneService.js';

// One key per schema version. The old key is left in place rather than deleted:
// a migration that goes wrong should be recoverable by hand, and a few hundred
// KB of superseded funnels is a cheap insurance policy against losing work.
const KEYS = {
  1: 'chat-cms:funnels:v1',
  2: 'chat-cms:funnels:v2',
};
const VERSION = 2;
const KEY = KEYS[VERSION];
const SEEDED = 'chat-cms:seeded:v1';

// ── Migrations ──
//
// Each one takes the records from the previous version and returns this
// version's. They run once, on first read after an upgrade, and the result is
// written before anything else touches it.

const MIGRATIONS = {
  // v1 → v2: give every existing funnel a channel id, a slug and a tracking URL.
  //
  // Existing funnels get ids minted now rather than at their original creation,
  // which is the only honest option — there was nothing to mint before. Once
  // assigned they are as immutable as a new funnel's.
  2: (funnels) =>
    funnels.map((f) => {
      const withIds = ensureTracking({ ...f, tracking: makeTracking(f.tracking) }, trackingOptions());
      return {
        ...withIds,
        createdAt: f.createdAt || f.updatedAt || new Date().toISOString(),
        tracking: { ...withIds.tracking, slug: withIds.tracking.slug || slugify(f.name) },
      };
    }),
};

const parse = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || null;
  } catch {
    return null;
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

const read = () => {
  const current = parse(KEY);
  if (current) return current.map(withDefaults);

  // Nothing at this version yet — walk up from the newest older version that
  // does have data, applying each migration in turn.
  for (let from = VERSION - 1; from >= 1; from -= 1) {
    const older = parse(KEYS[from]);
    if (!older) continue;
    let records = older;
    for (let to = from + 1; to <= VERSION; to += 1) records = MIGRATIONS[to](records);
    const migrated = records.map(withDefaults);
    write(migrated);
    console.info(`[cms] migrated ${migrated.length} funnels from schema v${from} to v${VERSION}`);
    return migrated;
  }
  return [];
};

// The two Selene readings are loaded once, on first run, so the editor opens
// with something real in it rather than an empty list — and so the data model
// is proven against a script that actually shipped.
export function listFunnels() {
  if (!localStorage.getItem(SEEDED)) {
    localStorage.setItem(SEEDED, '1');
    const existing = read();
    if (!existing.length) {
      return write(SEED_FUNNELS.map((f) => ensureTracking(withDefaults(f), trackingOptions())));
    }
  }
  return read();
}

export const getFunnel = (id) => listFunnels().find((f) => f.id === id) || null;

// Fields that identify a funnel to something outside this browser, and so can
// never change once written. A traffic source, a CPV One report and a link in
// somebody's ad account all point at these; letting the editor overwrite one
// would silently detach a live campaign from its funnel.
const FROZEN = ['channel_id', 'slug', 'tracking_url'];

function keepFrozen(previous, next) {
  const tracking = { ...makeTracking(previous?.tracking), ...makeTracking(next?.tracking) };
  for (const field of FROZEN) {
    const was = previous?.tracking?.[field];
    if (was && tracking[field] !== was) {
      console.warn(`[cms] ignored an attempt to change tracking.${field} on funnel ${previous.id}`);
      tracking[field] = was;
    }
  }
  return tracking;
}

export function saveFunnel(funnel) {
  const all = listFunnels();
  const i = all.findIndex((f) => f.id === funnel.id);
  const previous = i === -1 ? null : all[i];

  const stamped = {
    ...funnel,
    createdAt: previous?.createdAt || funnel.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tracking: previous ? keepFrozen(previous, funnel) : ensureTracking(funnel, trackingOptions()).tracking,
  };

  if (i === -1) all.push(stamped);
  else all[i] = stamped;
  write(all);
  return stamped;
}

/**
 * A new funnel, with its channel id and tracking URL already minted.
 *
 * The id is generated here rather than when an admin first opens the tracking
 * panel, so it exists from the moment the funnel does and there is no window in
 * which a funnel is unattributable. `ensureTracking` only fills blanks, so a
 * retried create — a double-clicked button, a re-run request — cannot produce a
 * second id for the same record.
 */
export function createFunnel(name = 'Untitled funnel') {
  const funnel = ensureTracking(makeFunnel({ name }), trackingOptions());
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

  const name = `${source.name} (copy)`;
  const copy = ensureTracking(
    {
      ...source,
      id: uid(),
      name,
      createdAt: new Date().toISOString(),
      // A copy is a different funnel and must be attributable separately, so it
      // starts with no tracking at all and `ensureTracking` mints a fresh id.
      // Carrying the original's would credit two funnels' traffic to one.
      tracking: makeTracking({ slug: slugify(name) }),
      startStage: remap[source.startStage] || stages[0]?.id,
      stages,
    },
    trackingOptions()
  );
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
  const name = parsed.name || 'Imported funnel';
  // A fresh id, so importing a funnel you already have makes a second copy
  // rather than silently overwriting the one you are working on — and for the
  // same reason a fresh channel id, since the imported file's belongs to the
  // funnel it was exported from and may still be taking live traffic.
  const funnel = ensureTracking(
    withDefaults({
      ...parsed,
      id: uid(),
      name,
      createdAt: new Date().toISOString(),
      tracking: makeTracking({ slug: slugify(name) }),
    }),
    trackingOptions()
  );
  write([...listFunnels(), funnel]);
  return funnel;
}

/**
 * Record the outcome of a CPV One link against a funnel.
 *
 * Separate from `saveFunnel` because the editor autosaves the funnel it holds
 * in state, and a sync completing meanwhile would be overwritten by the next
 * autosave of a funnel that predates it. This reads, patches and writes in one
 * pass so the freshest record wins.
 */
export function patchTracking(id, patch) {
  const all = listFunnels();
  const i = all.findIndex((f) => f.id === id);
  if (i === -1) return null;
  const tracking = keepFrozen(all[i], { tracking: { ...all[i].tracking, ...patch } });
  all[i] = { ...all[i], tracking, updatedAt: new Date().toISOString() };
  write(all);
  return all[i];
}
