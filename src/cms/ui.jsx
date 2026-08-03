// Small building blocks the editor panels share, so every panel looks the same
// without each one re-deciding what a field looks like.

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      {label && <span className="text-[.7rem] font-semibold uppercase tracking-wide text-white/45">{label}</span>}
      {children}
      {hint && <span className="text-[.7rem] leading-snug text-white/35">{hint}</span>}
    </label>
  );
}

// A field reads as a well cut into its card rather than another card on top of
// it, so it sits a step below whatever holds it — which is what stops a beat's
// textarea from disappearing into the beat's own background.
export const inputClass =
  'w-full rounded-lg border border-white/10 bg-[var(--field)] px-3 py-2 text-[.85rem] text-white/90 outline-none transition-colors placeholder:text-white/25 focus:border-[#7c5cff] focus:bg-[#0e0f18]';

export const textareaClass = `${inputClass} min-h-[70px] resize-y leading-relaxed`;

// The native chevron sits hard against the right edge and differs per browser.
// `select-chevron` swaps in one that can actually be positioned; the extra
// right padding keeps the longest option from running underneath it.
export const selectClass = `${inputClass} select-chevron pr-9`;

export function Btn({ variant = 'ghost', className = '', ...props }) {
  const styles = {
    primary: 'bg-[#7c5cff] text-white hover:bg-[#8f74ff] border-transparent',
    ghost: 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border-white/10',
    danger: 'bg-transparent text-[#ff6b7d] hover:bg-[#ff6b7d]/10 border-[#ff6b7d]/25',
  }[variant];
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[.78rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
      {...props}
    />
  );
}

export function Panel({ title, subtitle, right, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-white/8 bg-[var(--surface-2)] ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-3 border-b border-white/8 bg-white/[.02] px-3.5 py-2.5">
          <div className="min-w-0">
            <h2 className="truncate text-[.82rem] font-semibold text-white/85">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-[.7rem] text-white/35">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      <div className="p-3.5">{children}</div>
    </section>
  );
}

// Reads a picked file as a data URL. Uploads live inside the funnel JSON rather
// than in a bucket, which is what makes a funnel a single portable file — at the
// cost of size, so anything too big is rejected loudly rather than silently
// blowing the localStorage quota.
export function readUploadedFile(file, { kind = 'image', maxKb = 900 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith(`${kind}/`)) return reject(new Error(`That is not ${kind === 'audio' ? 'an audio' : 'an image'} file.`));
    if (file.size > maxKb * 1024) {
      return reject(
        new Error(
          `That file is ${Math.round(file.size / 1024)}KB. Keep it under ${maxKb}KB — funnels are stored whole in this browser, so a big upload can break saving.`
        )
      );
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

export const readImageFile = (file, opts = {}) => readUploadedFile(file, { kind: 'image', maxKb: 900, ...opts });
