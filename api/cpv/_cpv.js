// The only file that touches CPV One's API key.
//
// Underscore-prefixed so Vercel treats it as a module rather than a route.
// Nothing here is imported by the browser bundle: `src/services/cpvOneService.js`
// talks to the two functions beside this file, and those talk to CPV One. That
// separation is the whole reason there is a server at all — the key cannot be
// in a static bundle, and this app is otherwise entirely static.

// ── Configuration ──
//
// Read per-call rather than at module load, so a missing variable is an error
// the admin sees in the editor rather than a function that fails to boot.
export function config() {
  const apiUrl = process.env.CPV_ONE_API_URL || '';
  const apiKey = process.env.CPV_ONE_API_KEY || '';
  const accountId = process.env.CPV_ONE_ACCOUNT_ID || '';
  const trackingBase = process.env.CPV_ONE_TRACKING_BASE_URL || '';
  // Which Extra Token slot carries the channel id. CPV One offers extra1…extra15
  // and which are free is an account decision, so it is configuration.
  const tokenParam = (process.env.CPV_ONE_CHANNEL_TOKEN || 'extra1').toLowerCase();

  const missing = [];
  if (!apiUrl) missing.push('CPV_ONE_API_URL');
  if (!apiKey) missing.push('CPV_ONE_API_KEY');

  return { apiUrl, apiKey, accountId, trackingBase, tokenParam, missing };
}

const VALID_TOKEN = /^extra([1-9]|1[0-5])$/;

export const assertTokenParam = (t) => {
  if (!VALID_TOKEN.test(t)) {
    throw new HttpError(500, `CPV_ONE_CHANNEL_TOKEN must be extra1…extra15, not "${t}".`);
  }
  return t;
};

// ── Errors ──

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ── Logging ──
//
// Two rules: never the key, and never a URL that still has the key in it. Every
// log line goes through here so that stays true by construction rather than by
// everyone remembering.
const REDACTED = '[redacted]';

export function redact(value) {
  const key = process.env.CPV_ONE_API_KEY;
  let out = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  if (key) out = out.split(key).join(REDACTED);
  // Belt and braces: any `key=` parameter, ours or not.
  return out.replace(/([?&](?:key|apikey|api_key|token)=)[^&\s]+/gi, `$1${REDACTED}`);
}

export function log(event, fields = {}) {
  const safe = {};
  for (const [k, v] of Object.entries(fields)) safe[k] = typeof v === 'string' ? redact(v) : v;
  console.log(JSON.stringify({ at: 'cpv', event, ...safe }));
}

// ── The CPV One call ──

/**
 * GET one CPV One API endpoint.
 *
 * The key goes on the query string because that is the only auth the API
 * documents — so the URL is never logged and never returned to the client.
 */
