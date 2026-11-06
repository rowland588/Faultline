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
import { bundleSays, defaultPicks, lineBundle, picksForTools, pictureNames, problemsLine, summaryMeans, summaryPage, whereFor, type LineBundle, type WhereRow } from './lineBundle';
import { toolByKey } from '../../catalogue/registry';
import { useLooking } from '../../tools/gemba/useLooking';
import { spreadSentences, useYokotenMany } from '../../tools/yokoten/useYokoten';
import { lookingReading } from '../../tools/gemba/looking';
import type { LineReading } from '../../lib/lineLean';
import { scopeCounts } from '../../tools/checks/owed';
import { lineClosing, lineTiles } from '../../lib/lineLean';
import { lineDay } from '../../lib/lineLoss';
import { dualOf, linesSaid, productionLines } from '../../lib/lines';
import { todayISO } from '../../lib/weeks';
import { useSaveOnArrival } from '../../lib/useSaveOnArrival';
import { PageHeader, ViewTabs } from '../../ui/parts';
import { ALL_IN, packageSections, packageSays, type PackageFlags, type PackageRecords } from './linePackage';
import { attemptsOf } from '../../lib/programJourney';
import { LeanActions, LeanBand, LeanClosing, LeanPanel, LeanTiles } from '../../ui/Lean';
import type { LeanInsight, LeanTone } from '../../lib/lean';
import { stopsOf } from '../../screens/ProductionLineScreen';
import { nav } from '../../state/useRoute';
import './lineReport.css';

const printedOn = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const MARK: Record<LeanTone, string> = { r: '✕', a: '!', g: '✓', n: '·' };

