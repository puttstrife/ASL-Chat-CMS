import { useEffect, useRef } from 'react';

// Messenger-style badge on the browser tab.
//
// It counts what Selene has said since the visitor last did anything — typed
// their name, picked an answer, tapped continue. Every interaction resets it
// to zero, and it climbs again as she replies, so the number is always "how
// many messages she has sent me since I last spoke".

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
  const avatar = useRef(null);
  const count = useRef(0);

  // Everything after the visitor's most recent message is Selene answering
  // it. Before they have said anything at all, that is the whole opening.
  // The typing indicator is not a message and never counts.
  const lastUserIndex = messages.map((m) => m.who).lastIndexOf('user');
  count.current = messages
    .slice(lastUserIndex + 1)
    .filter((m) => m.who !== 'typing').length;

  useEffect(() => {
    const img = new Image();
    img.src = AVATAR;
    img.onload = () => { avatar.current = img; drawFavicon(img, count.current); };
    drawFavicon(null, count.current);
  }, []);

  useEffect(() => {
    document.title = count.current > 0 ? `(${count.current}) ${BASE_TITLE}` : BASE_TITLE;
    drawFavicon(avatar.current, count.current);
  }, [messages]);
}
