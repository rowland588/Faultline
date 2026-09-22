/* ONE TEST, START TO FINISH.
 *
 * Four blocks, in the order the day runs:
 *
 *   1 · WHAT WE PLANNED TO DO   what · which machine · when · what it passes on
 *   2 · WHAT ACTUALLY HAPPENED  what we ran · when it really was · the result
 *   3 · WHAT WE FOUND           the issues, with the photos and the video
 *   4 · WHAT WE DO NEXT         agreed with the OEM, each one can become the next test
 *
 * THE PLAN IS NOT REWRITTEN AFTER THE DAY. The planned date and the actual date
 * are two fields, as are the planned product and the one that went down the
 * machine, because the day is fluid and the gap between them is usually the
 * story. One field quietly following the result around would always report that
 * everything went to plan.
 */
import { useRef, useState } from 'react';
import { nav } from '../state/useRoute';
import { AccountMenu } from '../ui/AccountMenu';
import { Crumbs } from '../ui/Crumbs';
import { DraftArea, DraftField } from '../ui/Draft';
import { EvidenceThumb, EvidenceViewer } from '../ui/Evidence';
import { VideoRecorder, videoCaptureSupported } from '../ui/VideoRecorder';
import { useProject } from '../lib/useProjects';
import { useTesting } from '../lib/useTesting';
import { getBlob, putBlob } from '../db';
import { uid } from '../lib/ids';
import { deliverBlob, deliverPdf, isStaleBuildError, loadPdfLib } from '../lib/savePdf';
import {
  OUTCOME_WORD, actionOf, foundTally, itemsOf, standingOfItem,
  type DocRef, type ItemKind, type Outcome, type Test, type TestItem,
} from '../lib/testing';
import type { MediaRef } from '../types';

const kb = (b?: number): string =>
  b == null ? '' : b > 900_000 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
const nice = (iso?: string): string => {
  if (!iso) return '';
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : iso;
};
const today = () => new Date().toISOString().slice(0, 10);

type TT = ReturnType<typeof useTesting>;

