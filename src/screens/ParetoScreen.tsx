/* THE PARETO — where the time is going, and whether it moved.
 *
 * An optional surface, ticked on per project under Lines & people, because a
 * Pareto is not every project's tool. It is drawn from the losses timed in the
 * app on every line of the project — the last four weeks against the four
 * before — see lib/paretoFromLog. It used to read the Pareto sheet of an
 * uploaded workbook; Rowland: "switch to full app only." 
 *
 * TWO JOBS ON ONE PAGE, AND THE SECOND IS THE POINT. At the start of a project
 * the ranking says where to aim. Run again during it, the same ranking is
 * EVIDENCE — did the category we went after actually get smaller? So every row
 * carries its movement against the last comparable upload, and the page refuses
 * to imply movement when there is none to claim.
 */
import { useEffect, useMemo, useState } from 'react';
import { nav, useRoute } from '../state/useRoute';
import { useAccess } from '../cloud/access';
import { useProblems } from '../lib/useProblems';
import { planModel } from '../lib/planModel';
import { fishboneUrl, problemTitleOfBar, sameSource } from './FishboneScreen';
import { justDoItStep, lineOfBar as lineOfBarIn, openBarProblem, pickOf, problemOfBar, vitalWords } from '../lib/paretoPicks';
import { RootReasonSheet } from '../ui/ParetoPane';
import { ActionSheet, type Editing } from '../ui/ActionSheet';
import { uid } from '../lib/ids';
import { Sweep } from '../ui/Sweep';
import { useProject } from '../lib/useProjects';
import { useProjectPareto, barDrills, isTie, drillCategory, type BarDrill } from '../lib/paretoFromLog';
import { buildAnalyseHash } from '../state/useRoute';
import { Sheet, SheetRow } from '../ui/Sheet';
import type { DimensionKey } from '../types';

/** The drill from a category bar: category first (it is the path), then the
 *  machine, the sub-category and the shift — the board's order after it. */
const DRILL_ORDER: DimensionKey[] = ['category', 'asset', 'subcategory', 'shift'];
import { usePaceLines } from '../lib/usePaceLines';
import { createWorkspace } from '../db';
import { paretoView, moveSentence, type ParetoMove } from '../lib/paretoView';

const pct = (n: number) => `${Math.round(n * 100)}%`;
const mins = (n: number) => (n >= 100 ? Math.round(n).toLocaleString() : String(Math.round(n * 10) / 10));

/* THE PARETO PICKS THE PROBLEMS (docs/SIXM.md, the working method, step 1).
 * On a 6M job a bar in the VITAL FEW carries "Find the root cause" as the
 * thing to press: it opens a problem with that bar as the head of the fish —
 * its category, the line losing the most to it, and the machine it is mostly
 * on — and goes to the fishbone. A bar OUTSIDE the vital few carries "Just do
 * it" — the board's action editor with the bar's words and line in it — and
 * still offers the root cause, quietly, behind "why does this one earn
 * one?" (lib/paretoPicks). Every bar used to offer the root cause equally,
 * which made a two-minute loss look like a fishbone's worth; nothing it could
 * do is gone. A bar that already has an open problem goes to that one
 * instead, so the same loss is never two problems. */
type Act = { label: string; go: () => void; tone: 'press' | 'quiet' | 'link' };

/** The row's own door — the line's drill for this category (HUNT 15). */
type Door = { label: string; go: () => void } | null;

function Row({ m, max, showMove, acts, on, door }: { m: ParetoMove; max: number; showMove: boolean; acts: Act[]; on?: boolean; door?: Door }) {
  const w = max > 0 ? (m.mins / max) * 100 : 0;
  return (
    <tr id={'bar-' + encodeURIComponent(m.category)}
      className={(m.vital ? 'is-vital' : '') + (m.verdict ? ' has-move is-' + m.verdict : '') + (on ? ' is-asked' : '') + (door ? ' is-door' : '')}
      /* THE WHOLE ROW IS THE DOOR, the category's button its keyboard way in.
         A tap on any button in the row (the root cause's, or the door's own)
         is that button's alone, so it never also opens the drill. */
      onClick={door ? e => { if (!(e.target as Element).closest('button, a')) door.go(); } : undefined}>
      <th scope="row">
        {door
          ? <button type="button" className="pr-door" onClick={door.go}>
              <span className="pr-cat">{m.category}</span>
              <span className="pr-on">{door.label} ›</span>
            </button>
          : <span className="pr-cat">{m.category}</span>}
        {/* The shading said "vital few" in colour alone; the words go with it. */}
        {(m.profile || m.vital) && <span className="pr-prof">{[m.profile, m.vital ? 'vital few' : ''].filter(Boolean).join(' · ')}</span>}
        {acts.length > 0 && (
          <span className="pr-acts">
            {acts.map(a => (
              <button key={a.label} type="button" className={'pr-rc is-' + a.tone} onClick={a.go}>
                {a.label}{a.tone === 'quiet' ? '' : ' ›'}
              </button>
            ))}
          </span>
        )}
      </th>
      <td className="pr-bar-cell">
        {/* The bar is the ranking. Everything else on the row is detail. */}
        <span className="pr-bar" style={{ width: `${w}%` }} aria-hidden />
        <span className="pr-mins">{mins(m.mins)}</span>
      </td>
      <td className="pr-n">{pct(m.share)}</td>
      <td className="pr-n pr-cum">{pct(m.cum)}</td>
      <td className="pr-n">{m.events}</td>
      <td className="pr-n">{Math.round(m.minPerEvent * 10) / 10}</td>
      {showMove && (
        <td className={'pr-move is-' + (m.verdict ?? 'flat')}>
          {m.verdict ? moveSentence(m) : '—'}
        </td>
      )}
    </tr>
  );
}

