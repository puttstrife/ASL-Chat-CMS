// CPV One tracking, kept out of the editor.
//
// Why a service and not a few lines in the funnel store: attribution has rules
// that outlive any one screen — a channel id must be unique and must never
// change, a tracking URL has to be built the same way everywhere it is shown,
// and linking a campaign has to be safe to retry. Those belong in one place that
// can be tested without a browser.
//
// ── What CPV One's API can actually do ──
//
// Verified against https://cpvlab.pro/docs/cpv-lab-pro-api.html. The API is a
// single key passed as `key=`, against `<your-cpv-domain>/api/<endpoint>/`, and
// it offers:
//
//   /api/campaign/list/    every campaign, optionally active only
//   /api/campaign/edit/    change an EXISTING campaign's options
//   /api/stats/            campaign statistics
//   /api/conversions/      conversion rows
//   /api/click/lookup/     one click by subid
//   /api/lp/*  /api/offer/*  landing pages and offers
//
// There is NO endpoint that creates a campaign. But that is not why this module
// never creates one.
//
// A campaign here is a reporting bucket — domain, traffic source, variant —
// created deliberately and rarely, with funnel variants living INSIDE it as
// landing-page splits and Extra Tokens. One campaign per funnel would fragment
// the reporting the account runs on. So the admin makes the campaign in CPV One,
// pastes its id or its tracking URL here, and we attach our own channel id to
// it. That would still be the right shape if the API grew a create endpoint
// tomorrow.
//
// Attribution rides on CPV One's Extra Tokens (`extra1`…`extra15`) — values
// captured from the campaign URL and reportable as columns. Which slot is an
// account decision and belongs with the credentials, so the server picks it.
// In this account 1 through 4 are taken (`extra1` is `utm_source`, which the
// traffic-source reporting depends on) and 11 through 15 are free.
//
// Everything above the `── Calls that need credentials ──` line is pure and
// runs in both the browser and a serverless function. Everything below it is a
// browser-side call to our own API, because CPV One's key must never be in a
// bundle.

// ── Channel ids ──

// Prefix so a channel id is recognisable in a CPV report, a log line or a query
// string without anyone having to ask what it is.
export const CHANNEL_ID_PREFIX = 'ch';

// Base36, no vowels removed and no cleverness: this ends up in URLs, in CPV
// One's reports and occasionally read aloud off a screen, so it stays
// lowercase-alphanumeric with one separator.
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

// A random source that is cryptographic where one exists and merely adequate
// where it does not. Node ≥19 and every target browser have `crypto`; the
// fallback exists so a test or an old runtime cannot crash funnel creation.
const defaultRandomBytes = (n) => {
  const out = new Uint8Array(n);
  const c = globalThis.crypto;
  if (c?.getRandomValues) c.getRandomValues(out);
  else for (let i = 0; i < n; i += 1) out[i] = Math.floor(Math.random() * 256);
  return out;
};

/**
 * A new channel id. Unique, opaque, and never derived from the funnel — an id
 * that encoded the funnel name would change meaning when the name did.
 *
 * Shape: `ch_<time><random>` — the time component makes ids sort roughly by
 * creation and makes a collision between two ids minted in different
 * milliseconds impossible; the 12 random characters make one within the same
 * millisecond about as likely as a UUID collision.
 *
 * `now` and `randomBytes` are injectable so the shape can be tested exactly
 * rather than by regex alone.
 */
export function generateChannelId({ now = Date.now(), randomBytes = defaultRandomBytes } = {}) {
  const stamp = Math.floor(now).toString(36).padStart(8, '0');
  const bytes = randomBytes(12);
  let rand = '';
  for (let i = 0; i < 12; i += 1) rand += ALPHABET[bytes[i] % ALPHABET.length];
  return `${CHANNEL_ID_PREFIX}_${stamp}${rand}`;
}

const CHANNEL_ID_RE = new RegExp(`^${CHANNEL_ID_PREFIX}_[a-z0-9]{16,32}$`);

export const isChannelId = (value) => typeof value === 'string' && CHANNEL_ID_RE.test(value);

// ── Slugs ──

