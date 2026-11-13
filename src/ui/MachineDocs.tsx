/* A MACHINE'S DOCUMENTS, ON ITS PAGE (13 November, docs/ASSET-DOCUMENTS.md D2 — "connect the dots": a manual kept through Luna shows
 * where its machine shows). Each row says what it is, how much of it could be read, and — for a manual — how many maintenance tasks with
 * an interval the app's rules read in it (lib/manual pmTasksOf; no AI). Nothing here writes. */
import { useEffect, useState } from 'react';
import { onDataChange } from '../db';
import { listMachineDocs, DOC_KIND_WORD, type MachineDoc } from '../lib/manual/store';
import { pmTasksOf } from '../lib/manual/manual';

const day = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function docRowSaid(d: MachineDoc): string {
  const read = d.pageCount - d.blank;
  const pm = d.docKind === 'manual' ? pmTasksOf(d.pages).length : 0;
  return `${DOC_KIND_WORD[d.docKind]} · ${d.pageCount} page${d.pageCount === 1 ? '' : 's'}${d.blank ? ` (${read} with words to read)` : ''}${d.docKind === 'manual' ? ` · ${pm ? `${pm} maintenance task${pm === 1 ? '' : 's'} with an interval read in it` : 'no maintenance task with an interval read in it yet'}` : ''} · kept ${day(d.at)}`;
}

export function MachineDocs({ lineId, machine }: { lineId: string; machine: string }) {
  const [docs, setDocs] = useState<MachineDoc[] | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => void listMachineDocs({ lineId, machine }).then(d => { if (live) setDocs(d); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [lineId, machine]);
  if (!docs?.length) return null;
  return (
    <section className="pl-sec" aria-label="Its documents" data-machine-docs>
      <div className="pl-sec-h"><h2>Its documents</h2><span className="sub">{docs.length}</span></div>
      <ul className="mdocs">
        {docs.map(d => (
          <li key={d.id} data-machine-doc={d.id}><strong>{d.name}</strong><span className="sub">{docRowSaid(d)}</span></li>
        ))}
      </ul>
      <p className="sub">Ask Luna what one says, or for the PM list its maker stipulates — she answers from its pages, with the page.</p>
    </section>
  );
}