export function ParetoScreen({ projectId }: { projectId: string }) {
  const { loading, project } = useProject(projectId);
  const pareto = useProjectPareto(projectId);
  const lines = usePaceLines(projectId);
  /* THE EMPTY STATE CARRIES THE FIRST ACTION. With nothing timed, the page used
     to send you to the lines to find the door; now the door is here, one per
     line: it makes the line's study the first time (the same way the line's
     own screen does — lib/usePaceWorkspace) and opens the stopwatch. */
  const timeOn = async (l: { id: string; name: string; workspaceId?: string }) => {
    let ws = l.workspaceId;
    if (!ws) {
      ws = (await createWorkspace(l.name, 'food-packing')).id;
      await lines.editLine(l.id, { workspaceId: ws });
    }
    nav(`/w/${ws}/capture`);
  };
  const view = useMemo(
    () => (pareto.now ? paretoView(pareto.now, pareto.before) : null),
    [pareto.now, pareto.before],
  );
  const can = useAccess(projectId);
  const problems = useProblems(projectId);
  const asked = useRoute().query.get('bar');
  const [busy, setBusy] = useState(false);
  /* ?bar=<category> — opened from a cause on the fishbone: that bar, in view. */
  useEffect(() => {
    if (!asked || !view) return;
    document.getElementById('bar-' + encodeURIComponent(asked))?.scrollIntoView({ block: 'center' });
  }, [asked, view]);

  /** The line a bar is mostly on (byLine is keyed by the line's name). */
  const lineOfBar = (m: ParetoMove) => lineOfBarIn(m, lines.lines);
  const openFor = (m: ParetoMove) => problemOfBar(problems.problems, m.category, lineOfBar(m)?.id, true);
  /* The one way a bar becomes a problem (lib/paretoPicks) — the same one the
     Pareto pane on the fishbone page uses. `why`: the reason a bar outside
     the vital few earned it, kept on the problem. */
  const findRootCause = async (m: ParetoMove, why?: string) => {
    if (busy || !can.edit) return;
    setBusy(true);
    try {
      const line = lineOfBar(m);
      const c = await openBarProblem({
        category: m.category, line, problems: problems.problems, create: problems.create,
        why, title: problemTitleOfBar, same: sameSource,
      });
      nav(fishboneUrl(projectId, { line: c.lineId ?? line?.id, problem: c.id }));
    } finally { setBusy(false); }
  };
  const [asking, setAsking] = useState<ParetoMove | null>(null);
  const [action, setAction] = useState<Editing | null>(null);
  const justDoIt = (m: ParetoMove) => {
    if (!can.edit) return;
    setAction({ isNew: true, step: justDoItStep(m, { projectId, lineId: lineOfBar(m)?.id, id: uid(), now: Date.now() }) });
  };
  const sixM = !!project && planModel(project) === 'board';
  const actsOf = (m: ParetoMove): Act[] => {
    const pick = pickOf(m);
    if (!sixM || !pick) return [];
    const open = openFor(m);
    if (open) return [{ label: 'Its fishbone', tone: 'link', go: () => nav(fishboneUrl(projectId, { line: open.problem.lineId, problem: open.problem.id })) }];
    if (!can.edit) return [];
    return pick === 'root'
      ? [{ label: 'Find the root cause', tone: 'press', go: () => void findRootCause(m) }]
      : [{ label: 'Just do it', tone: 'press', go: () => justDoIt(m) },
         { label: 'Find the root cause', tone: 'quiet', go: () => setAsking(m) }];
  };

  /* THE ROW'S DOOR — the line's drill for this category (HUNT 15). It opens
     the line that lost the most minutes to it, because that is where the
     machines, sub-categories and shifts behind the bar are, and the same line
     "Find the root cause" files the problem on. When two lines lost the SAME
     minutes (as printed), "mostly" would be a coin toss dressed as a finding,
     so the row says so and asks which. Ranked by the next cut after category —
     the machine — over the drill's default window, the same last four weeks. */
  const [choosing, setChoosing] = useState<{ category: string; drills: BarDrill[] } | null>(null);
  const openDrill = (wsId: string, category: string) => nav(buildAnalyseHash(
    wsId, 'analyse', 'time', [{ dimension: 'category', value: drillCategory(category) }], DRILL_ORDER).slice(1));
  const doorOf = (m: ParetoMove): Door => {
    const d = barDrills(m.byLine, lines.lines, project?.walkWorkspaceId);
    if (!d.length) return null;
    const tie = isTie(d);
    const tied = tie ? d.filter(x => isTie([d[0], x])) : [];
    const label = d.length === 1 ? `on ${d[0].name}`
      : tie ? `on ${tied.map(x => x.name).join(' and ')}, equally`
      : `mostly on ${d[0].name}, also ${d.slice(1).map(x => x.name).join(', ')}`;
    return {
      label,
      go: () => (tie ? setChoosing({ category: m.category, drills: tied }) : openDrill(d[0].wsId, m.category)),
    };
  };

  if (loading || pareto.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/')}>Back to the control room</button>
      </div>
    );
  }

  return (
    <div className="wrap pace pr-screen">
      <Sweep id={'pareto:' + projectId} />
      <header className="pace-head">
        <div className="pace-head-main">
          <h1 className="pace-title">Pareto</h1>
          <p className="pace-lede">Where the time is going, ranked — the last four weeks against the four before.</p>
        </div>
        <div className="pace-head-actions">
          <button className="btn btn-ghost" onClick={() => window.print()}>Print</button>
        </div>
      </header>

      {!view ? (
        <div className="bd-empty">
          <p className="bd-empty-t">Nothing timed on the line in the last four weeks</p>
          <p className="sub">
            Time the stops on the floor — each one with its category and the stopwatch. They rank
            themselves here by what they cost.
          </p>
          {lines.lines.length > 0 ? (
            <div className="pr-empty-acts">
              {lines.lines.map(l => (
                <button key={l.id} className="btn btn-primary" onClick={() => void timeOn(l)}>Time a stop on {l.name}</button>
              ))}
            </div>
          ) : (
            <button className="btn btn-primary" style={{ marginTop: 16 }}
              onClick={() => nav(`/project/${projectId}/setup`)}>Add a line</button>
          )}
        </div>
      ) : (
        <>
          <p className="bs-src pr-src">
            Timed on the line{view.period && <> · covering <b>{view.period}</b></>}
            {' '}· {mins(view.totalMins)} minutes across {view.totalStops} stops
          </p>

          {/* THE FINDING, NOT THE TABLE. Somebody who reads one line should
              leave knowing where to aim. */}
          <div className="pr-vital">
            {(() => { const w = vitalWords(view, sixM); return (
              <p className="pr-vital-t"><b>{w.count}</b>{w.of}<b>{w.share}</b>{w.tail}</p>
            ); })()}
            {view.headline && <p className="pr-vital-s">{view.headline}</p>}
          </div>

          {/* Whether this page is allowed to talk about movement at all. */}
          <p className={'pr-cmp' + (view.comparable ? ' is-on' : '')}>
            {view.comparable
              ? <>Measured against <b>{view.beforePeriod}</b> — the four weeks before.
                  The right-hand column is the change.</>
              : view.whyNot}
          </p>

          <div className="pr-tablewrap">
            <table className="pr-table">
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Minutes lost</th>
                  <th scope="col">Share</th>
                  <th scope="col">Cum.</th>
                  <th scope="col">Stops</th>
                  <th scope="col">Min/stop</th>
                  {view.comparable && <th scope="col">Since {view.beforePeriod}</th>}
                </tr>
              </thead>
              <tbody>
                {view.rows.map(m => (
                  <Row key={m.category} m={m} max={view.rows[0]?.mins ?? 0} showMove={view.comparable}
                    acts={actsOf(m)} on={asked === m.category} door={doorOf(m)} />
                ))}
              </tbody>
            </table>
          </div>

          <p className="sub pr-foot-note">
            Shaded rows are the vital few — the categories that make up the first 80% of the lost time.
            {sixM && <> Each gets its own problem; a smaller loss is usually just done, as an action on the board.</>}
            {' '}The profile says whether a category is a few long stops or many short ones.
          </p>
        </>
      )}

      {choosing && (
        <Sheet open onClose={() => setChoosing(null)} title="Which line?">
          <p className="sub">{choosing.category} lost the same minutes on each. Open its drill on:</p>
          {choosing.drills.map(x => (
            <SheetRow key={x.wsId} label={x.name} hint={`${mins(x.mins)} min`}
              onClick={() => { setChoosing(null); openDrill(x.wsId, choosing.category); }} />
          ))}
        </Sheet>
      )}

      {asking && (
        <RootReasonSheet category={asking.category} onClose={() => setAsking(null)}
          onPick={why => { const m = asking; setAsking(null); void findRootCause(m, why); }} />
      )}
      {action && <ActionSheet editing={action} lines={lines.lines} onClose={() => setAction(null)} />}

      <footer className="pace-foot">
        <p>{project.name} · Pareto · from the stops timed on the line</p>
      </footer>
    </div>
  );
}
