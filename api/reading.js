import Anthropic from '@anthropic-ai/sdk';
import { env, flags, readingFallback, readBody } from './_marisol.js';

// Original chat journey: Stage 5→6 on-rails personalization.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const body = readBody(req);
  const name = String(body?.name || 'friend').slice(0, 60);
  const userText = String(body?.userText || '').trim().slice(0, 800);

  if (!flags.readingEnabled || !userText) {
    return res.json({ text: readingFallback(name), source: 'fallback' });
  }

  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const system =
      'You are Marisol, a warm, unhurried intuitive reader in a scripted experience. ' +
      'The user has just shared what they have been hoping for. Reflect it back in ONE short ' +
      "paragraph (3-5 sentences), in Marisol's gentle, mystical voice. You MUST follow this shape: " +
      'acknowledge that what they described has been trying to reach them, then say it has been ' +
      'BLOCKED (not gone) by some old pattern or weight sitting in its path. Weave in a phrase or ' +
      'two from their own words so it feels personal. Do NOT give concrete predictions, dates, ' +
      'medical/financial/legal advice, or promises. Do NOT mention being an AI. This reply comes ' +
      "right after Marisol has already said 'Yes. I can feel it now, more clearly than before.' — " +
      'so do NOT open with that or any restatement of it; continue naturally from it. Address them ' +
      `as ${name}. Keep it under 90 words.`;

    const msg = await client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 260,
      temperature: 0.7,
      system,
      messages: [{ role: 'user', content: userText }],
    });

    const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    return res.json({ text: text || readingFallback(name), source: text ? 'llm' : 'fallback' });
  } catch (err) {
    console.error('Reading failure', err);
    return res.json({ text: readingFallback(name), source: 'fallback' });
  }
}
