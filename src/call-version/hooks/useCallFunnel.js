import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAT_STAGES, interpolate } from '../stages.js';
import { fetchCallReading } from '../lib/api.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const REACTIONS = {
  love: ['💜', '💖', '🥰', '✨', '💫'],
  comfort: ['🕊️', '🙏', '💫', '🌙', '💜'],
  abundance: ['🌟', '🔮', '✨', '💫', '🌸'],
  question: ['🔮', '✨', '🌙', '💫'],
  default: ['💜', '✨', '🌙', '🙏', '💫', '💖'],
};

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];
const pickReaction = (text) => {
  const value = String(text || '').toLowerCase();
  if (/love|hope|wish|want|dream|heart|reconcile|family|together|happy|grateful|ready/.test(value)) return randomItem(REACTIONS.love);
  if (/afraid|worried|scared|anxious|lost|alone|lonely|pain|hurt|grief|sad|fear|struggl|tired|health/.test(value)) return randomItem(REACTIONS.comfort);
  if (/money|job|work|career|success|abundance|business|finance|home|move/.test(value)) return randomItem(REACTIONS.abundance);
  if (/\?|what|when|how|will|why|should|whether/.test(value)) return randomItem(REACTIONS.question);
  return randomItem(REACTIONS.default);
};

export function useCallFunnel(context) {
  const [messages, setMessages] = useState([]);
  const [dock, setDock] = useState({ type: 'none' });
  const answersRef = useRef({});
  const nextIdRef = useRef(0);
  const runningRef = useRef(false);
  const bootedRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const push = useCallback((message) => {
    const id = ++nextIdRef.current;
    setMessages((current) => [...current, { id, ...message }]);
    return id;
  }, []);

  const remove = useCallback((id) => {
    setMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  const scheduleReaction = useCallback((id, text) => {
    setTimeout(() => {
      if (!aliveRef.current) return;
      setMessages((current) => current.map((message) => (
        message.id === id ? { ...message, reaction: pickReaction(text) } : message
      )));
    }, 550);
  }, []);

  const revealLine = useCallback(async (line) => {
    const text = interpolate(line, context);
    const typingId = push({ who: 'typing' });
    await sleep(Math.max(500, Math.min(1450, 300 + text.length * 13)));
    if (!aliveRef.current) return;
    remove(typingId);
    push({ who: 'marisol', text, name: context.name });
    await sleep(240);
  }, [context, push, remove]);

  const personalize = useCallback(async () => {
    const pendingId = push({ who: 'reading' });
    const text = await fetchCallReading(context, answersRef.current);
    if (!aliveRef.current) return;
    remove(pendingId);
    if (text) push({ who: 'marisol', text, name: context.name });
  }, [context, push, remove]);

  const runStage = useCallback(async (stageId) => {
    if (runningRef.current) return;
    const stage = CHAT_STAGES[stageId];
    if (!stage) return;
    runningRef.current = true;
    setDock({ type: 'none' });

    for (let index = 0; index < stage.lines.length; index += 1) {
      await revealLine(stage.lines[index]);
      if (!aliveRef.current) return;
      if (stage.personalizeAfter === index) await personalize();
    }

    if (stage.buttons) setDock({ type: 'buttons', buttons: stage.buttons });
    else if (stage.input) setDock({ type: 'input', ...stage.input });
    else if (stage.next) setDock({ type: 'continue', next: stage.next });
    else if (stage.terminal) setDock({ type: 'terminal' });
    else setDock({ type: 'none' });
    runningRef.current = false;
  }, [personalize, revealLine]);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    runStage('1');
  }, [runStage]);

  const choose = useCallback((button) => {
    if (button.answerKey) answersRef.current[button.answerKey] = button.label;
    const id = push({ who: 'user', text: button.label });
    scheduleReaction(id, button.label);
    runStage(button.next);
  }, [push, runStage, scheduleReaction]);

  const submit = useCallback((key, value, next) => {
    answersRef.current[key] = value;
    const id = push({ who: 'user', text: value });
    scheduleReaction(id, value);
    runStage(next);
  }, [push, runStage, scheduleReaction]);

  return { messages, dock, choose, submit, advance: runStage };
}
