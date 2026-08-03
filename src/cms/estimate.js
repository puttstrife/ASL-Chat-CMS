// How long a reading takes to play.
//
// This mirrors the timing in `useFunnel.js` exactly — if that changes, this has
// to change with it, or the editor will quote a number the player does not
// honour. It walks the longest path through the branches rather than averaging,
// because the number a writer needs is "how long could this take", not "how long
// might it".

const PRE_MID = (240 + 700) / 2;
const POST_MID = (220 + 520) / 2;

function beatMs(beat, pacing, perChar) {
  const { minTyping = 900, maxTyping = 26000 } = pacing;
  if (beat.type === 'line') {
    const len = (beat.text || '').length;
    const forLength = Math.min(maxTyping, Math.max(minTyping, 300 + len * perChar));
    return PRE_MID + Math.max(forLength, (beat.seconds || 0) * 1000) + POST_MID;
  }
  if (beat.type === 'pause') return (beat.seconds || 0) * 1000;
  if (beat.type === 'image') return beat.src ? 700 : 0;
  if (beat.type === 'list') return (beat.items || []).filter(Boolean).length ? 700 : 0;
  return 0;
}

const stageMs = (stage, pacing, perChar) =>
  (stage.beats || []).reduce((sum, b) => sum + beatMs(b, pacing, perChar), 0);

// Longest path from a stage to the end. Memoised, and guarded against loops —
// a funnel that points back at itself is a mistake, not an infinite reading.
function longestFrom(id, byId, pacing, perChar, seen = new Set(), memo = new Map()) {
  if (!id || seen.has(id)) return 0;
  if (memo.has(id)) return memo.get(id);
  const stage = byId[id];
  if (!stage) return 0;

  const here = stageMs(stage, pacing, perChar);
  const d = stage.dock || {};
  const nexts = [];
  if (d.next) nexts.push(d.next);
  for (const o of d.options || []) if (o.next) nexts.push(o.next);

  const branch = nexts.length
    ? Math.max(...nexts.map((n) => longestFrom(n, byId, pacing, perChar, new Set([...seen, id]), memo)))
    : 0;

  const total = here + branch;
  memo.set(id, total);
  return total;
}

export function estimateFunnel(funnel) {
  if (!funnel?.stages?.length) return { min: 0, max: 0, mid: 0 };
  const byId = Object.fromEntries(funnel.stages.map((s) => [s.id, s]));
  const p = funnel.pacing || {};
  const lo = p.msPerCharMin ?? 30;
  const hi = p.msPerCharMax ?? 50;
  const at = (perChar) => longestFrom(funnel.startStage, byId, p, perChar);
  return { min: at(lo), mid: at((lo + hi) / 2), max: at(hi) };
}

export const fmtDuration = (ms) => {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (m < 1) return `${s}s`;
  return `${m}m ${String(rest).padStart(2, '0')}s`;
};

// The convention the funnel scripts use: 5 characters to a word.
export const toWpm = (msPerChar) => Math.round(60000 / (msPerChar * 5));
export const fromWpm = (wpm) => Math.round(60000 / (wpm * 5));
