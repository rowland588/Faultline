/* Faultline's mark — a seismic trace on a warm espresso tile. The line runs
 * steady, the fault rips through it as a coral spike, and it settles again:
 * walk the line, and the problem announces itself. It's the name made literal,
 * and it echoes every trend chart inside the app. Used in the top bar, the
 * home wordmark, and the favicon (public/mark.svg). */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Faultline" className="logo-mark">
      <rect width="32" height="32" rx="7" fill="#2b1f18" />
      <path d="M5 20 L11.5 20" stroke="#f6efe6" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M22 20 L27 20" stroke="#f6efe6" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M11.5 20 L15 8.5 L19 25 L22 20" stroke="#ff7a4d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