/** The one picture — machines in flow, then the findings that point at them. */
function LinePicture({ machines, where, title }: { machines: string[]; where: WhereRow[]; title: string }) {
  const names = pictureNames(machines, where);
  const toneOf = (name: string): LeanTone => {
    const row = where.find(w => w.machine.toLowerCase() === name.toLowerCase());
    if (!row?.findings.length) return 'n';
    return row.findings.some(f => f.tone === 'r') ? 'r' : row.findings.some(f => f.tone === 'a') ? 'a' : 'n';
  };
  if (!names.length && !where.length) return <p className="sub">No finding points at a machine.</p>;
  return (
    <div className="lr-pic">
      {names.length > 0 && (
        <ol className="lr-flow" aria-label="The machines in flow">
          {names.map(name => {
            const n = where.find(w => w.machine.toLowerCase() === name.toLowerCase())?.findings.length ?? 0;
            return (
              <li key={name} className={'lr-flow-m is-' + toneOf(name)}>
                <b>{name}</b>
                <span>{n ? `${n} finding${n === 1 ? '' : 's'}` : 'no finding'}</span>
              </li>
            );
          })}
        </ol>
      )}
      {where.length > 0 && (
        <div className="lr-where" role="table" aria-label={`Where on ${title}`}>
          {where.map(w => (
            <div key={w.machine} className="lr-where-row" role="row">
              <b role="rowheader">{w.machine}</b>
              <span role="cell">{w.findings.map((f, i) => <span key={i} className={'lr-find is-' + f.tone}><i>{f.from}: </i>{f.says}</span>)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** What it means — the same sentences as the paper, with the looking and the spread marked for the gate. */
function MeansList({ insights, looking, spread }: { insights: LeanInsight[]; looking?: { says: string; more: string }; spread?: readonly string[] }) {
  if (!insights.length) return null;
  return (
    <ul className="ln-ins">
      {insights.map(x => {
        const look = !!looking && (x.text === looking.says || x.text === looking.more);
        const sp = !!spread?.includes(x.text);
        return (
          <li key={x.text} className={'ie-cap is-' + x.tone}>
            <span className="ln-mark" aria-hidden>{MARK[x.tone]}</span>
            <span className={look ? 'lr-looked' : sp ? 'lr-spread' : undefined} {...(x.text === looking?.says ? { 'data-looking': '' } : {})} {...(sp ? { 'data-spread': '' } : {})}>{x.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

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
  /* TWO WORLDS (3 November — Rowland: "the line as a short report … or the line full report … prints off the tools, individual reports"):
     the SUMMARY as it was, and the FULL PACKAGE — each tool's own paper joined behind a cover and contents. */
  const [mode, setMode] = useState<'summary' | 'full'>(() => (/[?&]full=1/.test(window.location.hash) ? 'full' : 'summary'));
  const [flags, setFlags] = useState<PackageFlags>(ALL_IN);
  const [progress, setProgress] = useState<string | null>(null);
  const full = mode === 'full';

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
    if (bundle && picks === null && keys) setPicks(asked.length ? picksForTools(bundle, asked) : full ? new Set(bundle.parts.flatMap(p => p.items.map(i => i.key))) : new Set(bundle.parts.flatMap(p => [...defaultPicks(p.items)])));
  }, [bundle, keys, picks, asked, full]);
  const on = picks ?? new Set<string>();
  const switchTo = (m: 'summary' | 'full') => {
    if (m === mode || !bundle) return;
    setMode(m);
    setPicks(m === 'full' ? new Set(bundle.parts.flatMap(p => p.items.map(i => i.key))) : new Set(bundle.parts.flatMap(p => [...defaultPicks(p.items)])));
  };
  const toggle = (k: string) => setPicks(s => { const n = new Set(s ?? on); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  /* ITS PROGRAMS, machine by machine — read as the line's Programs reads them (lib/lineRecords) */
  const partIds = useMemo(() => bundle?.parts.map(p => p.line.id) ?? [], [bundle]);
  const floor = useJobFloor(useMemo(() => projectsOnLines(partIds, rec.jobLines, pid => rec.jobs.some(j => j.id === pid && !j.archivedAt)), [partIds, rec.jobLines, rec.jobs]));
  const stageOnly = useMemo(() => stageOnlyByLine(floor.stageOnly ?? [], rec.machines, rec.jobLines), [floor, rec.machines, rec.jobLines]);
  const jobNames = useMemo(() => new Map(rec.jobs.map(j => [j.id, j.name])), [rec.jobs]);
  const programs = useMemo(() => new Map((bundle?.parts ?? []).map(p => [p.line.id, lineProgramsReading([{ id: p.line.id, name: p.line.name, machines: p.kit.machines, programs: p.kit.programs }], today,
    { floor, jobName: jobNames, tests: rec.provingTests, studies: rec.studies, standards: rec.standards, stageOnly: new Map([[p.line.id, (stageOnly.get(p.line.id) ?? []).map(x => x.line)]]) })] as const)), [bundle, today, floor, jobNames, rec.provingTests, rec.studies, rec.standards, stageOnly]);

  /* how fresh the looking is, a part at a time (FC-199, tools/gemba) */
  const looked = useLooking(partIds);
  const spreadOf = useYokotenMany(partIds);
  const checkCounts = useMemo(() => new Map((bundle?.parts ?? []).map(p => [p.line.id, scopeCounts(rec.studies.filter(x => !x.deletedAt && x.workspaceId === p.line.id), Date.now())] as const)), [bundle, rec.studies]);
  /* EACH PART AS THE ONE-PAGE LINE REPORT READS IT (lib/lineLean) — the same tiles and closing line */
  const readings = useMemo(() => new Map((bundle?.parts ?? []).map(p => {
    const s = stopsOf(obs.get(p.line.id) ?? []);
    const r: LineReading = { name: p.line.name, problems: { open: p.problems.open, late: p.problems.late, critical: p.problems.critical },
      programs: { n: p.kit.programs.length, proved: p.kit.proved, late: p.kit.late, onStage: (stageOnly.get(p.line.id) ?? []).length },
      stops: { n: s.n, minutes: s.minutes, ...(s.worst ? { worst: s.worst } : {}) }, day: lineDay(p.line), jobs: jobsOn.get(p.line.id) ?? 0,
      /* the line's check logs (src/tools/checks): the tile and the closing line the line's page says */
      ...(checkCounts.get(p.line.id)?.logs ? { checks: checkCounts.get(p.line.id) } : {}),
      ...(() => { const lk = looked?.find(x => x.id === p.line.id); return lk ? { looking: lookingReading(p.line.name, lk.looking) } : {}; })(),
      ...(() => { const sp = spreadSentences(spreadOf?.get(p.line.id)); return sp.length ? { spread: sp } : {}; })() };
    return [p.line.id, r] as const;
  })), [bundle, obs, stageOnly, jobsOn, checkCounts, looked, spreadOf]);

  const dualWords = useMemo<[string, string] | undefined>(() => {
    const dual = line ? dualOf(line, productionLines(all)) : { madeOf: [], partOf: [] };
    return dual.madeOf.length ? ['Made of', linesSaid(dual.madeOf)] : dual.partOf.length ? ['Part of', dual.partOf.map(w => w.name).join(' and ')] : undefined;
  }, [line, all]);

  /* WHAT THE LINE HOLDS THAT THE BUNDLE DOES NOT COUNT: every problem (open and closed) and the tests of its programs, every attempt */
  const pkgRec = useMemo<PackageRecords | undefined>(() => (bundle ? {
    problemsOn: id => { const mine = snags.filter(x => x.workspaceId === id && !x.deletedAt && !x.archivedAt); return { open: mine.filter(x => x.status !== 'closed').length, closed: mine.filter(x => x.status === 'closed').length }; },
    testsOn: part => new Set(part.kit.programs.flatMap(p => attemptsOf(p, rec.provingTests).map(t => t.id))).size,
  } : undefined), [bundle, snags, rec.provingTests]);
  const testsOfLine = useCallback((lineId: string) => {
    const part = bundle?.parts.find(p => p.line.id === lineId);
    const seen = new Set<string>();
    return (part?.kit.programs ?? []).flatMap(p => attemptsOf(p, rec.provingTests)).filter(t => (seen.has(t.id) ? false : (seen.add(t.id), true)));
  }, [bundle, rec.provingTests]);
  const projectOf = useCallback((pid: string, lineId: string) => {
    const j = pid ? rec.jobs.find(x => x.id === pid) : undefined;
    return j ? { name: j.name, ...(j.lead ? { lead: j.lead } : {}) } : { name: all.find(w => w.id === lineId)?.name ?? 'The line' };
  }, [rec.jobs, all]);

  const make = useCallback(async () => {
    if (!bundle || !line || busy || picks === null) return;
    setBusy(true); setSaid(null);
    try {
      if (full) {
        const [{ deliverBlob }, { makeLinePackage }, { pdfFileName }] = await Promise.all([import('../../lib/savePdf'), import('./linePackagePdf'), import('../../lib/fileName')]);
        const sections = packageSections(bundle, picks, flags, pkgRec);
        const names = new Map(all.map(w => [w.id, w.name]));
        const made = await makeLinePackage(sections, { bundle, printed: printedOn(), today, picks, readings, programs, standards: rec.standards, snags, ctx,
          lineName: id => names.get(id) ?? 'A line', jobName: id => (id ? jobName(id) : undefined), testsOf: testsOfLine, projectOf, ...(dualWords ? { dual: dualWords } : {}) }, (n, of, title) => setProgress(`Making ${n + 1} of ${of}: ${title}…`));
        const how = await deliverBlob(made.blob, pdfFileName(line.name, 'full line report', today));
        setSaid(`${how === 'downloaded' ? 'Saved' : 'Ready'} — ${made.pages} pages, ${made.contents.length} papers. ${how === 'downloaded' ? 'Open or send it from the bar below.' : 'Open it from the bar below.'}`);
        return;
      }
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
    } finally { setBusy(false); setProgress(null); }
  }, [bundle, line, busy, picks, readings, programs, rec.standards, ctx, dualWords, today, full, flags, all, snags, jobName, pkgRec, testsOfLine, projectOf]);
  useSaveOnArrival(!!bundle && picks !== null && !rec.loading, make);

  if (line === undefined || rec.loading) return <div className="wrap pl"><p className="sub">Opening…</p></div>;
  if (line === null || !bundle) return <div className="wrap pl"><p>This line is not here. <button type="button" className="cw-link" onClick={() => nav('/factory')}>The factory’s lines ›</button></p></div>;

  return (
    <div className="wrap pl lr">
      <PageHeader
        eyebrow={<span className="pl-eyebrow">PRODUCTION LINE · {full ? 'THE FULL LINE REPORT' : 'THE LINE REPORT'}</span>}
        title={`${line.name} — ${full ? 'the full package' : 'everything on the line'}`}
        says={full ? <span className="pl-says">Every paper below is the report that tool prints on its own, joined behind a cover and contents — nothing is summarised. Untick what should not go to the client.</span> : <span className="pl-says">{bundleSays(bundle, on)}{dualWords ? ` · ${dualWords[0].toLowerCase()} ${dualWords[1]}` : ''}. Tick what goes in; {asked.length ? `every record of ${asked.join(', ')} is in already` : 'the newest of each tool is in already'}. Each tool's own report stays where it was.</span>}
        primary={{ label: full ? 'Download the full package' : 'Download', disabled: busy || picks === null, run: () => void make() }}
      />
      <ViewTabs label="Which line report" value={mode} onChange={k => switchTo(k as 'summary' | 'full')} views={[{ key: 'summary', label: 'Summary' }, { key: 'full', label: 'Full package' }]} />
      {progress && <p className="sub lr-said" role="status">{progress}</p>}
      {said && <p className="tc-ok lr-said" role="status">{said}</p>}
      {full && picks !== null && (() => {
        const sections = packageSections(bundle, on, flags, pkgRec);
        return (
          <section className="lr-package" aria-label="The full package" data-package>
            <h2>The package, in order</h2>
            <p className="sub">A cover and contents, then {packageSays(sections)}.</p>
            <ul className="lr-ticks" aria-label="Whole-line papers">
              {([['problems', 'Problems report', 'every problem, open and closed, with its plan and journey'], ['problemCards', 'Problem cards', 'a card for each problem, open or closed, for the board'], ['programs', 'Programs report', 'every program, machine by machine, every test and its notes'], ['testCards', 'Test cards', 'a card for each test — what was agreed, what was seen, what we do next'], ['machines', 'Machines report', 'every machine in full — tests, programs, steps, studies']] as const).map(([k, name, what]) => (
                <li key={k}>
                  <label className="lr-tick">
                    <input type="checkbox" checked={flags[k]} aria-label={name} onChange={() => setFlags(f => ({ ...f, [k]: !f[k] }))} />
                    <span><b>{name}</b><span className="sub">{what}</span></span>
                  </label>
                </li>
              ))}
            </ul>
            <ol className="lr-order" aria-label="Papers in the package">
              {sections.map((sc, k) => <li key={sc.id} data-section={sc.kind} {...(k === 0 || sections[k - 1].group !== sc.group ? { 'data-group': sc.group } : {})}><b>{sc.title}</b> <span className="sub">{sc.what}</span></li>)}
            </ol>
          </section>
        );
      })()}
      {!full && (() => {
        const whole = readings.get(bundle.dual ? line.id : bundle.parts[0].line.id);
        if (!whole) return null;
        const closing = lineClosing(whole);
        const page = summaryPage(bundle, { picks: on.size, tone: closing.tone, ...(dualWords ? { dual: dualWords } : {}), ...(whole.looking ? { lookingFact: whole.looking.fact } : {}) });
        return <LeanBand page={{ ...page, facts: [...page.facts, ['Printed', printedOn()]] }} />;
      })()}
      {bundle.parts.map(part => {
        const reading = readings.get(part.line.id);
        const pr = programs.get(part.line.id);
        const where = whereFor(part, on);
        const programsSays = pr?.says ?? 'no program planned';
        const goesIn = (
          <>
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
          </>
        );
        return (
          <section key={part.line.id} className={'lr-part' + (full ? '' : ' lr-lean')} aria-label={part.title}>
            <h2>{part.title}{part.title === 'Both lines together' ? <span className="sub"> · what was run on {line.name} itself</span> : null}</h2>
            {reading && <LeanTiles tiles={lineTiles(reading)} className="sg-tiles" />}
            {full ? (
              <>
                {reading?.looking && <p className="sub lr-looked" data-looking>{reading.looking.says} <span>{reading.looking.more}</span></p>}
                {reading?.spread?.map((x, i) => <p key={i} className="sub lr-spread" data-spread>{x}</p>)}
                {goesIn}
                <h3 className="lr-h">Problems and programs</h3>
                <p className="sub">{problemsLine(part)} · {programsSays}</p>
                {where.length > 0 && (<>
                  <h3 className="lr-h">Where on the line</h3>
                  <div className="lr-where" role="table" aria-label={`Where on ${part.title}`}>
                    {where.map(w => (
                      <div key={w.machine} className="lr-where-row" role="row">
                        <b role="rowheader">{w.machine}</b>
                        <span role="cell">{w.findings.map((f, i) => <span key={i} className={'lr-find is-' + f.tone}><i>{f.from}: </i>{f.says}</span>)}</span>
                      </div>
                    ))}
                  </div>
                </>)}
                <h3 className="lr-h">Who owes what by when</h3>
                <LeanActions actions={part.actions} empty="Nothing owed on this line — no problem open, every program proved." />
              </>
            ) : (
              <>
                <div className="ln-grid">
                  <LeanPanel title="Where on the line">
                    <LinePicture machines={part.kit.machines.map(m => m.name)} where={where} title={part.title} />
                  </LeanPanel>
                  <LeanPanel title="What it means">
                    <MeansList insights={summaryMeans({
                      ...(reading?.looking ? { looking: reading.looking } : {}),
                      ...(reading?.spread?.length ? { spread: reading.spread } : {}),
                      problems: problemsLine(part),
                      programs: programsSays,
                      programsTone: reading?.programs.late ? 'r' : reading && reading.programs.n > reading.programs.proved ? 'a' : 'n',
                      picked: part.items.filter(it => on.has(it.key)).map(it => ({ tool: it.tool, says: it.says, tone: it.tone })),
                    })} looking={reading?.looking} spread={reading?.spread} />
                  </LeanPanel>
                </div>
                <h3 className="lr-h">Problems and programs</h3>
                <p className="sub">{problemsLine(part)} · {programsSays}</p>
                <h3 className="lr-h">Who owes what by when</h3>
                <LeanActions actions={part.actions} empty="Nothing owed on this line — no problem open, every program proved." />
                {goesIn}
              </>
            )}
          </section>
        );
      })}
      {(() => { const whole = readings.get(bundle.dual ? line.id : bundle.parts[0].line.id); return whole ? <LeanClosing closing={lineClosing(whole)} /> : null; })()}
    </div>
  );
}
