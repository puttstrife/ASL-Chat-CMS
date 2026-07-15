import Anthropic from '@anthropic-ai/sdk';
import { env, flags, callReadingFallback, readBody } from './_marisol.js';

// Call-first variant: reflect the three private-chat answers.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const body = readBody(req);
  const name = String(body?.name || 'friend').trim().slice(0, 60);
  const area = String(body?.area || '').trim().slice(0, 80);
  const change = String(body?.change || '').trim().slice(0, 800);
  const desire = String(body?.desire || '').trim().slice(0, 800);
  const fallback = callReadingFallback(name, area, change, desire);

  if (!flags.readingEnabled || (!area && !change && !desire)) {
    return res.json({ text: fallback, source: 'fallback' });
  }

  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const system =
      'You are Marisol, a warm and unhurried intuitive reader in a fictional scripted experience. ' +
      'The user selected an area that feels heavy and described what they hope changes and what they want most. ' +
      'Reflect their own words in one short paragraph of 3-5 sentences. Continue naturally after Marisol has said ' +
      "'Yes... I can feel it.' Say that the desire still feels present but has been blocked by an old pattern or weight. " +
      'Do not diagnose, prescribe, provide medical/financial/legal advice, intensify fear or urgency, promise an outcome, ' +
      'or claim supernatural certainty. If the area is health, stay emotional and general and explicitly avoid health conclusions. ' +
      `Address the user as ${name}. Keep the response under 100 words.`;

    const message = await client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 280,
      temperature: 0.65,
      system,
      messages: [{
        role: 'user',
        content: `Area: ${area || 'unspecified'}\nHoped-for change: ${change || 'unspecified'}\nDeepest desire: ${desire || 'unspecified'}`,
      }],
    });

    const text = message.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    return res.json({ text: text || fallback, source: text ? 'llm' : 'fallback' });
  } catch (error) {
    console.error('Call reading failure', error);
    return res.json({ text: fallback, source: 'fallback' });
  }
}
