/* WHAT A RECORD CARRIES BESIDE ITS BOXES — the files somebody was sent, what
 * to raise at the meeting, the card on paper, and taking a picture off.
 *
 * Rowland, 8 October: "a mess of different ways to see the same thing."
 * (docs/DOORS.md, slice 3.) These were on the record's own page only, one
 * link away from the drawer — the second home. They are the drawer's now
 * (ui/RecordDrawer), at its foot, where every list opens the record; the
 * record's page, kept for old links, reads the same pieces from here. */
import { useEffect, useRef, useState } from 'react';
import { deleteBlobs, getBlob, putBlob } from '../db';
import type { Can } from '../lib/access';
import { pdfFileName } from '../lib/fileName';
import { uid } from '../lib/ids';
import { deliverBlob, deliverPdf, isStaleBuildError, loadPdfLib, reloadOntoNewBuild } from '../lib/savePdf';
import { itemsOf, standingOfItem, wordsOf, type DocRef, type ItemKind, type Test, type TestItem } from '../lib/testing';
import { trialCard } from '../lib/trialCard';
import type { useTesting } from '../lib/useTesting';
import { niceDay, todayISO } from '../lib/weeks';
import type { MediaRef } from '../types';
import { DateInput } from './DateInput';
import { DraftArea, DraftField } from './Draft';
import { EvidenceThumb } from './Evidence';
import { Evidence } from './EvidenceDoors';
import { Icon } from './Icon';
import { OnTheLine } from './OnTheLine';
import { offerUndo } from './Undo';

type TT = ReturnType<typeof useTesting>;

const kb = (b?: number): string =>
  b == null ? '' : b > 900_000 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
const nice = (iso?: string): string => niceDay(iso) || '';

/** THE CARD ON PAPER — the record on one A4, saved to the device first so it
 *  is read before it is sent (lib/savePdf), drawn from the same reading the
 *  record's lines come from (lib/trialCard, lib/trialCardPdf). */
export function CardPdf({ test, tt, project }: { test: Test; tt: TT; project: { name: string; lead?: string } }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const words = wordsOf(test);
  /* The 350KB of jsPDF is fetched when the record OPENS, not when the button
     is pressed — the rule savePdf.ts sets out. */
  useEffect(() => { void loadPdfLib().catch(() => { /* the button reports it */ }); }, []);
  const send = async () => {
    if (busy) return;
    setBusy(true); setErr(null); setSaid(null);
    try {
      const { jsPDF } = await loadPdfLib();
      const { drawTrialCard } = await import('../lib/trialCardPdf');
      const { shotsOf } = await import('../lib/testReport');
      const c = trialCard(test, tt.tests, tt.items, tt.assets);
      const found = itemsOf(tt.items, test.id, 'found');
      const shots = await shotsOf([...(test.media ?? []), ...found.flatMap(i => i.media ?? [])]);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      drawTrialCard(pdf, c, { project: project.name, lead: project.lead, builtAt: Date.now(), shots });
      const when = c.ranOn ?? c.plannedFor;
      const how = await deliverPdf(pdf, pdfFileName(project.name, `${c.title} ${c.kind === 'fix' ? 'fix' : c.kind === 'install' ? 'step' : 'test'} card`, when ?? todayISO()), { brand: false }); // its band carries the mark
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      console.error('Card failed', e);
      setErr(isStaleBuildError(e)
        ? 'This tab is still running an older version of the app, so the part that draws the PDF could not load.'
        : (e instanceof Error ? e.message : `The ${words.one.toLowerCase()} card could not be built.`));
    } finally { setBusy(false); }
  };
  return (
    <>
      <div className="tc-send is-foot">
        <button className="btn" onClick={() => void send()} disabled={busy}>
          {busy ? 'Building…' : `${words.one} card — PDF`}
        </button>
        {said && <span className="tc-ok">{said}</span>}
      </div>
      {err && (
        <p className="sub tw-err">
          {err}{' '}
          {isStaleBuildError(err) && <button className="cw-link" onClick={() => void reloadOntoNewBuild()}>Reload</button>}
        </p>
      )}
    </>
  );
}

/** TAKE A PICTURE OFF — off whichever holds it, the record or a thing found
 *  under it; the file itself kept in hand for the Undo. The owner's (can.remove). */
