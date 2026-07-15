export function MarisolAvatar({
  sizeClass = 'size-32',
  active = false,
  ping = false,
  dim = false,
  className = '',
}) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      {ping && (
        <span
          className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#b676ff]/25"
          style={{ animationDuration: '2.2s' }}
        />
      )}
      <img
        src="/images/chat/marisol-avatar.png"
        alt="Marisol"
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = '/images/chat/sabrina-avatar.png';
        }}
        className={`${sizeClass} rounded-full object-cover shadow-[0_0_44px_rgba(190,108,255,0.6)] ring-2 ring-[var(--gold)]/50 ${active ? 'animate-pulse' : ''} ${dim ? 'opacity-70' : ''}`}
        style={{ objectPosition: 'center 18%' }}
      />
    </div>
  );
}

export function MarisolIdentity({ status, statusClassName = '', nameClassName = 'text-5xl' }) {
  return (
    <div className="text-center">
      <p className={`font-script leading-none text-[var(--gold)] ${nameClassName}`}>Marisol</p>
      {status && (
        <p className={`font-sans mt-2 text-[.7rem] text-white/55 ${statusClassName}`}>
          {status}
        </p>
      )}
    </div>
  );
}

export function AudioActivity({ active = false, bars = 7, className = '' }) {
  return (
    <div className={`flex h-6 items-end justify-center gap-1 ${className}`} aria-hidden="true">
      {Array.from({ length: bars }, (_, index) => (
        <span
          key={index}
          className="w-1 rounded-full bg-[#b676ff]"
          style={{
            height: 7,
            animation: active ? `callBar 0.9s ease-in-out ${index * 0.1}s infinite` : 'none',
            opacity: active ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  );
}
