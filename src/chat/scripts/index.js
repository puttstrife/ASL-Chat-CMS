// Every flow the app can play, keyed by the value of the `?v=` URL parameter.
//
// A script is a module exporting `STAGES` and `START_STAGE`; the engine in
// useFunnel.js is shared by all of them, which is why alternate flows live
// here as sibling files rather than in a branch or a second repo.

import * as versionA from './version-a.js';
import * as versionB from './version-b.js';

// The previous single-flow script is still in ../stages.js but is not
// registered — the preview offers A and B only. Re-add it here to bring it
// back; nothing else has to change.
export const SCRIPTS = {
  a: versionA,
  b: versionB,
};

export const DEFAULT_SCRIPT = 'a';

export const resolveScriptKey = () => {
  const requested = new URLSearchParams(window.location.search).get('v');
  return requested && SCRIPTS[requested] ? requested : DEFAULT_SCRIPT;
};
