// POST /api/cpv/validate  { campaignId?, campaignUrl? }
//
// Answers one question: does this campaign exist in the CPV One account?
//
// It exists because the alternative is finding out weeks later, from a report
// with no rows in it, that a campaign id was mistyped. `/api/campaign/list/` is
// the only read the account needs to make and the only one that can tell a typo
// apart from a campaign that was deleted.

import {
  campaignId as idOf,
  campaignName as nameOf,
  campaignUrl as urlOf,
  config,
  cpvGet,
  extraTokenSlot,
  handler,
  HttpError,
  log,
  rows,
  slotNumber,
} from './_cpv.js';

export async function findCampaign(ref) {
  const wantedId = String(ref.campaignId || '').trim();
  const wantedUrl = String(ref.campaignUrl || '').trim();
  if (!wantedId && !wantedUrl) {
    throw new HttpError(400, 'Enter a CPV One campaign id, or paste the campaign tracking URL.');
  }
  if (wantedId && !/^\d{1,12}$/.test(wantedId)) {
    throw new HttpError(400, 'A CPV One campaign id is a number.');
  }

  const list = rows(await cpvGet('campaign/list'));
  if (!list.length) throw new HttpError(502, 'CPV One returned no campaigns for this account.');

  // By id when there is one. By URL otherwise — an admin pasting a tracking URL
  // rarely knows the id, and the URL is what identifies the campaign to them.
  const match = wantedId
    ? list.find((r) => idOf(r) === wantedId)
    : list.find((r) => {
        const known = urlOf(r);
        if (!known) return false;
        try {
          const a = new URL(known);
          const b = new URL(wantedUrl);
          return a.host === b.host && a.pathname === b.pathname;
        } catch {
          return false;
        }
      });

  if (!match) {
    throw new HttpError(
      404,
      wantedId
        ? `No campaign ${wantedId} in this CPV One account. Check the id, and that it has not been deleted.`
        : 'No campaign in this CPV One account matches that URL. Paste the campaign id instead.'
    );
  }

  return {
    campaignId: idOf(match),
    campaignName: nameOf(match),
    campaignUrl: urlOf(match) || wantedUrl,
    // The raw row, so the caller can read this campaign's Extra Token
    // configuration without listing every campaign a second time.
    row: match,
  };
}

export default handler(async (body) => {
  const { row, ...found } = await findCampaign(body);
  const { tokenParam } = config();
  const slot = extraTokenSlot(row, slotNumber(tokenParam));

  log('validated', { campaignId: found.campaignId, slotReady: !slot.problem });

  // Reported, not thrown: "the campaign exists but its token slot is not set up"
  // is a different message from "no such campaign", and the admin needs both.
  return {
    ...found,
    campaign: found,
    channelToken: tokenParam,
    tokenParam: slot.param || '',
    tokenReady: !slot.problem,
    tokenProblem: slot.problem || '',
  };
});
