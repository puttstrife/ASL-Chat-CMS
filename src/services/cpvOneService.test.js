// Unit tests for the parts of tracking that have to be right forever: the
// channel id, and the URL built from it. Everything here is pure — no browser,
// no network, no CPV One account.

import { describe, expect, it } from 'vitest';
import {
  appendChannelToCampaignUrl,
  buildTrackingUrl,
  bumpVersion,
  ensureTracking,
  generateChannelId,
  isChannelId,
  makeTracking,
  normalizeCampaignRef,
  slugify,
} from './cpvOneService.js';

describe('generateChannelId', () => {
  it('produces an id of the documented shape', () => {
    const id = generateChannelId();
    expect(id).toMatch(/^ch_[a-z0-9]+$/);
    expect(isChannelId(id)).toBe(true);
  });

  it('is deterministic given a clock and a random source', () => {
    const fixed = { now: 1_700_000_000_000, randomBytes: () => new Uint8Array(12).fill(0) };
    // 1_700_000_000_000 is 'loyw3v28' in base36; zeroed bytes map to 'a'.
    expect(generateChannelId(fixed)).toBe('ch_loyw3v28aaaaaaaaaaaa');
    expect(generateChannelId(fixed)).toBe(generateChannelId(fixed));
  });

  it('does not repeat across many ids minted in the same millisecond', () => {
    // The timestamp component cannot separate these, so this is a test of the
    // random half — which is the half that matters for uniqueness.
    const now = 1_700_000_000_000;
    const ids = new Set(Array.from({ length: 5000 }, () => generateChannelId({ now })));
    expect(ids.size).toBe(5000);
  });

  it('separates ids minted in different milliseconds even with identical randomness', () => {
    const randomBytes = () => new Uint8Array(12).fill(7);
    expect(generateChannelId({ now: 1, randomBytes })).not.toBe(generateChannelId({ now: 2, randomBytes }));
  });

  it('rejects things that are not channel ids', () => {
    expect(isChannelId('')).toBe(false);
    expect(isChannelId('ch_')).toBe(false);
    expect(isChannelId('abc123')).toBe(false);
    expect(isChannelId('ch_UPPERCASE1234567')).toBe(false);
    expect(isChannelId(undefined)).toBe(false);
    expect(isChannelId({ toString: () => 'ch_aaaaaaaaaaaaaaaa' })).toBe(false);
  });
});

describe('slugify', () => {
  it('makes a URL-safe slug from a funnel name', () => {
    expect(slugify('Selene — Version A (with the place)')).toBe('selene-version-a-with-the-place');
  });

  it('strips accents rather than dropping the letters', () => {
    expect(slugify('Marisol Über Café')).toBe('marisol-uber-cafe');
  });

  it('falls back rather than returning an empty slug', () => {
    expect(slugify('')).toBe('funnel');
    expect(slugify('!!!')).toBe('funnel');
  });

  it('never ends in a separator, even when truncated', () => {
    const slug = slugify(`${'a'.repeat(59)} tail`);
    expect(slug.endsWith('-')).toBe(false);
    expect(slug.length).toBeLessThanOrEqual(60);
  });
});

describe('buildTrackingUrl', () => {
  const args = {
    base: 'https://chat.example.com',
    id: 'abc123',
    slug: 'selene',
    version: 'v1',
    channelId: 'ch_abcdefgh12345678',
  };

  it('builds the default player URL with the channel id on it', () => {
    expect(buildTrackingUrl(args)).toBe('https://chat.example.com/selene/v1/ch_abcdefgh12345678');
  });

  it('honours a configured pattern, including the slug form from the brief', () => {
    expect(buildTrackingUrl({ ...args, pattern: '{base}/chat/{slug}?channel_id={channel_id}' })).toBe(
      'https://chat.example.com/chat/selene?channel_id=ch_abcdefgh12345678'
    );
  });

  it('does not double the slash when the base has a trailing one', () => {
    expect(buildTrackingUrl({ ...args, base: 'https://chat.example.com/' })).toBe(
      'https://chat.example.com/selene/v1/ch_abcdefgh12345678'
    );
  });

  it('interpolates the version into the default pattern', () => {
    expect(buildTrackingUrl({ ...args, version: 'v2' })).toBe('https://chat.example.com/selene/v2/ch_abcdefgh12345678');
  });

  it('falls back to an empty version segment rather than the literal token', () => {
    const { version, ...rest } = args;
    expect(buildTrackingUrl(rest)).toBe('https://chat.example.com/selene//ch_abcdefgh12345678');
  });

  it('escapes values so a slug can never break the query string', () => {
    const url = buildTrackingUrl({ ...args, slug: 'a b&c', pattern: '{base}/chat/{slug}?channel_id={channel_id}' });
    expect(url).toBe('https://chat.example.com/chat/a%20b%26c?channel_id=ch_abcdefgh12345678');
    expect(new URL(url).searchParams.get('channel_id')).toBe('ch_abcdefgh12345678');
  });

  it('is deterministic — the same inputs give the same URL', () => {
    expect(buildTrackingUrl(args)).toBe(buildTrackingUrl(args));
  });

  it('refuses to build a URL that would be missing its point', () => {
    expect(() => buildTrackingUrl({ ...args, channelId: '' })).toThrow(/channel id/i);
    expect(() => buildTrackingUrl({ ...args, base: '' })).toThrow(/base URL/i);
  });
});