// The readable half of a tracking URL. Derived from the funnel name once, at
// creation, and then frozen — a slug that followed the name would break every
// link already handed to a traffic source.
export function slugify(name, fallback = 'funnel') {
  const slug = String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug || fallback;
}

// ── Tracking URLs ──

// Where the player lives. A pattern rather than a fixed path because the URL a
// traffic source is given depends on how the app is hosted: this build is a
// static bundle whose player selects a funnel from `?f=<id>`, but a host with a
// rewrite rule can serve the prettier `/chat/<slug>` form. Both are expressible;
// neither is hardcoded.
//
//   {base}  {id}  {slug}  {channel_id}
export const DEFAULT_URL_PATTERN = '{base}/?f={id}&channel_id={channel_id}';

const trimSlashes = (s) => String(s || '').replace(/\/+$/, '');

/**
 * The tracking URL for a funnel — the link that goes to a traffic source, and
 * the one displayed in the editor. Deterministic: the same funnel and channel
 * id always produce the same string, which is what makes re-syncing safe.
 */
export function buildTrackingUrl({ base, id, slug, channelId, pattern = DEFAULT_URL_PATTERN } = {}) {
  if (!channelId) throw new Error('A tracking URL needs a channel id.');
  if (!base) throw new Error('A tracking URL needs a base URL — set VITE_CHAT_BASE_URL.');
  const values = {
    '{base}': trimSlashes(base),
    '{id}': encodeURIComponent(id || ''),
    '{slug}': encodeURIComponent(slug || ''),
    '{channel_id}': encodeURIComponent(channelId),
  };
  let out = pattern;
  for (const [token, value] of Object.entries(values)) out = out.split(token).join(value);
  return out;
}

/**
 * The CPV One campaign URL with our channel id attached to an Extra Token.
 *
 * This is the URL that actually earns the attribution: traffic hits CPV One
 * first, CPV One records `extraN` and forwards every parameter it does not
 * handle itself, so the channel id lands on the funnel as well and the two ends
 * of the click agree on which funnel it was.
 */
export function appendChannelToCampaignUrl(campaignUrl, { channelId, tokenParam = 'extra11' } = {}) {
  if (!channelId) throw new Error('A campaign URL needs a channel id to carry.');
  let url;
  try {
    url = new URL(campaignUrl);
  } catch {
    throw new Error('That does not look like a full URL — it needs to start with https://');
  }
  url.searchParams.set(tokenParam, channelId);
  // Our own id travels alongside the CPV token so the funnel can read it after
  // the redirect without depending on CPV One's forwarding rules.
  url.searchParams.set('channel_id', channelId);
  return url.toString();
}

// A CPV One campaign id as the API reports it. Accepts the id on its own or a
// campaign URL to pull it out of, because an admin copying from the CPV One
// interface has the URL in hand far more often than the bare number.
export function normalizeCampaignRef(input) {
  const raw = String(input || '').trim();
  if (!raw) return { campaignId: '', campaignUrl: '' };
  if (/^\d{1,12}$/.test(raw)) return { campaignId: raw, campaignUrl: '' };
  try {
    const url = new URL(raw);
    const fromQuery = url.searchParams.get('campaignid') || url.searchParams.get('cid') || url.searchParams.get('camp');
    return { campaignId: fromQuery || '', campaignUrl: url.toString() };
  } catch {
    return { campaignId: '', campaignUrl: '' };
  }
}

// ── The tracking record ──

// The fields stored against a funnel. Named as they would be columns, because
// that is what they become the day funnels move to a database — this object is
// one row of funnel tracking, not a bag of UI state.
export const SYNC_STATES = ['unlinked', 'pending', 'linked', 'error'];

export const makeTracking = (over = {}) => ({
  // Ours. Minted once at creation and immutable from then on.
  channel_id: '',
  slug: '',
  tracking_url: '',
  // Theirs, filled in when an admin links a campaign.
  cpv_campaign_id: '',
  cpv_campaign_name: '',
  cpv_tracking_url: '',
  // The same value as `channel_id`, recorded as what was actually sent to CPV
  // One. They are equal today; keeping them separate means a channel id that is
  // ever re-issued cannot silently claim another campaign's history.
  cpv_channel_id: '',
  // The URL parameter CPV One reads the channel id from, and the Extra Token
  // slot it lands in. The parameter is the campaign's own — CPV One does not
  // read a parameter called `extra1` — so it is recorded rather than assumed.
  cpv_token_param: '',
  cpv_token_slot: '',
  cpv_sync_status: 'unlinked',
  cpv_sync_error: '',
  cpv_synced_at: '',
  ...over,
});

