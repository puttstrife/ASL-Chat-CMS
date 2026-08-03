import { useEffect, useRef, useState } from 'react';
import { Btn, Field, inputClass, Panel, readUploadedFile } from '../ui.jsx';

// The ambient bed behind the reading.
//
// Two ways in, because they trade off against each other. A path points at a
// file served from `public/`, costs nothing to store, and is the right answer
// for a track used by several funnels. An upload is embedded in the funnel, so
// the funnel stays one portable file — but audio is heavy and everything lives
// in localStorage, so it is capped hard.
const MAX_KB = 500;

export function AudioPanel({ audio, onPatch }) {
  const fileRef = useRef(null);
  const [error, setError] = useState('');
  const uploaded = audio.src?.startsWith('data:');

  const upload = async (file) => {
    if (!file) return;
    setError('');
    try {
      onPatch({ src: await readUploadedFile(file, { kind: 'audio', maxKb: MAX_KB }) });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <Panel title="Music" subtitle="The ambient track behind the reading">
      <div className="flex flex-col gap-3.5">
        <label className="flex items-center gap-2 text-[.8rem] text-white/70">
          <input
            type="checkbox"
            checked={audio.enabled !== false}
            onChange={(e) => onPatch({ enabled: e.target.checked })}
            className="accent-[#7c5cff]"
          />
          Play music during the reading
        </label>

        {audio.enabled !== false && (
          <>
            <Field label="Track" hint={uploaded ? 'Uploaded and stored inside this funnel.' : 'A file served from public/ — costs no storage.'}>
              <input
                className={inputClass}
                value={uploaded ? '' : audio.src || ''}
                onChange={(e) => onPatch({ src: e.target.value })}
                placeholder={uploaded ? 'Uploaded track' : '/audio/ambient.mp3'}
                disabled={uploaded}
              />
            </Field>

            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" accept="audio/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
              <Btn onClick={() => fileRef.current?.click()}>Upload track</Btn>
              {uploaded && <Btn variant="danger" onClick={() => onPatch({ src: '/audio/ambient.mp3' })}>Remove upload</Btn>}
              <span className="text-[.68rem] text-white/30">Max {MAX_KB}KB — a short loop, not a full song</span>
            </div>

            {error && <p className="rounded-lg border border-[#ff6b7d]/25 bg-[#ff6b7d]/10 px-3 py-2 text-[.75rem] text-[#ff9aa7]">{error}</p>}

            <Field label={`Volume — ${Math.round((audio.volume ?? 0.05) * 100)}%`}>
              <input
                type="range"
                min={0}
                max={40}
                step={1}
                value={Math.round((audio.volume ?? 0.05) * 100)}
                onChange={(e) => onPatch({ volume: Number(e.target.value) / 100 })}
                className="w-full accent-[#7c5cff]"
              />
            </Field>

            <AudioPreview src={audio.src} volume={audio.volume ?? 0.05} />
          </>
        )}

        <p className="text-[.7rem] leading-snug text-white/35">
          The send and reply sounds are fixed and not configurable — they are short enough to suit any
          reader, where music sets a mood that differs between one persona and the next.
        </p>
      </div>
    </Panel>
  );
}

// Hearing it is the only way to judge it, and the funnel preview keeps sound off
// so a track does not restart on every keystroke. So the check sits here, opt-in
// and stoppable, at the volume actually configured.
function AudioPreview({ src, volume }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const audio = ref.current;
    return () => { audio?.pause(); };
  }, []);

  // Changing the track or the volume mid-listen should be audible immediately.
  useEffect(() => {
    setPlaying(false);
    setFailed(false);
    ref.current?.pause();
    ref.current = null;
  }, [src]);

  useEffect(() => {
    if (ref.current) ref.current.volume = volume;
  }, [volume]);

  const toggle = () => {
    if (playing) {
      ref.current?.pause();
      setPlaying(false);
      return;
    }
    if (!src) return;
    const audio = ref.current || new Audio(src);
    audio.loop = true;
    audio.volume = volume;
    ref.current = audio;
    audio.play().then(() => { setPlaying(true); setFailed(false); }).catch(() => setFailed(true));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Btn onClick={toggle} disabled={!src}>{playing ? '■ Stop' : '▶ Listen'}</Btn>
      {failed && <span className="text-[.7rem] text-[#ff9aa7]">Could not play that track — check the path.</span>}
      {playing && <span className="text-[.7rem] text-white/35">Playing at the volume set above.</span>}
    </div>
  );
}
