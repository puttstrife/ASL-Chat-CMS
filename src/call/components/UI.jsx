export function GradientFrame({ children }) {
  return (
    <div className="call-frame">
      <div className="call-frame-clip">
        <div className="call-frame-content">{children}</div>
      </div>
    </div>
  );
}

export function MarisolAvatar({ size = 'medium', active = false, ping = false }) {
  return (
    <div className={`call-avatar-wrap call-avatar-${size}`}>
      {ping && <span className="call-avatar-ping" />}
      <img
        src="/images/chat/marisol-avatar.png"
        alt="Marisol"
        className={active ? 'is-active' : ''}
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = '/images/chat/sabrina-avatar.png';
        }}
      />
    </div>
  );
}

export function AudioBars({ active = false }) {
  return (
    <div className={`call-audio-bars ${active ? 'is-active' : ''}`} aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => <span key={index} style={{ animationDelay: `${index * 0.08}s` }} />)}
    </div>
  );
}

export function PrimaryButton({ className = '', children, ...props }) {
  return <button className={`call-primary-button ${className}`} {...props}>{children}</button>;
}
