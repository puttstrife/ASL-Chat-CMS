import { useCallback, useEffect, useRef, useState } from 'react';
import { SKETCHES, STAGES, START_STAGE } from '../stages.js';
import { getConfig } from '../lib/api.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const formatDob = ({ month, day, year }) => `${MONTHS[month - 1]} ${day}, ${year}`;

export function useFunnel() {
  const [messages, setMessages] = useState([]); // {id, who, …}
  const [dock, setDock] = useState({ type: 'none' });
  const [config, setConfig] = useState({ ttsEnabled: false, readingEnabled: false });

  const answers = useRef({});
  const idRef = useRef(0);
  const runningRef = useRef(false);
  const bootedRef = useRef(false);

  // {name}/{dob} resolve from what the user has told us so far.
  const interpolate = useCallback(
    (t) => t.replace(/\{name\}/g, answers.current.name || 'friend').replace(/\{dob\}/g, answers.current.dob || 'your birth date'),
    []
  );

  const nextId = () => ++idRef.current;
  const push = (msg) => { const id = nextId(); setMessages((m) => [...m, { id, ...msg }]); return id; };
  const remove = (id) => setMessages((m) => m.filter((x) => x.id !== id));
  const updateMsg = (id, patch) => setMessages((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  // ── Emoji reactions on user messages (all positive; keyword → set → random) ──
  const REACTIONS = {
    love: ['💜', '💖', '🥰', '✨', '💫'],
    comfort: ['🕊️', '🙏', '💫', '🌙', '💜'],
    question: ['🔮', '✨', '🌙', '💫'],
    default: ['💜', '✨', '🌙', '🙏', '💫', '💖'],
  };
  const rand = (a) => a[Math.floor(Math.random() * a.length)];
  const pickReaction = (text) => {
    const t = (text || '').toLowerCase();
    if (/love|hope|man|woman|anyone|soulmate|heart|ready/.test(t)) return rand(REACTIONS.love);
    if (/afraid|worried|scared|alone|lonely|sad|fear/.test(t)) return rand(REACTIONS.comfort);
    if (/\?/.test(t)) return rand(REACTIONS.question);
    return rand(REACTIONS.default);
  };
  const scheduleReaction = (id, text) => setTimeout(() => updateMsg(id, { reaction: pickReaction(text) }), 550);

  // Reveal one Selene bubble: typing indicator → bubble.
  const revealLine = async (text) => {
    const typingId = push({ who: 'typing' });
    const readMs = Math.min(2200, 500 + interpolate(text).length * 22);
    await sleep(Math.max(650, readMs * 0.5));
    remove(typingId);
    push({ who: 'selene', text: interpolate(text) });
    await sleep(360);
  };

  // A status label sits on screen while its "work" happens, then settles.
  const revealStatus = async (label) => {
    push({ who: 'status', text: label });
    await sleep(1500);
  };

  // Sketch reveals use the portrait set matching the chosen preference.
  const revealSketch = async ({ sketch, caption }) => {
    const set = SKETCHES[answers.current.preference] || SKETCHES.anyone;
    push({ who: 'sketch', src: set[sketch], caption, final: sketch === set.length - 1 });
    await sleep(700);
  };

  // ── State machine ──
  const runStage = useCallback(async (id) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setDock({ type: 'none' });

    const stage = STAGES[id];
    if (!stage) { runningRef.current = false; return; }

    for (const beat of stage.beats || []) {
      if (typeof beat === 'string') await revealLine(beat);
      else if (beat.status) await revealStatus(beat.status);
      else if (beat.sketch !== undefined) await revealSketch(beat);
    }

    if (stage.reveal) {
      push({ who: 'reveal', ...stage.reveal });
      await sleep(300);
    }

    if (stage.buttons) setDock({ type: 'buttons', buttons: stage.buttons });
    else if (stage.input) setDock({ type: 'input', ...stage.input });
    else if (stage.datePicker) setDock({ type: 'date', ...stage.datePicker });
    else if (stage.select) setDock({ type: 'select', ...stage.select });
    else if (stage.next) setDock({ type: 'continue', next: stage.next });
    else setDock({ type: 'none' });

    runningRef.current = false;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──
  const chooseButton = (b) => {
    if (b.action === 'save') return; // "Save My Sketch" — wired up separately.
    const id = push({ who: 'user', text: b.label });
    scheduleReaction(id, b.label);
    if (b.next) runStage(b.next);
  };

  const submitSelect = (key, option, next) => {
    answers.current[key] = option.value;
    const id = push({ who: 'user', text: option.label });
    scheduleReaction(id, option.label);
    runStage(next);
  };

  const submitInput = (key, value, next) => {
    answers.current[key] = value;
    const id = push({ who: 'user', text: value });
    scheduleReaction(id, value);
    runStage(next);
  };

  const submitDate = (key, parts, next) => {
    const text = formatDob(parts);
    answers.current[key] = text;
    const id = push({ who: 'user', text });
    scheduleReaction(id, text);
    runStage(next);
  };

  const advance = (next) => runStage(next);

  // ── Boot ──
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    (async () => {
      setConfig(await getConfig());
      runStage(START_STAGE);
    })();
  }, [runStage]);

  return { messages, dock, config, answers: answers.current, chooseButton, submitInput, submitDate, submitSelect, advance };
}
