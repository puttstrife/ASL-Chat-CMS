import { useMemo, useState } from 'react';
import { AIGradientBorder } from '../../chat/components/AIGradientBorder.jsx';
import { ChatCard } from '../../chat/components/ChatCard.jsx';
import { useFunnel } from '../../chat/hooks/useFunnel.js';
import { sampleAnswersBefore } from '../model.js';
import { Btn } from '../ui.jsx';

// The funnel as the visitor sees it, beside the thing being edited.
//
// Two decisions worth stating. First, the preview plays through a speed
// multiplier that is NOT saved to the funnel — nobody can proof a seven-minute
// reading in real time, but the speed they test at must not become the speed
// that ships. Second, a CTA reports where it would have gone instead of
// navigating, because following it would throw away the editor.

const SPEEDS = [
  { label: 'Real time', value: 1 },
  { label: '4×', value: 4 },
  { label: '20×', value: 20 },
  { label: 'Instant', value: 200 },
];

export function PreviewPanel({ funnel, startAt, startBeat = 0, replayKey = 0, onClearStart }) {
  const [speed, setSpeed] = useState(20);
  const [handoff, setHandoff] = useState(null);
  const [runId, setRunId] = useState(0);

  // Previewing beat 0 of the funnel's own start is just a normal play, so it
  // gets no banner — anything else is a partial run and has to say so.
  const target = startAt ? funnel.stages.find((s) => s.id === startAt) : null;
  const fromStage = target && !(startAt === funnel.startStage && startBeat === 0) ? target : null;

  // Playing from the middle means nothing was ever answered, so anything the
  // script captured earlier is stood in for. Without this a stage opening on
  // "{name}" would render "…" and read as broken copy rather than as a preview
  // that simply started late.
  const seedAnswers = useMemo(
    () => (fromStage ? sampleAnswersBefore(funnel, fromStage.id) : undefined),
    [funnel, fromStage] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // A new object identity on every restart is what makes the engine re-boot;
  // the run id carries it, so a restart is a genuinely fresh reading rather
  // than a resumed one. Speed is passed as an option instead of being baked in,
  // so changing it does not restart what you were watching — and so the saved
  // pacing is never touched.
  const previewFunnel = useMemo(
    () => ({
      ...funnel,
      id: `${funnel.id}:preview:${runId}:${replayKey}:${startAt || ''}:${startBeat}`,
      startStage: startAt || funnel.startStage,
    }),
    // Copy edits should not restart the reading mid-proof, so this deliberately
    // does not depend on the whole funnel — Restart is the way back to the top.
    [funnel.id, runId, replayKey, startAt, startBeat] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const engine = useFunnel(previewFunnel, {
    speed,
    seedAnswers,
    startBeat,
    onFinish: ({ dock, params }) => {
      setHandoff({ url: dock.url, next: dock.next, params });
      // Returning false keeps the engine from navigating away from the editor.
      return false;
    },
  });

  const restart = () => { setHandoff(null); setRunId((n) => n + 1); };

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Btn variant="primary" onClick={restart}>↻ Restart</Btn>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSpeed(s.value)}
              className={`rounded-md px-2 py-1 text-[.7rem] font-semibold transition-colors ${
                speed === s.value ? 'bg-[#7c5cff] text-white' : 'text-white/45 hover:text-white/80'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="text-[.66rem] leading-tight text-white/30">Preview speed only — not saved</span>
      </div>

      {fromStage && (
        <div className="rounded-lg border border-[#7c5cff]/30 bg-[#7c5cff]/10 px-3 py-2 text-[.74rem] leading-relaxed text-white/70">
          <div className="flex items-start justify-between gap-2">
            <p>
              Playing from <strong className="text-white/90">{fromStage.title || 'this stage'}</strong>.
              {Object.keys(seedAnswers || {}).length > 0 && (
                <>
                  {' '}Earlier answers are stood in with samples —{' '}
                  <span className="text-white/50">
                    {Object.entries(seedAnswers)
                      .filter(([k]) => !k.endsWith('_slug'))
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')}
                  </span>
                  .
                </>
              )}
            </p>
            <button
              type="button"
              onClick={onClearStart}
              className="shrink-0 rounded border border-white/15 px-1.5 py-0.5 text-[.68rem] font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              From the top
            </button>
          </div>
        </div>
      )}

      {handoff && <HandoffNote handoff={handoff} funnel={funnel} />}

      {/* Flex, not `grid place-items-center`: a percentage height on a centred
          grid item does not resolve against the track, so the card fell back to
          its content height and hung past the bottom of the pane on a short
          window — clipping the dock, which is the part you most need to see.
          Flex stretch gives it a real height with no percentage involved. */}
      <div className="flex min-h-0 flex-1 justify-center rounded-xl border border-white/8 bg-[#06070c] p-3">
        <AIGradientBorder className="h-full max-h-[720px] w-full max-w-[400px] rounded-[22px] p-px">
          <ChatCard funnel={engine} persona={funnel.persona} audio={funnel.audio} sound={false} />
        </AIGradientBorder>
      </div>
    </div>
  );
}

// What the CTA would have done. Shown rather than performed, so the writer can
// check the link and the answers it carries without leaving the editor.
function HandoffNote({ handoff, funnel }) {
  const stageName = funnel.stages.find((s) => s.id === handoff.next)?.title;
  const query = new URLSearchParams(handoff.params).toString();
  return (
    <div className="rounded-lg border border-[#7c5cff]/30 bg-[#7c5cff]/10 px-3 py-2.5 text-[.74rem] leading-relaxed text-white/70">
      <p className="font-semibold text-[#a892ff]">CTA tapped.</p>
      {handoff.url ? (
        <p className="mt-1 break-all">
          Would send them to <code className="text-white/90">{handoff.url}{query ? `?${query}` : ''}</code>
        </p>
      ) : handoff.next ? (
        <p className="mt-1">
          No link set, so it played <strong className="text-white/90">{stageName || handoff.next}</strong> instead.
        </p>
      ) : (
        <p className="mt-1 text-[#ff9aa7]">No link and no stage — this button currently goes nowhere.</p>
      )}
    </div>
  );
}
