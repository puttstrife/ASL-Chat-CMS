// Scripted soulmate-sketch funnel for Selene — one entry per step of the flow.
//
// {name} and {dob} are interpolated at runtime from answers collected earlier.
//
// A stage's `beats` play in order. Each beat is either:
//   'a string'              → one of Selene's chat bubbles
//   { status: '…' }         → a system status label ("Analyzing…")
//   { sketch: n, caption }  → reveal portrait step `n` (see SKETCHES)
//
// After the beats, a stage ends in exactly one of:
//   input      { placeholder, key, next, cta }  free text, stored under `key`
//   datePicker { key, next, cta }               month/day/year, stored as `key`
//   select     { key, options[], next, cta }    pick one, then confirm
//   buttons[]  { label, next?, action? }        act immediately on tap
//   next       auto-advance target, rendered as a "Continue" affordance
//
//   reveal     { headline, body }  optional card shown before the buttons

export const START_STAGE = '0';

// Portrait sets per soulmate preference: [jaw, hairline, full].
// `woman` and `anyone` reuse the man set until their own artwork lands.
const MAN = [
  '/images/sketch/man-1-jaw.webp',
  '/images/sketch/man-2-hairline.webp',
  '/images/sketch/man-3-full.webp',
];
export const SKETCHES = { man: MAN, woman: MAN, anyone: MAN };

export const STAGES = {
  // 1 — Welcome
  '0': {
    beats: [
      'Hi, I’m Selene. I’ll use your birth date and zodiac alignment to reveal the face of the person you’re most likely destined to meet.',
      'Before I begin, what should I call you?',
    ],
    input: { placeholder: 'Enter your first name', key: 'name', next: '1', cta: 'Continue' },
  },

  // 2 — Date of birth
  '1': {
    beats: [
      'Nice to meet you, {name}.',
      'Now, tell me your date of birth. This helps me identify your zodiac signature and the features connected to it.',
    ],
    datePicker: { key: 'dob', next: '2', cta: 'Continue' },
  },

  // 3 — Soulmate preference
  '2': {
    beats: [
      'One last question before I begin.',
      'Who would you like me to look for?',
    ],
    select: {
      key: 'preference',
      next: '3',
      cta: 'Reveal My Soulmate',
      options: [
        { label: 'A man', value: 'man' },
        { label: 'A woman', value: 'woman' },
        { label: 'Anyone / No preference', value: 'anyone' },
      ],
    },
  },

  // 4 — Preparing the reading
  '3': {
    beats: [
      'Thank you, {name}. I have everything I need.',
      'I’m reading the zodiac alignment connected to {dob} now.',
      { status: 'Analyzing your zodiac signature…' },
      'There’s a strong pattern beginning to appear. Give me a moment while I translate it into facial features.',
      { status: 'Mapping facial structure…' },
    ],
    next: '4',
  },

  // 5 — First partial sketch (jaw)
  '4': {
    beats: [
      'The first feature coming through is the shape of their face.',
      'Their jawline carries a calm but confident energy. I’m adding it to your sketch now.',
      { sketch: 0, caption: 'First details detected' },
    ],
    next: '5',
  },

  // 6 — Filler conversation
  '5': {
    beats: [
      'Interesting…',
      'This person may appear reserved when you first meet them, but their presence will feel strangely familiar.',
      'I’m now reading the upper part of their face.',
      { status: 'Interpreting appearance and energy…' },
    ],
    next: '6',
  },

  // 7 — Second partial sketch (hairline)
  '6': {
    beats: [
      'I can see the outline more clearly now.',
      'Their hair and overall silhouette may be one of the first things you notice about them.',
      { sketch: 1, caption: 'Your soulmate is taking shape' },
    ],
    next: '7',
  },

  // 8 — Final filler conversation
  '7': {
    beats: [
      'We’re very close, {name}.',
      'The final details are forming now—their eyes, expression, and the energy they carry when they look at you.',
      'Some people recognize someone immediately. Others meet them much later.',
      { status: 'Completing your soulmate portrait…' },
    ],
    next: '8',
  },

  // 9 — Full reveal
  '8': {
    beats: [
      'Your sketch is ready.',
      'This is the face connected to your zodiac signature.',
      { sketch: 2 },
    ],
    reveal: {
      headline: 'Meet Your Soulmate',
      body: 'Created from the zodiac alignment connected to your date of birth.',
    },
    buttons: [
      { label: 'Continue to My Full Reading', next: 'done' },
      { label: 'Save My Sketch', action: 'save' },
    ],
  },

  done: {
    beats: ['I’ll take you through the full reading now, {name}.'],
  },
};
