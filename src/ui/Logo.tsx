/* Faultline's mark — a seismic trace across a pale tile. The line runs steady,
 * the fault rips through it, and it settles again: walk the line, and the
 * problem announces itself. It is the name made literal, and it echoes every
 * trend chart inside the app.
 *
 * The landing's colours: a white-into-pale-blue tile, the flat line in a soft
 * blue, the spike navy into bright blue. It was a green-to-blue tile with a
 * white trace; Rowland asked for the install icon to look like the landing
 * page, and the mark is the same drawing at every size — the top bar, the
 * splash, the favicon (public/mark.svg) and the install icons
 * (scripts/brand-assets.mjs). */
export function LogoMark({ size = 28, id = 'fl' }: { size?: number; id?: string }) {
  // Unique per instance: two SVGs on one page sharing a gradient id means the
  // second one silently takes the first one's fill.
  const t = `${id}-tile`, p = `${id}-spike`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Faultline" className="logo-mark">
      <defs>
        <radialGradient id={t} cx="0.28" cy="0.18" r="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f1f6ff" />
          <stop offset="100%" stopColor="#d6e6ff" />
        </radialGradient>
        <linearGradient id={p} x1="11" y1="0" x2="22" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0d1f3c" />
          <stop offset="55%" stopColor="#1f63e0" />
          <stop offset="100%" stopColor="#3d8bff" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${t})`} />
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="none" stroke="#1f63e0" strokeOpacity="0.16" />
      <path d="M5 20 L11.5 20" stroke="#8fb7f2" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M22 20 L27 20" stroke="#8fb7f2" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M11.5 20 L15 8.5 L19 25 L22 20" stroke={`url(#${p})`} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
