// Unit tests for the server-side pieces that decide whether a link is safe, and
// for the redaction that keeps credentials out of logs. No network, no key.

import { describe, expect, it } from 'vitest';
import { CHANNEL_PARAM, campaignId, campaignName, campaignUrl, extraTokenSlot, freeSlots, redact, rows, slotNumber } from './_cpv.js';

// A campaign row shaped like the ones CPV One actually returns.
const row = (over = {}) => ({
  ID: '4',
  Name: 'sgs_clickbank_v1',
  CampaignUrl: 'https://cpvlab.example.com/base.php?c=4&key=abc123',
  ...over,
});

describe('reading a campaign row', () => {
  it('reads the fields whatever case CPV One uses', () => {
    expect(campaignId(row())).toBe('4');
    expect(campaignName(row())).toBe('sgs_clickbank_v1');
    expect(campaignUrl(row())).toContain('base.php?c=4');
    expect(campaignId({ campaignid: '9' })).toBe('9');
    expect(campaignUrl({ tracking_url: 'https://x.example/' })).toBe('https://x.example/');
  });

  it('finds the rows inside whatever wrapper the response uses', () => {
    expect(rows({ Status: 'OK', Rows: [row()] })).toHaveLength(1);
    expect(rows([row()])).toHaveLength(1);
    expect(rows({ data: { campaigns: [row(), row()] } })).toHaveLength(2);
    expect(rows({ Status: 'OK' })).toEqual([]);
  });
});

describe('slotNumber', () => {
  it('takes the number out of an extraN token name', () => {
    expect(slotNumber('extra1')).toBe(1);
    expect(slotNumber('extra11')).toBe(11);
    expect(slotNumber('EXTRA7')).toBe(7);
  });
});

describe('extraTokenSlot', () => {
  it('accepts a slot dedicated to the channel parameter', () => {
    const slot = extraTokenSlot(row({ ExtraTokenName11: 'Chat channel', ExtraTokenParam11: CHANNEL_PARAM }), 11);
    expect(slot.problem).toBeUndefined();
    expect(slot.param).toBe('channel_id');
    expect(slot.name).toBe('Chat channel');
  });

  it('unwraps a parameter written as a placeholder', () => {
    const slot = extraTokenSlot(row({ ExtraTokenParam11: '{channel_id}' }), 11);
    expect(slot.problem).toBeUndefined();
    expect(slot.param).toBe('channel_id');
  });

  it('refuses a slot that is not configured at all — CPV One would drop the value', () => {
    expect(extraTokenSlot(row(), 11)).toMatchObject({ problem: 'unconfigured', param: '' });
    expect(extraTokenSlot(row({ ExtraTokenParam11: '   ' }), 11)).toMatchObject({ problem: 'unconfigured' });
  });

  it('refuses a slot already carrying real traffic data', () => {
    // Exactly what live accounts look like: utm_source, tid, hop.
    expect(extraTokenSlot(row({ ExtraTokenName1: 'Traffic Source', ExtraTokenParam1: 'utm_source' }), 1)).toMatchObject({
      problem: 'occupied',
      param: 'utm_source',
    });
    expect(extraTokenSlot(row({ ExtraTokenParam1: '{tid}' }), 1)).toMatchObject({ problem: 'occupied', param: 'tid' });
  });

  it('calls out a split-test slot separately, since freeing it means ending a test', () => {
    expect(extraTokenSlot(row({ ExtraTokenParam1: '{multivariate1}' }), 1)).toMatchObject({
      problem: 'multivariate',
      param: 'multivariate1',
    });
  });

  it('is case-insensitive about the channel parameter', () => {
    expect(extraTokenSlot(row({ ExtraTokenParam11: 'Channel_ID' }), 11).problem).toBeUndefined();
  });
});

describe('freeSlots', () => {
  it('lists every slot with nothing in it', () => {
    const r = row({ ExtraTokenParam1: 'utm_source', ExtraTokenParam2: '{multivariate1}', ExtraTokenParam3: 'hop' });
    expect(freeSlots(r)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });

  it('treats a bare row as fifteen free slots', () => {
    expect(freeSlots(row())).toHaveLength(15);
  });
});

describe('redact', () => {
  const withKey = (key, fn) => {
    const had = process.env.CPV_ONE_API_KEY;
    process.env.CPV_ONE_API_KEY = key;
    try {
      return fn();
    } finally {
      if (had === undefined) delete process.env.CPV_ONE_API_KEY;
      else process.env.CPV_ONE_API_KEY = had;
    }
  };

  it('removes the API key wherever it appears', () => {
    withKey('s3cr3tkey', () => {
      const out = redact('called https://cpv.example.com/api/campaign/list/?key=s3cr3tkey&format=json');
      expect(out).not.toContain('s3cr3tkey');
      expect(out).toContain('[redacted]');
    });
  });

  it('removes key-shaped parameters even when the key is not set', () => {
    withKey('', () => {
      expect(redact('https://x.example/base.php?c=4&key=abc123')).toBe('https://x.example/base.php?c=4&key=[redacted]');
      expect(redact('?api_key=zzz&token=yyy')).toBe('?api_key=[redacted]&token=[redacted]');
    });
  });

  it('leaves ordinary text alone', () => {
    withKey('s3cr3tkey', () => {
      expect(redact('campaign 4 linked to ch_abcdefgh12345678')).toBe('campaign 4 linked to ch_abcdefgh12345678');
    });
  });
});
