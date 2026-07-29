// Stages 1–5 of the Selene reading. Version A and Version B are identical up
// to the moment the visitor taps "Keep going" at the end of stage 5, so both
// import these verbatim; each version then defines stage '6' onward itself.
//
// `l(text, seconds)` is a spoken line with the typing time the script asks
// for. `drawing(seconds, label)` holds the typing indicator without producing
// a bubble — it is how the script stages a pause before an image lands.

export const l = (line, typing) => ({ line, typing: typing * 1000 });
export const drawing = (seconds, label = 'Selene is drawing') => ({ wait: seconds * 1000, label });

export const IMG = {
  silhouette: '/images/sketch-v2/1-silhouette.webp',
  outline: '/images/sketch-v2/2-outline.webp',
  place: '/images/sketch-v2/3-place.webp',
  neck: '/images/sketch-v2/4-neck.webp',
  finalLocked: '/images/sketch-v2/5-final-locked.webp',
};

// The traits Selene reads off the chart. She shares a first pass at stage 5
// and adds to it at the neck stage, so the list visibly grows as she works.
//
// NOTE: placeholder copy — the source doc labels this list an example and
// gives none at all for the second appearance. Needs a real pass.
export const TRAITS_FIRST = [
  'Hazel eyes',
  'Olive skin',
  'Calm, deliberate voice',
  'Notices details',
  'Guarded until safe',
];

export const TRAITS_SECOND = [
  ...TRAITS_FIRST,
  'Slow to laugh — means it when they do',
  'Remembers what you said months ago',
  'Steadier than they first appear',
];

export const START_STAGE = '1';

export const SHARED_STAGES = {
  // 1 — The hook
  '1': {
    beats: [
      l('Oh, hi. You’re here. ✨', 2),
      l('I’m Selene.', 1),
      l('I draw soulmate sketches by hand using Vedic astrology.', 1),
      l('And I should tell you something before we begin.', 1.5),
      l('99% of readings only look at your sun sign. One placement. The same one shared by millions of people born the same month as you.', 1.5),
      l('That’s why every sketch you’ve ever seen felt like it could be anyone.', 1.5),
      l('I don’t work that way. I open your birth chart and read all 12 placements. The whole sky as it stood the moment you arrived.', 1.5),
      l('That’s where the face is hiding. In the eleven placements nobody else bothers to read.', 1.5),
      l('My canvas is in front of me. My pencils are ready.', 1.5),
      l('But a chart doesn’t open for a stranger. It opens for a name.', 1),
      l('So before anything else... what does the universe call you? 🌙', 1),
    ],
    input: { placeholder: 'Enter your first name', key: 'name', next: '2', cta: 'Continue' },
  },

  // 2 — The name
  '2': {
    beats: [
      l('{name}.', 1),
      l('I just wrote it at the top of the canvas. Names hold more weight than people think.', 1),
      l('Now I need the key that opens everything.', 1.5),
      l('The day you were born, the sky arranged itself into a pattern that has never repeated since. Not once.', 1.5),
      l('That pattern is your birth chart. And hidden inside it, like a lock holding the shape of its key, is theirs.', 1.5),
      l('Tell me your birth date, {name}. Let’s see what the sky was keeping for you. 🔑', 1),
    ],
    datePicker: { key: 'dob', next: '3', cta: 'Continue' },
  },

  // 3 — The first reading
  '3': {
    beats: [
      { wait: 3000, label: 'Selene is opening your chart' },
      l('Okay. Give me a moment.', 2),
      l('I’m laying out your placements now... Sun... Moon... Venus...', 2.5),
      l('Oh.', 2),
      l('This is strange. Two came up.', 1.5),
      l('That almost never happens.', 1.5),
      l('Let me triangulate a bit more. I’m going to narrow it down, I promise.', 1),
      l('But one thing is already certain. Both of them share the same aura.', 1.5),
      l('It’s a quiet kind of presence. The type that doesn’t fill a room with noise.', 1),
      l('The room just leans toward them.', 1),
      l('Warm, but guarded. They don’t let people in easily.', 1),
      l('When they finally do, they’re in completely.', 1),
      l('{name}... do you know someone with this kind of presence? Or have you felt drawn to this energy before?', 1),
    ],
    buttons: [
      { label: 'Yes, I think so', next: '3-yes' },
      { label: 'No, not yet', next: '3-no' },
    ],
  },

  '3-yes': {
    beats: [
      l('I thought so.', 1),
      l('That’s exactly what I’m picking up from your side of the chart.', 1),
      l('Your Venus placement has been responding to this exact aura for a long time.', 1),
      l('Your chart already knows them, {name}. Even if your mind is still catching up.', 1),
    ],
    next: '4',
  },

  '3-no': {
    beats: [
      l('Hmm. Hold on.', 1.5),
      l('Because your chart is telling me something different, {name}.', 1.5),
      l('Your Venus placement has been responding to this exact aura. And the response is recent.', 1),
      l('A signal like this only registers when someone has crossed your path. Even briefly. Even for a moment.', 1),
      l('Think back over the last few months.', 1.5),
      l('Someone you barely spoke to but noticed.', 1),
      l('Someone who felt strangely familiar and you never figured out why.', 1),
      l('A stranger you caught yourself thinking about after.', 1),
    ],
    buttons: [
      { label: 'Wait... maybe', next: '3-maybe' },
      { label: 'Still no', next: '3-still-no' },
    ],
  },

  '3-maybe': {
    beats: [
      l('There it is.', 1),
      l('That’s the one your chart flagged.', 1),
      l('I’m not saying it’s them, because I haven’t finished the face yet.', 1),
      l('But your chart logged that encounter for a reason. When the sketch is done, you’ll know whether your instinct was right.', 1),
    ],
    next: '4',
  },

  '3-still-no': {
    beats: [
      l('Then they’re still ahead of you.', 1),
      l('And that’s the better position to be in, {name}.', 1),
      l('It means you’ll see their face before you ever meet them. Almost nobody gets it in that order.', 1),
    ],
    next: '4',
  },

  // 4 — The silhouette
  '4': {
    beats: [
      l('Okay. I’ve honed it down to one.', 1.5),
      l('I’m starting the silhouette now, the outline of the face.', 1),
      l('This takes me a moment because I don’t sketch from imagination. I sketch from your placements.', 1),
      l('Bear with me. 🎨', 1),
      drawing(4),
      { image: IMG.silhouette },
      l('There.', 0.8),
      l('That’s them forming.', 1),
      l('Do you want me to continue?', 1),
    ],
    buttons: [{ label: 'Continue', next: '5' }],
  },

  // 5 — The energy + the traits
  '5': {
    beats: [
      l('Alright. Before I draw any features, I always do one thing first.', 1.5),
      l('I sit with the energy coming off the chart, and I pour it into the outline.', 1),
      l('The features come after the energy. That’s how the face stays true.', 1),
      l('And what I’m feeling from this one, {name}...', 1.5),
      l('There’s a steadiness here.', 1.5),
      l('Someone who thinks before they speak and means it when they do.', 1),
      l('Someone who notices small things about people and keeps them.', 1),
      drawing(3.5),
      { image: IMG.outline },
      l('The features are starting to come through.', 1),
      l('Here’s what I have on them so far.', 1),
      { traits: TRAITS_FIRST },
      l('Should I keep going?', 1),
    ],
    buttons: [{ label: 'Keep going', next: '6' }],
  },
};
