import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { env, flags, readBody } from './_marisol.js';

// ElevenLabs TTS proxy (keeps the API key server-side).
// Caches clips in /tmp — persists across warm invocations on the same
// instance, so repeated lines skip the ElevenLabs round-trip.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!flags.ttsEnabled) return res.status(503).json({ error: 'tts_disabled' });

  const body = readBody(req);
  const text = String(body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'empty_text' });
  if (text.length > 3000) return res.status(400).json({ error: 'text_too_long' });
  const voiceId = body?.variant === 'call' && env.ELEVENLABS_CALL_VOICE_ID
    ? env.ELEVENLABS_CALL_VOICE_ID
    : env.ELEVENLABS_VOICE_ID;
  if (!voiceId) return res.status(503).json({ error: 'tts_voice_unavailable' });

  const key = crypto.createHash('sha1').update(`${voiceId}:${env.ELEVENLABS_MODEL_ID}:${text}`).digest('hex');
  const cachePath = path.join(os.tmpdir(), `tts-${key}.mp3`);
  try {
    if (fs.existsSync(cachePath)) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(fs.readFileSync(cachePath));
    }
  } catch { /* fall through to fetch */ }

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: env.ELEVENLABS_MODEL_ID,
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.35 },
        }),
      }
    );

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '');
      console.error('ElevenLabs TTS error', upstream.status, detail);
      return res.status(502).json({ error: 'tts_upstream_error' });
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    try { fs.writeFileSync(cachePath, buf); } catch { /* /tmp best-effort */ }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buf);
  } catch (err) {
    console.error('TTS failure', err);
    return res.status(502).json({ error: 'tts_failure' });
  }
}