export async function removeMedia(tt: TT, test: Test, gone: MediaRef): Promise<void> {
  const keys = [gone.blobKey, ...(gone.thumbKey && gone.thumbKey !== gone.blobKey ? [gone.thumbKey] : [])];
  const kept = await Promise.all(keys.map(async k => [k, await getBlob(k)] as const));
  const onTest = (test.media ?? []).some(m => m.id === gone.id);
  const onItems = tt.items.filter(x => x.testId === test.id && (x.media ?? []).some(m => m.id === gone.id)).map(x => x.id);
  if (onTest) await tt.patchTest(test.id, cur => ({ media: (cur.media ?? []).filter(m => m.id !== gone.id) }));
  for (const id of onItems) await tt.patchItem(id, cur => ({ media: (cur.media ?? []).filter(m => m.id !== gone.id) }));
  await deleteBlobs(keys);
  offerUndo(`Removed the ${gone.kind === 'video' ? 'clip' : 'photo'}`, async () => {
    for (const [k, b] of kept) if (b) await putBlob(k, b);
    if (onTest) await tt.patchTest(test.id, cur => ({ media: [...(cur.media ?? []), gone] }));
    for (const id of onItems) await tt.patchItem(id, cur => ({ media: [...(cur.media ?? []), gone] }));
  });
}

/** What we found, or what to raise at the meeting, open for editing: the rows
 *  with their boxes, and the one line that adds another. One component,
 *  because they are the same shape. */
export function RecordItems({ kind, test, tt, can, placeholder, empty, onView, glow, focus }: {
  kind: ItemKind; test: Test; tt: TT; can: Can; placeholder: string; empty: string;
  onView: (m: MediaRef) => void;
  /** A voice note just added to this list. */
  glow?: boolean;
  /** Open with the cursor in the box — the page was opened to write here. */
  focus?: boolean;
}) {
  const [what, setWhat] = useState('');
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!focus) return;
    box.current?.scrollIntoView({ block: 'center' });
    box.current?.focus();
  }, [focus]);
  const rows = itemsOf(tt.items, test.id, kind);

  return (
    <div className={'tc-items is-' + kind + (glow ? ' is-filled' : '')}>
      {rows.length === 0 && <p className="sub tc-empty">{can.edit ? empty : 'Nothing written down.'}</p>}
      {rows.map(i => <ItemRow key={i.id} item={i} tt={tt} can={can} onView={onView} />)}
      {can.edit && <form className="tw-addrow" onSubmit={e => {
        e.preventDefault();
        if (!what.trim()) return;
        void tt.addItem(test.id, kind, what);
        setWhat('');
      }}>
        <input ref={box} placeholder={rows.length ? 'Another one?' : placeholder} value={what} onChange={e => setWhat(e.target.value)} />
        <button className="btn btn-sm" type="submit" disabled={!what.trim()}>Add</button>
      </form>}
    </div>
  );
}

