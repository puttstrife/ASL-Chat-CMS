import { useCallback, useEffect, useRef, useState } from 'react';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const formatDob = ({ month, day, year }) => `${MONTHS[month - 1]} ${day}, ${year}`;
// The form an offer page expects on a query string.
export const slugDob = ({ month, day, year }) => `${year}-${MONTHS[month - 1]}-${day}`;

/**
 * What goes on the CTA URL, and in what order of precedence.
 *
 * Pulled out of the hook because this is the rule attribution actually rests
 * on, and a rule worth testing should not need React rendered to reach it.
 *
 * Lowest to highest:
 *
 *   1. everything that arrived on the inbound URL. The chat is one hop between
 *      the campaign URL and the offer, so click ids, affiliate parameters and
 *      utm_* have to survive it. Not ours to interpret, only to carry.
 *   2. the writer's declared pass keys, which may deliberately overwrite an
 *      inbound value of the same name.
 *   3. the channel id, which is not the writer's to forget — without it the
 *      offer page cannot tell CPV One which funnel earned the conversion.
 */
export function ctaParams({ passThrough, passKeys, answers } = {}) {
  const params = { ...(passThrough || {}) };
  for (const k of passKeys || []) if (answers?.[k] != null) params[k] = answers[k];
  if (answers?.channel_id) params.channel_id = answers.channel_id;
  return params;
}

