// Integration tests for funnel creation and the tracking that comes with it.
//
// These drive the real store against a real (in-memory) localStorage and a
// stubbed `fetch`, so they cover the wiring the unit tests deliberately do not:
// the migration, the immutability guard, and a sync round trip through
// `cpvOneService` — including retrying it.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isChannelId } from '../services/cpvOneService.js';

// A localStorage good enough for the store: the real API surface it uses, and a
// switchable quota so the failure path can be tested too.
function memoryStorage() {
  const map = new Map();
  return {
    limit: Infinity,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem(k, v) {
      if (String(v).length > this.limit) {
        const e = new Error('quota');
        e.name = 'QuotaExceededError';
        throw e;
      }
      map.set(k, String(v));
    },
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
    get size() {
      return map.size;
    },
  };
}

const V1_KEY = 'chat-cms:funnels:v1';
const V2_KEY = 'chat-cms:funnels:v2';

let store;

beforeEach(async () => {
  vi.resetModules();
  globalThis.localStorage = memoryStorage();
  // Seeding is a first-run behaviour and would put two extra funnels in every
  // test; the seed path gets its own test below.
  globalThis.localStorage.setItem('chat-cms:seeded:v1', '1');
  globalThis.window = { location: { origin: 'https://chat.example.com' } };
  store = await import('./store.js');
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete globalThis.window;
  delete globalThis.localStorage;
});

describe('createFunnel', () => {
  it('gives a new funnel a channel id and a tracking URL, unlinked', async () => {
    const f = store.createFunnel('Selene A');
    // Read rather than hardcoded: VITE_CHAT_BASE_URL is set in .env.local, which
    // Vitest loads, so asserting a literal origin would make this test pass or
    // fail on somebody's local configuration.
    const { chatBaseUrl } = await import('./trackingConfig.js');

    expect(isChannelId(f.tracking.channel_id)).toBe(true);
    expect(f.tracking.slug).toBe('selene-a');
    expect(f.tracking.tracking_url).toBe(`${chatBaseUrl()}/?f=${f.id}&channel_id=${f.tracking.channel_id}`);

    const url = new URL(f.tracking.tracking_url);
    expect(url.searchParams.get('f')).toBe(f.id);
    expect(url.searchParams.get('channel_id')).toBe(f.tracking.channel_id);

    expect(f.tracking.cpv_sync_status).toBe('unlinked');
    expect(f.tracking.cpv_campaign_id).toBe('');
  });

  it('persists the channel id, so a reload sees the same one', () => {
    const f = store.createFunnel('Selene A');
    expect(store.getFunnel(f.id).tracking.channel_id).toBe(f.tracking.channel_id);
  });

  it('gives every funnel a different channel id', () => {
    const ids = new Set(Array.from({ length: 50 }, (_, i) => store.createFunnel(`Funnel ${i}`).tracking.channel_id));
    expect(ids.size).toBe(50);
  });

  it('does not save anything when storage is full', () => {
    store.createFunnel('First');
    globalThis.localStorage.limit = 10;
    expect(() => store.createFunnel('Second')).toThrow(/Out of browser storage/);
    globalThis.localStorage.limit = Infinity;
    expect(store.listFunnels()).toHaveLength(1);
  });
});

describe('the channel id cannot change', () => {
  it('ignores a save that tries to rewrite it', () => {
    const f = store.createFunnel('Selene A');
    const original = f.tracking.channel_id;

    store.saveFunnel({ ...f, tracking: { ...f.tracking, channel_id: 'ch_tamperedaaaaaaaa' } });

    expect(store.getFunnel(f.id).tracking.channel_id).toBe(original);
  });

  it('ignores a save that tries to rewrite the slug or the tracking URL', () => {
    const f = store.createFunnel('Selene A');
    store.saveFunnel({
      ...f,
      name: 'Renamed entirely',
      tracking: { ...f.tracking, slug: 'renamed-entirely', tracking_url: 'https://elsewhere.example/' },
    });

    const after = store.getFunnel(f.id);
    expect(after.name).toBe('Renamed entirely');
    expect(after.tracking.slug).toBe('selene-a');
    expect(after.tracking.tracking_url).toBe(f.tracking.tracking_url);
  });

  it('still lets the CPV fields change, since those are the mutable half', () => {
    const f = store.createFunnel('Selene A');
    store.patchTracking(f.id, { cpv_campaign_id: '1042', cpv_sync_status: 'linked' });

    const after = store.getFunnel(f.id);
    expect(after.tracking.cpv_campaign_id).toBe('1042');
    expect(after.tracking.cpv_sync_status).toBe('linked');
    expect(after.tracking.channel_id).toBe(f.tracking.channel_id);
  });
});

