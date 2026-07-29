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
index.html                     → src/chat/main.jsx → App.jsx
src/chat/scripts/shared.js       stages 1–5, identical in both versions
src/chat/scripts/version-a.js    + place interruption, 9 stages
src/chat/scripts/version-b.js    straight to email, 8 stages
src/chat/scripts/index.js        registry; resolves ?v=
src/chat/hooks/useFunnel.js      the engine that plays a script
src/chat/components/ChatCard.jsx the entire chat UI
public/images/sketch-v2/         the five desk photographs
public/audio/                    looping ambient track
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

`revealLine` simulates a person at a keyboard: a short pause to consider, then a typing
indicator held for 45–70 ms per character — re-rolled per line, so the same message is
never timed twice the same way — clamped to 0.7–6.5 s.

A beat may ask for a specific duration (`l('Wait.', 2)`). That acts as a **floor**, not a
replacement: a script can hold a deliberate pause, but never make a long message flash by
in less time than typing it would take.

`drawing(seconds, label)` holds the indicator without producing a bubble, and labels it —
"Selene is drawing", "Selene is opening your chart" — to stage the pause before an image.

### Portraits

`IMG` in `shared.js` maps the five photographs. They are one drawing progressing:
silhouette → features → neck → finished. The last is passed `locked: true`, which blurs it
behind a **Details Redacted** pill.

There is no gender question; the source script never asks one, and the artwork is a single
set.

### Audio

`public/audio/ambient.mp3` loops at volume `0.12`, wired to the speaker toggle in the
header. Browsers block autoplay until the page has been interacted with, so playback also
starts on the first pointer or key event.

---

## Known limitations

1. **The paywall is cosmetic.** The CTA takes no payment and unlocks nothing. Worse, it
   currently echoes its own label into the transcript and then does nothing, which reads
   as broken rather than unfinished.
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
   back but never used to compute anything, and the portrait is not derived from any input.
   The script claims all 12 chart placements while collecting only a date — no time, no
   place.
10. **No tests, no error boundary.** A throw inside the funnel blanks the card.
11. **Ambient track licensing.** `ambient.mp3` was generated with Suno. Identifying
    metadata has been stripped, but Suno embeds inaudible watermarks that cannot be
    removed or verified here — confirm the Suno plan permits commercial use before launch.
12. **Desktop-first spacing.** Responsive and working on mobile, but tuned at desktop
    width and not checked on real devices. The dev version switch overlaps the header at
    phone widths (dev-only, so it cannot ship).

---

## Conventions

- Tailwind v4 via `@tailwindcss/vite`; design tokens live in `src/chat/index.css`.
- Brand palette: gold `#dfa73a`, dark purple stroke `#4c1d95` on a near-black field.
- Type: Inter throughout.
- Commit style: imperative subject, body explaining *why*.
