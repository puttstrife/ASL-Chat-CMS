// Thin client for the Express backend (proxied via Vite in dev).

export async function getConfig() {
  try {
    const r = await fetch('/api/config');
    return await r.json();
  } catch {
    return { ttsEnabled: false, liveEnabled: false, readingEnabled: false };
  }
}

export async function fetchTTS(text) {
  const r = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!r.ok) return null;
  return r.blob();
}

export async function fetchReading(name, userText) {
  try {
    const r = await fetch('/api/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, userText }),
    });
    const d = await r.json();
    return d.text || null;
  } catch {
    return null;
  }
}

export async function fetchVoiceToken() {
  const r = await fetch('/api/voice-token');
  if (!r.ok) throw new Error('voice_token');
  const d = await r.json();
  return d.signedUrl;
}
