/* Faultline's mark — a seismic trace across the identity's sweep. The line runs
 * steady, the fault rips through it, and it settles again: walk the line, and
 * the problem announces itself. It is the name made literal, and it echoes
 * every trend chart inside the app.
 *
 * The tile carries the green-to-blue sweep the whole brand is built on; the
 * trace is white, and the spike is white too but heavier — the mark has to read
 * at 16px in a browser tab, where a third colour turns to mud. Used in the top
 * bar, the wordmark, the landing and the favicon (public/mark.svg). */
export function LogoMark({ size = 28, id = 'fl' }: { size?: number; id?: string }) {
  // Unique per instance: two SVGs on one page sharing a gradient id means the
  // second one silently takes the first one's fill.
  const g = `${id}-sweep`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Faultline" className="logo-mark">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0b7d68" />
          <stop offset="45%" stopColor="#13727f" />
          <stop offset="100%" stopColor="#1c6fb8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${g})`} />
      <path d="M5 20 L11.5 20" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.75" />
      <path d="M22 20 L27 20" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.75" />
      <path d="M11.5 20 L15 8.5 L19 25 L22 20" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Wordmark({ size = 34 }: { size?: number }) {
  return (
    <div className="wordmark">
      <LogoMark size={size} />
      <span className="wordmark-name">Faultline</span>
    </div>
  );
}

/** A calm, branded loading state — shown for the boot tick and while a workspace
 *  loads, so there's never a blank white flash. */
export function BootSplash() {
  return (
    <div className="splash">
      <div className="splash-mark"><LogoMark size={46} /></div>
    </div>
  );
}
