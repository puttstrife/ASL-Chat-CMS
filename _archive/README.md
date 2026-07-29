# Archive

Nothing here is imported, served, or built. It is kept only so the previous
work is findable without digging through git history.

## legacy-flow/

The single-script Selene funnel that preceded the A/B reading — `stages.js`
(script, portrait sets and the redacted "Soulmate Profile" case file) and the
artwork it used. Superseded by `src/chat/scripts/`.

To bring it back: move `stages.js` into `src/chat/`, move `images/sketch` back
under `public/images/`, register it in `src/chat/scripts/index.js`, and restore
the `sketch` / `profile` / `reveal` beat handlers in `useFunnel.js` plus their
renderers in `ChatCard.jsx` (see the commit that removed them).
