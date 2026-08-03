# Example funnels

Import any of these from the editor with **Import funnel file**. Importing
always creates a copy — it never overwrites a funnel you already have.

All three are generated from source rather than exported by hand, so they match
what a fresh install seeds. Regenerate the Selene pair from `src/cms/seed.js`;
regenerate Marisol from `~/ASL-legacy-archive/stages.js`.

| File | Reader | Stages | What it is |
| --- | --- | --- | --- |
| `selene-version-a-with-the-place.json` | Selene | 20 | The A/B reading, with the place interruption |
| `selene-version-b-no-place.json` | Selene | 16 | The same reading without it |
| `marisol-original-flow.json` | Marisol | 11 | The single flow that preceded both |

## The Selene pair

Branching, five sketch steps, a growing traits list, and a CTA that falls
through to a demo closing stage because no offer page exists yet. A and B share
stages 1–5 exactly; B drops the place interruption and its CTA promises no
meeting place.

## marisol-original-flow.json

Converted from the archived single-script funnel that preceded the A/B reading.
Worth keeping as a second, independent script to test against — one written
before this data model existed, which is why converting it found gaps the
Selene pair never exercised.

Three things did not survive intact, because the CMS has no beat type for them:

- **The "Meet Your Soulmate" reveal card** is now an ordinary message. Same
  words, no framed treatment.
- **The redacted case file** is a bulleted list. Withheld details render as
  block characters while locked and as the words themselves in the final
  unredacted pass, so both states still read — but they are baked in as text
  rather than being one source of truth with two renderings.
- **The case file cannot vary by answer.** The original had a separate profile
  for the man and the woman; a list is static, so this carries the man's. The
  portraits still switch, because image paths interpolate `{preference}`.

The soulmate question was a dropdown in the original and is choice buttons
here — a dropdown cannot pick at random, and "Anyone / No preference" has no
artwork of its own, so it needs the button that rolls between the two sets once
and holds it for the session.
