export async function fetchTTS(text) {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return response.ok ? response.blob() : null;
  } catch {
    return null;
  }
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
