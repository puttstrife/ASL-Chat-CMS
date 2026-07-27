import { useCallback, useEffect, useRef, useState } from 'react';
import { PROFILES, SKETCHES, STAGES, START_STAGE } from '../stages.js';
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

  // Reveal one Selene bubble: a beat of thought, then typing, then the bubble.
  // Duration scales with message length and varies per line, so short replies
  // land fast and long ones visibly take her a while — as a person would.
  const between = (min, max) => min + Math.random() * (max - min);

  const revealLine = async (text) => {
    const body = interpolate(text);

    // She reads/considers before the indicator even appears.
    await sleep(between(240, 700));

    const typingId = push({ who: 'typing' });
    // ~20-32ms per character, re-rolled each line, clamped so a very long
    // message never stalls the funnel and a two-word one still registers.
    const perChar = between(20, 32);
    await sleep(Math.min(5400, Math.max(700, 380 + body.length * perChar)));

    remove(typingId);
    push({ who: 'selene', text: body });
    await sleep(between(220, 520));
  };

  // Sketch reveals use the portrait set matching the chosen preference.
  // The finished portrait arrives blurred; `unlocked` re-sends it in the clear.
  const revealSketch = async ({ sketch, unlocked }) => {
    const set = SKETCHES[answers.current.preference] || SKETCHES.anyone;
    const complete = sketch === set.length - 1;
    push({ who: 'sketch', src: set[sketch], complete, locked: complete && !unlocked });
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
      else if (beat.sketch !== undefined) await revealSketch(beat);
      else if (beat.reveal) { push({ who: 'reveal', ...beat.reveal }); await sleep(300); }
      else if (beat.profile) {
        const profile = PROFILES[answers.current.preference] || PROFILES.anyone;
        push({ who: 'profile', ...profile, revealed: Boolean(beat.unredacted) });
        await sleep(700);
      }
    }

    if (stage.buttons) setDock({ type: 'buttons', buttons: stage.buttons, trust: stage.trust });
    else if (stage.input) setDock({ type: 'input', ...stage.input });
    else if (stage.datePicker) setDock({ type: 'date', ...stage.datePicker });
    else if (stage.select) setDock({ type: 'select', ...stage.select });
    else if (stage.next) setDock({ type: 'continue', next: stage.next });
    else setDock({ type: 'none' });

    runningRef.current = false;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──
  const chooseButton = (b) => {
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
