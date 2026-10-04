/* WHAT HAPPENED TO THIS STAGE — the one panel the plan opens.
 *
 * Rowland: "There's the plan. Plans change. This is the reason why. This is
 * what happened. Look at the film. Look at the picture. It's now booked in as
 * a fix, and we've even agreed a date, or we haven't."
 *
 * Read off lib/story: each move with its reason, the film and the pictures;
 * anything else found on it; and each fix with its agreed date, or none. In the
 * order it happened. One door on from here — the step itself.
 */
import { useState } from 'react';
import type { MediaRef } from '../types';
import { live, plannedEnd, type Test, type TestItem } from '../lib/testing';
import { keyOf, storyOf } from '../lib/story';
import { daysBetween, niceDay } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { Sheet } from './Sheet';
import { EvidenceThumb, EvidenceViewer } from './Evidence';
import { useTesting } from '../lib/useTesting';
import { DatesForm } from './InstallGrid';
import { ProblemForm, followingSummary, recordMove, recordProblem } from './WhyMoved';
import { offerUndo } from './Undo';
import { useAccess } from '../cloud/access';

export function StagePanel({ stepId, title, href, tests, items, projectId, onClose }: {
  stepId: string; title: string; href?: string; tests: Test[]; items: TestItem[]; projectId: string; onClose: () => void;
}) {
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  /* WHAT YOU DO FROM HERE, without leaving the plan: move its dates (asked why
     when it is later) or say it hit a problem (asked whether it moves the
     finish). Rowland: "how does the date move from this?" */
  const tt = useTesting(projectId);
  /* A client reads the story; the team rewords a reason but removes none. */
  const can = useAccess(projectId);
  const [doing, setDoing] = useState<'dates' | 'problem' | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const step = live(tt.loading ? tests : tt.tests).find(t => t.id === stepId);
  /* Not a stage — the handover, a machine, a material, a program: its reasons,
     editable, and the way to where its date is kept. */
  if (!step) return <ThingPanel thingKey={stepId} title={title} href={href} projectId={projectId} onClose={onClose} />;
  const st = storyOf(stepId, tt.loading ? tests : tt.tests, tt.loading ? items : tt.items);
  const end = plannedEnd(step);
  const slip = st.original && end ? daysBetween(st.original, end) : 0;
  const fixWord = (f: Test) => f.outcome === 'passed' ? `done${f.ranOn ? ` ${niceDay(f.ranOn)}` : ''}`
    : f.plannedFor ? `date agreed ${niceDay(f.plannedFor)}${f.plannedTo && f.plannedTo > f.plannedFor ? ` – ${niceDay(f.plannedTo)}` : ''}`
      : 'no date agreed yet';

  /* NOTHING HERE IS LOCKED. Rowland: "everything must be editable, nothing
     locked in." Every reason can be reworded or taken off — taking a move off
     leaves the dates where they are and stops drawing it as an overrun — and
     Undo puts it back. */
  const itemOf = (id: string) => tt.items.find(i => i.id === id);
  const editor = (id: string, text: string) => (
    <span className="sp-edit">
      <textarea className="text-area" rows={2} defaultValue={text} autoFocus id={`sp-e-${id}`} aria-label="What happened" />
      <span className="sp-edit-acts">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => {
          const v = (document.getElementById(`sp-e-${id}`) as HTMLTextAreaElement | null)?.value.trim();
          const it = itemOf(id);
          if (it && v && v !== it.what) {
            void tt.saveItem({ ...it, what: v });
            offerUndo('Reason changed', () => tt.saveItem(it));
          }
          setEditing(null);
        }}>Save</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
      </span>
    </span>
  );
  const entryActs = (id: string, text: string) => can.edit && (
    <span className="sp-row-acts">
      <button type="button" className="cw-link" onClick={() => setEditing(id)}>Edit</button>
      {can.remove && <button type="button" className="cw-link sp-rm" onClick={() => void tt.removeItem(id)} title={`Remove “${text}”`}>Remove</button>}
    </span>
  );

  type Line = { on: string; key: string; node: React.ReactNode };
  const lines: Line[] = [
    ...st.moves.map(m => ({ on: m.on, key: m.id, node: (
      <>
        <span className="sp-k is-move">Moved</span>
        <p className="sp-t"><b>{niceDay(m.from)} → {niceDay(m.to)}</b> · +{m.days} day{m.days === 1 ? '' : 's'}</p>
        {editing === m.id ? editor(m.id, m.why) : <p className="sp-why">{m.why}</p>}
        {m.media.length > 0 && <span className="sp-ev">{m.media.map(x => <EvidenceThumb key={x.id} media={x} size={64} onClick={() => setViewing(x)} />)}</span>}
        {editing !== m.id && entryActs(m.id, m.why)}
      </>
    ) })),
    ...st.found.map(f => ({ on: f.on, key: f.id, node: (
      <>
        <span className="sp-k is-found">Found</span>
        {editing === f.id ? editor(f.id, f.what) : <p className="sp-why">{f.what}</p>}
        {f.media.length > 0 && <span className="sp-ev">{f.media.map(x => <EvidenceThumb key={x.id} media={x} size={64} onClick={() => setViewing(x)} />)}</span>}
        {editing !== f.id && entryActs(f.id, f.what)}
      </>
    ) })),
    ...st.fixes.map(f => ({ on: niceIso(f.createdAt), key: f.id, node: (
      <>
        <span className={'sp-k is-fix' + (f.outcome === 'passed' ? ' is-done' : !f.plannedFor ? ' is-open' : '')}>Fix</span>
        <p className="sp-t"><b>{f.title}</b> · {fixWord(f)}{f.withWhom ? ` · ${f.withWhom}` : ''}</p>
        {(f.media ?? []).length > 0 && <span className="sp-ev">{(f.media ?? []).map(x => <EvidenceThumb key={x.id} media={x} size={64} onClick={() => setViewing(x)} />)}</span>}
        <button type="button" className="cw-link" onClick={() => nav(`/project/${projectId}/testing/${encodeURIComponent(f.id)}`)}>Open the fix ›</button>
      </>
    ) })),
  ].sort((a, b) => a.on.localeCompare(b.on));

  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="sp">
        <p className="sp-dates">
          {step.plannedFor ? <>Planned {niceDay(step.plannedFor)}{end && end > step.plannedFor ? ` – ${niceDay(end)}` : ''}</> : 'No dates yet'}
          {slip > 0 && <> · <b className="sp-slip">+{slip} day{slip === 1 ? '' : 's'}</b> past the finish first planned ({niceDay(st.original)})</>}
        </p>
        {lines.length === 0
          ? <p className="sub">Nothing has happened to this one yet — it is running to plan.</p>
          : (
            <ol className="sp-list">
              {lines.map(l => <li key={l.key}><span className="sp-on">{niceDay(l.on, { weekday: 'short' })}</span><div className="sp-body">{l.node}</div></li>)}
            </ol>
          )}
        {doing === 'dates' && (
          <DatesForm start={step.plannedFor} finish={step.plannedTo} was={plannedEnd(step)}
            following={end => followingSummary(step, tt.tests, end)}
            onSave={(from, to) => {
              const before = { plannedFor: step.plannedFor, plannedTo: step.plannedTo };
              void tt.patchTest(step.id, { plannedFor: from, plannedTo: to });
              offerUndo(`${title} — dates changed`, () => tt.patchTest(step.id, before));
              setDoing(null);
            }}
            onMove={(from, to, a) => void (async () => {
              const before = { plannedFor: step.plannedFor, plannedTo: step.plannedTo };
              const was = plannedEnd(step) as string;
              await tt.patchTest(step.id, { plannedFor: from, plannedTo: to });
              const back = await recordMove(tt, [{ step, from: was, to: to ?? from }], a);
              offerUndo(`${title} moved to ${niceDay(to ?? from)} — reason kept`, async () => { await tt.patchTest(step.id, before); await back(); });
              setDoing(null);
            })()} />
        )}
        {doing === 'problem' && (
          <ProblemForm step={step} tests={tt.tests} assets={tt.assets} onCancel={() => setDoing(null)}
            onSave={a => { void recordProblem(tt, step, a, `${title} hit a problem${a.fix ? ', fix booked' : ''}`); setDoing(null); }} />
        )}
        {!doing && (
          <span className="sp-acts">
            {can.edit && <button type="button" className="btn btn-primary" onClick={() => setDoing('dates')}>Change the dates</button>}
            {can.edit && <button type="button" className="btn ig-bad" onClick={() => setDoing('problem')}>Hit a problem</button>}
            <button type="button" className="btn btn-ghost" onClick={() => nav(`/project/${projectId}/testing/${encodeURIComponent(stepId)}`)}>Open the step ›</button>
          </span>
        )}
      </div>
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)} />}
    </Sheet>
  );
}

