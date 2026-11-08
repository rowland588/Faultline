/* YOUR BRAND — who prepares the papers (8 November, docs/STORY.md S1; lib/brand). Opened from the account menu: your name, your
 * business, a strapline, a contact line and a logo. Saved once, it is on the foot of every paper and on every cover. The logo is
 * resized here to a small PNG so the profile row stays small and every paper draws it the same. */
import { useRef, useState } from 'react';
import { DEFAULT_BRAND, readBrand, saveBrand, type Brand } from '../lib/brand';
import { Sheet } from './Sheet';

/** A chosen image file as a PNG data URL no wider or taller than `max` px. */
export async function logoDataUrl(file: File, max = 240): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
  c.getContext('2d')?.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

export function BrandSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const have = readBrand();
  const [b, setB] = useState<Brand>(have ?? DEFAULT_BRAND);
  const [said, setSaid] = useState('');
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const put = (k: keyof Brand, v: string) => setB(x => ({ ...x, [k]: v }));
  const save = async () => {
    setBusy(true);
    const r = await saveBrand({ ...b, strapline: b.strapline?.trim() || undefined, contact: b.contact?.trim() || undefined });
    setBusy(false);
    setSaid(r.ok ? 'Saved — on the foot of every paper and on every cover from now.' : r.why);
    if (r.ok) window.setTimeout(onClose, 900);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Your brand">
      <div className="brand-sheet" data-brand-sheet>
        <p className="sub">Who prepares the papers. Said once here, it is on the foot of every paper and on every cover a client is handed — {have ? 'change it any time.' : 'nothing is printed until you save it.'}</p>
        <label className="field"><span className="field-label">Your name</span>
          <input className="text-input" value={b.name} maxLength={80} onChange={e => put('name', e.target.value)} aria-label="Your name" /></label>
        <label className="field"><span className="field-label">Your business</span>
          <input className="text-input" value={b.business} maxLength={80} onChange={e => put('business', e.target.value)} aria-label="Your business" /></label>
        <label className="field"><span className="field-label">Strapline <span className="sub">(optional, under the business on a cover)</span></span>
          <input className="text-input" value={b.strapline ?? ''} maxLength={120} placeholder="e.g. Operational improvement for food manufacturers" onChange={e => put('strapline', e.target.value)} aria-label="Strapline" /></label>
        <label className="field"><span className="field-label">Contact line <span className="sub">(optional)</span></span>
          <input className="text-input" value={b.contact ?? ''} maxLength={120} placeholder="e.g. rowland@streamlinesynergy.co.uk · 07…" onChange={e => put('contact', e.target.value)} aria-label="Contact line" /></label>
        <div className="field">
          <span className="field-label">Logo <span className="sub">(optional — a PNG or JPEG; kept small)</span></span>
          <div className="brand-logo-row">
            {b.logo ? <img className="brand-logo" src={b.logo} alt="Your logo" /> : <span className="sub">None yet</span>}
            <input ref={file} type="file" accept="image/png,image/jpeg" hidden aria-label="Choose a logo"
              onChange={async e => { const f = e.target.files?.[0]; if (f) put('logo', await logoDataUrl(f)); e.target.value = ''; }} />
            <button type="button" className="btn btn-sm" onClick={() => file.current?.click()}>{b.logo ? 'Change the logo' : 'Add a logo'}</button>
            {b.logo && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setB(x => { const { logo: _l, ...rest } = x; return rest; })}>Take it off</button>}
          </div>
        </div>
        <div className="brand-foot-preview sub" aria-label="How the foot of a paper will read">On every paper: <b>{[b.name.trim(), b.business.trim()].filter(Boolean).join(' · ') || '—'}</b></div>
        <div className="sheet-acts">
          <button type="button" className="btn btn-primary" disabled={busy || !(b.name.trim() || b.business.trim())} onClick={() => void save()}>Save</button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
        {said && <p className="sub" role="status">{said}</p>}
      </div>
    </Sheet>
  );
}
