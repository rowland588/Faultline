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
import { PageHeader } from '../../ui/parts';
import { EmptyState } from '../../ui/EmptyState';
import { LeanTiles } from '../../ui/Lean';
import { Fold } from '../../ui/Fold';
import { FactoryLineCard, useLineRates } from '../../ui/FactoryLineCard';
import { areaFromQuery, areaHref, areaSays, areaTiles } from '../../lib/areas';
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

const enc = encodeURIComponent;
/** ONE ROW OF CARDS A LINE, so the board stays a board and never a wall (docs/DESIGN.md — the calm check fails a page that got busier):
 *  five when that is all there are, else four and one card saying how many more are on the line's own Tools. */
export const CARDS_ROW = 5;
export function cardsShown<T>(cards: readonly T[]): { shown: T[]; more: number } {
  return cards.length <= CARDS_ROW ? { shown: [...cards], more: 0 } : { shown: cards.slice(0, CARDS_ROW - 1), more: cards.length - (CARDS_ROW - 1) };
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

export function AreaScreen({ route }: { route: Route }) {
  const q = route.query.toString();
  const area = useMemo(() => areaFromQuery(new URLSearchParams(q)), [q]);
  const { bundle, all, loading } = useAreaBundle(area);
  const rateOf = useLineRates();
  const looked = useLooking(useMemo(() => bundle?.lines.map(w => w.id) ?? [], [bundle]));
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
  const todo = bundle.actions.filter(a => a.kind !== 'program');
  const toProve = bundle.actions.filter(a => a.kind === 'program');
  const machineCount = bundle.parts.reduce((n, p) => n + p.kit.machines.filter(m => m.name.trim() && m.name.trim().toLowerCase() !== 'whole line').length, 0);

  return (
    <div className="wrap ar-page" data-area={bundle.title}>
      <PageHeader
        eyebrow={<span className="pl-eyebrow">{dept ? 'DEPARTMENT' : 'AREA'}{bundle.client ? ` · ${bundle.client.toUpperCase()}` : ''}</span>}
        title={bundle.title}
        state={{ tone: says.tone, word: says.tone === 'r' ? 'Needs you' : says.tone === 'a' ? 'Gaps to close' : says.tone === 'g' ? 'In hand' : 'Nothing yet' }}
        says={<span className={'ar-says is-' + says.tone}>{says.text}</span>}
        more={[{ label: 'Set up the lines', run: () => nav('/factory') }, { label: 'Every line', run: () => nav('/room') }]}
        papers={[{ label: 'Area report', for: 'Everything happening in the area — each line’s part, then the area together', make: () => nav(`${areaHref(area, true)}&save=1`), disabled: !bundle.lines.length }]}
      />
      <LeanTiles tiles={areaTiles(bundle.facts)} className="sg-tiles" />

      <section className="ar-sec" aria-label="What needs doing">
        <h2>What needs doing</h2>
        {todo.length
          ? <ul className="ar-rows ar-todo">{todo.map(a => <ActionRow key={a.key} a={a} />)}</ul>
          : <p className="sub">Nothing open on any line of the area — no problem open, no check owed.</p>}
      </section>

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
                const { shown: cards, more } = cardsShown(cardsOf(part?.items ?? []));
                return (
                  <li key={w.id}>
                    <FactoryLineCard w={w}
                      c={part ? { problems: { open: part.problems.open, critical: part.problems.critical, late: part.problems.late }, ...(top ? { worst: { what: top.what, ...(top.owner ? { owner: top.owner } : {}), ...(top.due ? { due: top.due } : {}), red: top.priority === 'critical' || top.late } } : {}) } : undefined}
                      machineSaid={named.length ? (k?.flow || named.map(m => (m.record?.oem ? `${m.name} (${m.record.oem})` : m.name)).join(' → ')) : 'No machines named yet'}
                      todo={k ? k.programs.length - k.proved : 0} late={k?.late ?? 0} dual={dualSaid(dualOf(w, prod))} rate={rateOf[w.id]} projects={projects || undefined}
                      looked={lk ? { text: lookingShort(lk), level: lk.level } : undefined} />
                    {cards.length > 0 && (
                      <ul className="ar-cards" aria-label={`What has been used on ${w.name}`}>
                        {cards.map(({ it, n }) => (
                          <li key={it.key}>
                            <button type="button" className={'ar-card is-' + it.tone} data-card={it.key} onClick={() => nav(itemHref(it, w.id))}>
                              <span className="ar-card-tool">{it.tool}{n > 1 ? ` · ${n}` : ''}</span>
                              <b className="ar-card-name">{it.name}</b>
                              {it.says && <span className={'ar-card-says is-' + it.tone}>{it.says}</span>}
                            </button>
                          </li>
                        ))}
                        {more > 0 && <li><button type="button" className="ar-card is-more" data-card-more onClick={() => nav(`/lines/${enc(w.id)}?view=tools`)}><b className="ar-card-name">{more} more on {w.name}</b><span className="ar-card-says">All its tools ›</span></button></li>}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
      </section>

      {dept && <WalkPhotos query={{ departmentId: dept.id }} title="Photos from walks" />}
      <section className="ar-sec" aria-label="Programs to prove">
        <h2>Programs to prove</h2>
        {toProve.length
          ? <ul className="ar-rows ar-prove">{toProve.map(a => <ActionRow key={a.key} a={a} />)}</ul>
          : <p className="sub">Every program on the area&rsquo;s lines is proved, or none is planned.</p>}
      </section>

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
        {bundle.bundles.flatMap(b => b.parts.map(p => {
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
    </div>
  );
}
