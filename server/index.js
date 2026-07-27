import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist'); // Vite build output
const CACHE_DIR = path.join(__dirname, '.cache');

const {
  PORT = 3000,
  ELEVENLABS_API_KEY,
  ELEVENLABS_VOICE_ID,
  ELEVENLABS_MODEL_ID = 'eleven_turbo_v2_5',
  ELEVENLABS_AGENT_ID,
  ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL = 'claude-haiku-4-5',
} = process.env;

const ttsEnabled = Boolean(ELEVENLABS_API_KEY && ELEVENLABS_VOICE_ID);
const liveEnabled = Boolean(ELEVENLABS_API_KEY && ELEVENLABS_AGENT_ID);
const readingEnabled = Boolean(ANTHROPIC_API_KEY);

fs.mkdirSync(CACHE_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '32kb' }));
app.use(express.static(DIST_DIR));

// ── Feature flags so the client can hide voice / live-call when keys are absent ──
app.get('/api/config', (_req, res) => {
  res.json({ ttsEnabled, liveEnabled, readingEnabled });
});

// ── Scripted TTS: ElevenLabs text-to-speech, disk-cached by text hash ──
app.post('/api/tts', async (req, res) => {
  if (!ttsEnabled) return res.status(503).json({ error: 'tts_disabled' });
  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'empty_text' });
  if (text.length > 3000) return res.status(400).json({ error: 'text_too_long' });

  const key = crypto
    .createHash('sha1')
    .update(`${ELEVENLABS_VOICE_ID}:${ELEVENLABS_MODEL_ID}:${text}`)
    .digest('hex');
  const cachePath = path.join(CACHE_DIR, `${key}.mp3`);

  res.set('Content-Type', 'audio/mpeg');
  if (fs.existsSync(cachePath)) {
    return fs.createReadStream(cachePath).pipe(res);
  }

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_MODEL_ID,
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.35 },
        }),
      }
    );

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '');
      console.error('ElevenLabs TTS error', upstream.status, detail);
      return res.status(502).json({ error: 'tts_upstream_error' });
    }

    // Tee the stream: send to client and write to cache simultaneously.
    const cacheStream = fs.createWriteStream(cachePath);
    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
      cacheStream.write(value);
    }
    cacheStream.end();
    res.end();
  } catch (err) {
    console.error('TTS failure', err);
    if (!res.headersSent) res.status(502).json({ error: 'tts_failure' });
    else res.end();
    fs.rm(cachePath, { force: true }, () => {});
  }
});

// ── Stage 5→6 on-rails personalization of the reflected reading ──
// Follows the scripted "Yes. I can feel it now..." lead-in — so it must NOT
// repeat that opener.
const readingFallback = (name) =>
  `What you carry has been trying to reach you for some time, ${name} — longer than you ` +
  'probably realized while you were living through it. Something has been sitting in the way, ' +
  'quietly redirecting it, softening it, pulling it just slightly off course before it could ' +
  'fully land. Not gone. I want to be very clear with you about that. Not gone. Just blocked.';

app.post('/api/reading', async (req, res) => {
  const name = String(req.body?.name || 'friend').slice(0, 60);
  const userText = String(req.body?.userText || '').trim().slice(0, 800);

  if (!readingEnabled || !userText) {
    return res.json({ text: readingFallback(name), source: 'fallback' });
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const system =
      "You are Selene, a warm, unhurried intuitive reader in a scripted experience. " +
      "The user has just shared what they have been hoping for. Reflect it back in ONE short " +
      "paragraph (3-5 sentences), in Selene's gentle, mystical voice. You MUST follow this shape: " +
      "acknowledge that what they described has been trying to reach them, then say it has been " +
      "BLOCKED (not gone) by some old pattern or weight sitting in its path. Weave in a phrase or " +
      "two from their own words so it feels personal. Do NOT give concrete predictions, dates, " +
      "medical/financial/legal advice, or promises. Do NOT mention being an AI. This reply comes " +
      "right after Selene has already said 'Yes. I can feel it now, more clearly than before.' — " +
      "so do NOT open with that or any restatement of it; continue naturally from it. Address them " +
      `as ${name}. Keep it under 90 words.`;

    const msg = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 260,
      temperature: 0.7,
      system,
      messages: [{ role: 'user', content: userText }],
    });

    const text = msg.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    res.json({ text: text || readingFallback(name), source: text ? 'llm' : 'fallback' });
  } catch (err) {
    console.error('Reading failure', err);
    res.json({ text: readingFallback(name), source: 'fallback' });
  }
});

