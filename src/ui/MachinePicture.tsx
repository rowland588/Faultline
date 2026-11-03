/* A MACHINE'S PICTURE — drawn from its record (lib/machinePicture), and on its page taken, changed and taken off by whoever may
 * change the line (Rowland, 3 November: "I can't actually add a picture of the machine"). */
import { useEffect, useRef, useState } from 'react';
import { clearMachinePicture, setMachinePicture } from '../db/lineRecords';
import { getBlob } from '../db';
import { pictureOf } from '../lib/machinePicture';
import type { Asset } from '../lib/testing';
import { useCanStartProjects } from '../cloud/access';
import { offerUndo } from './Undo';
import { putAsset } from '../db/testing';

/** The picture of a machine, or nothing — an empty frame is a box to look past. */
export function MachineImg({ record, alt, className }: { record?: Asset; alt: string; className?: string }) {
  const key = pictureOf(record)?.blobKey;
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!key) { setUrl(null); return; }
    let u: string | null = null, live = true;
    void getBlob(key).then(b => { if (b && live) { u = URL.createObjectURL(b); setUrl(u); } }).catch(() => {});
    return () => { live = false; if (u) URL.revokeObjectURL(u); };
  }, [key]);
  return url ? <img className={className} src={url} alt={alt} loading="lazy" /> : null;
}

/** On the machine's page: its picture large, with Add / Change / Take off. */
export function MachinePicture({ wsId, name, record }: { wsId: string; name: string; record?: Asset }) {
  const may = useCanStartProjects();
  const pick = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const has = !!pictureOf(record);
  if (!has && !may) return null;
  const take = async (f: File | undefined) => {
    if (!f) return;
    setErr(null); setBusy(true);
    try {
      const before = await setMachinePicture(wsId, name, f, f.name || 'machine.jpg');
      offerUndo(`Picture of the ${name} saved`, () => putAsset(before));
    } catch (e) { setErr(e instanceof Error ? e.message : 'That picture could not be saved.'); }
    finally { setBusy(false); }
  };
  const off = async () => {
    const before = await clearMachinePicture(wsId, name);
    offerUndo(`Picture of the ${name} taken off`, () => putAsset(before));
  };
  return (
    <section className="pl-sec mpic" aria-label="Its picture" data-machine-picture>
      <MachineImg record={record} alt={`The ${name}`} className="mpic-img" />
      {err && <p className="sub is-r" role="alert">{err}</p>}
      {may && (
        <span className="lt-acts mpic-acts">
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => pick.current?.click()}>{busy ? 'Saving…' : has ? 'Change the picture' : 'Add a picture of the machine'}</button>
          {has && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void off()}>Take it off</button>}
          <input ref={pick} type="file" accept="image/*" hidden aria-label="Picture of the machine"
            onChange={e => { void take(e.target.files?.[0]); e.target.value = ''; }} />
        </span>
      )}
    </section>
  );
}