const TICK = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2.5 6.2 L5 8.5 L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function ItemRow({ item, tt, can, onView }: { item: TestItem; tt: TT; can: Can; onView: (m: MediaRef) => void }) {
  const [open, setOpen] = useState(false);
  const done = item.doneAt != null;

  /* AN OBSERVATION IS NOT DONE OR NOT DONE. It is written down, and then
     somebody decides: it needs doing (it becomes a fix), or it needs nothing.
     A next step is the ordinary open/done row it always was. */
  const observation = item.kind === 'found';

  /* AN OBSERVATION IS A NOTE — no tick. Ticking one used to make a fix in
     one tap, with no confirm; Rowland: "me putting in what did we find and
     then sending it tick to fix is the messy part." */
  /* A client reads the row: no tick (the words say raised or done), and it
     does not open, because everything it opens to is a box to change. */
  const tick = observation || !can.edit ? undefined
    : () => void tt.saveItem({ ...item, doneAt: done ? undefined : Date.now() });
  const Main = can.edit ? 'button' : 'div';

  return (
    <div className={'tw-item' + (done && !observation ? ' is-done' : '') + (observation ? ' is-note' : '')}>
      {tick && (
        <button className={'tw-tick' + (done ? ' is-on' : '')}
          aria-label={item.kind === 'note' ? (done ? 'Not raised yet' : 'Raised') : done ? 'Re-open' : 'Mark done'} onClick={tick}>
          {done ? TICK : null}
        </button>
      )}
      {observation && <span className="tw-obs-dot" aria-hidden />}
      <Main className="tw-item-m" {...(can.edit ? { onClick: () => setOpen(o => !o), 'aria-expanded': open } : { style: { cursor: 'default' } })}>
        <b>{item.what}</b>
        <span className="sub">
          {item.owner ?? (item.kind === 'next' ? 'nobody yet' : '')}
          {item.due && ` · by ${nice(item.due)}`}
          {!observation && done && (item.kind === 'note' ? ' · raised' : ' · done')}
          {/* The record it became names which — more useful than the bare word. */}
          {item.becameTestId && (() => {
            const became = tt.tests.find(t => t.id === item.becameTestId && !t.deletedAt);
            return became ? ` · fix: ${became.title}` : '';
          })()}
          {/* SAID ON PAPER, SO SAID HERE. */}
          {observation && standingOfItem(item, tt.items) === 'noted' && ' · not a problem'}
          {item.fromItemId && ' · from an observation'}
          {item.pin && <> · <Icon name="pin" size="1.15em" /> on the line</>}
        </span>
      </Main>
      {(item.media ?? []).length > 0 && !open && (
        <span className="tw-item-ev">
          {(item.media ?? []).map(m => <EvidenceThumb key={m.id} media={m} size={44} onClick={() => onView(m)} />)}
        </span>
      )}

      {open && can.edit && (
        <div className="tw-item-edit">
          {/* WHERE ON THE LINE — the problem pointed at on a frame of the walk. */}
          {observation && (
            <div className="cw-f cw-f-wide">
              <OnTheLine projectId={item.projectId} pin={item.pin} quiet
                onSave={pin => void tt.saveItem({ ...item, pin })} />
            </div>
          )}
          <label className="cw-f cw-f-wide"><span>What</span>
            <DraftArea rows={2} better="problem" value={item.what} onSave={v => v.trim() && void tt.saveItem({ ...item, what: v.trim() })} /></label>
          <label className="cw-f"><span>Whose</span>
            <DraftField value={item.owner ?? ''} placeholder="Ilapak UK" onSave={v => void tt.saveItem({ ...item, owner: v.trim() || undefined })} /></label>
          {item.kind === 'next' && (
            <label className="cw-f"><span>By when</span>
              <DateInput value={item.due ?? ''} onCommit={v => void tt.saveItem({ ...item, due: v || undefined })} /></label>
          )}
          <Evidence media={item.media ?? []} onView={onView} kind="found"
            onAdd={refs => tt.patchItem(item.id, cur => ({ media: [...(cur.media ?? []), ...refs] }))} />
          <span className="cw-edit-end">
            {can.remove && (
              <button className="btn btn-ghost btn-sm cw-del"
                onClick={() => void tt.removeItem(item.id)}>Delete</button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Close</button>
          </span>
        </div>
      )}
    </div>
  );
}

/** Files somebody was sent — an OEM report, a spec. Saved in the app so they
 *  open on the floor with no signal, by the same route a generated report
 *  leaves by. */
/** ATTACH FILES TO A RECORD — the bytes to the device's store (they ride the
 *  same sync as a picture), the names on the record. One write for "Attach a
 *  PDF" and for a paperwork stage's "Here they are" (docs/PANELS.md).
 *  Returns how many were kept. */
export async function attachFiles(tt: Pick<TT, 'patchTest'>, testId: string, files: FileList | File[]): Promise<number> {
  const next: DocRef[] = [];
  for (const f of Array.from(files)) {
    const blobKey = `doc-${uid()}`;
    await putBlob(blobKey, f);
    next.push({ id: uid(), name: f.name, blobKey, mime: f.type || 'application/pdf', bytes: f.size, savedAt: Date.now() });
  }
  if (next.length) await tt.patchTest(testId, cur => ({ docs: [...(cur.docs ?? []), ...next] }));
  return next.length;
}

export function RecordFiles({ test, tt, can }: { test: Test; tt: TT; can: Can }) {
  const pick = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const docs = test.docs ?? [];

  const take = async (files: FileList | null) => {
    if (!files?.length) return;
    setErr(null);
    try {
      await attachFiles(tt, test.id, files);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'That file could not be saved.');
    }
  };

  const open = async (d: DocRef) => {
    const blob = await getBlob(d.blobKey);
    if (!blob) { setErr('That file hasn’t reached this device yet — it will once this device has synced.'); return; }
    await deliverBlob(blob, d.name);
  };

  /* Nothing attached and nothing to attach with: no block to read. */
  if (!can.edit && docs.length === 0) return null;
  const attach = can.edit && <>
    <button type="button" className="cw-add" onClick={() => pick.current?.click()}>
      <span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Attach a PDF
    </button>
    <input ref={pick} type="file" accept="application/pdf,image/*" multiple hidden
      onChange={e => { void take(e.target.files); e.target.value = ''; }} />
  </>;
  /* Nothing attached yet: the one line that attaches the first. */
  if (docs.length === 0) return <>{err && <p className="sub is-r" role="alert">{err}</p>}{attach}</>;

  return (
    <>
      {err && <p className="sub is-r" role="alert">{err}</p>}
      {docs.map(d => (
        <div key={d.id} className="cx-doc">
          <button className="cx-doc-open" onClick={() => void open(d)}>
            <span className="cx-pdf" aria-hidden>PDF</span>
            <span className="cx-doc-n">{d.name}</span>
            <span className="cx-doc-s">{kb(d.bytes)}</span>
          </button>
          {can.remove && <button className="cw-del btn btn-ghost btn-sm"
            onClick={() => void (async () => {
              await tt.patchTest(test.id, cur => ({ docs: (cur.docs ?? []).filter(x => x.id !== d.id) }));
              /* The file itself stays on the device until nothing names it,
                 so putting the reference back is the whole undo. */
              offerUndo(`Removed “${d.name}”`, async () => {
                await tt.patchTest(test.id, cur => ({ docs: [...(cur.docs ?? []), d] }));
              });
            })()}>Remove</button>}
        </div>
      ))}
      {attach}
    </>
  );
}
