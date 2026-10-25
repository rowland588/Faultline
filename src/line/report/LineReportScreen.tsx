/* THE LINE REPORT — EVERYTHING ON THE LINE (23 October; lib/lineBundle, lib/
 * lineBundlePdf). Rowland: "I do a capability test. I do a line balance. I do
 * capacity ... three different tools, but it's on the same line ... I want to
 * be able to provide an immersive combined report ... including even programs
 * ... but still give the flexibility to do single reports."
 *
 * The line's own report page (#/lines/:ws/report), reached from the line's
 * Report ▾ with ?save=1 and made on arrival (lib/useSaveOnArrival), as the
 * stage gate's status report is. It shows what the paper will hold, part by
 * part — a line, or each line a dual line is made of and then both together
 * — with a tick beside every tool's record (the newest of each tool in by
 * default), where on the line each finding points, and who owes what by
 * when; Download makes the paper from the same shape. The single reports
 * stay where they were. No AI: every figure is a formula's. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Workspace } from '../../types';
import type { Snag } from '../../snag/types';
import type { Observation } from '../../types';
import { getWorkspace, listAllSnags, listObservations, listWorkspaces, onDataChange, projectsOnWorkspace } from '../../db';
import { useLineRecords } from '../../lib/useLineRecords';
import { projectsOnLines, stageOnlyByLine, useJobFloor } from '../../lib/useJobFloor';
import { lineProgramsReading } from '../../lib/lineRecords';
import { bundleSays, defaultPicks, lineBundle, picksForTools, whereFor, type LineBundle } from './lineBundle';
import { toolByKey } from '../../catalogue/registry';
import type { LineReading } from '../../lib/lineLean';
import { lineClosing, lineTiles } from '../../lib/lineLean';
import { lineDay } from '../../lib/lineLoss';
import { dualOf, linesSaid, productionLines } from '../../lib/lines';
import { todayISO } from '../../lib/weeks';
import { useSaveOnArrival } from '../../lib/useSaveOnArrival';
import { PageHeader } from '../../ui/parts';
import { LeanActions, LeanClosing, LeanTiles } from '../../ui/Lean';
import { stopsOf } from '../../screens/ProductionLineScreen';
import { nav } from '../../state/useRoute';

const printedOn = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export function LineReportScreen({ wsId }: { wsId: string }) {
  const rec = useLineRecords();
  const [line, setLine] = useState<Workspace | null | undefined>(undefined);
  const [all, setAll] = useState<Workspace[]>([]);
  const [snags, setSnags] = useState<Snag[]>([]);
  const [obs, setObs] = useState<Map<string, Observation[]>>(new Map());
  const [jobsOn, setJobsOn] = useState<Map<string, number>>(new Map());
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const today = todayISO();

  const load = useCallback(async () => {
    const [w, ws, every] = await Promise.all([getWorkspace(wsId), listWorkspaces(), listAllSnags()]);
    setLine(w ?? null); setAll(ws); setSnags(every);
    const ids = [wsId, ...(w?.madeOf ?? [])];
    const [o, j] = await Promise.all([Promise.all(ids.map(id => listObservations(id))), Promise.all(ids.map(id => projectsOnWorkspace(id)))]);
    setObs(new Map(ids.map((id, i) => [id, o[i]])));
    setJobsOn(new Map(ids.map((id, i) => [id, j[i].length])));
  }, [wsId]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  const jobName = useCallback((id: string) => rec.jobs.find(j => j.id === id)?.name, [rec.jobs]);
  const ctx = useMemo(() => ({ observations: [...obs.values()].flat(), workspaces: all }), [obs, all]);
  const bundle: LineBundle | undefined = useMemo(() => (line ? lineBundle(line, { lines: all, machines: rec.machines, programs: rec.programs, jobLines: rec.jobLines, snags, standards: rec.standards, studies: rec.studies, jobName, ctx, today }) : undefined),
    [line, all, rec.machines, rec.programs, rec.jobLines, snags, rec.standards, rec.studies, jobName, ctx, today]);

  /* WHAT GOES IN — the newest of each tool by default; a tick adds or takes one off */
  const [picks, setPicks] = useState<Set<string> | null>(null);
  const keys = useMemo(() => (bundle ? bundle.parts.flatMap(p => p.items.map(i => i.key)).join('|') : ''), [bundle]);
  /* ?tools=capability,reliability — the line's Tools page asked for these tools: every record of theirs is in, the rest left out */
  const asked = useMemo(() => {
    const m = /[?&]tools=([^&]*)/.exec(window.location.hash);
    return m ? decodeURIComponent(m[1]).split(',').map(k => toolByKey(k)?.label).filter((l): l is string => !!l) : [];
  }, []);
  useEffect(() => {
    if (bundle && picks === null && keys) setPicks(asked.length ? picksForTools(bundle, asked) : new Set(bundle.parts.flatMap(p => [...defaultPicks(p.items)])));
  }, [bundle, keys, picks, asked]);
  const on = picks ?? new Set<string>();
  const toggle = (k: string) => setPicks(s => { const n = new Set(s ?? on); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  /* ITS PROGRAMS, machine by machine — read as the line's Programs reads them (lib/lineRecords) */
  const partIds = useMemo(() => bundle?.parts.map(p => p.line.id) ?? [], [bundle]);
  const floor = useJobFloor(useMemo(() => projectsOnLines(partIds, rec.jobLines, pid => rec.jobs.some(j => j.id === pid && !j.archivedAt)), [partIds, rec.jobLines, rec.jobs]));
  const stageOnly = useMemo(() => stageOnlyByLine(floor.stageOnly ?? [], rec.machines, rec.jobLines), [floor, rec.machines, rec.jobLines]);
  const jobNames = useMemo(() => new Map(rec.jobs.map(j => [j.id, j.name])), [rec.jobs]);
  const programs = useMemo(() => new Map((bundle?.parts ?? []).map(p => [p.line.id, lineProgramsReading([{ id: p.line.id, name: p.line.name, machines: p.kit.machines, programs: p.kit.programs }], today,
    { floor, jobName: jobNames, tests: rec.provingTests, studies: rec.studies, stageOnly: new Map([[p.line.id, (stageOnly.get(p.line.id) ?? []).map(x => x.line)]]) })] as const)), [bundle, today, floor, jobNames, rec.provingTests, rec.studies, stageOnly]);

  /* EACH PART AS THE ONE-PAGE LINE REPORT READS IT (lib/lineLean) — the same tiles and closing line */
  const readings = useMemo(() => new Map((bundle?.parts ?? []).map(p => {
    const s = stopsOf(obs.get(p.line.id) ?? []);
    const r: LineReading = { name: p.line.name, problems: { open: p.problems.open, late: p.problems.late, critical: p.problems.critical },
      programs: { n: p.kit.programs.length, proved: p.kit.proved, late: p.kit.late, onStage: (stageOnly.get(p.line.id) ?? []).length },
      stops: { n: s.n, minutes: s.minutes, ...(s.worst ? { worst: s.worst } : {}) }, day: lineDay(p.line), jobs: jobsOn.get(p.line.id) ?? 0 };
    return [p.line.id, r] as const;
  })), [bundle, obs, stageOnly, jobsOn]);

  const dualWords = useMemo<[string, string] | undefined>(() => {
    const dual = line ? dualOf(line, productionLines(all)) : { madeOf: [], partOf: [] };
    return dual.madeOf.length ? ['Made of', linesSaid(dual.madeOf)] : dual.partOf.length ? ['Part of', dual.partOf.map(w => w.name).join(' and ')] : undefined;
  }, [line, all]);

  const make = useCallback(async () => {
    if (!bundle || !line || busy || picks === null) return;
    setBusy(true); setSaid(null);
    try {
      const [{ loadPdfLib, deliverPdf, titlePdf }, { drawLineBundle }, { capacityPapersFor }, { pdfFileName }] = await Promise.all([import('../../lib/savePdf'), import('./lineBundlePdf'), import('../../tools/linebalance/capacityPaperLoad'), import('../../lib/fileName')]);
      const { jsPDF } = await loadPdfLib();
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      titlePdf(doc, `${line.name} — the line report, everything on the line`);
      const printed = printedOn();
      const caps = bundle.parts.flatMap(p => p.items.flatMap(i => (picks.has(i.key) && i.key.startsWith('capacity:') && i.standard ? [i.standard] : [])));
      const papers = await capacityPapersFor(caps, printed);
      await drawLineBundle(doc, { bundle, picks, printed, readings, programs, standards: rec.standards, ctx, capacity: new Map(caps.map((s, i) => [s.id, papers[i]])), ...(dualWords ? { dual: dualWords } : {}) });
      const how = await deliverPdf(doc, pdfFileName(line.name, 'line-report', today));
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      console.error('line bundle failed', e);
      setSaid('The report could not be made — try again.');
    } finally { setBusy(false); }
  }, [bundle, line, busy, picks, readings, programs, rec.standards, ctx, dualWords, today]);
  useSaveOnArrival(!!bundle && picks !== null && !rec.loading, make);

  if (line === undefined || rec.loading) return <div className="wrap pl"><p className="sub">Opening…</p></div>;
  if (line === null || !bundle) return <div className="wrap pl"><p>This line is not here. <button type="button" className="cw-link" onClick={() => nav('/factory')}>Your factory ›</button></p></div>;

  return (
    <div className="wrap pl lr">
      <PageHeader
        eyebrow={<span className="pl-eyebrow">PRODUCTION LINE · THE LINE REPORT</span>}
        title={`${line.name} — everything on the line`}
        says={<span className="pl-says">{bundleSays(bundle, on)}{dualWords ? ` · ${dualWords[0].toLowerCase()} ${dualWords[1]}` : ''}. Tick what goes in; {asked.length ? `every record of ${asked.join(', ')} is in already` : 'the newest of each tool is in already'}. Each tool's own report stays where it was.</span>}
        primary={{ label: 'Download', disabled: busy || picks === null, run: () => void make() }}
      />
      {said && <p className="tc-ok lr-said" role="status">{said}</p>}
      {bundle.parts.map(part => {
        const reading = readings.get(part.line.id);
        const pr = programs.get(part.line.id);
        return (
          <section key={part.line.id} className="lr-part" aria-label={part.title}>
            <h2>{part.title}{part.title === 'Both lines together' ? <span className="sub"> · what was run on {line.name} itself</span> : null}</h2>
            {reading && <LeanTiles tiles={lineTiles(reading)} className="sg-tiles" />}
            <h3 className="lr-h">What goes in{part.items.length > 1 && (
              <span className="lr-all">
                <button type="button" className="cw-link" onClick={() => setPicks(new Set([...on, ...part.items.map(i => i.key)]))}>Tick all</button>
                <button type="button" className="cw-link" onClick={() => setPicks(new Set([...on].filter(k => !part.items.some(i => i.key === k))))}>Tick none</button>
              </span>
            )}</h3>
            {part.items.length === 0
              ? <p className="sub">No tool used on this line yet — its problems and programs still go in.</p>
              : (
                <ul className="lr-ticks" aria-label={`What goes in for ${part.title}`}>
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
            <h3 className="lr-h">Problems and programs</h3>
            <p className="sub">{part.problems.open ? `${part.problems.open} problem${part.problems.open === 1 ? '' : 's'} open${part.problems.late ? ` · ${part.problems.late} late` : ''}` : 'No problem open'} · {pr?.says ?? 'no program planned'}</p>
            {whereFor(part, on).length > 0 && (<>
              <h3 className="lr-h">Where on the line</h3>
              <div className="lr-where" role="table" aria-label={`Where on ${part.title}`}>
                {whereFor(part, on).map(w => (
                  <div key={w.machine} className="lr-where-row" role="row">
                    <b role="rowheader">{w.machine}</b>
                    <span role="cell">{w.findings.map((f, i) => <span key={i} className={'lr-find is-' + f.tone}><i>{f.from}: </i>{f.says}</span>)}</span>
                  </div>
                ))}
              </div>
            </>)}
            <h3 className="lr-h">Who owes what by when</h3>
            <LeanActions actions={part.actions} empty="Nothing owed on this line — no problem open, every program proved." />
          </section>
        );
      })}
      {(() => { const whole = readings.get(bundle.dual ? line.id : bundle.parts[0].line.id); return whole ? <LeanClosing closing={lineClosing(whole)} /> : null; })()}
    </div>
  );
}
