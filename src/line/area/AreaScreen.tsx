/* AN AREA OF THE FACTORY — its own page (9 November — Rowland: "we now have areas in set up. So on factory page we need area.. then
 * each area will have lines in them we need area reports show everything happening in the area").
 *
 * #/area?site=…&area=… (&client= when the lines name more than one client) — a page of the FACTORY scope, opened from the area's
 * section on the Lines tab, which it lights; the context bar says Factory › <site › area>. An area is a group of lines, never a
 * record (lib/areas), so this page holds nothing of its own: it reads the area's lines as their own pages read them
 * (src/line/report/areaBundle — the line report's parts) and answers the four questions in order (docs/LOOK.md): what's going
 * wrong — the area in a sentence and its tiles, its lines as the board's cards; what needs doing — every open problem and owed check
 * on its lines, the late first, each naming its line and opening its record, and the programs to prove; who's responsible — on
 * every row; did it work — the projects on its lines. Then its machines, line by line. Report ▾ holds the Area report.
 *
 * THE AREA IS A BOARD OF CARDS (14 November — Rowland: "It just needs to be cards … it's a card, it's a location, it's a point to say these
 * things live in this area. Click on if you want to then follow through with them … beautiful cards, real simple"; "clean, not mess — clear
 * visual navigation"). Under each line, a small card for every tool in use on it — the tool, the record's name, its one sentence, its state
 * on the card's edge — and the card is the door to that record, where the work is followed through. It replaces the fold that listed the
 * same records as rows: one card a tool a line (the newest record), one row a line, the rest on the line's own Tools. Nothing is worked out here — a card
 * says what the record's own list says of it (lineBundle BundleItem). */
import { useEffect, useMemo, useState } from 'react';
import type { Route } from '../../state/useRoute';
import { nav } from '../../state/useRoute';
import { MoreMenu, PageHeader } from '../../ui/parts';
import { APP_TOOLS } from '../../catalogue/registry';
import { ensureAreaPlace } from '../../lib/areaPlace';
import { openQuickSnag } from '../../snag/QuickSnag';
import { EmptyState } from '../../ui/EmptyState';
import { Fold } from '../../ui/Fold';
import { FactoryLineCard, useLineRates } from '../../ui/FactoryLineCard';
import { areaFromQuery, areaHref, areaSays, type AreaId } from '../../lib/areas';
import { QuestionCards, QuestionPanels } from '../../ui/FactoryQuestions';
import { useScopeQuestions } from '../../lib/useScopeQuestions';
import { departmentFor, type Department } from '../../lib/departments';
import { listDepartments } from '../../db/departments';
import { onDataChange } from '../../db';
import { WalkPhotos } from '../../ui/WalkPhotos';
import { dualOf, dualSaid, productionLines } from '../../lib/lines';
import { studyHref } from '../../lib/studyLinks';
import { useLooking } from '../../tools/gemba/useLooking';
import { lookingShort } from '../../tools/gemba/looking';
import { useAreaBundle } from '../report/useAreaBundle';
import { partName, type AreaAction } from '../report/areaBundle';
import type { BundleItem } from '../report/lineBundle';
import { cardActions, failedCard, failedPrograms, problemsCard, type LineCard } from '../../lib/cardActions';
import { lineProgramsReading } from '../../lib/lineRecords';
import { PlaceReports } from '../../ui/PlaceReports';
import { pdfFileName } from '../../lib/fileName';

const enc = encodeURIComponent;
/** ONE ROW OF CARDS A LINE, so the board stays a board and never a wall (docs/DESIGN.md — the calm check fails a page that got busier):
 *  five when that is all there are, else four and one card saying how many more are on the line's own Tools. */
export const CARDS_ROW = 5;
export function cardsShown<T>(cards: readonly T[], room = CARDS_ROW): { shown: T[]; more: number } {
  const r = Math.max(1, room);
  return cards.length <= r ? { shown: [...cards], more: 0 } : { shown: cards.slice(0, r - 1), more: cards.length - (r - 1) };
}

/** A line's cards: one a tool in use, its newest record, newest first — and how many records of that tool the line holds. */
export function cardsOf(items: readonly BundleItem[]): { it: BundleItem; n: number }[] {
  const by = new Map<string, { it: BundleItem; n: number }>();
  for (const it of items) { const e = by.get(it.tool); if (!e) by.set(it.tool, { it, n: 1 }); else { e.n += 1; if (it.at > e.it.at) e.it = it; } }
  return [...by.values()].sort((a, b) => b.it.at - a.it.at);
}

