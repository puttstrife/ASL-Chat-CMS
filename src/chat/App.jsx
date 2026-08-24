import { useMemo } from 'react';
import { AIGradientBorder } from './components/AIGradientBorder.jsx';
import { ChatCard } from './components/ChatCard.jsx';
import { useFunnel } from './hooks/useFunnel.js';
import { useTabBadge } from './hooks/useTabBadge.js';
import { listFunnels } from '../cms/store.js';

function Starfield() {
  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, () => {
        const isStatic = Math.random() < 0.3;
        const size = isStatic ? 1 + Math.random() * 0.5 : 1 + Math.random() * 2;
        return { left: Math.random() * 100, top: Math.random() * 100, size, d: 2 + Math.random() * 4, delay: Math.random() * 5 };
      }),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {stars.map((s, i) => (
        <span key={i} className="star" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, '--d': `${s.d}s`, animationDelay: `${s.delay}s` }} />
      ))}
    </div>
  );
}

// The player. `?f=<id>` picks which funnel to run; without one it plays the
// first that exists, so a bare URL still shows something. A funnel can also
// be reached by path, `/<slug>/<version>/<channel_id>`, which a vercel.json
// rewrite (or an equivalent on another host) points at this same page.
//
// A tracking URL also carries `?channel_id=<id>`, which is how a visit is
// attributed. It is seeded as an answer rather than held separately, because
// answers are already the thing that survives the reading and gets passed on at
// the CTA — the channel id needs exactly that lifetime. The path form carries
// the channel id as its third segment instead of a query parameter.
export default function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  const pathInfo = useMemo(() => {
    const segs = window.location.pathname.split('/').filter(Boolean);
    if (segs.length !== 3) return null;
    return { slug: decodeURIComponent(segs[0]), version: decodeURIComponent(segs[1]), channelId: decodeURIComponent(segs[2]) };
  }, []);

  const funnel = useMemo(() => {
    const all = listFunnels();
    const wanted = params.get('f');
    return (
      (pathInfo && all.find((f) => f.tracking?.slug === pathInfo.slug)) ||
      all.find((f) => f.id === wanted) ||
      // Also by slug, so a `/chat/<slug>`-shaped tracking URL resolves on a host
      // that rewrites it to this page.
      all.find((f) => wanted && f.tracking?.slug === wanted) ||
      all[0] ||
      null
    );
  }, [params, pathInfo]);

  const seedAnswers = useMemo(() => {
    const channelId = pathInfo?.channelId || params.get('channel_id');
    // The funnel's own id is the fallback so a visit that arrived without a
    // tracking URL is still attributed to the funnel, just not to a channel.
    return channelId ? { channel_id: channelId } : {};
  }, [params, pathInfo]);

  // Everything else on the inbound URL, carried through untouched and handed
  // back at the CTA. This app is one hop in a chain it does not own: CPV One
  // forwards the parameters it does not consume, the offer page and the
  // affiliate network expect them, and a parameter dropped here is attribution
  // lost with nothing to say so.
  //
  // Kept apart from answers on purpose. Answers are the writer's namespace and
  // interpolate into copy, so seeding them from the URL would let an inbound
  // `?name=` pre-fill a question the visitor has not been asked yet.
  const passThrough = useMemo(() => {
    const out = {};
    for (const [k, v] of params.entries()) {
      // `f` selects which funnel to play. It is this app's own routing, means
      // nothing downstream, and would collide with a real parameter of that
      // name on the offer side.
      if (k === 'f') continue;
      out[k] = v;
    }
    return out;
  }, [params]);

  const engine = useFunnel(funnel, { seedAnswers, passThrough });
  const unread = useTabBadge(engine.messages, funnel?.persona);

  if (!funnel) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#08090e] p-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-lg font-semibold text-white/85">No funnel to play</h1>
          <p className="mt-2 text-[.85rem] leading-relaxed text-white/40">
            Nothing has been built in this browser yet. Open the editor at <code className="text-white/70">#/admin</code> to
            make one, or import a funnel file there.
          </p>
          <a href="#/admin" className="mt-4 inline-block rounded-lg bg-[#7c5cff] px-4 py-2 text-[.8rem] font-semibold text-white">
            Open the editor
          </a>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="pointer-events-none fixed z-0 rounded-full blur-[90px]" style={{ width: 700, height: 700, top: '55vh', right: -150, background: 'radial-gradient(circle, rgba(72,38,160,0.28) 0%, transparent 70%)' }} />
      <div className="pointer-events-none fixed z-0 rounded-full blur-[90px]" style={{ width: 560, height: 560, top: '40vh', left: -120, background: 'radial-gradient(circle, rgba(14,110,130,0.24) 0%, transparent 70%)' }} />
      <Starfield />

      <main className="fixed inset-0 z-10 grid place-items-center sm:p-4">
        <AIGradientBorder className="h-dvh w-full max-w-[600px] rounded-none p-0 sm:h-[min(800px,100dvh-2rem)] sm:rounded-[22px] sm:p-px">
          <ChatCard funnel={engine} persona={funnel.persona} audio={funnel.audio} unread={unread} />
        </AIGradientBorder>
      </main>
    </>
  );
}