describe('bumpVersion', () => {
  it('increments a bare number', () => {
    expect(bumpVersion('3')).toBe('4');
  });

  it('increments a v-prefixed number, preserving the prefix case', () => {
    expect(bumpVersion('v1')).toBe('v2');
    expect(bumpVersion('V1')).toBe('V2');
  });

  it('leaves anything that is not an optional v plus digits for the admin to edit by hand', () => {
    expect(bumpVersion('a')).toBe('a');
    expect(bumpVersion('')).toBe('');
    expect(bumpVersion(undefined)).toBe(undefined);
  });
});

describe('appendChannelToCampaignUrl', () => {
  const campaign = 'https://track.example.com/base.php?c=1042';

  it('puts the channel id in the configured Extra Token and alongside it', () => {
    const url = new URL(appendChannelToCampaignUrl(campaign, { channelId: 'ch_abcdefgh12345678', tokenParam: 'extra3' }));
    expect(url.searchParams.get('extra3')).toBe('ch_abcdefgh12345678');
    expect(url.searchParams.get('channel_id')).toBe('ch_abcdefgh12345678');
    expect(url.searchParams.get('c')).toBe('1042');
  });

  it('replaces rather than appends when run twice — retrying must not stack params', () => {
    const once = appendChannelToCampaignUrl(campaign, { channelId: 'ch_abcdefgh12345678' });
    const twice = appendChannelToCampaignUrl(once, { channelId: 'ch_abcdefgh12345678' });
    expect(twice).toBe(once);
  });

  it('rejects something that is not a URL', () => {
    expect(() => appendChannelToCampaignUrl('base.php?c=1042', { channelId: 'ch_abcdefgh12345678' })).toThrow(/full URL/i);
  });
});

describe('normalizeCampaignRef', () => {
  it('takes a bare campaign id', () => {
    expect(normalizeCampaignRef(' 1042 ')).toEqual({ campaignId: '1042', campaignUrl: '' });
  });

  it('pulls the id out of a campaign URL when it is there', () => {
    const { campaignId } = normalizeCampaignRef('https://track.example.com/base.php?campaignid=77&x=1');
    expect(campaignId).toBe('77');
  });

  it('keeps the URL when the id is not in it, so the server can match on the URL', () => {
    const ref = normalizeCampaignRef('https://track.example.com/go/summer');
    expect(ref.campaignId).toBe('');
    expect(ref.campaignUrl).toBe('https://track.example.com/go/summer');
  });

  it('returns nothing usable for junk, rather than guessing', () => {
    expect(normalizeCampaignRef('not a campaign')).toEqual({ campaignId: '', campaignUrl: '' });
    expect(normalizeCampaignRef('')).toEqual({ campaignId: '', campaignUrl: '' });
  });
});

describe('ensureTracking', () => {
  const opts = { base: 'https://chat.example.com' };

  it('mints a channel id, slug and tracking URL for a funnel that has none', () => {
    const out = ensureTracking({ id: 'f1', name: 'Selene A' }, opts);
    expect(isChannelId(out.tracking.channel_id)).toBe(true);
    expect(out.tracking.slug).toBe('selene-a');
    expect(out.tracking.tracking_url).toContain(out.tracking.channel_id);
    expect(out.tracking.cpv_sync_status).toBe('unlinked');
  });

  it('is idempotent — running it again changes nothing', () => {
    const once = ensureTracking({ id: 'f1', name: 'Selene A' }, opts);
    const twice = ensureTracking(once, opts);
    expect(twice.tracking).toEqual(once.tracking);
  });

  it('leaves an existing channel id alone even when the name has changed', () => {
    const original = ensureTracking({ id: 'f1', name: 'Selene A' }, opts);
    const renamed = ensureTracking({ ...original, name: 'Something else entirely' }, opts);
    expect(renamed.tracking.channel_id).toBe(original.tracking.channel_id);
    expect(renamed.tracking.slug).toBe(original.tracking.slug);
    expect(renamed.tracking.tracking_url).toBe(original.tracking.tracking_url);
  });

  it('replaces a malformed channel id rather than trusting it', () => {
    const out = ensureTracking({ id: 'f1', name: 'x', tracking: makeTracking({ channel_id: 'nonsense' }) }, opts);
    expect(isChannelId(out.tracking.channel_id)).toBe(true);
    expect(out.tracking.channel_id).not.toBe('nonsense');
  });

  it('preserves an existing CPV link', () => {
    const linked = makeTracking({
      channel_id: 'ch_abcdefgh12345678',
      slug: 'x',
      tracking_url: 'https://chat.example.com/?f=f1&channel_id=ch_abcdefgh12345678',
      cpv_campaign_id: '1042',
      cpv_sync_status: 'linked',
    });
    const out = ensureTracking({ id: 'f1', name: 'x', tracking: linked }, opts);
    expect(out.tracking).toEqual(linked);
  });

  it('defaults version to v1 for a funnel that has no tracking yet', () => {
    const out = ensureTracking({ id: 'f1', name: 'x' }, opts);
    expect(out.tracking.version).toBe('v1');
  });

  it('leaves an existing version alone rather than resetting it to v1', () => {
    const linked = makeTracking({ channel_id: 'ch_abcdefgh12345678', slug: 'x', version: 'v3' });
    const out = ensureTracking({ id: 'f1', name: 'x', tracking: linked }, opts);
    expect(out.tracking.version).toBe('v3');
  });

  it('mints an id without a base URL, and simply leaves the URL empty', () => {
    const out = ensureTracking({ id: 'f1', name: 'x' }, {});
    expect(isChannelId(out.tracking.channel_id)).toBe(true);
    expect(out.tracking.tracking_url).toBe('');
  });
});