export async function cpvGet(endpoint, params = {}, { timeoutMs = 10000 } = {}) {
  const { apiUrl, apiKey, accountId, missing } = config();
  if (missing.length) {
    throw new HttpError(503, `CPV One is not configured on this deployment — missing ${missing.join(', ')}.`);
  }

  let url;
  try {
    // Relative, with no leading slash: a self-hosted CPV Lab can live in a
    // subdirectory (`https://example.com/cpvlab/`), and an absolute path would
    // resolve against the origin and throw that subdirectory away.
    url = new URL(`api/${endpoint}/`, apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`);
  } catch {
    throw new HttpError(500, 'CPV_ONE_API_URL is not a valid URL.');
  }
  url.searchParams.set('key', apiKey);
  url.searchParams.set('format', 'json');
  if (accountId) url.searchParams.set('accountid', accountId);
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') url.searchParams.set(k, String(v));

  const started = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, { signal: ctl.signal, headers: { accept: 'application/json' } });
  } catch (e) {
    // An aborted fetch and a DNS failure are the same thing to an admin: CPV
    // One did not answer. The distinction goes to the log, not the screen.
    log('upstream_failed', { endpoint, reason: e?.name === 'AbortError' ? 'timeout' : 'network' });
    throw new HttpError(502, 'CPV One did not respond. Try again in a moment.');
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  log('upstream', { endpoint, status: res.status, ms: Date.now() - started });

  if (!res.ok) {
    // The body can echo the request, key included, so it never leaves here.
    log('upstream_error_body', { endpoint, body: text.slice(0, 400) });
    throw new HttpError(res.status === 401 || res.status === 403 ? 502 : 502, `CPV One rejected the request (${res.status}).`);
  }

  let payload;
  try {
    payload = JSON.parse(stripPhpNotices(text, endpoint));
  } catch {
    // The API answers HTML when the key is wrong or API access is switched off,
    // which is the single most common setup mistake.
    log('upstream_not_json', { endpoint, body: text.slice(0, 200) });
    throw new HttpError(
      502,
      looksLikeLogin(text)
        ? 'CPV One answered with its login page instead of data — the API key is wrong, or API access is not enabled in Settings → General Settings.'
        : 'CPV One returned something that is not JSON. Check CPV_ONE_API_URL points at the install you log in to, and that API access is enabled in Settings → General Settings.'
    );
  }
  assertNoApiError(payload, endpoint);
  return payload;
}

const looksLikeLogin = (text) => /login|password|<html/i.test(text.slice(0, 500));

/**
 * CPV One's PHP emits deprecation notices ahead of the JSON body — several KB of
 * `<b>Deprecated</b>: trim(): Passing null…` before the first `{`, on a 200.
 * Their install, their PHP version, not something this app can fix.
 *
 * So the leading noise is dropped rather than treated as a failed response. This
 * only ever skips to the first `{` or `[`: a body that is genuinely HTML has
 * neither and still fails, so a login page cannot slip through as data.
 */
function stripPhpNotices(text, endpoint) {
  const brace = text.indexOf('{');
  const bracket = text.indexOf('[');
  const start = Math.min(brace === -1 ? Infinity : brace, bracket === -1 ? Infinity : bracket);
  if (start === 0 || start === Infinity) return text;
  log('upstream_noisy_prefix', { endpoint, bytes: start });
  return text.slice(start);
}

// ── Extra Tokens ──
//
// The one thing about this integration that cannot be guessed. CPV One does not
// read a parameter called `extra1`: each campaign configures, per slot, WHICH
// URL parameter feeds that slot — `ExtraTokenParam3` might be `hop`, `utm_source`
// or `{tid}`. Sending `extra1=<channel id>` to a campaign expecting `tid` is
// silently dropped, and the funnel then looks linked while recording nothing.
//
// So the slot number is ours to choose (CPV_ONE_CHANNEL_TOKEN) and the parameter
// name is the campaign's to declare.

export const slotNumber = (token) => Number(String(token).replace(/^extra/i, ''));

const unwrap = (param) => String(param || '').trim().replace(/^\{(.*)\}$/, '$1');

// The parameter a slot must be configured to read for this app to use it. A
// dedicated name, not a borrowed one: real accounts have `utm_source`, `tid` and
// `hop` in these slots already, and writing channel ids into one of those would
// make that column mean two different things depending on the campaign.
export const CHANNEL_PARAM = 'channel_id';

/**
 * What the campaign says feeds Extra Token `n`, or why it cannot be used.
 * Returns `{ param, name }` when usable, or `{ problem, ... }` when not.
 */
export function extraTokenSlot(row, n) {
  const name = String(row?.[`ExtraTokenName${n}`] || '').trim();
  const param = unwrap(row?.[`ExtraTokenParam${n}`]);

  if (!param) return { problem: 'unconfigured', name, param: '' };
  if (param.toLowerCase() === CHANNEL_PARAM) return { param, name: name || param };
  // CPV Lab's own split-test variables, called out separately because freeing
  // one means abandoning a running test rather than editing a token.
  if (/^multivariate\d*$/i.test(param)) return { problem: 'multivariate', name, param };
  return { problem: 'occupied', name, param };
}

// Slot numbers with nothing in them, so an error can name somewhere to put it
// rather than only saying no.
export function freeSlots(row) {
  const free = [];
  for (let i = 1; i <= 15; i += 1) if (!unwrap(row?.[`ExtraTokenParam${i}`])) free.push(i);
  return free;
}

// CPV One reports some failures — a rejected key among them — as HTTP 200 with
// an error in the body. A 200 is not proof of success, so every response is
// checked for one before it is used as data.
function assertNoApiError(payload, endpoint) {
  if (!payload || typeof payload !== 'object') return;
  const message = payload.error ?? payload.Error ?? payload.errorMessage ?? payload.message;
  const status = String(payload.status ?? payload.Status ?? '').toLowerCase();
  const failed = (typeof message === 'string' && message.trim() && status !== 'ok') || status === 'error' || status === 'fail';
  if (!failed) return;

  const text = String(message || 'CPV One reported an error.');
  log('upstream_api_error', { endpoint, message: text.slice(0, 200) });

  // An authentication failure is worth naming, because the fix is different
  // from every other error this can return.
  if (/key|auth|permission|denied|access/i.test(text)) {
    throw new HttpError(502, `CPV One rejected the API key: ${text} — check CPV_ONE_API_KEY and that API access is enabled in Settings → General Settings.`);
  }
  throw new HttpError(502, `CPV One reported: ${text}`);
}

// CPV One's list endpoint has been through several shapes and wraps its rows
// differently between versions. Rather than guess one, take the first array of
// objects we find.
export function rows(payload) {
  if (Array.isArray(payload)) return payload;
  for (const value of Object.values(payload || {})) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      const nested = rows(value);
      if (nested.length) return nested;
    }
  }
  return [];
}

const pick = (row, keys) => {
  for (const k of Object.keys(row || {})) if (keys.includes(k.toLowerCase())) return String(row[k]);
  return '';
};

export const campaignId = (row) => pick(row, ['campaignid', 'campid', 'id', 'campaign_id']);
export const campaignName = (row) => pick(row, ['campaignname', 'name', 'campname', 'campaign_name']);
export const campaignUrl = (row) => pick(row, ['campaignurl', 'url', 'trackingurl', 'tracking_url', 'campaign_url']);

// ── Request plumbing shared by both routes ──

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'The request body was not valid JSON.');
  }
}

export function handler(fn) {
  return async (req, res) => {
    res.setHeader('content-type', 'application/json');
    // Nothing here is cacheable and a cached channel link would be actively
    // wrong.
    res.setHeader('cache-control', 'no-store');
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('allow', 'POST');
      return res.end(JSON.stringify({ ok: false, error: 'Use POST.' }));
    }
    try {
      const body = await readJson(req);
      const out = await fn(body, req);
      res.statusCode = 200;
      return res.end(JSON.stringify({ ok: true, ...out }));
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      // An unexpected error's message can carry anything, including a URL with
      // the key in it, so only deliberate errors are shown verbatim.
      const message = e instanceof HttpError ? e.message : 'Something went wrong linking this campaign.';
      log('failed', { status, message: redact(String(e?.message || '')) });
      res.statusCode = status;
      return res.end(JSON.stringify({ ok: false, error: message }));
    }
  };
}
