/* THE CALCULATORS — their pages (knowledge/specs/FC-235-calculators.md; 25 October 2026).
 *
 *   #/calc              the hub: every calculator by group, how many are saved, the saved ones below
 *   #/calc/:key         one calculator: what it is for, its saved ones, New
 *   #/calc/:key/:id     one saved calculation: its figures left, the live answer right, a what-if, the saved before
 *
 * A calculation is a study of tool `calc` (lib/study): on a line, in a project, or on none. Its page and its paper are drawn from the
 * definition's own result (./calc, ./defs/<key>) so the screen, the paper and the acceptance script say one thing. Access as the
 * other tools: a team member types the figures (can.edit), the owner deletes (can.remove), a client reads it and takes the paper. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getStudy, listAllStudies, onDataChange, patchStudy, putStudy } from '../../db';
import { useAccess } from '../../cloud/access';
import { useSession } from '../../cloud/session';
import { displayName } from '../../cloud/team';
import { can as canAt } from '../../lib/access';
import { asked } from '../../lib/lines';
import { inScope, startLine, type ProjectScope } from '../../lib/inProject';
import { useInProject } from '../../lib/useInProject';
import { useFactoryLines, useArchivedPlaces } from '../../lib/useFactoryLines';
import { useProjects } from '../../lib/useProjects';
import { now, uid } from '../../lib/ids';
import { bandPage } from '../../lib/lean';
import { niceDay, isoDay } from '../../lib/weeks';
import { nav } from '../../state/useRoute';
import type { AgreedCalc, ToolStudy } from '../../lib/study';
import { studyHref } from '../../lib/studyLinks';
import { PageHeader, Section } from '../../ui/parts';
import { Sheet } from '../../ui/Sheet';
import { ProjectScopeChips } from '../../ui/ProjectScope';
import { LeanActions, LeanClosing, LeanPanel } from '../../ui/Lean';
import { StudyBand, removeStudy, StudyRowName } from '../../ui/StudyActs';
import { UsedFor, WhereItSits, useBetter } from '../../ui/StudyPlace';
import { raisedFrom } from '../losses/lossLean';
import { useLine } from '../linework/WorkBalance';
import { calcByKey, calcGroups } from './registry';
import { calcSays, dropped, runCalc, startInputs, studyCalc, typedOver, type Run } from './calc';
import { CalcForm, stillNeeded } from './CalcForm';
import { BeforeBox, ResultView, WhatIf } from './CalcView';
import type { CalcDef, Inputs } from './types';

const OWNER = canAt('owner');

/** The three pages. */
export function CalcScreen({ calcKey, id }: { calcKey?: string; id?: string }) {
  if (id) return <CalcRecord id={id} />;
  if (calcKey) return <CalcList calcKey={calcKey} />;
  return <CalcHub />;
}

/* --------------------------------------------------------------- what is saved */

