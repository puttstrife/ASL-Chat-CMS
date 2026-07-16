// Shared env + helpers for the Vercel serverless functions.
// (Files prefixed with "_" are not treated as routes by Vercel.)
export const env = {
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID,
  ELEVENLABS_MODEL_ID: process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5',
  ELEVENLABS_AGENT_ID: process.env.ELEVENLABS_AGENT_ID,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
};

export const flags = {
  ttsEnabled: Boolean(env.ELEVENLABS_API_KEY && env.ELEVENLABS_VOICE_ID),
  liveEnabled: Boolean(env.ELEVENLABS_API_KEY && env.ELEVENLABS_AGENT_ID),
  readingEnabled: Boolean(env.ANTHROPIC_API_KEY),
};

export const readingFallback = (name) =>
  `What you carry has been trying to reach you for some time, ${name} — longer than you ` +
  'probably realized while you were living through it. Something has been sitting in the way, ' +
  'quietly redirecting it, softening it, pulling it just slightly off course before it could ' +
  'fully land. Not gone. I want to be very clear with you about that. Not gone. Just blocked.';

export const cleanReadingFragment = (value, fallback) =>
  String(value || fallback).replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');

export const callReadingFallback = (name, area, change, desire) =>
  `What you shared about ${area || 'what feels heaviest'} connects closely with the change you have been hoping for, ${name}. ` +
  `You described it this way: “${cleanReadingFragment(change, 'something important finally shifting')}.” ` +
  `Underneath it, you said you want “${cleanReadingFragment(desire, 'the thing you want most')}.” That desire still feels present, not lost. ` +
  'Something old has been sitting in its path and softening its momentum before it can fully reach you. ' +
  'I want to be clear: it does not feel gone, only blocked.';

export function readBody(req) {
  // Vercel parses JSON bodies automatically; fall back to raw string just in case.
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return {};
}
