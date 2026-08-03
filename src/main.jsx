import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './chat/App.jsx';
import CmsApp from './cms/CmsApp.jsx';
import './chat/index.css';

// Hash routing on purpose: it needs no server rewrite rules, so the same build
// works on any static host and in `vite preview` without extra config.
//
//   #/admin  → the editor
//   anything → the player
function Root() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash.startsWith('#/admin') ? <CmsApp /> : <App />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