/** Every saved calculation on this device, newest first, kept current. */
function useCalcs(): ToolStudy[] | null {
  const [list, setList] = useState<ToolStudy[] | null>(null);
  const load = useCallback(async () => setList((await listAllStudies()).filter(s => s.tool === 'calc')), []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  return list;
}

/** Which of them a page shows: a line's own, a project's own (and its lines'), else all — the same rule every tool's list keeps. */
function useShown(list: ToolStudy[] | null) {
  const onLine = useMemo(() => asked('line'), []);
  const inP = useInProject();
  const [scope, setScope] = useState<ProjectScope>('project');
  const put = useArchivedPlaces();
  const shown = useMemo(() => {
    const base = inScope(list ?? [], scope, inP.id, inP.lineIds).filter(s => {
      const k = s.workspaceId ? `ws:${s.workspaceId}` : s.projectId ? `job:${s.projectId}` : 'none';
      return !put.has(k) || (inP.id && s.projectId === inP.id);
    });
    return onLine ? base.filter(s => s.workspaceId === onLine) : base;
  }, [list, scope, inP.id, inP.lineIds, put, onLine]);
  return { shown, onLine, inP, scope, setScope };
}

/** A saved calculation on a list: its name, what it says, where it is — renamed and deleted where it sits. */
function CalcRow({ s, withTitle }: { s: ToolStudy; withTitle: boolean }) {
  const jobCan = useAccess(s.projectId ?? '');
  const may = s.projectId ? jobCan : OWNER;
  const [naming, setNaming] = useState(false);
  const said = calcSays(s);
  const def = calcByKey(s.agreed?.calc?.key);
  if (naming) return <li className="lt-li is-naming" data-study={s.id}><StudyRowName s={s} onDone={() => setNaming(false)} /></li>;
  return (
    <li className="lt-li" data-study={s.id}>
      <button type="button" className="lt-row" onClick={() => nav(studyHref(s))}>
        <b className="lt-what">{s.name || 'Not named'}</b>
        <span className={'lt-says ie-tone is-' + said.tone}>{said.text}</span>
        <span className="lt-where">{withTitle ? `${def?.title ?? 'Calculator'} · ` : ''}{said.verdict}</span>
      </button>
      {((may.edit && !s.closedAt) || may.remove) && (
        <span className="lt-acts">
          {may.edit && !s.closedAt && <button type="button" className="cw-link" onClick={() => setNaming(true)} aria-label={`Rename ${s.name || 'this calculation'}`}>Rename</button>}
          {may.remove && <button type="button" className="cw-link sp-rm" onClick={() => void removeStudy(s)} aria-label={`Delete ${s.name || 'this calculation'}`}>Delete</button>}
        </span>
      )}
    </li>
  );
}

/** The list's paper: every calculation shown, a page each (lib/studiesPdf). */
function useListPaper(shown: ToolStudy[], title: string) {
  const { projects } = useProjects();
  const lines = useFactoryLines();
  return async () => {
    try {
      const [{ saveStudiesPdf }, { listAllStandards }] = await Promise.all([import('../../lib/studiesPdf'), import('../../db')]);
      const items = shown.map(s => {
        const line = lines.find(l => l.id === s.workspaceId), job = projects.find(p => p.id === s.projectId);
        return { s, where: `${line ? `On ${line.name}` : 'On no line'} · ${job ? `attached to ${job.name}` : 'on no project'}` };
      });
      await saveStudiesPdf({ title, printed: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), items, standards: await listAllStandards(), ctx: { workspaces: lines } }, title);
    } catch (e) {
      console.error('calculators pdf failed', e);
      window.alert('Sorry — the PDF could not be made. Please try again.');
    }
  };
}

/* --------------------------------------------------------------------- the hub */

