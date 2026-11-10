/* THE AREA REPORT — its page (9 November, src/line/report/areaBundle, areaBundlePdf). #/area/report?site=…&area=… (&client=),
 * reached from the area's Report ▾ and its section on the Lines tab with ?save=1 and made on arrival (lib/useSaveOnArrival), as the
 * line report is. It shows what the paper will hold: the band naming the client, site and area; the area's tiles and sentence;
 * each line of the area as its line report's summary shows a part, with a tick beside every tool record (the newest of each tool
 * in by default — lineBundle defaultPicks), a dual line's lines and then both lines together, once; then the area together. No AI:
 * every figure is a formula's. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Route } from '../../state/useRoute';
import { nav } from '../../state/useRoute';
import { PageHeader } from '../../ui/parts';
import { EmptyState } from '../../ui/EmptyState';
import { Fold } from '../../ui/Fold';
import { LeanActions, LeanBand, LeanClosing, LeanTiles } from '../../ui/Lean';
import { bandPage } from '../../lib/lean';
import { areaFromQuery, areaHref, areaSays, areaTiles } from '../../lib/areas';
import { lineTiles } from '../../lib/lineLean';
import { useSaveOnArrival } from '../../lib/useSaveOnArrival';
import { defaultPicks, problemsLine } from './lineBundle';
import { areaActionRows, areaBundleSays, partName } from './areaBundle';
import { areaBandFacts } from './areaBundlePdf';
import { useAreaBundle } from './useAreaBundle';
import { usePartReadings } from './usePartReadings';
import './lineReport.css';

const printedOn = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export function AreaReportScreen({ route }: { route: Route }) {
  const q = route.query.toString();
  const area = useMemo(() => areaFromQuery(new URLSearchParams(q)), [q]);
  const { bundle, rec, ctx, obs, jobsOn, today, loading } = useAreaBundle(area);
  const parts = useMemo(() => bundle?.parts ?? [], [bundle]);
  const { readings, programs } = usePartReadings(parts, obs, jobsOn, rec, today);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);

  /* WHAT GOES IN — the newest of each tool on each line by default; a tick adds or takes one off */
  const [picks, setPicks] = useState<Set<string> | null>(null);
  const keys = useMemo(() => parts.flatMap(p => p.items.map(i => i.key)).join('|'), [parts]);
  useEffect(() => { if (bundle && picks === null) setPicks(new Set(parts.flatMap(p => [...defaultPicks(p.items)]))); }, [bundle, parts, keys, picks]);
  const on = picks ?? new Set<string>();
  const toggle = (k: string) => setPicks(s => { const n = new Set(s ?? on); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const make = useCallback(async () => {
    if (!bundle || busy || picks === null) return;
    setBusy(true); setSaid(null);
    try {
      const [{ loadPdfLib, deliverPdf, titlePdf }, { drawAreaBundle }, { capacityPapersFor }, { pdfFileName }] = await Promise.all([import('../../lib/savePdf'), import('./areaBundlePdf'), import('../../tools/linebalance/capacityPaperLoad'), import('../../lib/fileName')]);
      const { jsPDF } = await loadPdfLib();
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      titlePdf(doc, `${bundle.title} — the area report, everything happening in the area`);
      const printed = printedOn();
      const caps = parts.flatMap(p => p.items.flatMap(i => (picks.has(i.key) && i.key.startsWith('capacity:') && i.standard ? [i.standard] : [])));
      const papers = await capacityPapersFor(caps, printed);
      await drawAreaBundle(doc, { area: bundle, picks, printed, readings, programs, standards: rec.standards, ctx, capacity: new Map(caps.map((s, i) => [s.id, papers[i]])) });
      const how = await deliverPdf(doc, pdfFileName(bundle.title.replace(/›/g, '-'), 'area-report', today));
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      console.error('area report failed', e);
      setSaid('The report could not be made — try again.');
    } finally { setBusy(false); }
  }, [bundle, busy, picks, parts, readings, programs, rec.standards, ctx, today]);
  useSaveOnArrival(!!bundle && picks !== null && !loading && bundle.lines.length > 0, make);

  if (!area) return <div className="wrap pl lr"><EmptyState title="No area named">This address names no area. <button type="button" className="cw-link" onClick={() => nav('/room')}>The factory&rsquo;s lines ›</button></EmptyState></div>;
  if (loading || !bundle) return <div className="wrap pl lr"><p className="sub">Opening…</p></div>;

  const says = areaSays(bundle.facts);
  const band = bandPage('AREA · THE AREA REPORT — EVERYTHING HAPPENING IN THE AREA', { name: bundle.title }, says.tone === 'r' ? 'Needs you' : says.tone === 'a' ? 'Gaps to close' : 'In hand', says.tone, areaBandFacts(bundle, on.size));

  return (
    <div className="wrap pl lr ar-report" data-area={bundle.title}>
      <PageHeader
        eyebrow={<span className="pl-eyebrow">AREA · THE AREA REPORT</span>}
        title={`${bundle.title} — everything happening in the area`}
        says={<span className="pl-says">{areaBundleSays(bundle, on)}. Tick what goes in; the newest of each tool on each line is in already. Each line&rsquo;s own report stays where it was.</span>}
        primary={{ label: 'Download', disabled: busy || picks === null || !bundle.lines.length, run: () => void make() }}
        more={[{ label: 'The area', run: () => nav(areaHref(bundle.area)) }]}
      />
      {said && <p className="tc-ok lr-said" role="status">{said}</p>}
      <LeanBand page={{ ...band, facts: [...band.facts, ['Printed', printedOn()]] }} />
      <LeanTiles tiles={areaTiles(bundle.facts)} className="sg-tiles" />
      <p className={'fac-area-says is-' + says.tone}>{says.text}</p>
      {!bundle.lines.length && <EmptyState title="No line in this area">No line says it is in {bundle.title}.</EmptyState>}

      {bundle.bundles.map(b => (
        <div key={b.line.id} className="ar-rep-line" data-line={b.line.name}>
          {b.parts.length > 1 && <h2 className="ar-rep-dual">{b.line.name} <span className="sub">· a dual line, its lines and then both together</span></h2>}
          {b.parts.map(part => {
            const reading = readings.get(part.line.id);
            const pr = programs.get(part.line.id);
            const inHere = part.items.filter(i => on.has(i.key)).length;
            return (
              <Fold key={part.line.id} id={`ar-rep-${part.line.id}`} start={false}
                title={part.title === 'Both lines together' ? `Both lines together — what was run on ${b.line.name} itself` : part.title}
                says={`${problemsLine(part)} · ${inHere} of ${part.items.length} tool record${part.items.length === 1 ? '' : 's'} going in`}>
              <section className="lr-part lr-lean" aria-label={partName(b, part)} data-part={part.line.name}>
                {reading && <LeanTiles tiles={lineTiles(reading)} className="sg-tiles" />}
                <h3 className="lr-h">Problems and programs</h3>
                <p className="sub">{problemsLine(part)} · {pr?.says ?? 'no program planned'}</p>
                <h3 className="lr-h">Who owes what by when</h3>
                <LeanActions actions={part.actions} empty="Nothing owed on this line — no problem open, every program proved." />
                <h3 className="lr-h">What goes in</h3>
                {part.items.length === 0
                  ? <p className="sub">No tool used on this line yet — its problems and programs still go in.</p>
                  : (
                    <ul className="lr-ticks" aria-label={`What goes in for ${partName(b, part)}`}>
                      {part.items.map(it => (
                        <li key={it.key}>
                          <label className="lr-tick">
                            <input type="checkbox" checked={on.has(it.key)} aria-label={`${it.tool} — ${it.name}`} onChange={() => toggle(it.key)} />
                            <span><b>{it.tool}</b> — {it.name}<span className={'sub' + (it.tone === 'r' ? ' is-r' : it.tone === 'a' ? ' is-a' : '')}>{it.says}</span></span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
              </section>
              </Fold>
            );
          })}
        </div>
      ))}

      {bundle.lines.length > 0 && (
        <section className="lr-part ar-together" aria-label="The area together">
          <h2>The area together</h2>
          <h3 className="lr-h">Who owes what by when, across the area</h3>
          <LeanActions actions={areaActionRows(bundle)} empty="Nothing owed in the area — no problem open, every program proved." />
          <h3 className="lr-h">Projects on its lines</h3>
          {bundle.projects.length
            ? <ul className="ar-rows">{bundle.projects.map(j => <li key={j.id} className="sub">{j.name} — on {j.lines.join(', ')}</li>)}</ul>
            : <p className="sub">No project on any line of the area.</p>}
        </section>
      )}
      {bundle.lines.length > 0 && <LeanClosing closing={says} />}
    </div>
  );
}
