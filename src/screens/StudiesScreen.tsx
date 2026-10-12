/* A TOOL'S PAGE — every study made with it, on every line and job, the
 * maker's unfiled ones first (docs/TOOLKIT.md, Part 0: "Tools, on the rail:
 * each tool's page lists its studies across every line and job, with Not
 * filed first for the maker").
 *
 * Rowland, 10 October: "Tools can be adjacent to do-one sessions, just to
 * allow quick use of the tool." So a new one asks only what it is of — no
 * line, no job. It is a quick session, its maker's alone, kept under "Not
 * filed": a calculator that remembers. Putting it on a line and attaching it
 * to a job come after, on the study itself.
 *
 * One tool today, the capability study (docs/BUILD.md, 2d). Every later tool
 * is one more entry in TOOL_WORDS and one more `tool` on the record. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAllStudies, listStandardsForLine, listWorkspaces, onDataChange, putStudy } from '../db';
import type { Standard } from '../lib/standard';
import { useProjects } from '../lib/useProjects';
import { now, uid } from '../lib/ids';
import { nav } from '../state/useRoute';
import { Sheet } from '../ui/Sheet';
import { sample, sampleSays } from '../lib/ie/sample';
import { studyHref } from '../lib/studyLinks';
import { dur, flowFigures, share } from '../lib/ie/steps';
import { changeoverFigures, changeoverSays, mins } from '../lib/ie/changeover';
import { samplingSays } from '../lib/ie/sampling';
import type { StudyTool, ToolStudy } from '../lib/study';
import type { Workspace } from '../types';

type ToolWords = { title: string; one: string; lede: string; add: string; placeholder: string; none: string; second: { label: string; placeholder: string } };
const CAPABILITY: ToolWords = {
  title: 'Capability study',
  one: 'Capability study',
  lede: 'Readings against agreed limits — does it pass, and would it keep passing all shift (Cpk)? Use one on its own, then put it on a line or attach it to a job.',
  add: 'New capability study',
  placeholder: 'e.g. Weight accuracy 400 g',
  none: 'No capability studies yet. Say what it is of, agree the limits and how many readings, then take them — on the phone at the machine.',
  second: { label: 'On which machine?', placeholder: 'e.g. Checkweigher' },
};
/* Rowland, 11 October: a swimlane grid of what, who and the value — and
   always a line's: "remove business-wide mapping ... but keep the line
   large, different departments can affect the line". */
const MAP: ToolWords = {
  title: 'Value stream map',
  one: 'Value stream map',
  lede: 'One line, end to end — from the material arriving to the pallet leaving — every step in the lane of whoever does it, the departments that touch the line included, coloured by its value, with how long it takes and how long it waits. Use one on its own, or attach it to a job.',
  add: 'New value stream map',
  placeholder: 'e.g. Film in to pallet away — Maris Piper 2kg',
  none: 'No value stream maps yet. Pick a line, start where its work starts, and add each thing done on it, in the lane of whoever does it, to the pallet leaving.',
  second: { label: 'Which product or family?', placeholder: 'e.g. Finest Red 2kg' },
};
/* The changeover and its interval (tool 6): how long the line stops between
   two products, how much of it could be done while it runs, how often each
   product can run. */
const CHANGEOVER: ToolWords = {
  title: 'Changeover',
  one: 'Changeover',
  lede: 'From one product to the next, step by step — each timed on the phone as it happens and marked internal (the line stopped) or external (could be done while it runs): the minutes now, the minutes with the external work moved out, and how often each product can run. Use one on its own, or on a line and a job.',
  add: 'New changeover',
  placeholder: 'e.g. Finest Red 2kg',
  none: 'No changeovers timed yet. Say which product the line runs and which it changes to, then Lap each step as it ends — on the phone at the line.',
  second: { label: 'To which product?', placeholder: 'e.g. Express 1.25 kg' },
};
/* Work sampling (docs/TOOLKIT.md, tool 9): the shift's moments drawn at
   random, one tap per person at each — the shares, each with its margin. A
   line's people are the ones watched, its product's standard brings them. */
const SAMPLING: ToolWords = {
  title: 'Work sampling',
  one: 'Work sampling',
  lede: 'What people are doing across a shift — working, walking, waiting, searching, away — from one tap per person at random moments. Every share is said with the margin it carries; nobody follows anyone with a stopwatch.',
  add: 'New work sampling',
  placeholder: 'e.g. Packing hall, day shift',
  none: 'No work sampling yet. Pick a line and who is watched; the phone asks at random moments of the shift, and one tap per person says what each was doing.',
  second: { label: 'Which product?', placeholder: 'e.g. Maris Piper 2kg' },
};
export const TOOL_WORDS: Partial<Record<StudyTool, ToolWords>> = { capability: CAPABILITY, map: MAP, changeover: CHANGEOVER, sampling: SAMPLING };

export { studyHref } from '../lib/studyLinks';