// Plays a funnel — the JSON the CMS produces, not a hand-written module.
//
// `onFinish` fires when a CTA is tapped, so the host decides what a CTA means:
// navigate, in the real player; stop and report, in the editor preview.
//
// `speed` divides every wait, so the editor can play a reading faster than it
// ships. It has to cover the thinking pauses between messages as well as the
// typing itself: those are a fixed ~0.8s per message, so scaling only the
// typing left a fifteen-message stage taking thirteen seconds however fast the
// control claimed to be.
export function useFunnel(funnel, { onFinish, speed = 1, seedAnswers, passThrough, startBeat = 0 } = {}) {
  const [messages, setMessages] = useState([]);
  const [dock, setDock] = useState({ type: 'none' });

  const answers = useRef({});
  const idRef = useRef(0);
  const runningRef = useRef(false);
  const bootedRef = useRef(null);
  // Bumped whenever the funnel is replaced or restarted, so a run still playing
  // from the previous version can tell it is stale and bail. Without it,
  // editing copy mid-preview leaves two readings interleaving.
  const runRef = useRef(0);
  const rateRef = useRef(1);
  // Held in a ref, not a dependency: this is a fresh object on every render, so
  // depending on it would reboot the reading continuously.
  const seedRef = useRef(seedAnswers);
  seedRef.current = seedAnswers;
  // How far into the FIRST stage to begin, so the editor can play from one
  // message rather than from the top of the stage holding it. Consumed once —
  // every stage after the first plays whole.
  const startBeatRef = useRef(0);

  const stages = useRef({});
  stages.current = Object.fromEntries((funnel?.stages || []).map((s) => [s.id, s]));

  const pacing = funnel?.pacing || {};
  const MS_PER_CHAR = [pacing.msPerCharMin ?? 30, pacing.msPerCharMax ?? 50];
  const MIN_TYPING = pacing.minTyping ?? 900;
  const MAX_TYPING = pacing.maxTyping ?? 26000;
  const personaName = funnel?.persona?.name || 'She';

  // {key} resolves from whatever the visitor has answered so far. Any captured
  // key works, so a funnel that asks for a city can say {city} later.
  const interpolate = useCallback((t) => {
    let out = String(t ?? '');
    for (const [k, v] of Object.entries(answers.current)) out = out.split(`{${k}}`).join(v ?? '');
    // Anything still unfilled reads as a gap rather than as raw syntax.
    return out.replace(/\{[a-z0-9_]+\}/gi, '…');
  }, []);

  const nextId = () => ++idRef.current;
  const push = (msg) => { const id = nextId(); setMessages((m) => [...m, { id, ...msg }]); return id; };
  const remove = (id) => setMessages((m) => m.filter((x) => x.id !== id));
  const updateMsg = (id, patch) => setMessages((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  // ── Emoji reactions on the visitor's own messages ──
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

  // Every wait goes through `wait`, so the speed control cannot miss one — and
  // `between` stays a plain random, since it also picks the per-character rate,
  // which must not be divided a second time on its way through `wait`.
  //
  // Read from a ref, not the closure: a run already in flight was started by an
  // earlier render, and changing the speed should take effect on the very next
  // pause rather than only after a restart.
  rateRef.current = speed > 0 ? speed : 1;
  const wait = (ms) => sleep(ms / rateRef.current);
  const between = (min, max) => min + Math.random() * (max - min);

  // `token` is the run this belongs to. A beat that was already mid-await when
  // the reading restarted has to notice before it pushes, or its bubble lands
  // in the transcript of the run that replaced it — carrying the old answers
  // with it, which is what made a restarted preview look haunted.
  const stale = (token) => token !== undefined && runRef.current !== token;

  const holdTyping = async (ms, label, token) => {
    if (stale(token)) return;
    const typingId = push({ who: 'typing', label: `${personaName} ${label || 'is typing'}` });
    await wait(ms);
    remove(typingId);
  };

  // A beat of thought, then the indicator, then the bubble.
  //
  // Wait scales with message length, so short replies land fast and long ones
  // visibly take a while. A beat may name its own duration; that is a FLOOR,
  // not a replacement — a deliberate pause is honoured, but no message ever
  // flashes past in less time than typing it would take.
  const revealLine = async (text, seconds, token) => {
    const body = interpolate(text);
    await wait(between(240, 700));
    if (stale(token)) return;
    const perChar = between(...MS_PER_CHAR);
    const forLength = Math.min(MAX_TYPING, Math.max(MIN_TYPING, 300 + body.length * perChar));
    await holdTyping(Math.max(forLength, (seconds || 0) * 1000), undefined, token);
    if (stale(token)) return;
    push({ who: 'persona', text: body });
    await wait(between(220, 520));
  };

  const runStage = useCallback(async (id) => {
    if (runningRef.current) return;
    runningRef.current = true;
    const myRun = runRef.current;
    setDock({ type: 'none' });

    const stage = stages.current[id];
    if (!stage) { runningRef.current = false; return; }

    const skip = startBeatRef.current;
    startBeatRef.current = 0;

    for (const beat of (stage.beats || []).slice(skip)) {
      if (runRef.current !== myRun) { runningRef.current = false; return; }
      if (beat.type === 'line') await revealLine(beat.text, beat.seconds, myRun);
      else if (beat.type === 'pause') await holdTyping((beat.seconds || 0) * 1000, beat.label, myRun);
      else if (beat.type === 'image') {
        if (beat.src) { push({ who: 'image', src: interpolate(beat.src), locked: Boolean(beat.locked) }); await wait(700); }
      } else if (beat.type === 'list') {
        const items = (beat.items || []).filter(Boolean).map(interpolate);
        if (items.length) { push({ who: 'list', items }); await wait(700); }
      }
    }

    if (runRef.current !== myRun) { runningRef.current = false; return; }

    const d = stage.dock || { type: 'end' };
    if (d.type === 'continue') setDock({ type: 'continue', next: d.next });
    else if (d.type === 'end' || d.type === 'none') setDock({ type: 'none' });
    else setDock({ ...d });

    runningRef.current = false;
  }, [funnel]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──
  const chooseButton = (b) => {
    // A button may record an answer as well as route — that is how a funnel
    // captures a choice (which portrait set, which path) without an input.
    if (b.setKey) {
      if (b.setRandom?.length) {
        // Decided once and held for the session. A value that changed partway
        // through would undo everything said before it.
        if (!answers.current[b.setKey]) {
          answers.current[b.setKey] = b.setRandom[Math.floor(Math.random() * b.setRandom.length)];
        }
      } else if (b.setValue !== undefined) {
        answers.current[b.setKey] = b.setValue;
      }
    }
    // A button that leads nowhere is a dead end; echoing the tap would read as
    // the app having broken rather than as the funnel having ended.
    if (!b.next) return;
    const id = push({ who: 'user', text: b.label });
    scheduleReaction(id, b.label);
    runStage(b.next);
  };

  const submitSelect = (key, option, next) => {
    if (key) answers.current[key] = option.value ?? option.label;
    const id = push({ who: 'user', text: option.label });
    scheduleReaction(id, option.label);
    if (next) runStage(next);
  };

  const submitInput = (key, value, next) => {
    if (key) answers.current[key] = value;
    const id = push({ who: 'user', text: value });
    scheduleReaction(id, value);
    if (next) runStage(next);
  };

  const submitDate = (key, parts, next) => {
    const text = formatDob(parts);
    if (key) {
      answers.current[key] = text;
      answers.current[`${key}_slug`] = slugDob(parts);
    }
    const id = push({ who: 'user', text });
    scheduleReaction(id, text);
    if (next) runStage(next);
  };

  const advance = (next) => runStage(next);

  // The CTA. A URL wins if one is set; otherwise it falls through to a stage,
  // which is how a funnel closes on scripted copy while a real offer page is
  // still being built.
  const finish = (d) => {
    const id = push({ who: 'user', text: d.label });
    scheduleReaction(id, d.label);
    const params = ctaParams({ passThrough, passKeys: d.passKeys, answers: answers.current });
    // A host returning false takes over — the preview uses this to report the
    // hand-off instead of navigating away from the editor.
    if (onFinish && onFinish({ dock: d, answers: { ...answers.current }, params }) === false) return;
    if (d.url) {
      try {
        const url = new URL(d.url, window.location.origin);
        for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
        window.location.href = url.toString();
      } catch {
        /* a malformed URL should not take the reading down */
      }
    } else if (d.next) {
      runStage(d.next);
    }
  };

  const boot = useCallback(() => {
    runRef.current += 1;
    runningRef.current = false;
    answers.current = { ...(seedRef.current || {}) };
    startBeatRef.current = startBeat || 0;
    idRef.current = 0;
    setMessages([]);
    setDock({ type: 'none' });
    // Let the stale run observe the bumped token before the new one starts.
    const token = runRef.current;
    setTimeout(() => { if (runRef.current === token) runStage(funnel?.startStage); }, 0);
  }, [funnel, runStage]);

  useEffect(() => {
    if (!funnel) return;
    // Re-boot when the funnel identity changes, not on every keystroke in the
    // editor — the preview has its own explicit restart for that.
    if (bootedRef.current === funnel.id) return;
    bootedRef.current = funnel.id;
    boot();
  }, [funnel, boot]);

  return { messages, dock, answers: answers.current, chooseButton, submitInput, submitDate, submitSelect, advance, finish, restart: boot };
}