// ── Call-first variant: reflect the three private-chat answers at Stage 7. ──
// This endpoint is intentionally separate from /api/reading so the original
// chat journey and its prompt remain unchanged.
const cleanReadingFragment = (value, fallback) =>
  String(value || fallback).replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');

const callReadingFallback = (name, area, change, desire) =>
  `What you shared about ${area || 'what feels heaviest'} connects closely with the change you have been hoping for, ${name}. ` +
  `You described it this way: “${cleanReadingFragment(change, 'something important finally shifting')}.” ` +
  `Underneath it, you said you want “${cleanReadingFragment(desire, 'the thing you want most')}.” That desire still feels present, not lost. ` +
  'Something old has been sitting in its path and softening its momentum before it can fully reach you. ' +
  'I want to be clear: it does not feel gone, only blocked.';

app.post('/api/call-reading', async (req, res) => {
  const name = String(req.body?.name || 'friend').trim().slice(0, 60);
  const area = String(req.body?.area || '').trim().slice(0, 80);
  const change = String(req.body?.change || '').trim().slice(0, 800);
  const desire = String(req.body?.desire || '').trim().slice(0, 800);
  const fallback = callReadingFallback(name, area, change, desire);

  if (!readingEnabled || (!area && !change && !desire)) {
    return res.json({ text: fallback, source: 'fallback' });
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const system =
      "You are Selene, a warm and unhurried intuitive reader in a fictional scripted experience. " +
      "The user selected an area that feels heavy and described what they hope changes and what they want most. " +
      "Reflect their own words in one short paragraph of 3-5 sentences. Continue naturally after Selene has said " +
      "'Yes... I can feel it.' Say that the desire still feels present but has been blocked by an old pattern or weight. " +
      "Do not diagnose, prescribe, provide medical/financial/legal advice, intensify fear or urgency, promise an outcome, " +
      "or claim supernatural certainty. If the area is health, stay emotional and general and explicitly avoid health conclusions. " +
      `Address the user as ${name}. Keep the response under 100 words.`;

    const message = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 280,
      temperature: 0.65,
      system,
      messages: [{
        role: 'user',
        content: `Area: ${area || 'unspecified'}\nHoped-for change: ${change || 'unspecified'}\nDeepest desire: ${desire || 'unspecified'}`,
      }],
    });

    const text = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();
    return res.json({ text: text || fallback, source: text ? 'llm' : 'fallback' });
  } catch (error) {
    console.error('Call reading failure', error);
    return res.json({ text: fallback, source: 'fallback' });
  }
});

// ── Live call: mint a signed URL for the ElevenLabs Conversational AI agent ──
app.get('/api/voice-token', async (_req, res) => {
  if (!liveEnabled) return res.status(503).json({ error: 'live_disabled' });
  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}`,
      { headers: { 'xi-api-key': ELEVENLABS_API_KEY } }
    );
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error('ElevenLabs signed-url error', upstream.status, detail);
      return res.status(502).json({ error: 'signed_url_error' });
    }
    const data = await upstream.json();
    res.json({ signedUrl: data.signed_url });
  } catch (err) {
    console.error('voice-token failure', err);
    res.status(502).json({ error: 'voice_token_failure' });
  }
});

// SPA fallback — serve the built index.html for any non-API GET.
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    const entry = req.path === '/chat' || req.path.startsWith('/chat/')
      ? path.join(DIST_DIR, 'chat', 'index.html')
      : path.join(DIST_DIR, 'index.html');
    return res.sendFile(entry);
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Selene chat → http://localhost:${PORT}`);
  console.log(
    `  TTS: ${ttsEnabled ? 'on' : 'off'} · live call: ${liveEnabled ? 'on' : 'off'} · reading LLM: ${
      readingEnabled ? 'on' : 'off'
    }`
  );
});
