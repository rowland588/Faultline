/* Finder's mark — three descending Pareto bars (the whole product in one glyph)
 * on a charcoal tile, in brand amber. Used in the top bar, the home wordmark, and
 * as the favicon (mirrored in public/mark.svg). */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Finder" className="logo-mark">
      <rect width="32" height="32" rx="7" fill="#14181f" />
      <rect x="7" y="9" width="4.6" height="15" rx="1.6" fill="#f59e0b" />
      <rect x="13.7" y="14" width="4.6" height="10" rx="1.6" fill="#f59e0b" fillOpacity="0.82" />
      <rect x="20.4" y="18" width="4.6" height="6" rx="1.6" fill="#f59e0b" fillOpacity="0.6" />
    </svg>
  );
}

export function Wordmark({ size = 34 }: { size?: number }) {
  return (
    <div className="wordmark">
      <LogoMark size={size} />
      <span className="wordmark-name">Finder</span>
    </div>
  );
}
