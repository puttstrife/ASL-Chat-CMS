// Scripted funnel for Marisol — one entry per stage of
// "(Interactive VSL) Marisol Chat Sequence.md".
//
// {name} and {city} are interpolated at runtime from URL params
// (?name=Elena&city=General%20Santos). Defaults: name "Elena".
//
// Per stage:
//   lines[]        Marisol's chat bubbles, in order.
//   label          Optional on-screen label (e.g. "MARISOL SPEAKING").
//   memo           true  → render as the Stage 3 voice memo (auto-plays TTS).
//   voice          true  → speak each bubble via TTS when sound is on.
//   buttons[]      { label, next } branch choices shown after the bubbles.
//   input          { placeholder, key, next } free-text; stored under `key`.
//   personalizeAfter / personalizeInput → insert an LLM-personalized bubble
//                  after line index `personalizeAfter`, built from answer `key`.
//   next           auto-advance target when there are no buttons/input
//                  (shown as a gentle "Continue" affordance).

export const START_STAGE = '0';

export const STAGES = {
  '0': {
    voice: true,
    lines: [
      'Hi {name}...',
      "We weren't supposed to meet yet.",
      'But I had to reach you now... something wouldn’t let me wait.',
      'It’s been pulling at me for days, quiet but insistent, the way these things do when they matter.',
      '{city}... that word is coming through very clearly.',
      'It’s tied to this moment. I can feel that much, even if I can’t yet say why.',
      'Not everyone who finds their way here is meant to stay.',
      'But you were called for a reason, {name}. I can feel that too.',
    ],
    buttons: [{ label: "Yes, I'm ready", next: '1' }],
  },

  '1': {
    voice: true,
    lines: [
      'My name is Marisol.',
      'I don’t call myself a psychic the way most do. I follow people, not moments.',
      'Most readers look once. A chart. A card. A single breath of time... and they call that the whole of a person.',
      'I don’t work that way.',
      'I stay close to how someone’s pattern moves, week by week, shift by shift... instead of freezing one moment and pretending that’s the truth.',
      'It’s slower. Harder. But it’s honest, and it’s the only way I’ve ever trusted what I see.',
      'I felt your presence before you ever opened this page. Faint at first... then closer. Then unmistakable.',
      'What I have for you isn’t for just anyone. It would lose its shape in the wrong hands.',
    ],
    next: '2',
  },

  '2': {
    voice: true,
    lines: [
      'What I need to tell you, {name}... it isn’t for this space.',
      'There are things I only say once someone has stepped fully into the quiet with me.',
      'I’d like to bring you somewhere quieter. A small, private thread, just for the two of us.',
      'Nothing said there will be repeated anywhere else. It stays exactly where it’s meant to stay... between us.',
      'Will you come with me?',
    ],
    buttons: [{ label: 'Go to the Chat', next: '3' }],
  },

  '3': {
    label: 'Marisol speaking',
    memo: true,
    voice: true,
    lines: [
      'Hey, {name}.',
      'I made this specifically for you. Not for anyone else who might come across it.',
      'I wanted to talk to you directly, because of something that came through clearly while I was sitting with your reading.',
      'This needs to happen this year. In 2026.',
      'There’s something you’ve been asking for. Something you’ve been quietly hoping would finally answer you back.',
      'And I need you to hear me on this, {name}. It hasn’t been ignoring you.',
      'It’s been blocked.',
      'And it isn’t just one thing. There’s more than one door that’s been quietly closed.',
      'But multiple things are about to manifest greatly for you, and soon.',
      'I’ll explain everything. But first, I need something from you, so my answers can be clearer.',
      'Tell me what’s been burdening you lately. Ask me the questions you’ve always wanted answered. Or tell me what you truly desire.',
      'There’s a small chat waiting for you just below. Type it there, and send it to me.',
      'The moment you do, I’ll bring you back into our private thread.',
    ],
    input: { placeholder: 'Type it here, in your own words...', key: 'burden', next: '4' },
  },

  '4': {
    voice: true,
    lines: [
      'Thank you for coming back to me, {name}.',
      'What I’m about to share has been sitting with me since I first felt your reading come through.',
      'Your questions. Your desires. Everything you’ve quietly hoped for.',
      'They haven’t gone unanswered by chance, and they haven’t gone unanswered because you did something wrong.',
      'When something you’ve asked for sits still for too long, it isn’t because it stopped moving toward you. It’s because of something else.',
      'It’s some pattern or some old weight that has been sitting directly in its path. And it’s quietly absorbing the momentum before it can reach you.',
      'That’s what I’m sensing around you, {name}. Not one gate. A few.',
    ],
    next: '5',
  },

  '5': {
    voice: true,
    lines: [
      'Tell me, {name}. What have you been hoping to hear an answer to?',
      'You don’t need to explain it perfectly. Just tell me plainly, as it sits in you right now.',
    ],
    input: { placeholder: 'Tell me plainly...', key: 'hope', next: '6' },
  },

  '6': {
    voice: true,
    personalizeAfter: 0,
    personalizeInput: 'hope',
    lines: [
      'Yes. I can feel it now, more clearly than before.',
      'I’ve seen this exact pattern before, {name}. Not long ago, I sat with a woman named Carol. Different situation, different questions, but the same shape underneath it. Something she wanted had been sitting just out of reach for almost two years, and she’d started to believe it simply wasn’t meant for her.',
      'It wasn’t that. It was blocked, the same way yours is. Once we cleared what was sitting in its way, it reached her within weeks, not years.',
      'That’s why I don’t take this lightly when I see it in someone else’s pattern too.',
    ],
    next: '7',
  },

  '7': {
    voice: true,
    lines: [
      'There is something I can do for you, {name}. A ritual, one I use to release what’s been blocking this from reaching you fully.',
      'But I want to be honest about how I work, because it matters.',
      'Once this ritual is done, I don’t ask you to simply hope and wait in silence, wondering if anything is actually moving.',
      'I give you thirteen lunar windows.',
      'Thirteen separate chances, spread across the coming stretch of time, for what you’ve been asking for to finally, fully answer back.',
      'Not one single moment that either works or doesn’t. Thirteen.',
      'That’s how I work, {name}. I don’t hand you one door and walk away to see what happens. I reveal each window as it opens until what’s meant to reach you finally does.',
      'I had another woman come to me a while back, her name was Marisela. She was hesitant at first, much like you might be right now. But she moved forward, and by her fourth window, something she’d been waiting years for finally came through. Not the first window or the second. The fourth. That’s exactly why I never promise one chance. I promise thirteen, because that’s how long it sometimes takes for a gate to fully open.',
    ],
    next: '8',
  },

  '8': {
    voice: true,
    lines: [
      'Can I ask you something, before we go further?',
      'When a door like this finally opens for you, after everything that’s been sitting blocked, after everything you’ve quietly waited for...',
      'Are you someone who walks through it?',
      'Or has it been a while since you let yourself take that step, even when the moment was right there in front of you?',
    ],
    next: '9',
  },

  '9': {
    voice: true,
    lines: [
      'I don’t want to rush you, {name}. That has never been how I work.',
      'But I need to be honest about the timing, because it matters more than I wish it did.',
      'This needs to happen within 2026, and I want to explain why, so it doesn’t sound like an empty deadline.',
      'The things you’ve been asking for, the ones sitting behind that gate, don’t stay in one place forever. They drift. Slowly, quietly, the way anything unattended does over time. What’s close and reachable this year moves further out with each year that passes without release.',
      'Carol felt this too, in her own way. She almost let her window close without acting. And she still tells me how differently things might have unfolded if she’d waited even a few more months.',
      'I’ve seen this happen more than once. Quietly. Without anyone fully noticing until the window had already closed around them.',
    ],
    next: '10',
  },

  '10': {
    voice: true,
    lines: [
      'If you’re ready, {name}, I can begin the ritual for you now.',
      'It’s a small offering. Not a payment in the way you might think of one, but enough to mark that you’re ready, enough to keep this thread open between us in the way it needs to stay open.',
      'And once it’s done, I won’t leave you there with just the first window. I’ll walk with you through all thirteen.',
    ],
    buttons: [
      { label: 'Yes, begin the ritual for me', next: '11' },
      { label: 'Not right now, maybe another time', next: 'later' },
    ],
  },

  '11': {
    voice: true,
    lines: [
      'There’s no risk in trying this, {name}.',
      'If it doesn’t feel right to you, in any way, it comes back to you, in full.',
      'I only ever want you to feel cared for here, through every part of this, whether you decide to move forward now or whenever you’re ready.',
    ],
    buttons: [{ label: "I'm ready to begin", next: 'done' }],
  },

  later: {
    voice: true,
    lines: [
      'That’s alright, {name}. The thread stays open.',
      'When you’re ready, I’ll be here. Nothing closes between us just because you needed a little more time.',
    ],
    buttons: [{ label: "Actually, I'm ready now", next: '11' }],
  },

  done: {
    voice: true,
    terminal: true,
    lines: [
      'It’s done, {name}. I’ll begin now, and I’ll reveal your first window the moment it opens.',
      'Stay close. I’ll be walking every one of the thirteen with you.',
    ],
  },
};