const niceIso = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** The story of one of the other dates: each time it moved later, and why. */
function ThingPanel({ thingKey, title, href, projectId, onClose }: {
  thingKey: string; title: string; href?: string; projectId: string; onClose: () => void;
}) {
  const tt = useTesting(projectId);
  const can = useAccess(projectId);
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const st = storyOf(thingKey, tt.tests, tt.items);
  const total = st.moves.reduce((n, m) => n + m.days, 0);
  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="sp">
        <p className="sp-dates">
          {st.moves.length ? <><b className="sp-slip">+{total} day{total === 1 ? '' : 's'}</b> since first planned ({niceDay(st.original)})</> : 'Nothing has moved it yet.'}
        </p>
        {st.moves.length > 0 && (
          <ol className="sp-list">
            {st.moves.map(m => (
              <li key={m.id}><span className="sp-on">{niceDay(m.on, { weekday: 'short' })}</span>
                <div className="sp-body">
                  <span className="sp-k is-move">Moved</span>
                  <p className="sp-t"><b>{niceDay(m.from)} → {niceDay(m.to)}</b> · +{m.days} day{m.days === 1 ? '' : 's'}</p>
                  {editing === m.id ? (
                    <span className="sp-edit">
                      <textarea className="text-area" rows={2} defaultValue={m.why} autoFocus id={`sp-e-${m.id}`} aria-label="Why it moved" />
                      <span className="sp-edit-acts">
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => {
                          const v = (document.getElementById(`sp-e-${m.id}`) as HTMLTextAreaElement | null)?.value.trim();
                          const it = tt.items.find(i => i.id === m.id);
                          if (it && v && v !== it.what) { void tt.saveItem({ ...it, what: v }); offerUndo('Reason changed', () => tt.saveItem(it)); }
                          setEditing(null);
                        }}>Save</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                      </span>
                    </span>
                  ) : <p className="sp-why">{m.why}</p>}
                  {m.media.length > 0 && <span className="sp-ev">{m.media.map(x => <EvidenceThumb key={x.id} media={x} size={64} onClick={() => setViewing(x)} />)}</span>}
                  {editing !== m.id && can.edit && (
                    <span className="sp-row-acts">
                      <button type="button" className="cw-link" onClick={() => setEditing(m.id)}>Edit</button>
                      {can.remove && <button type="button" className="cw-link sp-rm" onClick={() => void tt.removeItem(m.id)}>Remove</button>}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
        {/* The handover date was agreed: only the owner changes it. */}
        {href && <button type="button" className="btn btn-primary sp-open" onClick={() => nav(href)}>
          {can.edit && (can.agree || thingKey !== keyOf('handover')) ? 'Change the date ›' : 'Where the date is kept ›'}
        </button>}
      </div>
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)} />}
    </Sheet>
  );
}
