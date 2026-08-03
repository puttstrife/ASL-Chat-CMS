import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// An in-app replacement for window.confirm.
//
// The native one is chrome, not product: it says "localhost:5180 says", it
// cannot show the line you are about to delete in the app's own type, and on
// some platforms it is the same dialog a page uses to nag you. Since these
// prompts exist to make an unrecoverable action feel unrecoverable, they have
// to look like they come from the editor.
//
// Promise-based so call sites read the same as the thing it replaces:
//   if (await confirm({ ... })) remove()

const ConfirmContext = createContext(async () => false);

export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  // The resolver lives in a ref so closing never depends on which render the
  // handler was created in.
  const resolveRef = useRef(null);

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
        setRequest(opts);
      }),
    []
  );

  const settle = useCallback((value) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setRequest(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && <ConfirmDialog request={request} onSettle={settle} />}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({ request, onSettle }) {
  const cancelRef = useRef(null);

  // Cancel takes focus, not the destructive button — a stray Enter or Space
  // arriving with the dialog should not be the thing that deletes the stage.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onSettle(false); }
      // Enter confirms only from the button that already has focus, so it
      // cannot fire while someone is still reading.
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSettle]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
      style={{ animation: 'bubbleIn .12s ease-out' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onSettle(false); }}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-[26rem] overflow-hidden rounded-xl border border-white/12 bg-[var(--surface-3)] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="flex flex-col gap-2.5 p-4">
          <h2 id="confirm-title" className="text-[.95rem] font-semibold text-white/90">{request.title}</h2>

          {request.summary && <p className="text-[.78rem] text-white/45">{request.summary}</p>}

          {/* Everything being destroyed, in full and scrollable. An earlier
              version cut the list to three and appended "…and 5 more", which
              hid exactly the line someone might have needed to see to realise
              they had the wrong stage. */}
          {request.items?.length > 0 && (
            <ul className="no-scrollbar m-0 flex max-h-56 list-none flex-col gap-1 overflow-y-auto rounded-lg border border-white/8 bg-[var(--field)] p-2">
              {request.items.map((item, i) => (
                <li key={i} className="flex gap-2 rounded px-1 py-0.5 text-[.76rem] leading-relaxed text-white/60">
                  <span className="shrink-0 opacity-70" aria-hidden="true">{item.icon}</span>
                  <span className="min-w-0 break-words">{item.text}</span>
                </li>
              ))}
            </ul>
          )}

          {request.detail && (
            <p className="whitespace-pre-line rounded-lg border border-white/8 bg-[var(--field)] px-3 py-2 text-[.78rem] leading-relaxed text-white/55">
              {request.detail}
            </p>
          )}

          <p className="text-[.75rem] text-white/40">
            {request.note || 'This cannot be undone.'}
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/8 bg-[var(--surface-4)] px-4 py-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => onSettle(false)}
            className="rounded-lg border border-white/12 bg-white/5 px-3.5 py-1.5 text-[.8rem] font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSettle(true)}
            className="rounded-lg border border-[#ff6b7d]/40 bg-[#ff6b7d]/15 px-3.5 py-1.5 text-[.8rem] font-semibold text-[#ff9aa7] transition-colors hover:bg-[#ff6b7d]/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b7d]"
          >
            {request.confirmLabel || 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
