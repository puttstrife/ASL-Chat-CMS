# Example funnels

Import these from the editor with **Import funnel file**.

## marisol-original-flow.json

The single-flow funnel that preceded the Selene A/B reading, converted from
`~/ASL-legacy-archive/stages.js`. It is here as a real second script to test
the importer against — one written before this data model existed.

Three things did not survive the conversion intact, because the CMS has no
beat type for them:

- **The "Meet Your Soulmate" reveal card** is now an ordinary message. Same
  words, no framed treatment.
- **The redacted case file** is a bulleted list. The withheld details render as
  block characters while locked and as the words themselves in the final
  unredacted pass, so both states still read — but they are baked in as text
  rather than being one source of truth with two renderings.
- **The case file cannot vary by answer.** The original had a separate profile
  for the man and the woman; a list is static, so this carries the man's. The
  portraits still switch, because image paths interpolate.

The soulmate question was a dropdown in the original and is choice buttons
here — a dropdown cannot pick at random, and "Anyone / No preference" has no
artwork of its own, so it needs the button that rolls between the two sets once
and holds it for the session.