export function TestScreen({ projectId, testId }: { projectId: string; testId: string }) {
  const { project, loading } = useProject(projectId);
  const tt = useTesting(projectId);
  const [viewing, setViewing] = useState<MediaRef | null>(null);

  if (loading || tt.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  const test = tt.tests.find(t => t.id === testId);
  if (!project || !test) {
    /* A dead end is still a screen somebody is standing on. It says which one
       is gone, what is still there, and gives two ways out — a bare line of grey
       text reads as the app having broken rather than the test having been
       deleted. */
    return (
      <div className="wrap pace cm-screen">
        <AccountMenu />
        <Crumbs trail={[
          { label: 'Projects', to: '/projects' },
          ...(project ? [{ label: project.name, to: `/project/${projectId}` }] : []),
          { label: 'Testing' },
        ]} />
        <section className="cmp-empty">
          <h2>That test isn’t here any more</h2>
          <p>
            It has been deleted, or the link is to a test on a different project. Everything else on
            {project ? ` ${project.name}` : ' this project'} is still where it was.
          </p>
          <button className="btn btn-primary" onClick={() => nav(`/project/${projectId}/testing`)}>Back to the tests</button>
          <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => nav('/projects')}>All projects</button>
        </section>
      </div>
    );
  }

  const save = (patch: Partial<Test>) => void tt.saveTest({ ...test, ...patch });
  const from = test.fromTestId ? tt.tests.find(t => t.id === test.fromTestId) : undefined;

  /* Setting the outcome stamps the day it happened, if nobody has said
     otherwise — the common case is telling the app on the day itself, and
     making somebody type today's date is a question the app can answer. */
  const setOutcome = (o: Outcome) =>
    save({ outcome: o, ranOn: test.ranOn ?? (o === 'planned' ? undefined : today()) });

  return (
    <div className="wrap pace cm-screen">
      <AccountMenu />
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'Testing', to: `/project/${projectId}/testing` },
        { label: test.title },
      ]} />

      <header className="cm-head">
        <div>
          <h1>{test.title}</h1>
          <p className="cw-handover">
            <b>{OUTCOME_WORD[test.outcome]}</b>
            {test.ranOn && <span className="sub">{nice(test.ranOn)}</span>}
            {from && (
              <button className="cw-link" onClick={() => nav(`/project/${projectId}/testing/${encodeURIComponent(from.id)}`)}>
                follows “{from.title}”
              </button>
            )}
          </p>
        </div>
      </header>

      {/* 1 · THE PLAN */}
      <section className="tw-block">
        <span className="tw-block-h">1 · What we planned to do</span>
        <label className="cw-f cw-f-wide"><span>What we plan to do</span>
          <DraftField value={test.title} onSave={v => v.trim() && save({ title: v.trim() })} /></label>
        <label className="cw-f"><span>Machine</span>
          <select value={test.assetId ?? ''} onChange={e => save({ assetId: e.target.value || undefined })}>
            <option value="">The line itself</option>
            {tt.assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select></label>
        <label className="cw-f"><span>Planned for</span>
          <input type="date" value={test.plannedFor ?? ''} onChange={e => save({ plannedFor: e.target.value || undefined })} /></label>
        <label className="cw-f"><span>With</span>
          <DraftField value={test.withWhom ?? ''} placeholder="Ilapak UK" onSave={v => save({ withWhom: v.trim() || undefined })} /></label>
        <label className="cw-f"><span>Product we plan to run</span>
          <DraftField value={test.planned ?? ''} placeholder="Jacks Piper 2kg" onSave={v => save({ planned: v.trim() || undefined })} /></label>
        <label className="cw-f cw-f-wide"><span>Passes if — the expectation</span>
          <DraftArea value={test.passesIf ?? ''} placeholder="65 ppm held for 30 minutes, under 2% waste"
            onSave={v => save({ passesIf: v.trim() || undefined })} /></label>
        <p className="sub tw-note">Agreed before the day. It is what the result gets measured against.</p>
      </section>

      {/* 2 · THE DAY */}
      <section className="tw-block">
        <span className="tw-block-h">2 · What actually happened</span>
        <label className="cw-f"><span>Product we ran</span>
          <DraftField value={test.product ?? ''} placeholder={test.planned ?? 'what went down the machine'}
            onSave={v => save({ product: v.trim() || undefined })} /></label>
        <label className="cw-f"><span>On the day</span>
          <input type="date" value={test.ranOn ?? ''} onChange={e => save({ ranOn: e.target.value || undefined })} /></label>
        <label className="cw-f cw-f-wide"><span>What happened</span>
          <DraftArea rows={5} value={test.result ?? ''} placeholder="61 ppm, 3 leaked in 20"
            onSave={v => save({ result: v.trim() || undefined })} /></label>
        <span className="tw-seg">
          {(['passed', 'failed', 'notRun', 'planned'] as const).map(o => (
            <button key={o} className={'tw-seg-b is-' + o + (test.outcome === o ? ' on' : '')} onClick={() => setOutcome(o)}>
              {o === 'planned' ? 'Still planned' : OUTCOME_WORD[o]}
            </button>
          ))}
        </span>
        <Media test={test} tt={tt} onView={setViewing} />
      </section>

      {/* 3 · WHAT WE FOUND — the biggest block, because it is the important part.
          These are OBSERVATIONS: written down live, while it is running. Whether
          any of them is an action is a decision somebody makes afterwards. */}
      <Items kind="found" test={test} tt={tt} onView={setViewing}
        heading="3 · What we found on the day"
        placeholder="What did you see?"
        empty="Nothing written down yet. This is the part that matters most." />

      {/* 4 · WHAT'S NEXT — the actions. Some typed straight in, some promoted
          from an observation above. */}
      <Items kind="next" test={test} tt={tt} onView={setViewing}
        heading="4 · What we do next"
        placeholder="What do we do next?"
        empty="Nothing agreed yet. Tick an observation above to make it an action, or type one in." />

      <Docs test={test} tt={tt} />

      <TrialCardButton test={test} tt={tt} project={project.name} lead={project.lead} />

      <button className="btn btn-primary tw-loop" onClick={() => void (async () => {
        const id = await tt.planNextFrom(test);
        nav(`/project/${projectId}/testing/${encodeURIComponent(id)}`);
      })()}>
        Plan the next test from this one
      </button>
      <p className="sub tw-note" style={{ textAlign: 'center' }}>
        Carries the machine, the product and the expectation forward, so the plan writes itself.
      </p>

      <div className="cm-foot">
        <button className="btn btn-ghost cw-del" onClick={() => void (async () => {
          const c = await tt.testCost(test.id);
          const n = c.found + c.next;
          const warn = n > 0
            ? `Delete “${test.title}”?\n\nIts ${c.found} finding${c.found === 1 ? '' : 's'} and ${c.next} next step${c.next === 1 ? '' : 's'} go with it. That cannot be undone.`
            : `Delete “${test.title}”?`;
          if (confirm(warn)) { await tt.removeTest(test.id); nav(`/project/${projectId}/testing`); }
        })()}>Delete this test</button>
        <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}/testing`)}>Back to the tests</button>
      </div>

      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

/** THE CARD FOR THIS DAY, as a PDF somebody can send.
 *
 *  "Another PDF report that I can send out to show all the finite detail,
 *  because there's a lot of detail that you pick up."  This is that one. The GM
 *  report lifts four lines out of each trial; this is the whole of one.
 *
 *  jsPDF is loaded on demand, the way every other document in this app is — it
 *  is most of the bundle, and a phone on a factory wifi should not be made to
 *  fetch it to look at a test. */
function TrialCardButton({ test, tt, project, lead }: {
  test: Test; tt: TT; project: string; lead?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const make = async () => {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const { jsPDF } = await loadPdfLib();
      const [{ trialCard }, { drawTrialCard }] = await Promise.all([
        import('../lib/trialCard'), import('../lib/trialCardPdf'),
      ]);
      const card = trialCard(test, tt.tests, tt.items, tt.assets);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      drawTrialCard(pdf, card, { project, lead, builtAt: Date.now() });
      /* The file lands in somebody's inbox on its own, so the name has to say
         which trial on which job — "trial.pdf" from three days is three files
         nobody can tell apart. */
      const slug = `${project} ${test.title}`.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'Trial';
      const how = await deliverPdf(pdf, `${slug}-${(test.ranOn ?? test.plannedFor ?? today())}.pdf`);
      if (how === 'opened') setErr('Your browser would not save it, so it is open in a new tab — share or print it from there.');
    } catch (e) {
      console.error('Trial card failed', e);
      setErr(isStaleBuildError(e)
        ? 'This tab is still running an older version of the app, so the part that draws the PDF could not load. Reload and try again.'
        : (e instanceof Error ? e.message : 'The trial card could not be built.'));
    } finally { setBusy(false); }
  };

  return (
    <div className="tw-card-out">
      <button className="btn btn-primary" onClick={() => void make()} disabled={busy}>
        {busy ? 'Building…' : 'Trial card — the whole day, as a PDF'}
      </button>
      <p className="sub tw-note">
        Everything on this screen on a page you can send: what we planned, what happened, every
        observation and what was decided about it, and what we do next with names and dates.
      </p>
      {err && <p className="sub tw-err">{err}</p>}
    </div>
  );
}

/** What we found, or what we do next. One component, because they are the same
 *  shape and the only difference is the word at the top and whether a row can
 *  become the next test. */
function Items({ kind, test, tt, heading, placeholder, empty, onView }: {
  kind: ItemKind; test: Test; tt: TT; heading: string; placeholder: string; empty: string;
  onView: (m: MediaRef) => void;
}) {
  const [what, setWhat] = useState('');
  const rows = itemsOf(tt.items, test.id, kind);

  /* THE COUNT IS THE WHOLE POINT OF THIS BLOCK'S HONESTY.
   *
   * "5 open of 5" on a list of observations told the room five things were
   * going wrong, when what had happened was that five things were noticed. An
   * observation is written down; it is not open. */
  const count = kind === 'found'
    ? (() => {
        const t = foundTally(rows, tt.items);
        const bits = [`${t.written} written down`];
        if (t.actioned) bits.push(`${t.actioned} actioned`);
        if (t.undecided) bits.push(`${t.undecided} to decide`);
        return bits.join(' · ');
      })()
    : (() => {
        const open = rows.filter(r => r.doneAt == null).length;
        return open > 0 ? `${open} to do of ${rows.length}` : `${rows.length} done`;
      })();

  return (
    <section className={'tw-block is-' + kind}>
      <span className="tw-block-h">
        {heading}
        {rows.length > 0 && <span className="tw-block-n">{count}</span>}
      </span>

      {kind === 'found' && rows.length > 0 && (
        <p className="sub tw-note tw-obs-note">
          What you saw, as you saw it. Tick one to decide it needs doing — it becomes an action below,
          with somebody's name on it.
        </p>
      )}

      {rows.length === 0 && <p className="sub tw-note">{empty}</p>}

      {rows.map(i => <ItemRow key={i.id} item={i} test={test} tt={tt} onView={onView} />)}

      <form className="tw-addrow" onSubmit={e => {
        e.preventDefault();
        if (!what.trim()) return;
        void tt.addItem(test.id, kind, what);
        setWhat('');
      }}>
        <input placeholder={placeholder} value={what} onChange={e => setWhat(e.target.value)} />
        <button className="btn btn-sm" type="submit" disabled={!what.trim()}>Add</button>
      </form>
    </section>
  );
}

const TICK = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2.5 6.2 L5 8.5 L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function ItemRow({ item, test, tt, onView }: { item: TestItem; test: Test; tt: TT; onView: (m: MediaRef) => void }) {
  const [open, setOpen] = useState(false);
  const done = item.doneAt != null;

  /* AN OBSERVATION IS NOT DONE OR NOT DONE. It is written down, and then
     somebody decides: it needs doing (it becomes an action below), or it needs
     nothing. A next step is the ordinary open/done row it always was. */
  const observation = item.kind === 'found';
  const st = observation ? standingOfItem(item, tt.items) : undefined;
  const action = observation ? actionOf(item, tt.items) : undefined;

  const tick = observation
    ? () => {
        if (st === 'actioned') return;              // undo by deleting the action
        void tt.actionItem(item);
      }
    : () => void tt.saveItem({ ...item, doneAt: done ? undefined : Date.now() });

  return (
    <div className={'tw-item' + (done && !observation ? ' is-done' : '') + (st ? ' is-' + st : '')}>
      <button
        className={'tw-tick' + (st === 'actioned' ? ' is-on' : '')}
        aria-label={observation
          ? (st === 'actioned' ? 'Already an action' : 'Make this an action')
          : (done ? 'Re-open' : 'Mark done')}
        onClick={tick}
      >
        {(observation ? st === 'actioned' : done) ? TICK : null}
      </button>
      <button className="tw-item-m" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <b>{item.what}</b>
        <span className="sub">
          {item.owner ?? (item.kind === 'next' ? 'nobody yet' : '')}
          {item.due && ` · by ${nice(item.due)}`}
          {!observation && done && ' · done'}
          {st === 'actioned' && ' · actioned'}
          {st === 'noted' && ' · no action needed'}
          {item.fromItemId && ' · from an observation'}
          {item.becameTestId && ' · became a test'}
        </span>
      </button>
      {(item.media ?? []).map(m => <EvidenceThumb key={m.id} media={m} size={38} onClick={() => onView(m)} />)}

      {open && (
        <div className="tw-item-edit">
          <label className="cw-f cw-f-wide"><span>What</span>
            <DraftArea rows={2} value={item.what} onSave={v => v.trim() && void tt.saveItem({ ...item, what: v.trim() })} /></label>
          <label className="cw-f"><span>Whose</span>
            <DraftField value={item.owner ?? ''} placeholder="Ilapak UK" onSave={v => void tt.saveItem({ ...item, owner: v.trim() || undefined })} /></label>
          {item.kind === 'next' && (
            <label className="cw-f"><span>By when</span>
              <input type="date" value={item.due ?? ''} onChange={e => void tt.saveItem({ ...item, due: e.target.value || undefined })} /></label>
          )}
          <ItemMedia item={item} tt={tt} onView={onView} />
          {observation && (
            <span className="tw-decide">
              {st === 'actioned'
                ? <span className="sub">Actioned — it is “{action?.what}” under what we do next.</span>
                : (
                  <>
                    <button className="btn btn-sm" onClick={() => void tt.actionItem(item)}>Make this an action</button>
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => void tt.saveItem({ ...item, doneAt: done ? undefined : Date.now() })}>
                      {done ? 'Still deciding' : 'No action needed'}
                    </button>
                  </>
                )}
            </span>
          )}
          <span className="cw-edit-end">
            {item.kind === 'next' && !item.becameTestId && (
              <button className="btn btn-sm" onClick={() => void (async () => {
                const id = await tt.planNextFrom(test, item.id, item.what);
                nav(`/project/${test.projectId}/testing/${encodeURIComponent(id)}`);
              })()}>Make this the next test</button>
            )}
            <button className="btn btn-ghost btn-sm cw-del"
              onClick={() => { if (confirm(`Delete “${item.what}”?`)) void tt.removeItem(item.id); }}>Delete</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Close</button>
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ what's attached ---------------------------- */

/** Photos and video of the day itself. The same capture path the line walk uses,
 *  so a clip filmed here behaves like every other clip in the app. */
function Media({ test, tt, onView }: { test: Test; tt: TT; onView: (m: MediaRef) => void }) {
  const pick = useRef<HTMLInputElement>(null);
  const [filming, setFilming] = useState(false);

  const add = async (blob: Blob, kind: MediaRef['kind']) => {
    const blobKey = `test-${uid()}`;
    await putBlob(blobKey, blob);
    const m: MediaRef = { id: uid(), kind, blobKey, mime: blob.type || (kind === 'photo' ? 'image/jpeg' : 'video/webm'), capturedAt: Date.now() };
    await tt.saveTest({ ...test, media: [...(test.media ?? []), m] });
  };

  return (
    <div className="tw-media">
      {(test.media ?? []).map(m => <EvidenceThumb key={m.id} media={m} size={54} onClick={() => onView(m)} />)}
      <button className="tw-att" onClick={() => pick.current?.click()}>+ Photo</button>
      {videoCaptureSupported() && <button className="tw-att" onClick={() => setFilming(true)}>+ Video</button>}
      <input ref={pick} type="file" accept="image/*" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) void add(f, 'photo'); e.target.value = ''; }} />
      {filming && <VideoRecorder onCapture={b => { void add(b, 'video'); setFilming(false); }} onClose={() => setFilming(false)} />}
    </div>
  );
}

function ItemMedia({ item, tt, onView }: { item: TestItem; tt: TT; onView: (m: MediaRef) => void }) {
  const pick = useRef<HTMLInputElement>(null);
  const [filming, setFilming] = useState(false);

  const add = async (blob: Blob, kind: MediaRef['kind']) => {
    const blobKey = `item-${uid()}`;
    await putBlob(blobKey, blob);
    const m: MediaRef = { id: uid(), kind, blobKey, mime: blob.type || (kind === 'photo' ? 'image/jpeg' : 'video/webm'), capturedAt: Date.now() };
    await tt.saveItem({ ...item, media: [...(item.media ?? []), m] });
  };

  return (
    <div className="tw-media">
      {(item.media ?? []).map(m => <EvidenceThumb key={m.id} media={m} size={44} onClick={() => onView(m)} />)}
      <button className="tw-att" onClick={() => pick.current?.click()}>+ Photo</button>
      {videoCaptureSupported() && <button className="tw-att" onClick={() => setFilming(true)}>+ Video</button>}
      <input ref={pick} type="file" accept="image/*" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) void add(f, 'photo'); e.target.value = ''; }} />
      {filming && <VideoRecorder onCapture={b => { void add(b, 'video'); setFilming(false); }} onClose={() => setFilming(false)} />}
    </div>
  );
}

/** Files somebody was sent — an OEM report, a spec. Saved in the app so they
 *  open on the floor with no signal, by the same route a generated report
 *  leaves by. */
function Docs({ test, tt }: { test: Test; tt: TT }) {
  const pick = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const docs = test.docs ?? [];

  const take = async (files: FileList | null) => {
    if (!files?.length) return;
    setErr(null);
    try {
      const next: DocRef[] = [];
      for (const f of Array.from(files)) {
        const blobKey = `doc-${uid()}`;
        await putBlob(blobKey, f);
        next.push({ id: uid(), name: f.name, blobKey, mime: f.type || 'application/pdf', bytes: f.size, savedAt: Date.now() });
      }
      await tt.saveTest({ ...test, docs: [...docs, ...next] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'That file could not be saved.');
    }
  };

  const open = async (d: DocRef) => {
    const blob = await getBlob(d.blobKey);
    if (!blob) { setErr('That file hasn’t reached this device yet — it will once this device has synced.'); return; }
    await deliverBlob(blob, d.name);
  };

  return (
    <section className="tw-block">
      <span className="tw-block-h">
        Files
        {docs.length > 0 && <span className="tw-block-n">{docs.length}</span>}
      </span>
      {err && <p className="sub is-r" role="alert">{err}</p>}
      {docs.map(d => (
        <div key={d.id} className="cx-doc">
          <button className="cx-doc-open" onClick={() => void open(d)}>
            <span className="cx-pdf" aria-hidden>PDF</span>
            <span className="cx-doc-n">{d.name}</span>
            <span className="cx-doc-s">{kb(d.bytes)}</span>
          </button>
          <button className="cw-del btn btn-ghost btn-sm"
            onClick={() => { if (confirm(`Remove “${d.name}”?`)) void tt.saveTest({ ...test, docs: docs.filter(x => x.id !== d.id) }); }}>Remove</button>
        </div>
      ))}
      <button className="cw-add" onClick={() => pick.current?.click()}>
        <span className="cw-add-p" aria-hidden>+</span> Attach a PDF
      </button>
      <input ref={pick} type="file" accept="application/pdf,image/*" multiple hidden
        onChange={e => { void take(e.target.files); e.target.value = ''; }} />
    </section>
  );
}
