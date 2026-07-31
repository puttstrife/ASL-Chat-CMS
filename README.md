# ASL Interactive Chat — Selene

An interactive chat reading for [Astro Lover](https://astroloversketch.com/). Selene, a
scripted reader, collects the visitor's name and birth date, then draws a soulmate portrait
over the course of a conversation — silhouette, features, neck — photographing each stage
at her desk. The finished face arrives blurred behind a paywall.

The reading exists in **two versions** that differ by one stage; see
[Versions](#versions).

---

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173. There is no backend to start.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the built `dist/` locally |

Built and tested on Node 24 / npm 11.

---

## Versions

| | Version A | Version B |
| --- | --- | --- |
| URL | `/?v=a` (default) | `/?v=b` |
| Stages | 9 | 8 |
| Difference | Selene interrupts the portrait to sketch **the place** the meeting keeps pushing into her head, then asks if the visitor recognises it | No place stage — straight from the traits to the email |
| CTA promises | face, profile, **meeting place**, 24 hours | face, profile, 24 hours |

Stages 1–5 are byte-identical between them, shared from one file.

In development a **version switch** appears top-left. It is dev-only; production
selects the version from `?v=` alone, so a link can be shared without exposing the
control. An unrecognised value falls back to A.

---

## Architecture

A static single-page React frontend. Everything is driven client-side by a scripted state
machine — no network calls, nothing to deploy but `dist/`.

```
index.html                       → src/chat/main.jsx → App.jsx
src/chat/scripts/shared.js         stages 1–5, identical in both versions
src/chat/scripts/version-a.js      + place interruption, 9 stages
src/chat/scripts/version-b.js      straight to email, 8 stages
src/chat/scripts/index.js          registry; resolves ?v=
src/chat/hooks/useFunnel.js        the engine that plays a script
src/chat/hooks/useChatSfx.js       send/reply sound effects, muted by the header toggle
src/chat/hooks/useTabBadge.js      unread-message count on the browser tab (desktop) / avatar (mobile)
src/chat/lib/sfx.js                sound asset paths
src/chat/components/ChatCard.jsx   the chat shell — header, transcript, dock
src/chat/components/Bubble.jsx     a single message bubble
src/chat/components/ReactionPicker.jsx  emoji reaction on the visitor's own messages
src/chat/components/AIGradientBorder.jsx  the glass/gradient card border
src/shared/components/RainbowButton.jsx   shared button primitive
public/images/sketch-v2/           the desk photographs (man/ and woman/ sets, plus one shared place image)
public/audio/                      looping ambient track + sfx
```

### Why sibling scripts

Both versions share the engine — pacing, docks, branching, rendering. Keeping them as
files selected at runtime means a fix lands once. A branch or a second repo would mean
fixing every bug twice. Adding a version C is a new file plus one line in `index.js`.

### How a script works

A stage is an ordered list of `beats` followed by exactly one dock (the control at the
bottom of the card).

```js
'4': {
  beats: [
    l('Okay. I’ve honed it down to one.', 1.5),   // a line, with its typing time
    drawing(4),                                    // hold the indicator, no bubble
    { image: IMG.silhouette },                     // a photograph
    { traits: TRAITS_FIRST },                      // the notes she has so far
  ],
  buttons: [{ label: 'Continue', next: '5' }],
}
```

Beats play top to bottom. `{name}` interpolates from the visitor's answers. Branches are
ordinary stages: a `buttons` dock routes to one, and each branch ends by pointing back at
the stage where the paths rejoin.

Dock types — a stage ends in one of:

| Key | Renders |
| --- | --- |
| `input` | `{ placeholder, key, next, cta, inputType? }` free text stored under `key`; `inputType: 'email'` swaps in a validated email field |
| `datePicker` | `{ key, next, cta }` month/day/year; day count clamps to the month, leap years included |
| `select` | `{ key, options[], next, cta }` pick one, then confirm |
| `buttons` | `[{ label, next, variant?, arrow? }]` acts immediately on tap |
| `next` | a plain "Continue" affordance |

A stage may also carry `trust: [...]`, rendered as the reassurance row beneath the button.

### Typing pacing

The goal on this screen is to be indistinguishable from a person typing, so the pacing is
set to what a person can actually do rather than to what reads fastest.

`revealLine` holds the typing indicator for 30–50 ms per character — 240–400 wpm,
averaging ~300: fast enough to be unrealistic, chosen to hit a ~7-minute session target
rather than to read as an ordinary adult at a keyboard. Re-rolled per line, so the same
message is never timed twice the same way. Clamped to 0.9–26 s.

The ceiling is deliberately high. A low cap made the longest messages proportionally the
quickest, which is backwards: those are the ones that should visibly take a while. Long
lines are split at their own punctuation in the script instead, so no single message sits
for half a minute.

This puts a session at roughly 7 minutes. That is the cost of the goal.

A beat may ask for a specific duration (`l('Wait.', 2)`). That acts as a **floor**, not a
replacement: a script can hold a deliberate pause, but never make a long message flash by
in less time than typing it would take.

`drawing(seconds, label)` holds the indicator without producing a bubble, and labels it —
"Selene is drawing", "Selene is opening your chart" — to stage the pause before an image.

### Portraits

`IMG` in `shared.js` maps five photographs per gender (`man/` and `woman/`), plus one
`place` image shared by both. They are one drawing progressing: silhouette → outline →
neck → finished. The last is passed `locked: true`, which blurs it behind a **Details
Redacted** pill.

Stage 3 asks who the visitor's heart looks for — a man, a woman, or either — which is what
selects the portrait set. This question is not in the source doc; it was added because the
artwork needs to know which set to render, and because the doc's "two came up" beat needs
something to narrow it down to one. "A man"/"A woman" set the set directly. **"I'm open to
either" picks at random** (`useFunnel.js`'s `gender()`), once per session, and holds — a
face that changed partway through would undo the reading. There is no name/date-based
inference; that was considered and deliberately not built (see below).

### Sound

Three audio elements, all governed by the single speaker toggle in the header:

- `public/audio/ambient.mp3` — looping bed at volume `0.12`.
- Send/reply sfx (`useChatSfx.js`) — a short ping when the visitor acts, and when a Selene
  message lands. Each play uses a cloned `Audio` element rather than rewinding the shared
  one, so overlapping triggers don't cancel each other.

Browsers block audio until the page has been interacted with; all three unlock silently on
the visitor's first pointer or key event, ahead of the first sound that's actually meant to
be heard.

### Other UI details worth knowing

- **Message counter** — `useTabBadge.js` counts Selene's messages since the visitor's last
  reply, shown in the browser tab title/favicon on desktop and on the header avatar badge
  on mobile (phone browsers hide the tab strip). Resets to zero on every visitor action.
- **Reactions** — `ReactionPicker.jsx` puts an emoji reaction on the visitor's own message,
  chosen by keyword-matching what they typed/tapped. Cosmetic only, not tied to the
  message counter.

---

## Gender inference: deliberately not built

The brief asks for something better than random-on-"either" — infer the visitor's gender
from their first name. That was considered and rejected for now, not just deferred:

- A usable name→gender dataset is tens of thousands of entries. It does not belong in the
  bundle.
- The alternative is an API (Genderize.io, NamSor). Those need a key, and a key cannot live
  in client-side code — this would need a server, which the project doesn't have.
- Coverage fails regardless — on shortened names, on names used across genders, and on most
  non-Anglo names. Including *Marisol* and *Elena*, both of which appear in the source
  script. The random fallback has to exist either way.
- Worth weighing even if a server gets built: the inference assumes the visitor wants the
  opposite gender to their own — a guess about their orientation, and the people most
  likely to be wronged by it are exactly the ones who chose "either" rather than answering.
  The current random pick makes no such claim.

If this gets built, the frontend contract is already in place — whatever decides this only
has to set the same value the two explicit "A man"/"A woman" answers set.

---

## Known limitations

1. **The paywall is cosmetic.** The CTA takes no payment and unlocks nothing. It plays a
   scripted `confirmed` closing stage instead — demo scaffolding so the reading doesn't
   dead-end, but nothing is charged and no email is sent. **Must not go in front of real
   traffic** until a real checkout sits behind it; if the CTA ends up linking out to an
   offer page instead, this stage should be deleted and its copy moved to that page's
   thank-you screen.
2. **The blur is client-side.** The finished portrait is already in the page at full
   resolution; devtools defeats it. A real gate has to serve the locked version only.
3. **The trust row makes claims nothing implements.** "Delivered in 24 hours" has no
   fulfilment behind it. Must not ship in front of real traffic as-is.
4. **The email goes nowhere.** It is collected into a ref and lost on reload — no storage,
   no ESP, no list — while the script promises delivery.
5. **The price is a placeholder.** `$XX`, deliberately not a real number.
6. **The trait copy is a placeholder.** The source doc labels its list an example and gives
   none for the second appearance; the later list was extended, not authored.
7. **Nothing persists.** Refreshing restarts the reading. Answers live in a ref.
8. **No analytics.** The brand site runs GTM, Meta Pixel and Clarity; this has none, so an
   A/B split would currently measure nothing.
9. **The reading is static.** Every visitor gets identical copy; the birth date is echoed
   back but never used to compute anything. The portrait set follows the gender answer (or
   a random pick on "either"), but nothing else about the artwork or text varies by input.
   The script claims all 12 chart placements while collecting only a date — no time, no
   place.
10. **No tests, no error boundary.** A throw inside the funnel blanks the card.
11. **Ambient track licensing.** `ambient.mp3` was generated with Suno. Identifying
    metadata has been stripped, but Suno embeds inaudible watermarks that cannot be
    removed or verified here — confirm the Suno plan permits commercial use before launch.
12. **Desktop-first spacing.** Responsive and working on mobile, but tuned at desktop
    width and not checked on real devices. The dev version switch overlaps the header at
    phone widths (dev-only, so it cannot ship).
13. **Background tabs stall the reading.** All pacing runs on `setTimeout`, and browsers
    throttle hidden tabs to roughly one timer per second, then one per minute after five —
    which matters at this length and undercuts the tab-badge counter, since it barely
    climbs while the visitor is away. Fix is timestamp-based scheduling instead of raw
    timers; not started.

---

## Handoff: what's next

The single blocker on everything else in [Known limitations](#known-limitations): there is
no real offer/checkout page to send the CTA to. `astroloversketch.com/offer/v4/` currently
404s with and without params. Once one exists:

- Point the CTA button (`buttons: [{ label: 'Unlock My Full Sketch', next: 'confirmed', ... }]`
  in `version-a.js`/`version-b.js`, stage `9`/`8`) at that URL instead of `next: 'confirmed'`.
- Carry `name`, `email`, `birthdate` (format `1973-September-26`, i.e. `formatDob` in
  `useFunnel.js`), and `gender` as query params or state. `zodiac` and `opposite` are
  derivable from the birth date client-side if the offer page needs them.
- Delete the `confirmed` stage in `shared.js` and move its copy to the offer page's
  thank-you screen — it exists only to keep the reading from dead-ending on a CTA that
  goes nowhere.

Everything else in Known limitations (persistence, analytics, real paywall, gender
inference, tab-throttle fix) is independent of that and can be picked up in any order.

---

## Conventions

- Tailwind v4 via `@tailwindcss/vite`; design tokens live in `src/chat/index.css`.
- Brand palette: gold `#dfa73a`, dark purple stroke `#4c1d95` on a near-black field.
- Type: Inter throughout.
- Commit style: imperative subject, body explaining *why*.
