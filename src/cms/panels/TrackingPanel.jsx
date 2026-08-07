import { useEffect, useRef, useState } from 'react';
import { normalizeCampaignRef, syncFunnelTracking, validateCpvCampaign } from '../../services/cpvOneService.js';
import * as store from '../store.js';
import { trackingOptions } from '../trackingConfig.js';
import { Btn, Field, inputClass, Panel } from '../ui.jsx';

// Where a funnel's tracking lives in the editor.
//
// The channel id and the tracking URL are shown even before any CPV One
// campaign is linked, because they exist from the moment the funnel does and
// the link is useful on its own — an admin can put a funnel in front of traffic
// and attribute it later.
//
// The CPV One half is deliberately a paste box rather than a "create campaign"
// button: CPV One's API has no endpoint that creates a campaign, so a button
// promising one would be a lie that fails on every click. The admin makes the
// campaign there and brings back its id or URL; we attach the channel id to it.

const STATUS = {
  unlinked: { label: 'Not linked to CPV One', tone: 'text-white/40', dot: 'bg-white/25' },
  pending: { label: 'Linking…', tone: 'text-[#a892ff]', dot: 'bg-[#a892ff] animate-pulse' },
  linked: { label: 'Linked to CPV One', tone: 'text-[#6ee7a8]', dot: 'bg-[#6ee7a8]' },
  error: { label: 'Link failed', tone: 'text-[#ff9aa7]', dot: 'bg-[#ff6b7d]' },
};

