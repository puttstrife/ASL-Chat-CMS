import { useCallback, useEffect, useRef, useState } from 'react';
import { SCRIPTS, DEFAULT_SCRIPT } from '../scripts/index.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const formatDob = ({ month, day, year }) => `${MONTHS[month - 1]} ${day}, ${year}`;

export function useFunnel(scriptKey = DEFAULT_SCRIPT) {
  const script = SCRIPTS[scriptKey] || SCRIPTS[DEFAULT_SCRIPT];
  const { STAGES, START_STAGE } = script;

  const [messages, setMessages] = useState([]); // {id, who, …}
  const [dock, setDock] = useState({ type: 'none' });

  const answers = useRef({});
  const idRef = useRef(0);
  const runningRef = useRef(false);
  const bootedRef = useRef(false);

  // {name}/{dob} resolve from what the user has told us so far.
  const interpolate = useCallback(
    (t) => t.replace(/\{name\}/g, answers.current.name || 'friend').replace(/\{dob\}/g, answers.current.dob || 'your birth date'),
    []
  );

  // Which portrait set the sketches come from. "I'm open to either" is decided
  // once, here, rather than per render — a face that changed halfway through
  // the reading would undo the whole thing.
  const gender = useCallback(() => {
    const answer = answers.current.preference;
    if (answer === 'man' || answer === 'woman') return answer;
    if (!answers.current.resolvedGender) {
      answers.current.resolvedGender = Math.random() < 0.5 ? 'man' : 'woman';
    }
    return answers.current.resolvedGender;
  }, []);

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
    if (/love|hope|man|woman|anyone|soulmate|heart|ready|yes/.test(t)) return rand(REACTIONS.love);
    if (/afraid|worried|scared|alone|lonely|sad|fear|no|not sure/.test(t)) return rand(REACTIONS.comfort);
    if (/\?/.test(t)) return rand(REACTIONS.question);
    return rand(REACTIONS.default);
  };
  const scheduleReaction = (id, text) => setTimeout(() => updateMsg(id, { reaction: pickReaction(text) }), 550);

  // Hold the typing indicator on its own, without producing a bubble. The
  // script uses this to stage the pause before an image lands, with a label
  // saying what she is doing ("Selene is drawing").
  const holdTyping = async (ms, label) => {
    const typingId = push({ who: 'typing', label });
    await sleep(ms);
    remove(typingId);
  };

  // Reveal one Selene bubble: a beat of thought, then typing, then the bubble.
  // Duration scales with message length and varies per line, so short replies
  // land fast and long ones visibly take her a while — as a person would.
  const between = (min, max) => min + Math.random() * (max - min);

  // Selene is a middle-aged artist, not a typist, and the audience skews older
  // too. 260-340ms per character is 35-46wpm — an ordinary adult at a keyboard,
  // which is who she is meant to be.
  //
  // The ceiling is high on purpose. Capping it low made the longest messages
  // proportionally the fastest, which is backwards: those are the ones that
  // should visibly take her a while. Long lines in the script are split at
  // their own punctuation instead, so no single message sits for half a minute.
  const MS_PER_CHAR = [260, 340];
  const MIN_TYPING = 900;
  const MAX_TYPING = 26000;

  const revealLine = async (text, { typing, label } = {}) => {
    const body = interpolate(text);

    // She reads/considers before the indicator even appears.
    await sleep(between(240, 700));

    // Re-rolled each line, clamped so a very long message never stalls the
    // funnel and a two-word one still registers. A script may ask for longer
    // — a deliberate pause — but never for less than the text would take.
    const perChar = between(...MS_PER_CHAR);
    const forLength = Math.min(MAX_TYPING, Math.max(MIN_TYPING, 300 + body.length * perChar));

    await holdTyping(Math.max(forLength, typing ?? 0), label);
    push({ who: 'selene', text: body });
    await sleep(between(220, 520));
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
      else if (beat.line !== undefined) await revealLine(beat.line, beat);
      else if (beat.wait !== undefined) await holdTyping(beat.wait, beat.label);
      else if (beat.image) {
        const src = beat.image.replace('{gender}', gender());
        push({ who: 'sketch', src, complete: Boolean(beat.locked), locked: Boolean(beat.locked) });
        await sleep(700);
      }
      else if (beat.traits) {
        push({ who: 'traits', traits: beat.traits });
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
  }, [STAGES, gender]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──
  // A button that leads nowhere is a dead end, so don't echo the tap — an
  // unanswered message from the visitor reads as the app having broken.
  const chooseButton = (b) => {
    if (!b.next) return;
    // A button may also record an answer — the gender question does.
    if (b.preference) answers.current.preference = b.preference;
    const id = push({ who: 'user', text: b.label });
    scheduleReaction(id, b.label);
    runStage(b.next);
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
    runStage(START_STAGE);
  }, [runStage, START_STAGE]);

  return { messages, dock, answers: answers.current, chooseButton, submitInput, submitDate, submitSelect, advance };
}