/** Where a tool record opens — a study its own page, a product's Line capacity or its line standard on the line's products. */
function itemHref(it: BundleItem, wsId: string): string {
  if (it.study) return studyHref(it.study);
  if (it.standard) return `/w/${enc(wsId)}/standards/${enc(it.standard.id)}${it.key.startsWith('capacity:') ? '?at=balance' : ''}`;
  return `/lines/${enc(wsId)}?view=tools`;
}

function ActionRow({ a }: { a: AreaAction }) {
  return (
    <li>
      <button type="button" className={'ar-row is-' + a.tone} data-kind={a.kind} data-line={a.line} onClick={() => nav(a.to)}>
        <span className="ar-row-what">{a.what}</span>
        <span className={'ar-row-state' + (a.tone === 'r' ? ' is-r' : '')}>{a.state}{a.due ? ` · ${a.due}` : ''}</span>
        <span className="ar-row-meta">{a.line} · {a.who ?? 'nobody yet'}{a.from ? ` · ${a.from}` : ''}</span>
      </button>
    </li>
  );
}

/* THE AREA ITSELF (15 November, docs/AREAS.md A4): a problem raised or a tool started in the area, on no line — held on the area's own
   place (lib/areaPlace), made the first time it is wanted and never before */
const raiseInArea = (a: AreaId) => void ensureAreaPlace(a).then(w => openQuickSnag(undefined, { said: `${a.area} itself`, area: a.area, workspaceId: w.id }));
const startInArea = (a: AreaId, to: string) => void ensureAreaPlace(a).then(w => nav(`${to}?line=${encodeURIComponent(w.id)}`));
const AREA_TOOLS = APP_TOOLS.filter(t => t.kind === 'study' || t.kind === 'document');

