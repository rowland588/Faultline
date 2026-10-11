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
import { listAllStudies, listWorkspaces, onDataChange, putStudy } from '../db';
import { useProjects } from '../lib/useProjects';
import { now, uid } from '../lib/ids';
import { nav } from '../state/useRoute';
import { Sheet } from '../ui/Sheet';
import { sample, sampleSays } from '../lib/ie/sample';
import { studyHref } from '../lib/studyLinks';
import { dur, flowFigures, share } from '../lib/ie/steps';
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
/* Rowland, 11 October: "VSM is not just a line tool, it's a business tool" —
   door to door, through every department, drawn as a swimlane grid. */
const MAP: ToolWords = {
  title: 'Value stream map',
  one: 'Value stream map',
  lede: 'Door to door — from the order to the customer — every step in the lane of who does it, filled by its value, with how long it takes and how long it waits. Use one on its own, or attach it to a job.',
  add: 'New value stream map',
  placeholder: 'e.g. Order to delivery — Finest Red 2kg',
  none: 'No value stream maps yet. Start where the order starts, and add each step it goes through, in the lane of whoever does it, to the customer.',
  second: { label: 'Which product or family?', placeholder: 'e.g. Finest Red 2kg' },
};
export const TOOL_WORDS: Partial<Record<StudyTool, ToolWords>> = { capability: CAPABILITY, map: MAP };

export { studyHref } from '../lib/studyLinks';

/** What a study says in a line on a list: the verdict, from the module. */
export function studyLine(s: ToolStudy): { text: string; tone: string } {
  if (s.tool === 'map') {
    const f = flowFigures(s.facts.flow, s.agreed?.map);
    return { text: f.steps ? `lead time ${f.untimed ? 'at least ' : ''}${dur(f.leadSec)} · ${share(f.pce ?? 0)} adds value` : 'no steps yet', tone: 'n' };
  }
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
                    <b className="lt-what">{s.name || 'Not named'}{s.machine || s.product ? <span className="ie-li-m"> · {s.machine ?? s.product}</span> : null}</b>
                    <span className={'lt-says ie-tone is-' + said.tone}>{said.text}</span>
                    <span className="lt-where">{s.tool === 'map' ? `${steps} step${steps === 1 ? '' : 's'}${(s.facts.future ?? []).length ? ' · a future state' : ''}` : count ? `${n} of ${count}` : `${n} reading${n === 1 ? '' : 's'}`}{s.closedAt ? ' · closed' : ''}</span>
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
  const ready = !!name.trim() && !busy;
  const make = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      const t = now();
      const second = machine.trim() ? (tool === 'map' ? { product: machine.trim() } : { machine: machine.trim() }) : {};
      const s: ToolStudy = { id: uid(), tool, name: name.trim(), ...second,
        facts: {}, uses: [], startedAt: t, createdAt: t, updatedAt: t };
      await putStudy(s);
      setName(''); setMachine(''); onClose();
      nav(studyHref(s));
    } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={w.add}>
      <form className="lt-new" onSubmit={e => { e.preventDefault(); void make(); }}>
        <label className="field"><span className="field-label">What is it of?</span>
          <input className="text-input" value={name} maxLength={120} placeholder={w.placeholder} onChange={e => setName(e.target.value)} autoFocus />
        </label>
        <label className="field"><span className="field-label">{w.second.label} <i className="sub">optional</i></span>
          <input className="text-input" value={machine} maxLength={80} placeholder={w.second.placeholder} onChange={e => setMachine(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={!ready}>Start it</button>
      </form>
    </Sheet>
  );
}
