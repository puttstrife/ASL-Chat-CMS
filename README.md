# ASL Interactive Chat — Selene

An interactive chat funnel for [Astro Lover](https://astroloversketch.com/). A scripted
reader, "Selene", collects the visitor's name, date of birth and soulmate preference, then
plays out a reading that progressively reveals a hand-drawn soulmate portrait — jaw, then
hairline, then the finished sketch, which stays blurred until the visitor continues to the
full reading.

---

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173. That is all you need — see [Architecture](#architecture) for why
there is no backend to start.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Production build → `dist/` |
| `npm start` | Express server (see [The backend is currently unused](#the-backend-is-currently-unused)) |
| `npm run serve` | `build` then `start` |

Built and tested on Node 24 / npm 11.

---

## Architecture

**The shipped app is a static single-page React frontend.** Everything the visitor sees is
driven client-side by a scripted state machine. There are no network calls the experience
depends on.

```
index.html            → src/chat/main.jsx → App.jsx
src/chat/stages.js    the script: every line, status, sketch and dock, in order
src/chat/hooks/useFunnel.js   the state machine that plays stages.js
src/chat/components/ChatCard.jsx   the entire chat UI (messages + dock controls)
public/images/sketch/ portrait artwork
public/audio/         looping ambient track
```

### How the script works

`stages.js` is the file to edit for any copy or flow change. A stage is an ordered list of
`beats` followed by exactly one dock (the control at the bottom of the card).

```js
'4': {
  beats: [
    'The first feature coming through is the shape of their face.',   // a chat bubble
    { sketch: 0, caption: 'First details detected' },                  // reveal portrait step 0
    { reveal: { headline: '…', body: '…' } },                          // the reveal card
  ],
  next: '5',   // dock: a "Continue" button
}
```

Beats play top to bottom with typing indicators and pacing handled for you. `{name}` and
`{dob}` interpolate from the visitor's answers.

There is deliberately **no separate "system status" UI**. Progress beats like "analyzing
your zodiac signature" are written as ordinary lines Selene says, because the machine-style
labels read as artificial.

### Typing pacing

`revealLine` in `useFunnel.js` simulates a person at a keyboard: a short pause to
"consider", then a typing indicator held for roughly 20–32 ms per character — re-rolled per
line, so the same message is never timed twice the same way — clamped to 0.7–5.4 s. Short
replies land almost immediately; long paragraphs visibly take her a while.

Dock types — a stage ends in one of:

| Key | Renders |
| --- | --- |
| `input` | `{ placeholder, key, next, cta }` free text, stored under `key` |
| `datePicker` | `{ key, next, cta }` month/day/year; day count clamps to the month, leap years included |
| `select` | `{ key, options[], next, cta }` pick one, then confirm |
| `buttons` | `[{ label, next }]` acts immediately on tap |
| `next` | a plain "Continue" affordance |

### Portraits

`SKETCHES` in `stages.js` maps the soulmate preference to a `[jaw, hairline, full]` triple.
The last step renders blurred behind a **Details Redacted** pill unless the beat sets
`unlocked: true` — which is what stage `done` uses to re-send the portrait in the clear
after the visitor taps *Show Me The Face*. The blurred copy stays in the transcript.

The paywall CTA is a `buttons` entry with `variant: 'gold'` (and optional `arrow: true`);
a stage may also carry `trust: [...]`, rendered as the reassurance row beneath the button.

### Audio

`public/audio/ambient.mp3` loops at volume `0.12`, wired to the speaker toggle in the
header. Browsers block autoplay until the page is interacted with, so playback also starts
on the first pointer or key event.

---

## The backend is currently unused

`server/index.js` and `api/*` are left over from an earlier version of this project. The
current flow **does not call them**:

- `src/chat/lib/api.js` still exports `fetchTTS` and `fetchReading`, but nothing imports
  them — they are dead code.
- `getConfig()` is called on boot and its result is returned from `useFunnel`, but no
  component reads it.
- Consequently `ELEVENLABS_*` and `ANTHROPIC_*` in `.env.example` are not needed to run
  the app.

Deploying `dist/` to any static host is sufficient. `vercel.json` is already configured for
that (`buildCommand`, `outputDirectory`, no rewrites).

**Decision needed:** either delete the server, `api/`, the unused API client functions and
the stale env vars, or wire the reading back up to Anthropic. Right now it is carrying cost
without benefit.

---

## Known limitations

1. **Only the "man" portrait set exists.** `SKETCHES.woman` and `SKETCHES.anyone` alias the
   man artwork, so choosing *A woman* or *Anyone* shows a man's portrait. This is visible
   to any visitor who picks those options. Artwork for both is needed.
2. **The reading is entirely static.** Every visitor gets identical copy; the date of birth
   is echoed back but never actually used to compute a zodiac sign, and the portrait is not
   derived from any input.
3. **Nothing persists.** Refreshing restarts the funnel. Answers live in a ref and are lost
   on reload — no analytics, no storage, no lead capture.
4. **The paywall is cosmetic.** *Show Me The Face* re-sends the portrait unblurred and
   prints a closing line — there is no checkout, payment or gating behind it, and the
   full-resolution image is already in the page, so the blur is trivially bypassed in
   devtools. The trust badges ("30-Day Money-Back Guarantee", "Delivered in 24 Hours",
   "Secure Checkout") are **claims with nothing implementing them**; they must not ship in
   front of real traffic until a real checkout exists.
5. **No tests, no error boundary.** A throw inside the funnel blanks the card with nothing
   in the UI to explain it.
6. **No analytics or tracking.** The brand site runs GTM, Meta Pixel and Clarity; this app
   has none of it.
7. **Ambient track licensing.** `ambient.mp3` was generated with Suno. Identifying metadata
   has been stripped, but Suno embeds inaudible watermarks that cannot be removed or
   verified here — confirm the Suno plan permits commercial use before launch.
8. **Large unoptimised assets.** The audio is ~4.9 MB and the sketches ~200–270 KB each,
   all loaded eagerly. Worth compressing before a paid traffic push.
9. **Repo cruft.** `(Interactive VSL) Marisol Chat Sequence.md` and `BACKEND_HANDOFF.docx`
   describe the previous "Marisol" product and are stale.
10. **Desktop-first spacing.** The card is responsive and works on mobile, but spacing was
    tuned at desktop width and has not been checked on real devices.

---

## Conventions

- Tailwind v4 via `@tailwindcss/vite`; design tokens live in `src/chat/index.css`.
- Brand palette: gold `#dfa73a`, dark purple stroke `#4c1d95` on a near-black field.
- Type: Inter throughout; Cormorant Garamond remains only on the "Meet Your Soulmate"
  headline.
- Commit style: imperative subject, body explaining *why*.
