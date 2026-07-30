// Version A — the reading with the place interruption.
//
// Stages 1–5 come from shared.js. Stage 6 is the interruption: Selene stops
// mid-jawline, sketches the place the meeting keeps pushing into her head,
// and asks whether the visitor recognises it. Its CTA promises the meeting
// place alongside the face; Version B's does not.

import { SHARED_STAGES, IMG, TRAITS_SECOND, l, drawing } from './shared.js';

export { START_STAGE } from './shared.js';

export const STAGES = {
  ...SHARED_STAGES,

  // 6 — The place interruption
  '6': {
    beats: [
      l('Wait.', 2),
      l('I’m sorry. Something just interrupted me.', 1),
      l('While I was working on the jawline, a place kept pushing into my head.', 1.5),
      l('This happens sometimes when the meeting is close. The where arrives before the face is even finished.', 1),
      l('Is it okay if I draw it quickly before I lose it?', 1),
    ],
    buttons: [{ label: 'Draw it', next: '6-place' }],
  },

  '6-place': {
    beats: [
      drawing(3.5),
      { image: IMG.place },
      // The place sketch is meant to look unfinished — she dashed it off before
      // losing the impression. This line is what makes that read as urgency
      // rather than as a mistake.
      l('It’s rough, I know. But this is what came through.', 1),
      l('Open air. Trees. Water nearby, or something like it.', 1),
      l('It feels ordinary. The kind of place you’d walk past without thinking.', 1),
      l('{name}, is there a place like this near you? A park, a lake, somewhere green close to where you live?', 1),
    ],
    buttons: [
      { label: 'Yes, actually', next: '6-yes' },
      { label: 'I’m not sure', next: '6-unsure' },
    ],
  },

  '6-yes': {
    beats: [
      l('Then hold onto that.', 1),
      l('I’ll mark the location properly in your full reading, the exact place your love line points to.', 1),
    ],
    next: '7',
  },

  '6-unsure': {
    beats: [
      l('That’s alright.', 1),
      l('The full reading maps it precisely, down to the city your love line runs through.', 1),
      l('You may be surprised how close it is.', 1),
    ],
    next: '7',
  },

  // 7 — The email
  '7': {
    beats: [
      l('Okay. Back to the face.', 1.5),
      l('Before I use the last of my energy on the hardest part, I need one more thing from you.', 1),
      l('The sketch takes me up to 24 hours to finish properly, and I refuse to let this one get lost.', 1),
      l('Where should I send it when it’s done?', 1),
    ],
    input: {
      placeholder: 'you@example.com',
      key: 'email',
      inputType: 'email',
      next: '8',
      cta: 'Continue',
    },
  },

  // 8 — The neck
  '8': {
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
    next: '9',
  },

  // 9 — The close
  '9': {
    beats: [
      l('{name}, I have to be honest with you.', 2.5),
      l('I’ve drained almost everything I have.', 1.5),
      l('The eyes and the hair need the rest of my energy,', 1),
      l('and I need to give this sketch the time it deserves.', 1),
      l('Up to 24 hours.', 1),
      l('But I don’t want to stop here.', 1.5),
      l('Because there’s something about this one.', 1),
      l('The eyes are piercing, {name}.', 1.5),
      l('It’s strange to say out loud, but it feels like they’re looking at me instead of me looking at them.', 1),
      l('Once you hold the sketch, you’ll know exactly what I mean.', 1),
      l('If you want me to finish, just unlock the sketch below.', 1.5),
      l('Within 24 hours you’ll have the full face,', 1),
      l('the personality profile,', 1),
      l('why your Vedic chart matches theirs,', 1),
      l('and the place where you’re most likely to meet.', 1),
      l('I’ve already come this far with them.', 1),
      l('Don’t make me put the pencil down. 🖤', 1),
    ],
    buttons: [{ label: 'Unlock My Full Sketch', next: 'confirmed', variant: 'gold', arrow: true }],
    trust: ['Full face · Personality Profile · Meeting place', 'Delivered in 24 hours'],
  },
};
