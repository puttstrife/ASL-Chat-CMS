// Version B — the reading without the place interruption.
//
// Stages 1–5 come from shared.js, identical to Version A. From the end of
// stage 5 this version goes straight to the email, so it runs one stage
// shorter and its CTA promises no meeting place.

import { SHARED_STAGES, IMG, TRAITS_SECOND, l, drawing } from './shared.js';

export { START_STAGE } from './shared.js';

export const STAGES = {
  ...SHARED_STAGES,

  // 6 — The email
  '6': {
    beats: [
      l('Okay.', 1.5),
      l('Before I use the last of my energy on the hardest part, I need one more thing from you.', 1),
      l('The sketch takes me up to 24 hours to finish properly, and I refuse to let this one get lost.', 1),
      l('Where should I send it when it’s done?', 1),
    ],
    input: {
      placeholder: 'you@example.com',
      key: 'email',
      inputType: 'email',
      next: '7',
      cta: 'Continue',
    },
  },

  // 7 — The neck
  '7': {
    beats: [
      l('Saved. It goes there and nowhere else. 🤍', 1),
      l('Now, a strange confession about how I work.', 1.5),
      l('I always draw from the neck up.', 1),
      l('The hair comes last, because hair holds the most detail and it drains me fastest.', 1),
      l('The neck first. Then the face. Then, when I have everything left in me... the hair.', 1),
      drawing(3),
      l('And {name}... the neck on this one.', 1),
      l('Elegant. Strong. The kind of line an artist doesn’t get to draw very often.', 1),
      l('Whoever this is carries themselves well.', 1),
      { image: IMG.neck },
      l('Look at where we are.', 1),
      { traits: TRAITS_SECOND },
    ],
    next: '8',
  },

  // 8 — The close
  '8': {
    beats: [
      l('{name}, I have to be honest with you.', 2.5),
      l('I’ve drained almost everything I have.', 1.5),
      l('The eyes and the hair need the rest of my energy, and I need to give this sketch the time it deserves. Up to 24 hours.', 1),
      l('But I don’t want to stop here.', 1.5),
      l('Because there’s something about this one.', 1),
      { image: IMG.finalLocked, locked: true },
      l('The eyes are piercing, {name}.', 1.5),
      l('It’s strange to say out loud, but it feels like they’re looking at me instead of me looking at them.', 1),
      l('Once you hold the sketch, you’ll know exactly what I mean.', 1),
      l('If you want me to finish, just unlock the sketch below.', 1.5),
      l('Within 24 hours you’ll have the full face, the personality profile, and why your Vedic chart matches theirs.', 1),
      l('I’ve already come this far with them.', 1),
      l('Don’t make me put the pencil down. 🖤', 1),
    ],
    // PLACEHOLDER price — deliberately not a real number, so it cannot ship
    // by accident. Swap once the offer is priced.
    buttons: [{ label: 'Unlock My Full Sketch — $XX', next: 'confirmed', variant: 'gold', arrow: true }],
    trust: ['Full face · personality profile · delivered in 24 hours'],
  },
};
