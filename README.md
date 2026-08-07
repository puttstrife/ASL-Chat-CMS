# Chat CMS

A small CMS for scripted chat readings. An admin builds a "reader" — their face,
name, voice, script, questions and call to action — and the app plays it. No
developer needed to make a new one.

It grew out of [ASL Interactive Chat](https://github.com/puttstrife/ASL-Interactive-Chat),
where each variant of the funnel was a hand-written JavaScript module. That put a
developer in the middle of every copy change. Here the script is data, and the
engine that plays it is the same for every reader.

---

## Quick start

```bash
npm install
npm run dev
```

| Route | What it is |
| --- | --- |
| `/` | The player — runs a funnel as a visitor sees it |
| `/#/admin` | The editor |
| `/?f=<id>` | Play one specific funnel |

Routing is hash-based on purpose: no server rewrite rules, so the same build
works on any static host and under `vite preview`.

---

## What an admin can build

**The reader** — name, role, avatar (uploaded or a path), accent and header
colours, and the wording of the "is typing" / "is with you…" lines.

**The script** — a list of stages. Each stage plays some beats and then ends with
exactly one control:

| Beat | What it does |
| --- | --- |
| Message | A chat bubble. Can hold for a minimum time. |
| Pause | The typing indicator with a label ("is drawing"), no bubble. |
| Image | Uploaded or by path. Can be blurred behind a "Details Redacted" pill. |
| Bulleted list | A list bubble, for traits or summaries. |

| Ending | What it does |
| --- | --- |
| Nothing | Flows straight on. |
| Continue | One button. |
| Choice buttons | Two or more answers, each routing somewhere. Two of them is a yes/no. |
| Text input | Captures a typed answer. Text, email (validated), phone or number. |
| Date picker | Month / day / year. |
| Dropdown picker | Pick one, then confirm. |
| Call to action | The final button. Goes to a URL, carrying chosen answers as query params. |
| End | The reading stops. |

**Pace** — a words-per-minute slider with a live estimate of how long the reading
takes down its longest path. The two are one decision, so they sit together.

### Answers and interpolation

Any captured answer is available in later copy as `{key}` — `{name}`, `{email}`,
or anything a writer names. Unfilled ones render as `…` rather than showing raw
syntax. Image paths interpolate too, so `/images/{gender}/face.webp` picks a
different file per answer.

A choice button can also record an answer without an input — that is how a funnel
captures something like which portrait set to use. Give it a comma-separated
value and it picks one at random, once, and holds it for the session.

---

## Tracking with CPV One

Every funnel gets a **channel ID** the moment it is created — `ch_<time><random>`,
unique, and frozen from then on. It is what a click, a conversion and a funnel
have in common, so it cannot be allowed to move: the store refuses writes that
try to change it, and duplicating or importing a funnel mints a new one rather
than carrying the original's.

From it comes the **tracking URL**, the link handed to a traffic source:

```
https://chat.example.com/?f=<funnel-id>&channel_id=<channel-id>
```

Both are shown, with a copy button, under the editor's **Tracking** tab, and the
channel ID also sits on each row of the funnel list so a line in a CPV One report
can be matched back to a funnel without opening anything.

### Why a funnel is not a campaign

The obvious design — new funnel, new CPV One campaign, automatically — is the
wrong one, and it is worth saying why before someone tries to build it.

A campaign in this account is a **reporting bucket**, organised as domain →
traffic source → variant. They are created deliberately and rarely. Funnel
variants belong *inside* a campaign, as landing-page splits and Extra Tokens.
One campaign per funnel would shatter the reporting the account already runs on.

CPV One's API happens to agree: checked against
[the API docs](https://cpvlab.pro/docs/cpv-lab-pro-api.html), it exposes campaign
**list** and **edit**, stats, conversions, visitor stats, click lookup, and
landing-page/offer management, and there is **no endpoint that creates a
campaign.** But the missing endpoint is not the reason this app does not create
campaigns. Even with one, it should not.

So per-funnel attribution rides an Extra Token inside an existing campaign, which
is how it should work here regardless of what the API allows. The admin creates
the campaign in CPV One, pastes its ID or its tracking URL into the Tracking tab,
and the app:

1. checks the campaign exists (`/api/campaign/list/`),
2. checks that campaign's **Extra Token** slot is set up to receive the channel ID,
3. attaches the channel ID to the campaign URL,
4. saves the relationship on the funnel.

The result is the URL to actually run traffic to. CPV One records the Extra Token
and forwards the parameters it does not handle, so the channel ID reaches the
player too, is held for the session, and is appended to the CTA URL on the way
out — traffic, conversion and revenue all land on the same channel.

### The Extra Token slot, and why step 2 exists

The one part of this that cannot be guessed from the docs. **CPV One does not
read a parameter called `extra1`.** Each campaign declares, per slot, *which* URL
parameter feeds it — `ExtraTokenParam3` might be `hop`, `utm_source` or `{tid}`.
Send `extra1=<channel id>` to a campaign expecting `tid` and it is dropped
without complaint, leaving a funnel that looks linked and records nothing.

So the slot number is ours (`CPV_ONE_CHANNEL_TOKEN`) and the parameter name is
the campaign's. Linking is refused, with the fix in the message, when the chosen
slot is:

| Slot state | Why refused |
| --- | --- |
| unset | CPV One would ignore the value |
| reads something else (`utm_source`, `tid`, `hop`) | sharing it makes that column mean two things |
| a split-test variable (`{multivariate1}`) | writing there would overwrite the test's data |

**Per campaign, once, in CPV One:** open it, add Extra Token *N* reading the
parameter `channel_id`, save. Then it is linkable.

*N* has to be free across the whole account, not merely on one campaign.
**In this account that means 11–15.** `extra1` carries `utm_source` and the
traffic-source reporting depends on it; `extra2`–`extra4` are also in use. So
`CPV_ONE_CHANNEL_TOKEN=11`, and the default is `extra11` rather than `extra1` for
the same reason — an unset variable should not point at live reporting.
`npm run cpv:check` confirms what is free before you commit to a number.

### What this app does not send

Nothing. Both routes only read from CPV One.

Views and leads are already tracked by the pixel on the campaign URL, and backend
conversion data comes from ClickBank. So the CMS has no reporting job: it has to
**preserve the tracking parameters and stay out of the way.** Every parameter on
the inbound URL is held for the session and reattached at the CTA — click IDs,
affiliate parameters, `utm_*`, anything CPV One forwarded — because this page is
one hop in a chain it does not own, and a parameter dropped here is attribution
lost with nothing to say so.

### Setup

Copy `.env.example` to `.env.local` and fill it in. `.env.example` holds names
and no values, and is the only `.env` file git tracks — everything matching
`.env*` is ignored, with that one exception. The values are not in this
repository and never will be.

**Get the API key yourself, from CPV One.** Anyone with admin on the account can
read it at **Settings → General Settings → *Enable API Access***. No one needs to
send it to you, and it should not arrive by email, chat or a pull request.

It is one key for the whole account, not one per person — the same string
everyone reads. So **regenerating it breaks every other integration using it at
the same moment**, this app included. Read it; do not roll it because it is
easier than finding it.

The API URL is the install you log in to, without `/api`. The channel token is
`11` here — see above for why. The two `VITE_` variables can stay blank on a
single-origin deploy.

| Variable | Where it is read | Why |
| --- | --- | --- |
| `CPV_ONE_API_URL` | server | The CPV One install, without `/api` |
| `CPV_ONE_API_KEY` | server | Read it from Settings → General Settings → *Enable API Access*. Account-wide; do not regenerate |
| `CPV_ONE_ACCOUNT_ID` | server | Optional; only for installs that scope calls |
| `CPV_ONE_TRACKING_BASE_URL` | server | Used only when CPV One reports no URL for a campaign |
| `CPV_ONE_CHANNEL_TOKEN` | server | Which Extra Token slot carries the channel ID — `11` in this account; 1–4 are taken |
| `VITE_CHAT_BASE_URL` | browser | Where the player is served from |
| `VITE_CHAT_URL_PATTERN` | browser | The shape of a tracking URL |

The CPV variables have no `VITE_` prefix on purpose. Vite compiles every
`VITE_`-prefixed value into `dist/`, so a key named that way would ship to every
visitor. They are read in `api/cpv/_cpv.js` — the only file that touches the key,
and the only reason this otherwise-static app has a server side at all. Logs go
through a redactor there, so no line can carry the key or a URL still holding it.

### Checking the connection

```bash
npm run cpv:check
```

Read-only — it lists campaigns and counts them, creating and changing nothing, so
it is safe against a live account. It runs the same `api/cpv/_cpv.js` the
functions do, so a pass here means the functions will work. It reports the API
host, whether the key authenticated, how many campaigns are visible, which of
them have the channel slot set up, and which slots are free account-wide. The key
is never printed — only its length.

The same check is exposed as `POST /api/cpv/test` for use against a deployment.

### Testing

```bash
npm test          # once
npm run test:watch
```

Locally, `npm run dev` serves the editor but not the `/api` functions; the
Tracking tab will say the tracking service is unavailable, which is accurate. Run
`vercel dev` to exercise the whole path, or `npm run cpv:check` to test the CPV
half without a server at all.

`src/services/cpvOneService.test.js` covers the two things that must never drift
— channel ID generation (shape, determinism under an injected clock, 5000 ids in
one millisecond with no collision) and tracking URL construction (both URL
patterns, escaping, idempotence).

`src/cms/store.test.js` drives the real store against an in-memory
`localStorage` and a stubbed `fetch`: creating a funnel, the v1 → v2 migration,
the immutability guard, a sync round trip, a retried sync, and the failure paths.

`api/cpv/_cpv.test.js` covers the server-side judgements — reading a campaign
row, deciding whether an Extra Token slot is usable, and the log redactor.

---

## Architecture

```
src/main.jsx                  hash routing: player vs editor
src/chat/                     the player
  hooks/useFunnel.js            the engine; consumes funnel JSON
  hooks/useChatSfx.js           send/reply sounds
  hooks/useTabBadge.js          unread count on the tab and the avatar
  components/ChatCard.jsx       the chat surface; everything comes from `persona`
src/cms/
  model.js                      what a funnel is, and the factories for empty ones
  store.js                      localStorage CRUD, schema migrations, export/import
  seed.js                       the two Selene readings, converted (generated)
  estimate.js                   how long a reading takes — mirrors useFunnel's timing
  trackingConfig.js             the public half of tracking config
  CmsApp.jsx                    funnel list and editor shell
  panels/                       persona, pace, stages, beats, docks, preview, tracking
src/services/
  cpvOneService.js              channel ids, tracking URLs, the CPV One link
api/cpv/                        the only server-side code; holds the CPV One key
  _cpv.js                       config, redacted logging, the CPV One call,
                                  Extra Token rules
  validate.js                   POST — does this campaign exist, and is it ready?
  sync.js                       POST — link a funnel's channel to a campaign
  test.js                       POST — read-only connection check
scripts/cpv-check.mjs           the same check from the command line
```

### One format, not two

The engine consumes the same JSON the editor writes. There is no build step and no
second "compiled" representation, because two formats means two things to keep in
sync and one of them silently rots.

The two Selene readings in `seed.js` were converted from the original hand-written
scripts. They are seed data with no special status — the editor can change or
delete them. They exist so the editor opens with real content, and because
converting a script that actually shipped is the only honest test that this data
model can express one.

### The preview

The editor plays the funnel beside the thing being edited, through a speed
multiplier that is **not** saved. Nobody can proof a seven-minute reading in real
time, but the speed someone tests at must not become the speed that ships.

A CTA in the preview reports where it *would* have gone rather than navigating —
following it would throw away the editor.

---

## Known limitations

1. **Funnels live in one browser.** localStorage, no server. Clearing site data
   loses them; two people cannot edit the same funnel; there is no auth. Export to
   a `.json` file is the only way to move or back one up. This is the first thing
   to replace — see below.
2. **Images are embedded in the funnel.** Uploads become data URLs inside the
   JSON, which is what makes a funnel one portable file, but it also means a big
   image can blow the storage quota. Uploads are capped (400KB avatars, 900KB
   images) and rejected loudly rather than silently failing.
3. **The stage list is linear.** Branches are real and work, but they are shown as
   dropdowns rather than as a graph, so a heavily branched funnel is harder to
   picture than it should be.
4. **No undo.** Autosave is immediate and there is no history.
5. **The estimate is approximate.** It mirrors `useFunnel`'s timing and walks the
   longest path, but random per-line variation means a real run lands near it, not
   on it. If the engine's timing changes, `estimate.js` must change with it.
6. **Nothing the player captures is stored.** Answers live in memory for the
   session, exactly as in the original funnel. No ESP, no persistence. The
   channel ID rides along with them and is passed on at the CTA, so attribution
   happens in CPV One rather than here — this app records no visits itself.
7. **Background tabs stall a reading.** Pacing is `setTimeout`-based and browsers
   throttle hidden tabs. Inherited from the original engine; the fix is
   timestamp-based scheduling.
8. **Tests cover tracking only.** Vitest specs cover channel IDs, tracking URLs
   and the store; the editor and the player engine have none, and Playwright is
   installed but still has no specs.
9. **The CPV link is one-way, and never reconciled.** Campaigns are made in CPV
   One and referenced here — by design, not only because the API has no create
   endpoint. If a campaign is deleted or renamed there, the funnel goes on
   claiming it is linked until someone re-links it. Nothing checks.
10. **No pixel on this page.** If the campaign URL points a visitor straight at
    the chat, then the chat *is* the landing page, and whatever view/lead pixel
    normally sits on an LP is not here. Fine when the chat is reached by
    redirect from a real LP; not fine if it replaces one. Unresolved.

---

## Next

**A real backend.** localStorage was chosen so the editor worked in the first
minute with no keys and no deploy, and it should not survive contact with more
than one person. Replacing it should only require rewriting `store.js` — nothing
above it knows where a funnel came from.

**A flowchart view of the script.** The linear list is right for writing copy in
order; it is wrong for seeing how branches rejoin. A node graph alongside it, not
instead of it.

**Not** automatic campaign creation. It is the first thing everyone asks for and
it is the wrong shape for this account — see *Why a funnel is not a campaign*.

---

## Conventions

- Tailwind v4 via `@tailwindcss/vite`; tokens in `src/chat/index.css`
- Inter throughout
- Commits: imperative subject, body explains *why* rather than what
