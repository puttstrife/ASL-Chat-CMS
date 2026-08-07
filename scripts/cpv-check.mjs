// Is CPV One reachable with the credentials in this environment?
//
//   npm run cpv:check
//
// Read-only: it lists campaigns and counts them. Nothing is created, edited or
// deleted, so it is safe against a live account.
//
// It runs the same `_cpv.js` the serverless functions do, so a pass here means
// the functions will work — this is not a second implementation that can drift
// from the real one.
//
// Nothing it prints can carry a credential: the key is never echoed, URLs are
// reduced to hosts, and the key itself is shown only as a length.

import {
  campaignId as idOf,
  campaignName as nameOf,
  CHANNEL_PARAM,
  config,
  cpvGet,
  extraTokenSlot,
  freeSlots,
  rows,
  slotNumber,
} from '../api/cpv/_cpv.js';

const host = (v) => {
  try {
    return new URL(v).host;
  } catch {
    return '(not a URL)';
  }
};

const { apiUrl, apiKey, accountId, trackingBase, tokenParam, missing } = config();

console.log('CPV One connection check\n');
console.log(`  API host          ${apiUrl ? host(apiUrl) : '(not set)'}`);
console.log(`  API key           ${apiKey ? `set, ${apiKey.length} characters` : '(not set)'}`);
console.log(`  Account id        ${accountId ? 'set — calls will be scoped to it' : 'not set — calls are not scoped'}`);
console.log(`  Tracking base     ${trackingBase ? host(trackingBase) : '(not set — only needed as a fallback)'}`);
console.log(`  Channel token     ${tokenParam}\n`);

if (missing.length) {
  console.error(`✗ Missing ${missing.join(', ')}.`);
  console.error('  Set them in .env.local, and run through `npm run cpv:check` which loads that file.');
  process.exit(1);
}

try {
  const list = rows(await cpvGet('campaign/list'));
  console.log(`✓ Authenticated. /api/campaign/list/ returned ${list.length} campaign${list.length === 1 ? '' : 's'}.\n`);

  // Which campaigns can actually carry a channel id. CPV One reads each Extra
  // Token from a parameter the campaign names itself, so a campaign with that
  // slot unset would accept a link and record nothing — worth knowing before
  // anyone links one, not after a week of empty reports.
  const n = slotNumber(tokenParam);
  const ready = [];
  const notReady = [];
  for (const row of list) {
    const id = idOf(row);
    if (!id) continue;
    const slot = extraTokenSlot(row, n);
    (slot.problem ? notReady : ready).push({ id, name: nameOf(row) || '(unnamed)', slot });
  }

  const total = ready.length + notReady.length;
  console.log(`  Extra Token ${n} reads "${CHANNEL_PARAM}" on ${ready.length} of ${total} campaigns.\n`);
  for (const c of ready.slice(0, 10)) console.log(`    ✓ ${c.id.padStart(4)}  ${c.name}`);
  if (ready.length > 10) console.log(`      …and ${ready.length - 10} more ready`);

  if (ready.length) {
    console.log('\n  Paste a ✓ campaign id into a funnel’s Tracking tab to link it.');
  } else {
    const count = (p) => notReady.filter((c) => c.slot.problem === p).length;
    console.log('  None yet — nothing is linkable until one campaign is set up.\n');
    console.log('  To set one up, in CPV One:');
    console.log('    1. open the campaign you want the chat funnel attributed to');
    console.log(`    2. add Extra Token ${n}, reading the parameter "${CHANNEL_PARAM}"`);
    console.log('    3. save, then re-run this check\n');
    console.log(`  Of the ${total} campaigns, that slot is currently:`);
    console.log(`    ${count('unconfigured')} unset — ready to be given to ${CHANNEL_PARAM}`);
    console.log(`    ${count('occupied')} carrying something else already`);
    console.log(`    ${count('multivariate')} used by a split test`);

    // Whichever slot is free everywhere is the one worth standardising on, so
    // one CPV_ONE_CHANNEL_TOKEN value works across the account.
    const freeEverywhere = [];
    for (let i = 1; i <= 15; i += 1) if (list.every((r) => freeSlots(r).includes(i))) freeEverywhere.push(i);
    if (freeEverywhere.length) {
      console.log(`\n  Free on every campaign: ${freeEverywhere.map((i) => `extra${i}`).join(', ')}`);
      if (!freeEverywhere.includes(n)) {
        console.log(`  extra${n} is not — consider CPV_ONE_CHANNEL_TOKEN=extra${freeEverywhere[0]}`);
      }
    }
  }
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(1);
}