/** What a study says in a line on a list: the verdict, from the module. */
export function studyLine(s: ToolStudy): { text: string; tone: string } {
  if (s.tool === 'changeover') {
    const said = changeoverSays(changeoverFigures(s.facts.sequence, s.facts.perWeek));
    return { text: said.verdict, tone: said.tone };
  }
  if (s.tool === 'map') {
    const f = flowFigures(s.facts.flow, s.agreed?.map);
    return { text: f.steps ? `lead time ${f.untimed ? 'at least ' : ''}${dur(f.leadSec)} · ${share(f.pce ?? 0)} adds value` : 'no steps yet', tone: 'n' };
  }
  if (s.tool === 'sampling') return { text: samplingSays(s.agreed?.sampling, s.facts.taps ?? []).verdict, tone: 'n' };
  const a = s.agreed?.readings;
  const said = sampleSays(sample(a, s.facts.readings ?? []), a);
  if (s.overrule) return { text: `${s.overrule.verdict} · overruled`, tone: 'n' };
  return { text: said.verdict, tone: said.tone };
}

export function StudiesScreen({ tool }: { tool: StudyTool }) {
  const w = TOOL_WORDS[tool] ?? CAPABILITY;
  const { projects } = useProjects();
  const [list, setList] = useState<ToolStudy[] | null>(null);
  const [lines, setLines] = useState<Workspace[]>([]);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const [all, ws] = await Promise.all([listAllStudies(), listWorkspaces()]);
    setList(all.filter(s => s.tool === tool)); setLines(ws);
  }, [tool]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  /* Not filed first, then each line, then a job with no line of its own. */
  const groups = useMemo(() => {
    const by = new Map<string, ToolStudy[]>();
    for (const s of list ?? []) {
      const k = s.workspaceId ? `ws:${s.workspaceId}` : s.projectId ? `job:${s.projectId}` : 'none';
      by.set(k, [...(by.get(k) ?? []), s]);
    }
    return [...by.entries()].sort(([a], [b]) => (a === 'none' ? -1 : b === 'none' ? 1 : a.localeCompare(b)));
  }, [list]);
  const groupName = (k: string) => (k === 'none' ? 'Not filed'
    : k.startsWith('ws:') ? (lines.find(l => l.id === k.slice(3))?.name ?? 'A line')
    : `Job: ${projects.find(p => p.id === k.slice(4))?.name ?? 'a job'}`);

  return (
    <div className="wrap qsl ie-list">
      <header className="pace-head">
        <div className="pace-head-main">
          <h1>{w.title}</h1>
          <p className="sub">{w.lede}</p>
        </div>
        <div className="pace-head-actions">
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>{w.add}</button>
        </div>
      </header>
      {list && list.length === 0 && (
        <div className="qsl-empty">
          <p>{w.none}</p>
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>{w.add}</button>
        </div>
      )}
      {groups.map(([k, rows]) => (
        <section key={k} className="qsl-g">
          <div className="qsl-gh">
            <h2>{groupName(k)}</h2>
            <span className="sub">{rows.length} {rows.length === 1 ? 'study' : 'studies'}{k === 'none' ? ' — yours alone until you put one on a line' : ''}</span>
          </div>
          <ul className="lt-rows">
            {rows.map(s => {
              const said = studyLine(s);
              const n = (s.facts.readings ?? []).filter(r => !r.struck).length;
              const count = s.agreed?.readings?.count;
              const steps = (s.facts.flow ?? []).length;
              return (
                <li key={s.id}>
                  <button type="button" className="lt-row" onClick={() => nav(studyHref(s))}>
                    <b className="lt-what">{s.name || 'Not named'}{(s.machine || s.product) && s.tool !== 'changeover' ? <span className="ie-li-m"> · {s.machine ?? s.product}</span> : null}</b>
                    <span className={'lt-says ie-tone is-' + said.tone}>{said.text}</span>
                    <span className="lt-where">{s.tool === 'sampling' ? `${(s.agreed?.sampling?.who ?? []).length} watched · ${(s.facts.taps ?? []).filter(x => !x.struck).length} taps` : s.tool === 'map' ? `${steps} step${steps === 1 ? '' : 's'}${(s.facts.future ?? []).length ? ' · a future state' : ''}`
                      : s.tool === 'changeover' ? `${(s.facts.sequence ?? []).length} step${(s.facts.sequence ?? []).length === 1 ? '' : 's'}${changeoverFigures(s.facts.sequence).enough ? ` · ${mins(changeoverFigures(s.facts.sequence).nowSec)}` : ''}`
                        : count ? `${n} of ${count}` : `${n} reading${n === 1 ? '' : 's'}`}{s.closedAt ? ' · closed' : ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <NewStudy open={adding} tool={tool} onClose={() => setAdding(false)} />
    </div>
  );
}

/** A NEW ONE — what it is of, and the machine if it is one. Nothing else is
 *  asked first: it is a quick session until it is put somewhere. */
function NewStudy({ open, tool, onClose }: { open: boolean; tool: StudyTool; onClose: () => void }) {
  const w = TOOL_WORDS[tool] ?? CAPABILITY;
  const [name, setName] = useState('');
  const [machine, setMachine] = useState('');
  const [busy, setBusy] = useState(false);
  /* A VALUE STREAM is always a line's — what is done on it and who does it,
     the departments that touch it included (Rowland, 11 October: "remove
     business-wide mapping ... but keep the line large, different
     departments can affect the line"). */
  const [lineId, setLineId] = useState('');
  const [lines, setLines] = useState<Workspace[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  useEffect(() => { if (open && (tool === 'map' || tool === 'sampling' || tool === 'changeover')) void listWorkspaces().then(setLines); }, [open, tool]);
  useEffect(() => { if (lineId) void listStandardsForLine(lineId).then(setStandards); else setStandards([]); }, [lineId]);
  /* a map is always a line's; a sampling study watches a line's people */
  const isLine = tool === 'map' || tool === 'sampling';
  /* A CHANGEOVER is from one product to the next: both are asked, the line
     when it is known (its standards offer the products, and the interval
     needs it — but a quick session on its own still times a changeover). */
  const isChange = tool === 'changeover';
  const ready = !!name.trim() && !busy && (!isLine || !!lineId) && (!isChange || !!machine.trim());
  const make = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      const t = now();
      if (isChange) {
        const from = name.trim(), to = machine.trim();
        const std = standards.find(x => !x.deletedAt && x.product.trim().toLowerCase() === to.toLowerCase());
        const s: ToolStudy = { id: uid(), tool, name: `${from} → ${to}`, product: to,
          ...(lineId ? { workspaceId: lineId } : {}), ...(std ? { standardId: std.id } : {}),
          facts: { fromProduct: from, toProduct: to, sequence: [] }, uses: [], startedAt: t, createdAt: t, updatedAt: t };
        await putStudy(s);
        setName(''); setMachine(''); onClose();
        nav(studyHref(s));
        return;
      }
      const second = machine.trim() ? (isLine ? { product: machine.trim() } : { machine: machine.trim() }) : {};
      /* A line's map sits on the line, and on its product's line standard when
         there is one — its people are the lanes. */
      const std = isLine ? standards.find(x => !x.deletedAt && x.product.trim().toLowerCase() === machine.trim().toLowerCase()) : undefined;
      const s: ToolStudy = { id: uid(), tool, name: name.trim(), ...second,
        ...(isLine ? { workspaceId: lineId } : {}), ...(tool === 'map' ? { agreed: { map: { scope: 'line' as const } } } : {}), ...(std ? { standardId: std.id } : {}),
        facts: {}, uses: [], startedAt: t, createdAt: t, updatedAt: t };
      await putStudy(s);
      setName(''); setMachine(''); onClose();
      nav(studyHref(s));
    } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={w.add}>
      <form className="lt-new" onSubmit={e => { e.preventDefault(); void make(); }}>
        {isChange && (
          <label className="field"><span className="field-label">Which line? <i className="sub">optional — its products are offered, and the interval needs it</i></span>
            <select className="text-input" value={lineId} aria-label="Which line" onChange={e => setLineId(e.target.value)}>
              <option value="">No line yet — a quick session</option>
              {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
        )}
        {isLine && (
          <label className="field"><span className="field-label">Which line?</span>
            <select className="text-input" value={lineId} aria-label="Which line" onChange={e => setLineId(e.target.value)}>
              <option value="">Pick the line…</option>
              {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <span className="sub">{tool === 'map' ? 'A lane for each person or department whose work touches the line — Op 1, Op 2, the machine, the team leader, planning, stores, quality, maintenance.' : 'Its product’s line standard brings the people to watch; anyone else is added by name.'}</span>
          </label>
        )}
        <label className="field"><span className="field-label">{isChange ? 'From which product?' : 'What is it of?'}</span>
          <input className="text-input" value={name} maxLength={120} placeholder={w.placeholder} list={isChange ? 'new-co-products' : undefined} onChange={e => setName(e.target.value)} autoFocus />
        </label>
        <label className="field"><span className="field-label">{w.second.label} {!isChange && <i className="sub">optional</i>}</span>
          <input className="text-input" value={machine} maxLength={80} placeholder={w.second.placeholder} list={isLine ? 'new-map-products' : isChange ? 'new-co-products' : undefined} onChange={e => setMachine(e.target.value)} />
          {(isLine || isChange) && <datalist id={isLine ? 'new-map-products' : 'new-co-products'}>{standards.filter(x => !x.deletedAt).map(x => <option key={x.id} value={x.product} />)}</datalist>}
          {isLine && standards.length > 0 && <span className="sub">{tool === 'map' ? 'A product with a line standard brings its people as the lanes.' : 'A product with a line standard brings its people to watch.'}</span>}
          {isChange && standards.length > 0 && <span className="sub">A product with a line standard is where Set as the standard writes the agreed sequence.</span>}
        </label>
        <button type="submit" className="btn btn-primary" disabled={!ready}>Start it</button>
      </form>
    </Sheet>
  );
}
