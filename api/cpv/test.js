// POST /api/cpv/test  — is this deployment able to talk to CPV One?
//
// Read-only and side-effect free: it lists campaigns and counts them. Nothing
// is created, edited or deleted, so it is safe to run against a live account at
// any time, including from a deploy check.
//
// It exists because every other failure in this integration looks the same from
// the editor — "the campaign was not found" is what you get whether the id is
// wrong, the key is wrong, API access is switched off, or the URL points at the
// wrong install. This separates those.

import { config, cpvGet, handler, log, rows, campaignId as idOf, campaignName as nameOf } from './_cpv.js';

export default handler(async () => {
  const { apiUrl, accountId, trackingBase, tokenParam, missing } = config();

  // Reported rather than thrown, so a misconfigured deployment answers with
  // *which* variable is missing instead of a bare 503.
  if (missing.length) {
    return {
      connected: false,
      configured: false,
      missing,
      message: `Not configured: ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} not set on this deployment.`,
    };
  }

  const list = rows(await cpvGet('campaign/list'));
  const sample = list.slice(0, 5).map((r) => ({ id: idOf(r), name: nameOf(r) })).filter((c) => c.id);

  log('connection_test', { campaigns: list.length });

  return {
    connected: true,
    configured: true,
    // The host only — never the key, and never the composed request URL.
    apiHost: safeHost(apiUrl),
    accountScoped: Boolean(accountId),
    trackingBaseHost: safeHost(trackingBase),
    channelToken: tokenParam,
    campaigns: list.length,
    sample,
    message: `Connected. ${list.length} campaign${list.length === 1 ? '' : 's'} visible to this API key.`,
  };
});

const safeHost = (value) => {
  if (!value) return '';
  try {
    return new URL(value).host;
  } catch {
    return '';
  }
};
