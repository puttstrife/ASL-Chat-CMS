import { useCallback, useEffect, useRef, useState } from 'react';
import { STAGES, START_STAGE } from '../stages.js';
import { getConfig, fetchReading } from '../lib/api.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function useFunnel() {
  // Session context from URL params (carried from the funnel).
  const params = new URLSearchParams(location.search);
  const ctx = useRef({
    name: (params.get('name') || 'Elena').trim().slice(0, 60),
    city: (params.get('city') || '').trim().slice(0, 80),
    dob: (params.get('dob') || '').trim(),
  }).current;

  const [messages, setMessages] = useState([]); // {id, who, text}
  const [dock, setDock] = useState({ type: 'none' });
  const [config, setConfig] = useState({ ttsEnabled: false, liveEnabled: false, readingEnabled: false });
  const [memoModal, setMemoModal] = useState(null); // Stage 3 center popup: {text, enabled}

  const answers = useRef({});
  const idRef = useRef(0);
  const runningRef = useRef(false);
  const configRef = useRef(config);
  const bootedRef = useRef(false);

  useEffect(() => { configRef.current = config; }, [config]);

  const interpolate = useCallback(
    (t) => t.replace(/\{name\}/g, ctx.name).replace(/\{city\}/g, ctx.city),
    [ctx]
  );
  const usableLines = (lines) => lines.filter((l) => (l.includes('{city}') ? Boolean(ctx.city) : true));

  const nextId = () => ++idRef.current;
  const push = (msg) => { const id = nextId(); setMessages((m) => [...m, { id, ...msg }]); return id; };
  const remove = (id) => setMessages((m) => m.filter((x) => x.id !== id));
  const updateMsg = (id, patch) => setMessages((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  // ── Emoji reactions on user messages (all positive; keyword → set → random) ──
  const REACTIONS = {
    love: ['💜', '💖', '🥰', '✨', '💫'],
    comfort: ['🕊️', '🙏', '💫', '🌙', '💜'],
    abundance: ['🌟', '🔮', '✨', '💫', '🌸'],
    question: ['🔮', '✨', '🌙', '💫'],
    default: ['💜', '✨', '🌙', '🙏', '💫', '💖'],
  };
  const rand = (a) => a[Math.floor(Math.random() * a.length)];
  const pickReaction = (text) => {
    const t = (text || '').toLowerCase();
    if (/love|hope|wish|want|dream|heart|reconcile|family|together|happy|grateful|ready/.test(t)) return rand(REACTIONS.love);
    if (/afraid|worried|scared|anxious|lost|alone|lonely|pain|hurt|grief|sad|fear|struggl|tired/.test(t)) return rand(REACTIONS.comfort);
    if (/money|job|work|career|success|abundance|business|finance|home|move/.test(t)) return rand(REACTIONS.abundance);
    if (/\?|what|when|how|will|why|should|whether/.test(t)) return rand(REACTIONS.question);
    return rand(REACTIONS.default);
  };
  // Selene "reacts" a beat after the user sends.
  const scheduleReaction = (id, text) => setTimeout(() => updateMsg(id, { reaction: pickReaction(text) }), 550);

  // Reveal one Selene bubble: typing indicator → bubble. (Voice is Stage 3 only.)
  const revealLine = async (text) => {
    const typingId = push({ who: 'typing' });
    const readMs = Math.min(2200, 500 + interpolate(text).length * 22);
    await sleep(Math.max(650, readMs * 0.5));
    remove(typingId);
    push({ who: 'selene', text: interpolate(text) });
    await sleep(360);
  };

  const personalize = async (userText) => {
    const pendingId = push({ who: 'reading-pending' });
    const text = await fetchReading(ctx.name, userText);
    remove(pendingId);
    if (text) push({ who: 'selene', text });
  };

  // ── State machine ──
  const runStage = useCallback(async (id) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setDock({ type: 'none' });

    const stage = STAGES[id];
    if (!stage) { runningRef.current = false; return; }

    if (stage.label && !stage.memo) push({ who: 'memo-label', text: stage.label });

    const lines = usableLines(stage.lines);

    // Voice-memo stage (Stage 3): collapse the chat into a full voice-memo
    // view (avatar + player + burden input). No dock while it's up.
    if (stage.memo) {
      const combined = lines.map(interpolate).join('  ');
      setMemoModal({ text: combined, enabled: configRef.current.ttsEnabled, input: stage.input });
      runningRef.current = false;
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      await revealLine(lines[i]);
      if (stage.personalizeAfter === i && answers.current[stage.personalizeInput]) {
        await personalize(answers.current[stage.personalizeInput]);
      }
    }

    if (stage.buttons) setDock({ type: 'buttons', buttons: stage.buttons });
    else if (stage.input) setDock({ type: 'input', ...stage.input });
    else if (stage.next) setDock({ type: 'continue', next: stage.next });
    else setDock({ type: 'none' });

    runningRef.current = false;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──
  const chooseButton = (b) => { const id = push({ who: 'user', text: b.label }); scheduleReaction(id, b.label); runStage(b.next); };
  const submitInput = (key, value, next) => {
    answers.current[key] = value;
    const id = push({ who: 'user', text: value });
    scheduleReaction(id, value);
    runStage(next);
  };
  const advance = (next) => runStage(next);
  const submitMemo = (value) => {
    const inp = memoModal?.input;
    setMemoModal(null);
    if (!inp) return;
    answers.current[inp.key] = value;
    const id = push({ who: 'user', text: value });
    scheduleReaction(id, value);
    runStage(inp.next);
  };

  // ── Boot ──
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    (async () => {
      const cfg = await getConfig();
      setConfig(cfg);
      configRef.current = cfg;
      runStage(START_STAGE);
    })();
  }, [runStage]);

  return { ctx, messages, dock, config, chooseButton, submitInput, advance, memoModal, submitMemo };
}
