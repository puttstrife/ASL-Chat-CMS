// Where the player is reachable from, for the tracking URLs the editor shows.
//
// Only public values live here. CPV One's API key, account id and API URL are
// read in `api/cpv/_cpv.js` and never reach this bundle — anything with `VITE_`
// in front of it is compiled into `dist/` and is therefore public by definition.

import { DEFAULT_URL_PATTERN } from '../services/cpvOneService.js';

const env = import.meta.env || {};

// The deployed origin. Falls back to wherever the editor is open, which is right
// in development and right on any single-origin deploy — it is only wrong when
// the editor and the player are served from different hosts, which is what the
// variable is for.
export const chatBaseUrl = () =>
  env.VITE_CHAT_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

// The URL shape handed to a traffic source. The default is the one this static
// build actually serves; `{base}/chat/{slug}?channel_id={channel_id}` needs a
// host rewrite to reach the same page.
export const chatUrlPattern = () => env.VITE_CHAT_URL_PATTERN || DEFAULT_URL_PATTERN;

export const trackingOptions = () => ({ base: chatBaseUrl(), pattern: chatUrlPattern() });