/**
 * Give a funnel its tracking record if it has none — and leave it exactly alone
 * if it has one.
 *
 * This is the whole of requirement "unique and cannot change": every path that
 * could touch tracking (create, import, duplicate, migrate, save) goes through
 * here, and here only ever fills blanks. Retrying a create cannot mint a second
 * channel id for the same funnel because the first is already there.
 */
export function ensureTracking(funnel, { base, pattern, ...opts } = {}) {
  const existing = makeTracking(funnel?.tracking);
  const channel_id = isChannelId(existing.channel_id) ? existing.channel_id : generateChannelId(opts);
  const slug = existing.slug || slugify(funnel?.name);
  const tracking_url =
    existing.tracking_url || (base ? buildTrackingUrl({ base, id: funnel?.id, slug, channelId: channel_id, pattern }) : '');
  return { ...funnel, tracking: { ...existing, channel_id, slug, tracking_url } };
}

// ── Calls that need credentials ──
//
// These go to our own serverless functions, never to CPV One. The CPV key is
// read from the environment there and is not present in this bundle at all.

const API_ROOT = '/api/cpv';

async function post(path, body) {
  let res;
  try {
    res = await fetch(`${API_ROOT}/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Could not reach the tracking service. Check your connection and try again.');
  }
  let payload = {};
  try {
    payload = await res.json();
  } catch {
    // A non-JSON body means the function itself failed — most often because
    // it is not deployed. Say that rather than "unexpected token <".
    throw new Error(
      res.status === 404
        ? 'The tracking service is not available on this host. It needs the /api functions deployed.'
        : `The tracking service returned ${res.status}.`
    );
  }
  if (!res.ok || payload.ok === false) throw new Error(payload.error || `The tracking service returned ${res.status}.`);
  return payload;
}

/**
 * Does this campaign exist in CPV One? Checked against `/api/campaign/list/`,
 * which is the only read the account needs to make and the only one that can
 * tell the difference between a typo and a campaign that was deleted.
 */
export async function validateCpvCampaign(campaignRef) {
  const { campaignId, campaignUrl } = normalizeCampaignRef(campaignRef);
  if (!campaignId && !campaignUrl) {
    throw new Error('Enter a CPV One campaign id, or paste the campaign tracking URL.');
  }
  return post('validate', { campaignId, campaignUrl });
}

/**
 * Link a funnel's channel to a CPV One campaign and return the tracking record
 * to store.
 *
 * Idempotent by construction. The channel id is minted here, in the browser,
 * before the call — so a retry sends the same one, the server does the same
 * deterministic work, and the result is byte-identical. Nothing is created
 * remotely (CPV One has no create endpoint), so there is no remote duplicate to
 * make either. Calling this twice leaves exactly one link.
 */
export async function syncFunnelTracking(funnel, campaignRef, { base, pattern } = {}) {
  const withIds = ensureTracking(funnel, { base, pattern });
  const t = withIds.tracking;
  const { campaignId, campaignUrl } = normalizeCampaignRef(campaignRef);

  const result = await post('sync', {
    funnelId: funnel.id,
    channelId: t.channel_id,
    campaignId,
    campaignUrl,
  });

  return {
    ...t,
    cpv_campaign_id: result.campaignId || campaignId,
    cpv_campaign_name: result.campaignName || '',
    cpv_tracking_url: result.cpvTrackingUrl || '',
    cpv_channel_id: t.channel_id,
    cpv_token_param: result.tokenParam || '',
    cpv_token_slot: result.tokenSlot ? String(result.tokenSlot) : '',
    cpv_sync_status: 'linked',
    cpv_sync_error: '',
    cpv_synced_at: new Date().toISOString(),
  };
}