describe('copies and imports get their own channel', () => {
  it('duplicating mints a new channel id and drops the CPV link', () => {
    const f = store.createFunnel('Selene A');
    store.patchTracking(f.id, { cpv_campaign_id: '1042', cpv_sync_status: 'linked' });

    const copy = store.duplicateFunnel(f.id);

    expect(isChannelId(copy.tracking.channel_id)).toBe(true);
    expect(copy.tracking.channel_id).not.toBe(f.tracking.channel_id);
    expect(copy.tracking.cpv_campaign_id).toBe('');
    expect(copy.tracking.cpv_sync_status).toBe('unlinked');
  });

  it('importing a funnel file mints a new channel id rather than reusing the file’s', async () => {
    const f = store.createFunnel('Selene A');
    const file = { text: async () => JSON.stringify(f) };

    const imported = await store.importFunnel(file);

    expect(imported.id).not.toBe(f.id);
    expect(imported.tracking.channel_id).not.toBe(f.tracking.channel_id);
    expect(isChannelId(imported.tracking.channel_id)).toBe(true);
  });
});

describe('migration from schema v1', () => {
  it('gives pre-tracking funnels a channel id, keeps their content, and runs once', () => {
    const legacy = [
      { id: 'old1', name: 'Marisol Original', stages: [{ id: 's1', title: 'Opening', beats: [], dock: { type: 'end' } }] },
      { id: 'old2', name: 'Selene B', stages: [] },
    ];
    globalThis.localStorage.setItem(V1_KEY, JSON.stringify(legacy));

    const migrated = store.listFunnels();

    expect(migrated).toHaveLength(2);
    expect(migrated.map((f) => f.name)).toEqual(['Marisol Original', 'Selene B']);
    expect(migrated[0].stages[0].title).toBe('Opening');
    for (const f of migrated) {
      expect(isChannelId(f.tracking.channel_id)).toBe(true);
      expect(f.tracking.tracking_url).toContain(f.tracking.channel_id);
      expect(f.tracking.cpv_sync_status).toBe('unlinked');
    }
    expect(migrated[0].tracking.slug).toBe('marisol-original');

    // Written to v2 and stable across reads — a second migration would mint new
    // ids and quietly detach every live campaign.
    expect(JSON.parse(globalThis.localStorage.getItem(V2_KEY))).toHaveLength(2);
    expect(store.listFunnels()[0].tracking.channel_id).toBe(migrated[0].tracking.channel_id);

    // The old records are left where they were, as a manual recovery path.
    expect(JSON.parse(globalThis.localStorage.getItem(V1_KEY))).toHaveLength(2);
  });

  it('never looks at v1 again once v2 exists', () => {
    globalThis.localStorage.setItem(V1_KEY, JSON.stringify([{ id: 'old1', name: 'Legacy', stages: [] }]));
    const migrated = store.listFunnels();
    expect(migrated).toHaveLength(1);

    // Something writes to the old key afterwards — an older tab, a restored
    // backup. It must not be picked up: re-migrating would mint a second
    // channel id for a funnel that already has one.
    globalThis.localStorage.setItem(
      V1_KEY,
      JSON.stringify([{ id: 'old1', name: 'Legacy' }, { id: 'old2', name: 'Sneaked in' }])
    );

    const after = store.listFunnels();
    expect(after).toHaveLength(1);
    expect(after[0].tracking.channel_id).toBe(migrated[0].tracking.channel_id);
  });
});

