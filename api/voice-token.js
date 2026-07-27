import { env, flags } from './_selene.js';

// Live conversational call: mint an ElevenLabs signed URL.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  if (!flags.liveEnabled) return res.status(503).json({ error: 'live_disabled' });

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${env.ELEVENLABS_AGENT_ID}`,
      { headers: { 'xi-api-key': env.ELEVENLABS_API_KEY } }
    );
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error('ElevenLabs signed-url error', upstream.status, detail);
      return res.status(502).json({ error: 'signed_url_error' });
    }
    const data = await upstream.json();
    return res.json({ signedUrl: data.signed_url });
  } catch (err) {
    console.error('voice-token failure', err);
    return res.status(502).json({ error: 'voice_token_failure' });
  }
}
