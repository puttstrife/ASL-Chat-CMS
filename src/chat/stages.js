// Scripted soulmate-sketch funnel for Selene — one entry per step of the flow.
//
// {name} and {dob} are interpolated at runtime from answers collected earlier.
//
// A stage's `beats` play in order. Each beat is either:
//   'a string'                     → one of Selene's chat bubbles
//   { status: '…' }                → a system status label ("Analyzing…")
//   { sketch: n, caption, unlocked? } → reveal portrait step `n` (see SKETCHES);
//                                    the last step blurs unless `unlocked`
//   { reveal: { headline, body } } → the "Meet Your Soulmate" card
//
// After the beats, a stage ends in exactly one of:
//   input      { placeholder, key, next, cta }  free text, stored under `key`
//   datePicker { key, next, cta }               month/day/year, stored as `key`
//   select     { key, options[], next, cta }    pick one, then confirm
//   buttons[]  { label, next }                  act immediately on tap
//   next                                        a "Continue" affordance

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

  // 5 — First partial sketch (jawline)
  '4': {
    beats: [
      'The first feature coming through is the shape of their face.',
      'Their jawline suggests someone with a calm, grounded presence. They may not demand attention, but you’ll naturally notice when they enter the room.',
      { sketch: 0, caption: 'First details detected' },
    ],
    next: '5',
  },

  // 6 — Filler conversation (personality reading)
  '5': {
    beats: [
      'There’s a quiet confidence around this person.',
      'They may seem reserved when you first meet them. Not distant—just careful about who they allow into their inner world.',
      { status: 'Reading emotional energy…' },
      'They appear soft-spoken and thoughtful. The kind of person who listens closely before responding.',
      'You may feel unusually comfortable around them, even before you know them well.',
      'I’m beginning to sense a creative side too.',
      'They may express themselves through ideas, music, design, writing, or something they prefer to keep private.',
      { status: 'Interpreting appearance and personality…' },
      'The upper outline is becoming clearer now.',
    ],
    next: '6',
  },

  // 7 — Second partial sketch (hairline)
  '6': {
    beats: [
      'I can see their hair and overall silhouette beginning to form.',
      'This may be one of the first physical details you notice about them.',
      { sketch: 1, caption: 'Your soulmate is taking shape' },
    ],
    next: '7',
  },

  // 8 — Final filler conversation (eyes and energy)
  '7': {
    beats: [
      'We’re getting closer, {name}.',
      'Their eyes are the strongest part of this reading.',
      { status: 'Drawing their eyes and expression…' },
      'They have thoughtful eyes—the kind that make you feel they understand more than they say.',
      'At first, they may appear serious or difficult to read. But beneath that reserved nature, their energy feels warm and reassuring.',
      'This person doesn’t open up immediately.',
      'But once they trust you, they become deeply attentive, affectionate, and emotionally present.',
      { status: 'Connecting your zodiac energies…' },
      'There’s also something familiar about their presence.',
      'Meeting them may not feel dramatic. It may feel calm—almost as though you’ve known them before.',
      'The final details are forming now: their eyes, expression, and the way their energy appears through the portrait.',
      'Some people recognize someone immediately. Others meet them much later.',
      { status: 'Completing your soulmate portrait…' },
    ],
    next: '8',
  },

  // 9 — Full reveal
  '8': {
    beats: [
      'Your sketch is ready, {name}.',
      'This is the face connected to your zodiac signature.',
      { sketch: 2 },
      {
        reveal: {
          headline: 'Meet Your Soulmate',
          body: 'Created from the zodiac alignment connected to your date of birth.',
        },
      },
      'Look closely at their features.',
      'You may recognize someone you already know—or remember this face when someone new enters your life.',
    ],
    buttons: [
      { label: 'Continue to My Full Reading', next: 'done' },
    ],
  },

  // Selene re-sends the portrait, this time in the clear.
  done: {
    beats: [
      'Here they are, {name} — nothing held back this time.',
      { sketch: 2, unlocked: true },
      'I’ll take you through the full reading now.',
    ],
  },
};
