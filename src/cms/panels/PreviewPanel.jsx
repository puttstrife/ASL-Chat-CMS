import { useMemo, useState } from 'react';
import { AIGradientBorder } from '../../chat/components/AIGradientBorder.jsx';
import { ChatCard } from '../../chat/components/ChatCard.jsx';
import { useFunnel } from '../../chat/hooks/useFunnel.js';
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

export function PreviewPanel({ funnel }) {
  const [speed, setSpeed] = useState(20);
  const [handoff, setHandoff] = useState(null);
  const [runId, setRunId] = useState(0);

  // A new object identity on every restart or speed change is what makes the
  // engine re-boot; the id carries the run so a restart is a genuinely fresh
  // reading rather than a resumed one.
  const previewFunnel = useMemo(
    () => ({
      ...funnel,
      id: `${funnel.id}:preview:${runId}:${speed}`,
      pacing: {
        ...funnel.pacing,
        msPerCharMin: funnel.pacing.msPerCharMin / speed,
        msPerCharMax: funnel.pacing.msPerCharMax / speed,
        minTyping: funnel.pacing.minTyping / speed,
        maxTyping: funnel.pacing.maxTyping / speed,
      },
    }),
    // Copy edits should not restart the reading mid-proof, so this deliberately
    // does not depend on the whole funnel — the Restart button is the way back
    // to the top after an edit.
    [funnel.id, runId, speed] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const engine = useFunnel(previewFunnel, {
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

      {handoff && <HandoffNote handoff={handoff} funnel={funnel} />}

      <div className="grid min-h-0 flex-1 place-items-center rounded-xl border border-white/8 bg-[#06070c] p-3">
        <AIGradientBorder className="h-full max-h-[720px] w-full max-w-[400px] rounded-[22px] p-px">
          <ChatCard funnel={engine} persona={funnel.persona} sound={false} />
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
