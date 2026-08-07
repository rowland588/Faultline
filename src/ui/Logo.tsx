/* Faultline's mark — three descending Pareto bars (the whole product in one
 * glyph) on a deep-navy tile. The tallest bar is light orange: the fault that
 * matters. The rest cool off through blue to green — worked down to good.
 * Used in the top bar, the home wordmark, and the favicon (public/mark.svg). */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Faultline" className="logo-mark">
      <rect width="32" height="32" rx="7" fill="#0f2440" />
      <rect x="7" y="9" width="4.6" height="15" rx="1.6" fill="#fb923c" />
      <rect x="13.7" y="14" width="4.6" height="10" rx="1.6" fill="#5b9bff" />
      <rect x="20.4" y="18" width="4.6" height="6" rx="1.6" fill="#34d399" />
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