function CalcHub() {
  const list = useCalcs();
  const { shown, onLine, inP, scope, setScope } = useShown(list);
  const lines = useFactoryLines(onLine);
  const mayP = useAccess(inP.id ?? '');
  const lineName = onLine ? lines.find(l => l.id === onLine)?.name ?? 'this line' : undefined;
  const paper = useListPaper(shown, lineName ? `Calculators — ${lineName}` : inP.project && scope === 'project' ? `Calculators — ${inP.project.name}` : 'Calculators');
  const by = (key: string) => shown.filter(s => s.agreed?.calc?.key === key);
  const query = onLine ? `?line=${encodeURIComponent(onLine)}` : inP.id ? `?project=${encodeURIComponent(inP.id)}` : '';
  return (
    <div className="wrap qsl ie-list calc-hub">
      <PageHeader title="Calculators" says={<span className="sub">A sum for one situation, saved: what went in, the sentence it says, what it is worth in money, and a paper to show it. Change a figure and see the answer move; save the figures as the before and the next ones read as a before → after.</span>}
        papers={shown.length ? [{ label: 'Calculators — every one shown', for: 'each with what it says and the figures put in', make: paper }] : []} />
      {inP.id && <ProjectScopeChips name={inP.project?.name} lines={inP.lineIds.length} scope={scope} onScope={setScope} />}
      {onLine && (
        <div className="chip-row qsl-f" role="group" aria-label="Which line">
          <button type="button" className="chip on" aria-pressed>{lineName}</button>
          <button type="button" className="chip" onClick={() => nav('/calc')}>All lines</button>
        </div>
      )}
      {calcGroups().map(g => (
        <Section key={g.group} title={g.group} count={`${g.calcs.length} calculator${g.calcs.length === 1 ? '' : 's'}`} label={g.group}>
          <ul className="calc-cards">
            {g.calcs.map(c => {
              const mine = by(c.key), latest = mine[0];
              return (
                <li key={c.key}>
                  <button type="button" className="calc-card" data-calc-card={c.key} onClick={() => nav(`/calc/${c.key}${query}`)}>
                    <b>{c.title}</b>
                    <span className="sub">{c.says}</span>
                    <span className={'calc-card-n' + (mine.length ? '' : ' is-none')}>{mine.length ? `${mine.length} saved` : 'none saved yet'}</span>
                    {latest && <span className="sub calc-card-latest">{latest.name}: {calcSays(latest).verdict}</span>}
                    <span className="pl-tool-go" aria-hidden>›</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      ))}
      <Section title="Saved calculations" count={`${shown.length}`} label="Saved calculations">
        {list && shown.length === 0
          ? <p className="sub qsl-empty-p">{onLine ? `None on ${lineName} yet.` : inP.id && scope !== 'all' ? `None ${scope === 'project' ? 'on' : 'on the lines of'} ${inP.project?.name ?? 'this project'} yet.` : 'None yet — pick a calculator above, say what it is of, and put in the figures.'}{(!inP.id || mayP.edit) ? '' : ''}</p>
          : <ul className="lt-rows">{shown.map(s => <CalcRow key={s.id} s={s} withTitle />)}</ul>}
      </Section>
    </div>
  );
}

/* ------------------------------------------------------- one calculator's list */

function CalcList({ calcKey }: { calcKey: string }) {
  const def = calcByKey(calcKey);
  const list = useCalcs();
  const { shown: all, onLine, inP, scope, setScope } = useShown(list);
  const lines = useFactoryLines(onLine);
  const mayP = useAccess(inP.id ?? '');
  const mayAdd = !inP.id || mayP.edit;
  const [adding, setAdding] = useState(() => asked('add') === '1');
  const shown = all.filter(s => s.agreed?.calc?.key === calcKey);
  const lineName = onLine ? lines.find(l => l.id === onLine)?.name ?? 'this line' : undefined;
  const paper = useListPaper(shown, `${def?.title ?? 'Calculator'}${lineName ? ` — ${lineName}` : ''}`);
  const { projects } = useProjects();
  const groups = useMemo(() => {
    const by = new Map<string, ToolStudy[]>();
    for (const s of shown) { const k = s.workspaceId ? `ws:${s.workspaceId}` : s.projectId ? `job:${s.projectId}` : 'none'; by.set(k, [...(by.get(k) ?? []), s]); }
    return [...by.entries()].sort(([a], [b]) => (a === 'none' ? -1 : b === 'none' ? 1 : a.localeCompare(b)));
  }, [shown]);
  const groupName = (k: string) => (k === 'none' ? 'Not filed' : k.startsWith('ws:') ? lines.find(l => l.id === k.slice(3))?.name ?? 'A line' : `Project: ${projects.find(p => p.id === k.slice(4))?.name ?? 'a project'}`);
  if (!def) {
    return (
      <div className="wrap ie"><h1>That calculator isn’t in this version</h1><p className="sub">It may be newer than this build of the app.</p>
        <button type="button" className="btn" onClick={() => nav('/calc')}>Every calculator</button></div>
    );
  }
  const back = onLine ? `?line=${encodeURIComponent(onLine)}` : inP.id ? `?project=${encodeURIComponent(inP.id)}` : '';
  return (
    <div className="wrap qsl ie-list calc-list" data-calc-list={def.key}>
      <PageHeader eyebrow={<button type="button" className="linkish" onClick={() => nav(`/calc${back}`)}>All calculators</button>} title={def.title}
        says={<span className="sub">{def.says}. {def.question}</span>}
        primary={mayAdd ? { label: 'New calculation', run: () => setAdding(true) } : undefined}
        papers={shown.length ? [{ label: `${def.title} — every one shown`, for: 'each with what it says and the figures put in', make: paper }] : []} />
      {inP.id && <ProjectScopeChips name={inP.project?.name} lines={inP.lineIds.length} scope={scope} onScope={setScope} />}
      {onLine && (
        <div className="chip-row qsl-f" role="group" aria-label="Which line">
          <button type="button" className="chip on" aria-pressed>{lineName}</button>
          <button type="button" className="chip" onClick={() => nav(`/calc/${def.key}`)}>All lines</button>
        </div>
      )}
      {list && groups.length === 0 && (
        <div className="qsl-empty">
          <p>{onLine ? `None on ${lineName} yet.` : `No ${def.title.toLowerCase()} yet. Say what it is of, put in the figures, and the answer is worked out as you type.`}</p>
          {mayAdd && <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>New calculation</button>}
        </div>
      )}
      {groups.map(([k, rows]) => (
        <section key={k} className="qsl-g">
          <div className="qsl-gh"><h2>{groupName(k)}</h2><span className="sub">{rows.length} saved{k === 'none' ? ' — yours alone until you put one on a line' : ''}</span></div>
          <ul className="lt-rows">{rows.map(s => <CalcRow key={s.id} s={s} withTitle={false} />)}</ul>
        </section>
      ))}
      {(def.see ?? []).length > 0 && (
        <p className="sub calc-see">{def.see?.map(x => {
          const c = calcByKey(x.key);
          return c ? <span key={x.key}><button type="button" className="linkish" onClick={() => nav(`/calc/${c.key}${back}`)}>{c.title}</button> — {x.why}. </span> : null;
        })}</p>
      )}
      <NewCalc open={adding} def={def} onClose={() => setAdding(false)} onLine={onLine} project={inP.project && mayAdd ? { id: inP.project.id, name: inP.project.name, lineIds: inP.lineIds } : undefined} />
    </div>
  );
}

/** A NEW ONE — what it is of, and the line when it is known. A quick session until it is put somewhere. */
function NewCalc({ open, def, onClose, onLine, project }: { open: boolean; def: CalcDef; onClose: () => void; onLine?: string; project?: { id: string; name: string; lineIds: string[] } }) {
  const [name, setName] = useState('');
  const [lineId, setLineId] = useState(onLine ?? '');
  const [busy, setBusy] = useState(false);
  const pLines = project?.lineIds;
  useEffect(() => { if (open && !lineId && pLines) setLineId(startLine(pLines)); }, [open, lineId, pLines]);
  const factoryLines = useFactoryLines(onLine);
  const lines = useMemo(() => (pLines?.length ? [...factoryLines.filter(l => pLines.includes(l.id)), ...factoryLines.filter(l => !pLines.includes(l.id))] : factoryLines), [factoryLines, pLines]);
  const ready = !!name.trim() && !busy;
  const make = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      const t = now();
      const s: ToolStudy = { id: uid(), tool: 'calc', name: name.trim(), ...(lineId ? { workspaceId: lineId } : {}), ...(project ? { projectId: project.id } : {}),
        agreed: { calc: { key: def.key, inputs: startInputs(def) } }, facts: {}, uses: [], startedAt: t, createdAt: t, updatedAt: t };
      await putStudy(s);
      setName(''); onClose();
      nav(studyHref(s));
    } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={`New ${def.title.toLowerCase()}`}>
      <form className="lt-new" onSubmit={e => { e.preventDefault(); void make(); }}>
        {project && <p className="sub ie-for" data-for-project={project.id}>For <b>{project.name}</b> — it is the project’s, with everything else in it.</p>}
        <label className="field"><span className="field-label">What is it of?</span>
          <input className="text-input" value={name} maxLength={120} placeholder="e.g. Film reels for the packer" autoFocus onChange={e => setName(e.target.value)} aria-label="What is it of?" />
        </label>
        <label className="field"><span className="field-label">Which line? <i className="sub">optional — its cost figures can then be offered</i></span>
          <select className="text-input" value={lineId} aria-label="Which line" onChange={e => setLineId(e.target.value)}>
            <option value="">No line yet — a quick session</option>
            {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={!ready}>Start it</button>
      </form>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ one record */

function CalcRecord({ id }: { id: string }) {
  const [s, setS] = useState<ToolStudy | null | undefined>(undefined);
  const load = useCallback(async () => setS((await getStudy(id)) ?? null), [id]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const jobCan = useAccess(s?.projectId ?? '');
  const can = s?.projectId ? jobCan : OWNER;
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;
  if (s === undefined) return <div className="wrap ie"><p className="sub">Opening…</p></div>;
  if (s === null) {
    return (
      <div className="wrap ie"><h1>This calculation isn’t on this device</h1><p className="sub">It may have been deleted, or not synced here yet.</p>
        <button type="button" className="btn" onClick={() => nav('/calc')}>Every calculator</button></div>
    );
  }
  const c = studyCalc(s);
  if (!c) {
    return (
      <div className="wrap ie"><h1>{s.name || 'A calculation'}</h1><p className="sub">{s.agreed?.calc ? 'Its calculator isn’t in this version of the app — a newer build has it. Nothing has been lost: its figures are kept.' : 'It has no calculator yet.'}</p>
        <button type="button" className="btn" onClick={() => nav('/calc')}>Every calculator</button></div>
    );
  }
  return <Record s={s} def={c.def} agreed={c.agreed} can={can} me={me} />;
}

function Record({ s, def, agreed, can, me }: { s: ToolStudy; def: CalcDef; agreed: AgreedCalc; can: ReturnType<typeof canAt>; me?: string }) {
  const closed = !!s.closedAt;
  const canEdit = can.edit && !closed;
  const line = useLine(s.workspaceId);
  /* the figures as they are in the boxes now; the record follows a moment after the last key, never a write for every one */
  const [draft, setDraft] = useState<Inputs>(agreed.inputs);
  const [src, setSrc] = useState<Record<string, string> | undefined>(agreed.src);
  const queue = useRef<Record<string, { v: string | number | null; from?: string }>>({});
  const timer = useRef<number | undefined>(undefined);
  const dirty = useRef(false);
  /* writes on their way: what is read back while one is in flight may predate it, so the boxes are not reset from it */
  const inflight = useRef(0);
  const id = s.id;
  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const q = queue.current;
    queue.current = {};
    dirty.current = false;
    if (!Object.keys(q).length) return;
    inflight.current++;
    void patchStudy(id, cur => {
      let a = cur.agreed?.calc;
      if (!a) return {};
      for (const [k, e] of Object.entries(q)) a = e.v === null ? dropped(a, k) : typedOver(a, k, e.v, e.from);
      return { agreed: { ...cur.agreed, calc: a } };
    }).finally(() => { inflight.current--; });
  }, [id]);
  useEffect(() => { if (!dirty.current && inflight.current === 0) { setDraft(agreed.inputs); setSrc(agreed.src); } }, [agreed.inputs, agreed.src]);
  useEffect(() => () => flush(), [flush]);
  const edit = (field: string, raw: string | number, from?: string) => {
    const t = typeof raw === 'string' ? raw.trim() : raw;
    const kind = def.inputs.find(f => f.id === field)?.kind;
    /* a number box keeps a number once it reads as one ("1,500" → 1500); what does not read as one is kept as typed, and the answer says so */
    const kept: string | number = kind === 'number' && typeof t === 'string' && /^[-+]?[0-9,]*\.?[0-9]*$/.test(t) && t !== '' && Number.isFinite(Number(t.replace(/,/g, ''))) ? Number(t.replace(/,/g, '')) : t;
    setDraft(d => { if (t === '') { const { [field]: _g, ...rest } = d; void _g; return rest; } return { ...d, [field]: raw }; });
    setSrc(m => { const { [field]: _g, ...rest } = m ?? {}; void _g; const next = from ? { ...rest, [field]: from } : rest; return Object.keys(next).length ? next : undefined; });
    queue.current[field] = { v: t === '' ? null : kept, ...(from ? { from } : {}) };
    dirty.current = true;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 500);
  };

  const run: Run = useMemo(() => runCalc(def, draft), [def, draft]);
  const r = run.result;
  const needs = stillNeeded(def, draft);
  const { steps, tests } = useBetter(s, me);

  const saveBefore = () => {
    flush();
    void patchStudy(id, cur => {
      const a = cur.agreed?.calc;
      if (!a) return {};
      return { agreed: { ...cur.agreed, calc: { ...a, before: { at: now(), ...(me ? { by: me } : {}), inputs: { ...a.inputs }, ...(a.src ? { src: { ...a.src } } : {}) } } } };
    });
  };
  const clearBefore = () => void patchStudy(id, cur => { if (!cur.agreed?.calc) return {}; const { before: _b, ...a } = cur.agreed.calc; void _b; return { agreed: { ...cur.agreed, calc: a } }; });
  const makeIt = (field: string, value: string) => { edit(field, value); flush(); };

  const page = bandPage(def.title, s, r?.verdict, r?.tone, [['Catalogue', def.fc]]);
  const live = { ...agreed, inputs: draft, ...(src ? { src } : {}) };
  return (
    <div className="wrap ie ie-calc" data-calc-record={def.key}>
      <StudyBand page={page} s={s} what={def.title} canEdit={canEdit} canRemove={can.remove} />
      <div className="ln-under">
        <p className="sub ie-where">{def.question}</p>
        <WhereItSits s={s} can={can} />
      </div>
      {!canEdit && !closed && <p className="sub calc-ro" role="status">You can read this and take its paper; the figures are changed by the people doing the work.</p>}
      <div className="calc-body">
        <CalcForm def={def} draft={draft} src={src} disabled={!canEdit} line={line ? { ...line, name: line.name } : undefined} onEdit={(f, v) => edit(f, v)} onUse={(f, v, from) => edit(f, v, from)} onBlur={flush} problems={run.problems} />
        <div className="calc-out">
          {r
            ? <ResultView def={def} run={run} agreed={live} />
            : (
              <div className="calc-wait" role="status" data-calc="waiting">
                <h2>Waiting for the figures</h2>
                <p className="sub">{needs.length ? `To work it out: ${needs.join(' ')}` : run.problems.filter(p => p.block).map(p => p.say).join(' ')}</p>
              </div>
            )}
          {r && <BeforeBox def={def} agreed={live} canEdit={canEdit} ready={!run.blocked} onSave={saveBefore} onClear={clearBefore} />}
          {r && <WhatIf def={def} draft={draft} run={run} canEdit={canEdit} onMakeIt={makeIt} />}
        </div>
      </div>
      <UsedFor s={s} can={can} me={me} />
      <LeanPanel title="Action plan" className="ln-solo ln-plan-p">
        <LeanActions actions={raisedFrom(s, steps, tests)} empty="Nothing raised from it yet — Make it better raises a fix or a countermeasure from what it found." />
      </LeanPanel>
      {r && <LeanClosing closing={{ text: r.closing, tone: r.tone }} />}
      {s.createdAt && <p className="sub calc-when">Started {niceDay(isoDay(s.startedAt))}{s.updatedAt ? ` · last changed ${niceDay(isoDay(s.updatedAt))}` : ''}.</p>}
    </div>
  );
}
