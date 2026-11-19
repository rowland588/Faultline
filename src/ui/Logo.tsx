/* Faultline's split F: one simple drawing shared with installed icons and report stamps. */
import { PRODUCT } from '../lib/product';
import identity from '../brand/identity.json';

export function LogoMark({ size = 28 }: { size?: number; id?: string }) {
  /* the split F on its lime tile (minimal v2, 19 November — the tile is the one place lime appears), as the installed icons draw it */
  return <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={PRODUCT.name} className="logo-mark">
    <rect width="32" height="32" rx="6" fill={identity.palette.highlight} />
    {identity.mark.map(p => <rect key={p.id} x={p.x} y={p.y} width={p.w} height={p.h} fill={identity.palette[p.fill as keyof typeof identity.palette]} />)}
  </svg>;
}

export function Wordmark({ size = 34 }: { size?: number }) {
  return <div className="wordmark"><LogoMark size={size} /><span className="wordmark-name">{PRODUCT.mark}</span></div>;
}

export function BootSplash() {
  return <div className="splash"><div className="splash-mark"><LogoMark size={46} /></div></div>;
}
