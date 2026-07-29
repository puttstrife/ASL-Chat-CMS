import { useEffect, useRef } from 'react';

// Messenger-style badge on the browser tab.
//
// The reading keeps playing while the visitor is in another tab. While they
// are away the badge shows how many messages Selene has sent — the whole
// conversation, not only what arrived after they left, so the number matches
// what they will find waiting when they come back. Returning clears it.

const BASE_TITLE = 'Selene — Chat';
const AVATAR = '/images/chat/selene-avatar.png';
const SIZE = 64;

// The favicon is drawn rather than shipped: the avatar, cropped to a circle,
// with a badge over it. Same-origin, so the canvas stays untainted.
function drawFavicon(avatar, count) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
  ctx.clip();
  if (avatar) {
    // Square crop biased towards the top, matching the header's
    // `object-position: center 18%` — a centre crop puts her chin in frame.
    const side = Math.min(avatar.width, avatar.height);
    const sx = (avatar.width - side) / 2;
    const sy = (avatar.height - side) * 0.18;
    ctx.drawImage(avatar, sx, sy, side, side, 0, 0, SIZE, SIZE);
  } else {
    ctx.fillStyle = '#12131b';
    ctx.fillRect(0, 0, SIZE, SIZE);
  }
  ctx.restore();

  if (count > 0) {
    const r = 15;
    const cx = SIZE - r - 1;
    const cy = r + 1;

    // A ring in the page background separates the badge from the avatar
    // behind it, so it stays legible at 16px.
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#080910';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#f0334b';
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = `700 ${count > 9 ? 17 : 22}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(count > 9 ? '9+' : String(count), cx, cy + 1);
  }

  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = canvas.toDataURL('image/png');
}

export function useTabBadge(messages) {
  const cleared = useRef(false);
  const total = useRef(0);
  const avatar = useRef(null);

  // The badge is dormant while they are reading, and stays cleared once they
  // are back — it should never count at someone already looking at the page.
  const paint = useRef(null);
  paint.current = () => {
    const count = document.hidden && !cleared.current ? total.current : 0;
    document.title = count > 0 ? `(${count}) ${BASE_TITLE}` : BASE_TITLE;
    drawFavicon(avatar.current, count);
  };

  // Load the avatar once; the favicon redraws from it on every change.
  useEffect(() => {
    const img = new Image();
    img.src = AVATAR;
    img.onload = () => { avatar.current = img; paint.current(); };
    drawFavicon(null, 0);
  }, []);

  useEffect(() => {
    // Only what Selene produces counts — the visitor's own replies and the
    // typing indicator are not messages waiting for them.
    total.current = messages.filter((m) => m.who !== 'user' && m.who !== 'typing').length;
    paint.current();
  }, [messages]);

  useEffect(() => {
    // Leaving paints immediately — waiting for the next message would leave
    // the tab bare during a pause. Returning clears it.
    const onVisibilityChange = () => {
      cleared.current = !document.hidden;
      paint.current();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);
}