export function AreaScreen({ route }: { route: Route }) {
  const q = route.query.toString();
  const area = useMemo(() => areaFromQuery(new URLSearchParams(q)), [q]);
  /* ITS OWN TABS — Overview · Tools · Reports (16 November, docs/NAV.md N2), drawn by the frame (ui/rail areaTabs) */
  const view = route.query.get('view') === 'tools' ? 'tools' : route.query.get('view') === 'reports' ? 'reports' : 'overview';
  const { bundle, all, loading, rec, snags, today } = useAreaBundle(area);
  const rateOf = useLineRates();
  const looked = useLooking(useMemo(() => bundle?.lines.map(w => w.id) ?? [], [bundle]));
  /* THE FOUR ANSWERS FOR THE AREA (15 November) — the Factory's own, counted from the area's lines only (lib/useScopeQuestions) */
  /* the area's own place counts with its lines (docs/AREAS.md A4) */
  const scoped = useMemo(() => (bundle ? [...bundle.lines, ...(bundle.place ? [bundle.place.line] : [])] : undefined), [bundle]);
  const questions = useScopeQuestions(scoped);
  /* THE DEPARTMENT OF THESE WORDS, when it is a record (10 November, docs/FACTORY-WALK.md, lib/departments) — Dispatch with no line */
  const [dept, setDept] = useState<Department | undefined>();
  useEffect(() => {
    let live = true;
    const load = () => void listDepartments().then(l => { if (live) setDept(area ? departmentFor(l, area) : undefined); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [area]);

  if (!area) return <div className="wrap ar-page"><EmptyState title="No area named">This address names no area. <button type="button" className="cw-link" onClick={() => nav('/room')}>The factory&rsquo;s lines ›</button></EmptyState></div>;
  if (loading || !bundle) return <div className="wrap ar-page"><p className="sub">Opening…</p></div>;

  const says = areaSays(bundle.facts);
  const prod = productionLines(all ?? []);
  const checks = bundle.actions.filter(a => a.kind === 'check');
  const toProve = bundle.actions.filter(a => a.kind === 'program');
  const machineCount = bundle.parts.reduce((n, p) => n + p.kit.machines.filter(m => m.name.trim() && m.name.trim().toLowerCase() !== 'whole line').length, 0);

  return (
    <div className="wrap ar-page" data-area={bundle.title}>
      <PageHeader
        eyebrow={<span className="pl-eyebrow">{dept ? 'DEPARTMENT' : 'AREA'}{bundle.client ? ` · ${bundle.client.toUpperCase()}` : ''}</span>}
        title={bundle.title}
        primary={{label:'Create action',run:()=>void ensureAreaPlace(area).then(w=>openQuickSnag(undefined,{intent:'action',said:bundle.title,area:area.area,workspaceId:w.id}))}}
        state={{ tone: says.tone, word: says.tone === 'r' ? 'Needs you' : says.tone === 'a' ? 'Gaps to close' : says.tone === 'g' ? 'In hand' : 'Nothing yet' }}
        says={<span className={'ar-says is-' + says.tone}>{bundle.lines.length ? `${bundle.lines.length} ${bundle.lines.length === 1 ? 'line' : 'lines'} — open a line for its machines, programs and work.` : 'Work held in this area.'}</span>}
        more={[{ label: 'Raise a problem here', run: () => raiseInArea(area) }, { label: 'Set up the lines', run: () => nav('/factory') }, { label: 'Every line', run: () => nav('/room') }]}
      />
      {view === 'tools' && <AreaTools area={area} bundle={bundle} snags={snags} />}
      {view === 'reports' && (
        <PlaceReports label={`Reports on ${bundle.title}`}
          match={k => k.page === '#/area/report' && k.name.startsWith(pdfFileName(bundle.title.replace(/›/g, '-'), 'area-report', '').replace(/\.pdf$/, ''))}
          rows={[{
            key: 'summary', title: 'Summary', says: 'The main findings, next actions with owners and dates, and results verified.',
            primary: { label: 'Download', disabled: !questions, run: () => { if (questions) void import('../report/areaSummary').then(m => m.saveAreaSummary(bundle, questions)).catch(e => window.alert(`The summary could not be made: ${e instanceof Error ? e.message : 'try again'}`)); } },
          }, {
            key: 'everything', title: 'Everything',
            says: 'The area report — each line’s part with every record on it, then the area together. Untick what should not go.',
            primary: { label: 'Download', run: () => nav(`${areaHref(area, true)}&save=1`), disabled: !bundle.parts.length },
            other: { label: 'Choose what goes in', run: () => nav(areaHref(area, true)) },
          }]} />
      )}
      {view === 'overview' && <>
      {/* THE FOUR ANSWERS (15 November — agreed 14 November): what's going wrong, what needs doing, who, did it work — the Factory's
          cards and answers for this area's lines alone. They replace the area's five tiles, whose counts (lines, programs, projects,
          tools used) the sentence above says; the rows that were "What needs doing" are the answers' own (the problems, every action
          open with who and by when), and the owed checks stand under What needs doing as before. */}
      <section className="ar-sec fq-lines fac-home ep-panel" aria-label="Its lines">
        <h2>Its lines</h2>
        {!bundle.lines.length
          ? (dept
            ? <EmptyState title="No lines in it yet">{dept.facts.area} is a department of its own — its lines, machines and photos join it as they are found. <button type="button" className="cw-link" onClick={() => nav('/factory')}>Set up the lines ›</button></EmptyState>
            : <EmptyState title="No line in this area">No line says it is in {bundle.title}. <button type="button" className="cw-link" onClick={() => nav('/factory')}>Set up the lines ›</button></EmptyState>)
          : (
            <ul className="fac-floor" aria-label={`The lines in ${bundle.title}`}>
              {bundle.lines.map(w => {
                const part = bundle.parts.find(p => p.line.id === w.id);
                const top = part?.problems.rows[0];
                const k = part?.kit;
                const named = (k?.machines ?? []).filter(m => m.name.trim() && m.name.trim().toLowerCase() !== 'whole line');
                const lk = looked?.find(x => x.id === w.id)?.looking;
                const projects = bundle.projects.filter(j => j.lines.includes(w.name)).map(j => j.name).join(', ');
                /* A3 (15 November, docs/AREAS.md): the line's own cards first — its open problems, its tests that did not pass — then a card
                   a tool, each saying how its actions stand (the problems it holds, lib/cardActions); the row stays one row */
                const own: LineCard[] = part ? [
                  problemsCard({ open: part.problems.open, late: part.problems.late, critical: part.problems.critical, ...(top ? { worst: top.what } : {}) }),
                  failedCard(part.kit.programs.length ? failedPrograms(part.kit.programs, rec.provingTests, lineProgramsReading([{ id: w.id, name: w.name, machines: part.kit.machines, programs: part.kit.programs }], today, { tests: rec.provingTests, studies: rec.studies })) : []),
                ].filter((c): c is LineCard => !!c) : [];
                const { shown: cards, more } = cardsShown(cardsOf(part?.items ?? []), CARDS_ROW - own.length);
                return (
                  <li key={w.id}>
                    <FactoryLineCard w={w}
                      c={part ? { problems: { open: part.problems.open, critical: part.problems.critical, late: part.problems.late }, ...(top ? { worst: { what: top.what, ...(top.owner ? { owner: top.owner } : {}), ...(top.due ? { due: top.due } : {}), red: top.priority === 'critical' || top.late } } : {}) } : undefined}
                      machineSaid={named.length ? (k?.flow || named.map(m => (m.record?.oem ? `${m.name} (${m.record.oem})` : m.name)).join(' → ')) : 'No machines named yet'}
                      todo={k ? k.programs.length - k.proved : 0} late={k?.late ?? 0} dual={dualSaid(dualOf(w, prod))} rate={rateOf[w.id]} projects={projects || undefined}
                      looked={lk ? { text: lookingShort(lk), level: lk.level } : undefined} />
                    {(cards.length > 0 || own.length > 0) && (
                      <ul className="ar-cards" aria-label={`What has been used on ${w.name}`}>
                        {own.map(c => (
                          <li key={c.key}>
                            <button type="button" className={'ar-card is-line is-' + c.tone} data-line-card={c.key} onClick={() => nav(c.key === 'problems' ? `/snags?line=${enc(w.id)}` : `/programs?line=${enc(w.id)}`)}>
                              <span className="ar-card-tool">{c.tool}</span>
                              <b className={'ar-card-name' + (c.tone === 'r' ? ' is-r' : '')}>{c.name}</b>
                              {c.says && <span className="ar-card-says">{c.says}</span>}
                            </button>
                          </li>
                        ))}
                        {cards.map(({ it, n }) => {
                          const acts = it.study ? cardActions(snags, it.study.id) : undefined;
                          return (
                            <li key={it.key}>
                              <button type="button" className={'ar-card is-' + it.tone} data-card={it.key} onClick={() => nav(itemHref(it, w.id))}>
                                <span className="ar-card-tool">{it.tool}{n > 1 ? ` · ${n}` : ''}</span>
                                <b className="ar-card-name">{it.name}</b>
                                {it.says && <span className={'ar-card-says is-' + it.tone}>{it.says}</span>}
                                {acts && <span className={'ar-card-acts is-' + acts.tone} data-card-acts>{acts.text}</span>}
                              </button>
                            </li>
                          );
                        })}
                        {more > 0 && <li><button type="button" className="ar-card is-more" data-card-more onClick={() => nav(`/lines/${enc(w.id)}?view=tools`)}><b className="ar-card-name">{more} more on {w.name}</b><span className="ar-card-says">All its tools ›</span></button></li>}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
      </section>

      <div className="ar-four"><QuestionCards q={questions} /></div>
      <QuestionPanels records={rec} q={questions} lines={null} scope={{
        /* three rows an answer, as the Factory shows them, the rest in place; Did it work drawn once a fix is proved (its card says none) */
        only: questions?.worked.proved.length ? ['wrong', 'doing', 'worked'] : ['wrong', 'doing'],
        all: { wrong: null, doing: null }, limit: 3,
        doingExtra: checks.length ? (
          <div className="ar-checks">
            <Fold id="area-checks" title="Checks owed" start={false} says={`${checks.length} check${checks.length === 1 ? '' : 's'} owed${checks.some(a => a.tone === 'r') ? ` · ${checks.filter(a => a.tone === 'r').length} overdue` : ''}`}>
              <ul className="ar-rows ar-todo">{checks.map(a => <ActionRow key={a.key} a={a} />)}</ul>
            </Fold>
          </div>
        ) : null,
      }} />


      {/* IN THE AREA ITSELF (15 November, docs/AREAS.md A4 — "an area able to hold its own problems, tools and actions — so Dispatch, an
          area with no lines, works"): what is held in the area on no line, as a line's cards are drawn — its problems, its tests, a card a
          tool with its actions — and the two ways in. Open on arrival for an area with no line (it is all the area has); folded otherwise. */}
      {(() => {
        const pl = bundle.place;
        const name = area.area;
        const ownCards: LineCard[] = pl ? [problemsCard({ open: pl.part.problems.open, late: pl.part.problems.late, critical: pl.part.problems.critical, ...(pl.part.problems.rows[0] ? { worst: pl.part.problems.rows[0].what } : {}) })].filter((c): c is LineCard => !!c) : [];
        const toolCards = pl ? cardsOf(pl.part.items) : [];
        const held = ownCards.length + toolCards.length;
        const body = (
          <section className="ar-sec ar-itself" aria-label={`In ${name} itself`} data-area-itself>
            {held === 0
              ? <p className="sub">Nothing is held in {name} itself yet — a problem or a study that belongs to the area and to no line of it goes here.</p>
              : (
                <ul className="ar-cards is-itself" aria-label={`What is held in ${name} itself`}>
                  {ownCards.map(c => (
                    <li key={c.key}><button type="button" className={'ar-card is-line is-' + c.tone} data-line-card={c.key} onClick={() => pl && nav(`/snags?line=${enc(pl.line.id)}`)}>
                      <span className="ar-card-tool">{c.tool}</span><b className={'ar-card-name' + (c.tone === 'r' ? ' is-r' : '')}>{c.name}</b>{c.says && <span className="ar-card-says">{c.says}</span>}
                    </button></li>
                  ))}
                  {toolCards.map(({ it, n }) => {
                    const acts = it.study ? cardActions(snags, it.study.id) : undefined;
                    return (
                      <li key={it.key}><button type="button" className={'ar-card is-' + it.tone} data-card={it.key} onClick={() => pl && nav(itemHref(it, pl.line.id))}>
                        <span className="ar-card-tool">{it.tool}{n > 1 ? ` · ${n}` : ''}</span><b className="ar-card-name">{it.name}</b>
                        {it.says && <span className={'ar-card-says is-' + it.tone}>{it.says}</span>}
                        {acts && <span className={'ar-card-acts is-' + acts.tone} data-card-acts>{acts.text}</span>}
                      </button></li>
                    );
                  })}
                </ul>
              )}
            <div className="ar-itself-acts">
              <button type="button" className="btn" data-raise-in-area onClick={() => raiseInArea(area)}>Raise a problem here</button>
              <MoreMenu label="Start a tool here" items={AREA_TOOLS.map(t => ({ label: t.label, run: () => startInArea(area, t.to) }))} />
            </div>
          </section>
        );
        return bundle.lines.length
          ? <Fold id="area-itself" title={`In ${name} itself`} start={false} says={held ? `${held} card${held === 1 ? '' : 's'} — work held in the area, on no line` : 'Nothing yet — raise a problem or start a tool here'}>{body}</Fold>
          : <><h2 className="ar-itself-h">In {name} itself</h2>{body}</>;
      })()}
      {dept && <WalkPhotos query={{ departmentId: dept.id }} title="Photos from walks" />}
      {/* PROGRAMS TO PROVE — in a fold since 15 November, shut on arrival with how many and how many late (docs/DESIGN.md: the four
          answers came in above, so the page is no busier — what leaves the first view moves into a fold) */}
      <Fold id="area-prove" title="Programs to prove" start={false}
        says={toProve.length ? `${toProve.length} program${toProve.length === 1 ? '' : 's'} to prove${toProve.some(a => a.tone === 'r') ? ` · ${toProve.filter(a => a.tone === 'r').length} late` : ''}` : 'Every program proved, or none planned'}>
        <section className="ar-sec" aria-label="Programs to prove">
          {toProve.length
            ? <ul className="ar-rows ar-prove">{toProve.map(a => <ActionRow key={a.key} a={a} />)}</ul>
            : <p className="sub">Every program on the area&rsquo;s lines is proved, or none is planned.</p>}
        </section>
      </Fold>

      <Fold id="area-projects" title="Projects on its lines" start={false} says={bundle.projects.length ? `${bundle.projects.length} project${bundle.projects.length === 1 ? '' : 's'} — ${bundle.projects.slice(0, 2).map(j => j.name).join(', ')}${bundle.projects.length > 2 ? ' …' : ''}` : 'None on its lines'}>
        <section className="ar-sec" aria-label="Projects on its lines">
        {bundle.projects.length
          ? <ul className="ar-rows ar-projects">{bundle.projects.map(j => (
            <li key={j.id}><button type="button" className="ar-row" onClick={() => nav(`/project/${j.id}`)}><span className="ar-row-what">{j.name}</span><span className="ar-row-meta">on {j.lines.join(', ')}</span></button></li>
          ))}</ul>
          : <p className="sub">No project on any line of the area.</p>}
      </section>
      </Fold>

      <Fold id="area-machines" title="Its machines, line by line" start={false} says={`${machineCount} machine${machineCount === 1 ? '' : 's'} on ${bundle.lines.length} line${bundle.lines.length === 1 ? '' : 's'}`}>
        <section className="ar-sec" aria-label="Its machines">
        {bundle.bundles.filter(b => b.line.id !== bundle.place?.line.id).flatMap(b => b.parts.map(p => {
          const ms = p.kit.machines.filter(m => m.name.trim() && m.name.trim().toLowerCase() !== 'whole line');
          return (
            <div key={p.line.id} className="ar-line">
              <h3 className="ar-line-h">{partName(b, p)}</h3>
              {ms.length
                ? <ul className="ar-machines">{ms.map(m => <li key={m.name}><button type="button" className="chip" onClick={() => nav(`/lines/${enc(p.line.id)}/machine/${enc(m.name)}`)}>{m.name}</button></li>)}</ul>
                : <p className="sub">No machines named yet.</p>}
            </div>
          );
        }))}
      </section>
      </Fold>
      </>}
    </div>
  );
}

/* THE AREA'S TOOLS TAB (16 November, docs/NAV.md N2 — "I couldn't even get onto tools properly"): every tool record on its lines, a card
   each, line by line — the same cards the overview's board draws, none held back — what is held in the area itself, and the two ways to
   start one: here in the area, or the whole library. */
function AreaTools({ area, bundle, snags }: { area: AreaId; bundle: NonNullable<ReturnType<typeof useAreaBundle>['bundle']>; snags: ReturnType<typeof useAreaBundle>['snags'] }) {
  const card = (it: BundleItem, n: number, wsId: string) => {
    const acts = it.study ? cardActions(snags, it.study.id) : undefined;
    return (
      <li key={it.key}>
        <button type="button" className={'ar-card is-' + it.tone} data-card={it.key} onClick={() => nav(itemHref(it, wsId))}>
          <span className="ar-card-tool">{it.tool}{n > 1 ? ` · ${n}` : ''}</span>
          <b className="ar-card-name">{it.name}</b>
          {it.says && <span className={'ar-card-says is-' + it.tone}>{it.says}</span>}
          {acts && <span className={'ar-card-acts is-' + acts.tone} data-card-acts>{acts.text}</span>}
        </button>
      </li>
    );
  };
  const pl = bundle.place;
  return (
    <section className="ar-sec ar-tools" aria-label={`Tools in ${bundle.title}`} data-area-tools>
      <div className="ar-tools-acts">
        <MoreMenu label="Start a tool here" items={AREA_TOOLS.map(t => ({ label: t.label, run: () => startInArea(area, t.to) }))} />
        <button type="button" className="btn" data-all-tools onClick={() => nav('/tools')}>All tools</button>
      </div>
      {bundle.lines.map(w => {
        const part = bundle.parts.find(p => p.line.id === w.id);
        const cards = cardsOf(part?.items ?? []);
        return (
          <div key={w.id} className="ar-line" data-area-tools-line={w.name}>
            <h3 className="ar-line-h"><button type="button" className="linkish" onClick={() => nav(`/lines/${enc(w.id)}?view=tools`)}>{w.name} ›</button></h3>
            {cards.length
              ? <ul className="ar-cards" aria-label={`Tools used on ${w.name}`}>{cards.map(({ it, n }) => card(it, n, w.id))}</ul>
              : <p className="sub">No tool used on {w.name} yet.</p>}
          </div>
        );
      })}
      {pl && cardsOf(pl.part.items).length > 0 && (
        <div className="ar-line" data-area-tools-line={`${area.area} itself`}>
          <h3 className="ar-line-h">In {area.area} itself</h3>
          <ul className="ar-cards">{cardsOf(pl.part.items).map(({ it, n }) => card(it, n, pl.line.id))}</ul>
        </div>
      )}
      {!bundle.lines.length && !pl && <p className="sub">No line in {bundle.title} yet — start a tool here and it is held in the area itself.</p>}
    </section>
  );
}