export function TrackingPanel({ funnel, onPatch }) {
  const t = funnel.tracking || {};
  const [campaignRef, setCampaignRef] = useState(t.cpv_campaign_id || '');
  const [busy, setBusy] = useState('');
  const [ok, setOk] = useState('');
  const [error, setError] = useState('');

  // A sync can outlive this panel — the admin can switch tabs mid-request — and
  // setting state on an unmounted panel is a warning for no benefit.
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const status = STATUS[t.cpv_sync_status] || STATUS.unlinked;
  const parsed = normalizeCampaignRef(campaignRef);
  const canSubmit = Boolean(parsed.campaignId || parsed.campaignUrl) && !busy;

  const run = async (kind, fn) => {
    setBusy(kind);
    setError('');
    setOk('');
    if (kind === 'sync') onPatch({ cpv_sync_status: 'pending', cpv_sync_error: '' });
    try {
      const message = await fn();
      if (!alive.current) return;
      setOk(message);
    } catch (e) {
      if (!alive.current) return;
      setError(e.message);
      if (kind === 'sync') {
        // Persisted, not just shown: an admin who closes the editor after a
        // failure should find the funnel still saying it is not linked, and why.
        store.patchTracking(funnel.id, { cpv_sync_status: 'error', cpv_sync_error: e.message });
        onPatch({ cpv_sync_status: 'error', cpv_sync_error: e.message });
      }
    } finally {
      if (alive.current) setBusy('');
    }
  };

  const check = () =>
    run('check', async () => {
      const res = await validateCpvCampaign(campaignRef);
      const found = `Campaign ${res.campaignId}${res.campaignName ? ` — ${res.campaignName}` : ''} exists in CPV One.`;
      // Existing is not the same as ready. A campaign whose Extra Token slot is
      // unset will accept the link and record nothing, so it is said here rather
      // than discovered in an empty report later.
      if (res.tokenReady) return `${found} It reads the channel ID from “${res.tokenParam}”.`;
      if (res.tokenProblem === 'multivariate') {
        return `${found} But its ${res.channelToken} slot is used by a split test — linking will be refused until CPV_ONE_CHANNEL_TOKEN points at a free slot.`;
      }
      return `${found} But it has no ${res.channelToken} set up yet — add that Extra Token in CPV One with the parameter “channel_id”, or linking will be refused.`;
    });

  const link = () =>
    run('sync', async () => {
      const tracking = await syncFunnelTracking(funnel, campaignRef, trackingOptions());
      store.patchTracking(funnel.id, tracking);
      onPatch(tracking);
      return `Linked to campaign ${tracking.cpv_campaign_id}. Traffic on this channel id will report against it.`;
    });

  return (
    <Panel
      title="Tracking"
      subtitle="The channel this funnel is attributed to"
      right={
        <span className={`flex shrink-0 items-center gap-1.5 text-[.7rem] ${status.tone}`}>
          <span className={`size-1.5 rounded-full ${status.dot}`} />
          {busy === 'sync' ? STATUS.pending.label : status.label}
        </span>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field
          label="Channel ID"
          hint="Generated when the funnel was created and fixed for good — links already handed to a traffic source depend on it."
        >
          <CopyRow value={t.channel_id} label="channel ID" mono />
        </Field>

        <Field label="Tracking URL" hint="The link to give a traffic source. It carries the channel ID to the player.">
          <CopyRow value={t.tracking_url} label="tracking URL" />
        </Field>

        <hr className="border-white/8" />

        <Field
          label="CPV One campaign"
          hint="Paste the campaign ID or its tracking URL from CPV One. Campaigns are made there — CPV One's API has no endpoint that creates one."
        >
          <input
            className={inputClass}
            value={campaignRef}
            onChange={(e) => { setCampaignRef(e.target.value); setError(''); setOk(''); }}
            placeholder="1042  —  or  https://track.example.com/base.php?c=1042"
            spellCheck={false}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="primary" onClick={link} disabled={!canSubmit}>
            {busy === 'sync' ? 'Linking…' : t.cpv_sync_status === 'linked' ? 'Re-link campaign' : 'Link campaign'}
          </Btn>
          <Btn onClick={check} disabled={!canSubmit}>{busy === 'check' ? 'Checking…' : 'Check it exists'}</Btn>
          {!canSubmit && !busy && <span className="text-[.68rem] text-white/30">Enter a campaign ID or URL</span>}
        </div>

        {ok && (
          <p className="rounded-lg border border-[#6ee7a8]/25 bg-[#6ee7a8]/8 px-3 py-2 text-[.75rem] leading-relaxed text-[#6ee7a8]">
            {ok}
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-[#ff6b7d]/25 bg-[#ff6b7d]/10 px-3 py-2 text-[.75rem] leading-relaxed text-[#ff9aa7]">
            {error}
          </p>
        )}
        {!error && t.cpv_sync_status === 'error' && t.cpv_sync_error && (
          <p className="rounded-lg border border-[#ff6b7d]/25 bg-[#ff6b7d]/10 px-3 py-2 text-[.75rem] leading-relaxed text-[#ff9aa7]">
            Last attempt failed: {t.cpv_sync_error}
          </p>
        )}

        {t.cpv_sync_status === 'linked' && (
          <div className="flex flex-col gap-3.5 rounded-lg border border-white/8 bg-white/[.02] p-3">
            <Field
              label="CPV One tracking URL"
              hint={`This is the link to run traffic to. It carries the channel ID as “${t.cpv_token_param || 'a parameter'}”, which CPV One records${
                t.cpv_token_slot ? ` as Extra Token ${t.cpv_token_slot}` : ''
              }, and passes it on to the funnel.`}
            >
              <CopyRow value={t.cpv_tracking_url} label="CPV tracking URL" />
            </Field>
            <p className="text-[.68rem] leading-relaxed text-white/35">
              Campaign {t.cpv_campaign_id}
              {t.cpv_campaign_name ? ` — ${t.cpv_campaign_name}` : ''} · linked{' '}
              {t.cpv_synced_at ? new Date(t.cpv_synced_at).toLocaleString() : ''}
              {t.cpv_token_param && (
                <>
                  {' '}· reported under <code className="text-white/60">{t.cpv_token_param}</code>
                  {t.cpv_token_slot ? ` (Extra Token ${t.cpv_token_slot})` : ''} in CPV One
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}

// A read-only value with the one action it needs. Read-only because every value
// shown through it is either immutable or derived from something that is —
// an editable field here would invite changing a live channel id.
function CopyRow({ value, label, mono = false }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    setFailed(false);
    try {
      // The clipboard API needs a secure context, which `vite preview` over
      // plain http on a LAN address is not — so there is a fallback rather than
      // a button that silently does nothing.
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else throw new Error('no clipboard');
      setCopied(true);
    } catch {
      setFailed(true);
    }
  };

  if (!value) {
    return <p className="rounded-lg border border-dashed border-white/12 px-3 py-2 text-[.75rem] text-white/25">Not set yet.</p>;
  }

  return (
    <span className="flex items-stretch gap-2">
      <input
        readOnly
        value={value}
        onFocus={(e) => e.target.select()}
        aria-label={label}
        className={`${inputClass} flex-1 cursor-text text-white/70 ${mono ? 'font-mono text-[.78rem]' : ''}`}
      />
      <Btn onClick={copy} className="shrink-0" title={`Copy ${label}`} aria-live="polite">
        {copied ? '✓ Copied' : failed ? 'Select it' : 'Copy'}
      </Btn>
    </span>
  );
}
