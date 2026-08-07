import { describe, expect, it } from 'vitest';
import { ctaParams } from './useFunnel.js';

// What lands on the CTA URL is the last chance attribution has. Everything here
// fails silently in production — a dropped parameter looks exactly like traffic
// that never converted — so the precedence rule is pinned rather than trusted.

describe('inbound parameters', () => {
  it('carries every one of them through', () => {
    const params = ctaParams({
      passThrough: { cbaffi: '12345', click_id: 'abc', utm_source: 'fb', gclid: 'x.y' },
      answers: {},
    });
    expect(params).toEqual({ cbaffi: '12345', click_id: 'abc', utm_source: 'fb', gclid: 'x.y' });
  });

  it('does not need any of them', () => {
    expect(ctaParams({ answers: { channel_id: 'ch_abc' } })).toEqual({ channel_id: 'ch_abc' });
    expect(ctaParams()).toEqual({});
  });

  it('does not interpret what it carries', () => {
    // Empty strings and odd values belong to whoever sent them. Dropping an
    // empty parameter is a decision, and not one this app is entitled to make.
    const params = ctaParams({ passThrough: { sub2: '', flag: '0' }, answers: {} });
    expect(params).toEqual({ sub2: '', flag: '0' });
  });
});

describe('precedence', () => {
  it('lets a declared pass key overwrite an inbound value of the same name', () => {
    const params = ctaParams({
      passThrough: { email: 'stale@from-url.test' },
      passKeys: ['email'],
      answers: { email: 'typed@by-visitor.test' },
    });
    expect(params.email).toBe('typed@by-visitor.test');
  });

  it('leaves the inbound value alone when the visitor answered nothing', () => {
    const params = ctaParams({
      passThrough: { email: 'from-url.test' },
      passKeys: ['email'],
      answers: {},
    });
    expect(params.email).toBe('from-url.test');
  });

  it('never lets anything overwrite the channel id', () => {
    // The one value a writer or a traffic source must not be able to bend:
    // whatever arrives, the channel that ran the traffic is the one recorded.
    const params = ctaParams({
      passThrough: { channel_id: 'ch_from_url' },
      passKeys: ['channel_id'],
      answers: { channel_id: 'ch_session', other: 'x' },
    });
    expect(params.channel_id).toBe('ch_session');
  });
});

describe('the channel id', () => {
  it('goes out whether or not the writer listed it', () => {
    const params = ctaParams({ passKeys: [], answers: { channel_id: 'ch_abc' } });
    expect(params.channel_id).toBe('ch_abc');
  });

  it('is absent, not empty, when the visit arrived without one', () => {
    // `channel_id=` on the URL would read as a real but blank channel in a CPV
    // One report, which is worse than the parameter simply not being there.
    const params = ctaParams({ passKeys: ['name'], answers: { name: 'Jo' } });
    expect(params).toEqual({ name: 'Jo' });
    expect('channel_id' in params).toBe(false);
  });
});

describe('answers that were never asked for', () => {
  it('only sends the keys the dock declared', () => {
    const params = ctaParams({
      passKeys: ['name'],
      answers: { name: 'Jo', dob: 'March 3, 1990', secret: 'not for the URL' },
    });
    expect(params).toEqual({ name: 'Jo' });
  });
});