describe('linking a CPV One campaign', () => {
  const okResponse = (body) => ({ ok: true, status: 200, json: async () => ({ ok: true, ...body }) });

  it('stores the campaign, the CPV tracking URL and the channel it reports under', async () => {
    const f = store.createFunnel('Selene A');
    const fetchMock = vi.fn(async () =>
      okResponse({
        campaignId: '1042',
        campaignName: 'Selene — cold traffic',
        cpvTrackingUrl: `https://track.example.com/base.php?c=1042&extra1=${f.tracking.channel_id}&channel_id=${f.tracking.channel_id}`,
        tokenParam: 'extra1',
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { syncFunnelTracking } = await import('../services/cpvOneService.js');
    const tracking = await syncFunnelTracking(f, '1042', { base: 'https://chat.example.com' });
    store.patchTracking(f.id, tracking);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/cpv/sync');
    expect(JSON.parse(init.body)).toMatchObject({ funnelId: f.id, channelId: f.tracking.channel_id, campaignId: '1042' });

    const saved = store.getFunnel(f.id).tracking;
    expect(saved.cpv_campaign_id).toBe('1042');
    expect(saved.cpv_channel_id).toBe(f.tracking.channel_id);
    expect(saved.cpv_token_param).toBe('extra1');
    expect(saved.cpv_tracking_url).toContain(f.tracking.channel_id);
    expect(saved.cpv_sync_status).toBe('linked');
    expect(saved.cpv_sync_error).toBe('');
    // Still the one it was created with.
    expect(saved.channel_id).toBe(f.tracking.channel_id);
  });

  it('is idempotent — syncing twice sends the same channel id and leaves one link', async () => {
    const f = store.createFunnel('Selene A');
    const fetchMock = vi.fn(async () =>
      okResponse({ campaignId: '1042', cpvTrackingUrl: 'https://track.example.com/base.php?c=1042', tokenParam: 'extra1' })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { syncFunnelTracking } = await import('../services/cpvOneService.js');

    const first = await syncFunnelTracking(store.getFunnel(f.id), '1042', { base: 'https://chat.example.com' });
    store.patchTracking(f.id, first);
    const second = await syncFunnelTracking(store.getFunnel(f.id), '1042', { base: 'https://chat.example.com' });
    store.patchTracking(f.id, second);

    const sent = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(sent[0].channelId).toBe(sent[1].channelId);

    const saved = store.getFunnel(f.id).tracking;
    expect(saved.channel_id).toBe(f.tracking.channel_id);
    expect(saved.cpv_campaign_id).toBe('1042');
    expect(store.listFunnels()).toHaveLength(1);
  });

  it('records why a link failed, and does not claim to be linked', async () => {
    const f = store.createFunnel('Selene A');
    vi.stubGlobal('fetch', async () => ({
      ok: false,
      status: 404,
      json: async () => ({ ok: false, error: 'No campaign 9999 in this CPV One account.' }),
    }));

    const { syncFunnelTracking } = await import('../services/cpvOneService.js');
    await expect(syncFunnelTracking(f, '9999', { base: 'https://chat.example.com' })).rejects.toThrow(/No campaign 9999/);

    store.patchTracking(f.id, { cpv_sync_status: 'error', cpv_sync_error: 'No campaign 9999 in this CPV One account.' });
    const saved = store.getFunnel(f.id).tracking;
    expect(saved.cpv_sync_status).toBe('error');
    expect(saved.cpv_sync_error).toMatch(/No campaign 9999/);
    expect(saved.cpv_tracking_url).toBe('');
    // The funnel is still usable and still attributable on its own channel.
    expect(isChannelId(saved.channel_id)).toBe(true);
  });

  it('says something useful when the API functions are not deployed', async () => {
    const f = store.createFunnel('Selene A');
    vi.stubGlobal('fetch', async () => ({
      ok: false,
      status: 404,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    }));

    const { syncFunnelTracking } = await import('../services/cpvOneService.js');
    await expect(syncFunnelTracking(f, '1042', { base: 'https://chat.example.com' })).rejects.toThrow(/not available on this host/);
  });

  it('refuses to call the server without a campaign reference', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { validateCpvCampaign } = await import('../services/cpvOneService.js');

    await expect(validateCpvCampaign('   ')).rejects.toThrow(/campaign id/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('first run', () => {
  it('seeds the example funnels with channel ids of their own', () => {
    globalThis.localStorage.removeItem('chat-cms:seeded:v1');
    const seeded = store.listFunnels();

    expect(seeded.length).toBeGreaterThan(0);
    const ids = seeded.map((f) => f.tracking.channel_id);
    expect(ids.every(isChannelId)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
