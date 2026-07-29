// Scripted soulmate-sketch funnel for Selene — one entry per step of the flow.
//
// {name} and {dob} are interpolated at runtime from answers collected earlier.
//
// A stage's `beats` play in order. Each beat is either:
//   'a string'                     → one of Selene's chat bubbles
//   { sketch: n, unlocked? }       → reveal portrait step `n` (see SKETCHES);
//                                    the last step blurs unless `unlocked`
//   { reveal: { headline, body } } → the "Meet Your Soulmate" card
//   { profile: true, unredacted? } → the case file (see PROFILES); redacted
//                                    unless `unredacted`
//
// After the beats, a stage ends in exactly one of:
//   input      { placeholder, key, next, cta, inputType? }  free text under `key`;
//              inputType 'email' swaps in a validated email field
//   datePicker { key, next, cta }               month/day/year, stored as `key`
//   select     { key, options[], next, cta }    pick one, then confirm
//   buttons[]  { label, next }                  act immediately on tap
//   next                                        a "Continue" affordance

export const START_STAGE = '0';

// Portrait sets per soulmate preference: [jaw, hairline, full].
const MAN = [
  '/images/sketch/man-1-jaw.webp',
  '/images/sketch/man-2-hairline.webp',
  '/images/sketch/man-3-full.webp',
];
const WOMAN = [
  '/images/sketch/woman-1-jaw.webp',
  '/images/sketch/woman-2-hairline.webp',
  '/images/sketch/woman-3-full.webp',
];
// "Anyone / No preference" has no artwork of its own, so it picks one of the
// two sets at random per session rather than always showing the same face.
const ANYONE_IS_MAN = Math.random() < 0.5;
export const SKETCHES = { man: MAN, woman: WOMAN, anyone: ANYONE_IS_MAN ? MAN : WOMAN };

// The case file shown beside the portrait. `[[…]]` wraps the withheld detail:
// it renders as a redaction bar while the reading is locked and as the text
// itself once unlocked, so both states share one source of truth.
// `**…**` highlights in gold.
const MAN_PROFILE = [
  'He is [[tall and lean]] with sharp dark eyes that hold your attention [[longer than]] you expect.',
  'Height: [[6′1″]]',
  'Hair: [[dark, softly parted]]',
  'Eyes: [[deep brown]] with an intensity that feels like he’s [[already decided]] something about you.',
  'He is not loud about what he wants — but when he wants something, nothing stops him. He moves through rooms like someone who [[already knows where]] he’s going.',
  'His first words to you will be [[an apology for something small]] and they will catch you **completely off guard**.',
];

const WOMAN_PROFILE = [
  'She is [[slight and composed]] with steady eyes that settle on you [[before]] you notice.',
  'Height: [[5′6″]]',
  'Hair: [[long, loosely waved]]',
  'Eyes: [[warm hazel]] with a steadiness that feels like she’s [[already forgiven]] something about you.',
  'She does not announce what she wants — but once she decides, she does not waver. She enters a room like someone who [[has never had to ask if]] she belongs.',
  'Her first words to you will be [[a question no one else thought to ask]] and they will catch you **completely off guard**.',
];

export const PROFILES = {
  man: { caseNo: '2847', lines: MAN_PROFILE },
  woman: { caseNo: '3106', lines: WOMAN_PROFILE },
  anyone: ANYONE_IS_MAN
    ? { caseNo: '2847', lines: MAN_PROFILE }
    : { caseNo: '3106', lines: WOMAN_PROFILE },
};

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
    datePicker: { key: 'dob', next: 'email', cta: 'Continue' },
  },

  // 2b — Email capture
  email: {
    beats: [
      'One thing before I start drawing.',
      'I work on paper, so what you’ll see here are just photos I take at my desk as it comes together.',
      'The finished one I scan properly—that’s the copy worth keeping.',
      'Where should I send it?',
    ],
    input: {
      placeholder: 'you@example.com',
      key: 'email',
      inputType: 'email',
      next: '2',
      cta: 'Continue',
    },
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
      'Give me a second—I’m reading the zodiac alignment connected to {dob}.',
      'There’s a strong pattern beginning to appear.',
      'Hold on. Let me translate it into facial structure.',
    ],
    next: '4',
  },

  // 5 — First partial sketch (jawline)
  '4': {
    beats: [
      'The first feature coming through is the shape of their face.',
      'Their jawline suggests someone with a calm, grounded presence. They may not demand attention, but you’ll naturally notice when they enter the room.',
      { sketch: 0 },
    ],
    next: '5',
  },

  // 6 — Filler conversation (personality reading)
  '5': {
    beats: [
      'There’s a quiet confidence around this person.',
      'They may seem reserved when you first meet them. Not distant—just careful about who they allow into their inner world.',
      'Let me sit with their emotional energy for a moment.',
      'They appear soft-spoken and thoughtful. The kind of person who listens closely before responding.',
      'You may feel unusually comfortable around them, even before you know them well.',
      'I’m beginning to sense a creative side too.',
      'They may express themselves through ideas, music, design, writing, or something they prefer to keep private.',
      'Give me a moment—I’m still reading their appearance and personality.',
      'The upper outline is becoming clearer now.',
    ],
    next: '6',
  },

  // 7 — Second partial sketch (hairline)
  '6': {
    beats: [
      'I can see their hair and overall silhouette beginning to form.',
      'This may be one of the first physical details you notice about them.',
      { sketch: 1 },
    ],
    next: '7',
  },

  // 8 — Final filler conversation (eyes and energy)
  '7': {
    beats: [
      'We’re getting closer, {name}.',
      'Their eyes are the strongest part of this reading.',
      'Let me draw their eyes and expression. This part takes care.',
      'They have thoughtful eyes—the kind that make you feel they understand more than they say.',
      'At first, they may appear serious or difficult to read. But beneath that reserved nature, their energy feels warm and reassuring.',
      'This person doesn’t open up immediately.',
      'But once they trust you, they become deeply attentive, affectionate, and emotionally present.',
      'Hold on. I’m connecting your energy to theirs.',
      'There’s also something familiar about their presence.',
      'Meeting them may not feel dramatic. It may feel calm—almost as though you’ve known them before.',
      'The final details are forming now: their eyes, expression, and the way their energy appears through the portrait.',
      'Some people recognize someone immediately. Others meet them much later.',
      'Almost there. I’m finishing the portrait now.',
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
      'I wrote down everything else that came through while I drew.',
      { profile: true },
      'Look closely at their features.',
      'You may recognize someone you already know—or remember this face when someone new enters your life.',
    ],
    buttons: [
      { label: 'Show Me The Face', next: 'done', variant: 'gold', arrow: true },
    ],
    trust: ['🛡 30-Day Money-Back Guarantee', '⚡ Delivered in 24 Hours', '🔒 Secure Checkout'],
  },

  // Selene re-sends the portrait and the case file, this time in the clear.
  done: {
    beats: [
      'Here they are, {name} — nothing held back this time.',
      { sketch: 2, unlocked: true },
      'And the rest of what I wrote down.',
      { profile: true, unredacted: true },
      'I’ll take you through the full reading now.',
    ],
  },
};
