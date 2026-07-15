export async function fetchTTS(text, signal) {
  // Retry once — Vercel cold starts / transient ElevenLabs hiccups shouldn't
  // silence the line. Aborts are not retried.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal,
      });
      if (response.ok) return response.blob();
    } catch (error) {
      if (error?.name === 'AbortError') return null;
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

export async function fetchCallReading(context, answers) {
  try {
    const response = await fetch('/api/call-reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: context.name,
        area: answers.area,
        change: answers.change,
        desire: answers.desire,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.text || null;
  } catch {
    return null;
  }
}
