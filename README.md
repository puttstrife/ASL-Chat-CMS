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
  store.js                      localStorage CRUD, export/import
  seed.js                       the two Selene readings, converted (generated)
  estimate.js                   how long a reading takes — mirrors useFunnel's timing
  CmsApp.jsx                    funnel list and editor shell
  panels/                       persona, pace, stages, beats, docks, preview
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
   session, exactly as in the original funnel. No ESP, no analytics, no
   persistence.
7. **Background tabs stall a reading.** Pacing is `setTimeout`-based and browsers
   throttle hidden tabs. Inherited from the original engine; the fix is
   timestamp-based scheduling.
8. **No tests.** Playwright is installed but has no specs.

---

## Next

**A real backend.** localStorage was chosen so the editor worked in the first
minute with no keys and no deploy, and it should not survive contact with more
than one person. Replacing it should only require rewriting `store.js` — nothing
above it knows where a funnel came from.

**A flowchart view of the script.** The linear list is right for writing copy in
order; it is wrong for seeing how branches rejoin. A node graph alongside it, not
instead of it.

---

## Conventions

- Tailwind v4 via `@tailwindcss/vite`; tokens in `src/chat/index.css`
- Inter throughout
- Commits: imperative subject, body explains *why* rather than what
