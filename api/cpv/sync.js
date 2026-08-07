// POST /api/cpv/sync  { funnelId, channelId, campaignId?, campaignUrl? }
//
// Ties one funnel's channel to one existing CPV One campaign and returns the
// campaign tracking URL with the channel id attached.
//
// ── Why this creates nothing ──
//
// CPV One's API has no campaign-creation endpoint (verified: it exposes
// campaign list/edit/editpage, stats, conversions, visitorstats, click lookup,
// and landing-page/offer management — nothing that adds a campaign). So the
// admin creates the campaign in CPV One and this route attaches our channel id
// to it via an Extra Token. Attempting a create would fail on every call.
//
// ── Why retrying is safe ──
//
// The channel id arrives from the client, already minted and immutable. This
// route only reads from CPV One and builds a string from what it read. Nothing
// is created anywhere, so there is nothing to duplicate: two identical requests
// return two identical responses and leave exactly one link.

import { appendChannelToCampaignUrl, isChannelId } from '../../src/services/cpvOneService.js';
import { assertTokenParam, CHANNEL_PARAM, config, extraTokenSlot, freeSlots, handler, HttpError, log, slotNumber } from './_cpv.js';
import { findCampaign } from './validate.js';

export default handler(async (body) => {
  const { funnelId, channelId } = body || {};

  if (!funnelId || typeof funnelId !== 'string') throw new HttpError(400, 'funnelId is required.');
  // Validated rather than generated here: a channel id minted server-side would
  // be a new one on every retry, which is exactly the duplicate this is meant
  // to prevent.
  if (!isChannelId(channelId)) throw new HttpError(400, 'channelId is missing or malformed.');

  const { trackingBase, tokenParam: channelToken } = config();
  assertTokenParam(channelToken);
  const n = slotNumber(channelToken);

  const { row, ...campaign } = await findCampaign(body);

  // Which URL parameter this campaign actually reads into that slot. Not
  // `extra1`: CPV One reads whatever the campaign declares, and a parameter it
  // does not expect is dropped without complaint — a funnel that looked linked
  // and recorded nothing is the worst outcome available here, so this refuses
  // rather than guesses.
  const slot = extraTokenSlot(row, n);
  if (slot.problem) {
    const free = freeSlots(row);
    const elsewhere = free.length ? ` Free slots on this campaign: ${free.map((i) => `extra${i}`).join(', ')}.` : '';
    if (slot.problem === 'unconfigured') {
      throw new HttpError(
        409,
        `Campaign ${campaign.campaignId} has no Extra Token ${n} set up, so CPV One would ignore the channel ID. Open the campaign in CPV One, add Extra Token ${n} reading the parameter "${CHANNEL_PARAM}", save, then link again.`
      );
    }
    if (slot.problem === 'multivariate') {
      throw new HttpError(
        409,
        `Extra Token ${n} on campaign ${campaign.campaignId} is a split-test variable ("${slot.param}"). Writing the channel ID there would overwrite that test's data — point CPV_ONE_CHANNEL_TOKEN at a free slot instead.${elsewhere}`
      );
    }
    throw new HttpError(
      409,
      `Extra Token ${n} on campaign ${campaign.campaignId} already reads "${slot.param}"${slot.name && slot.name !== slot.param ? ` (${slot.name})` : ''}. Sharing it would make that column mean two different things — give the channel ID a slot of its own, configured to read "${CHANNEL_PARAM}".${elsewhere}`
    );
  }

  // The campaign's own URL if CPV One reports one; otherwise built from the
  // configured tracking domain, which is how CPV One composes them.
  let base = campaign.campaignUrl;
  if (!base) {
    if (!trackingBase) {
      throw new HttpError(
        503,
        'CPV One did not report a URL for that campaign and CPV_ONE_TRACKING_BASE_URL is not set, so the tracking URL cannot be built.'
      );
    }
    base = `${trackingBase.replace(/\/+$/, '')}/base.php?c=${encodeURIComponent(campaign.campaignId)}`;
  }

  const cpvTrackingUrl = appendChannelToCampaignUrl(base, { channelId, tokenParam: slot.param });

  log('synced', { funnelId, channelId, campaignId: campaign.campaignId, slot: n, tokenParam: slot.param });

  return {
    funnelId,
    channelId,
    campaignId: campaign.campaignId,
    campaignName: campaign.campaignName,
    cpvTrackingUrl,
    // The parameter the URL actually carries, and the slot it lands in — both
    // shown in the editor, because an admin checking a CPV One report needs to
    // know which column to look at.
    tokenParam: slot.param,
    tokenSlot: n,
    tokenName: slot.name,
  };
});
