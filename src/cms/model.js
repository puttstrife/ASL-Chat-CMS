// The shape of a funnel, and the factories that make empty ones.
//
// Everything here is plain JSON — no functions, no class instances. That is the
// whole point: a funnel has to survive `JSON.stringify` so it can live in
// localStorage today and in a database later, and so a writer can hand one to
// someone as a file.
//
// The old hand-written scripts (`src/chat/scripts/*.js`) used helper functions
// (`l()`, `drawing()`) and module imports, which cannot be serialised. Those are
// gone; `seed.js` holds the same readings converted to this format.

export const uid = () => Math.random().toString(36).slice(2, 10);

// ── Beats — what plays inside a stage, in order ──
//
// `seconds` on a line is a FLOOR, not a duration. The engine works out how long
// the text would take to type and uses whichever is longer, so a deliberate
// pause is honoured but a long line never flashes past. See `pacing` below.
export const BEAT_TYPES = {
  line: { label: 'Message', icon: '💬', make: () => ({ id: uid(), type: 'line', text: '', seconds: 1 }) },
  pause: { label: 'Pause / doing something', icon: '⏳', make: () => ({ id: uid(), type: 'pause', seconds: 3, label: 'is typing' }) },
  image: { label: 'Image', icon: '🖼️', make: () => ({ id: uid(), type: 'image', src: '', locked: false }) },
  list: { label: 'Bulleted list', icon: '📋', make: () => ({ id: uid(), type: 'list', items: [''] }) },
};

// ── Docks — the control at the bottom of the card that ends a stage ──
//
// Exactly one per stage. `end` means the reading stops there.
export const DOCK_TYPES = {
  none: { label: 'Nothing — keep talking', hint: 'Stage flows straight into the next one.' },
  continue: { label: 'Continue button', hint: 'A single button that moves on.' },
  buttons: { label: 'Choice buttons', hint: 'Two or more answers, each going somewhere. Use two for a yes/no.' },
  input: { label: 'Text input', hint: 'Captures a typed answer — name, email, anything.' },
  date: { label: 'Date picker', hint: 'Month / day / year. Stored as a readable date.' },
  select: { label: 'Dropdown-style picker', hint: 'Pick one option, then confirm.' },
  cta: { label: 'Call to action', hint: 'The final button. Sends the visitor to a URL.' },
  end: { label: 'End of reading', hint: 'Nothing further. The card goes quiet.' },
};

// Field presets for the `input` dock. `key` is what the answer is stored under,
// and what `{key}` in any later message interpolates from.
export const FIELD_PRESETS = [
  { key: 'name', label: 'First name', placeholder: 'Enter your first name', inputType: 'text' },
  { key: 'email', label: 'Email address', placeholder: 'you@example.com', inputType: 'email' },
  { key: 'phone', label: 'Phone number', placeholder: 'Your phone number', inputType: 'tel' },
  { key: 'city', label: 'City', placeholder: 'Where do you live?', inputType: 'text' },
  { key: 'custom', label: 'Something else…', placeholder: '', inputType: 'text' },
];

export const makeStage = (over = {}) => ({
  id: uid(),
  title: 'Untitled stage',
  beats: [],
  dock: { type: 'none' },
  ...over,
});

export const makePersona = (over = {}) => ({
  name: 'New reader',
  role: 'Say what they do',
  // A data URL once someone uploads one; a path while it is still a stock file.
  avatar: '/images/chat/selene-avatar.png',
  // Shown in the dock when there is nothing to tap and she is mid-flow.
  idleText: 'is with you…',
  // Shown under the typing dots. Prefixed with the persona name at render time.
  typingLabel: 'is typing',
  accent: '#dfa73a',
  header: '#1a043d',
  ...over,
});

// The ambient bed. Uploaded tracks are embedded in the funnel like avatars are,
// which is what keeps a funnel one portable file — but audio is far heavier than
// an image, and localStorage caps out around 5–10MB for everything combined. So
// uploads are capped hard, and a path to a bundled file stays the cheaper option.
//
// The send/reply sounds are deliberately not configurable: they are short and
// generic enough to suit any reader, where music sets a mood that genuinely
// differs between one persona and the next.
export const makeAudio = (over = {}) => ({
  src: '/audio/ambient.mp3',
  // Well under the reading and under the send/reply sounds sitting on top of it:
  // the bed should register as atmosphere, not as music.
  volume: 0.05,
  enabled: true,
  ...over,
});

// Selene's measured settings, which are the defaults for anything new.
// 30–50ms per character is ~300wpm; deliberately fast, chosen to land a full
// reading near 7 minutes. Raise `msPerChar` to make the reader feel more human
// and the session longer — the editor's pacing panel shows the trade live.
export const makePacing = (over = {}) => ({
  msPerCharMin: 30,
  msPerCharMax: 50,
  minTyping: 900,
  maxTyping: 26000,
  ...over,
});

export const makeFunnel = (over = {}) => {
  const first = makeStage({ title: 'Opening', beats: [BEAT_TYPES.line.make()] });
  return {
    id: uid(),
    name: 'Untitled funnel',
    updatedAt: new Date().toISOString(),
    persona: makePersona(),
    pacing: makePacing(),
    audio: makeAudio(),
    startStage: first.id,
    stages: [first],
    ...over,
  };
};

// Funnels saved before a field existed — and any imported from elsewhere — are
// filled in on read rather than migrated in place. Anything above the store can
// then assume the shape is whole, and adding a field later stays a one-line
// change here instead of a migration.
export const withDefaults = (funnel) => ({
  ...funnel,
  persona: { ...makePersona(), ...funnel.persona },
  pacing: { ...makePacing(), ...funnel.pacing },
  audio: { ...makeAudio(), ...funnel.audio },
  stages: funnel.stages || [],
});

// ── Derived helpers the editor and the player both need ──

// Every key a funnel captures, in the order it asks for them. Used for the
// CTA's parameter list and for the "you can use these" hint in the copy editor.
export function collectKeys(funnel) {
  const keys = [];
  for (const stage of funnel.stages) {
    const d = stage.dock || {};
    if (['input', 'date', 'select'].includes(d.type) && d.key) keys.push(d.key);
    if (d.type === 'buttons') for (const o of d.options || []) if (o.setKey) keys.push(o.setKey);
  }
  return [...new Set(keys)];
}

// Stage ids a dock can point at, so the editor can flag a link that goes
// nowhere before the writer ever runs a preview.
export function danglingLinks(funnel) {
  const ids = new Set(funnel.stages.map((s) => s.id));
  const bad = [];
  for (const stage of funnel.stages) {
    const d = stage.dock || {};
    const targets = [];
    if (d.next) targets.push(d.next);
    if (d.type === 'buttons') for (const o of d.options || []) if (o.next) targets.push(o.next);
    for (const t of targets) if (!ids.has(t)) bad.push({ stage, target: t });
  }
  return bad;
}
