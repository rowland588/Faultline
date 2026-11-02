/* SCORED REGISTERS — hub, one register’s saved rankings, one record (FC-064 criticality first). */
import { Commentary } from '../../ui/Commentary';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getStudy, listAllStudies, onDataChange, patchStudy, putStudy } from '../../db';
import { useAccess } from '../../cloud/access';
import { can as canAt } from '../../lib/access';
import { inScope, startLine, type ProjectScope } from '../../lib/inProject';
import { asked } from '../../lib/lines';
import { useInProject } from '../../lib/useInProject';
import { useFactoryLines, useArchivedPlaces } from '../../lib/useFactoryLines';
import { burdenOf, fmtGBP } from '../../lib/cost';
import { now, uid } from '../../lib/ids';
import { bandPage } from '../../lib/lean';
import { niceDay, isoDay } from '../../lib/weeks';
import { nav } from '../../state/useRoute';
import type { AgreedScored, ScoredCriterion, ScoredRow, ToolStudy } from '../../lib/study';
import { studyHref } from '../../lib/studyLinks';
import { PageHeader, Section } from '../../ui/parts';
import { Sheet } from '../../ui/Sheet';
import { ProjectScopeChips } from '../../ui/ProjectScope';
import { LeanClosing, LeanPanel, LeanTiles } from '../../ui/Lean';
import { StudyBand, removeStudy, StudyRowName } from '../../ui/StudyActs';
import { WhereItSits } from '../../ui/StudyPlace';
import { PughEditor } from '../pugh/PughEditor';
import { RegisterEditor } from './RegisterEditor';
import { SkillsEditor } from '../skills/SkillsEditor';
import { ChecklistEditor } from './ChecklistEditor';
import { lineDay } from '../../lib/lineLoss';
import { scoredByKey, scoredGroups } from './registry';
import { newScoredStudy, scoredSays, scoredTitle, studyScored } from './scored';
import type { ScoredDef, ScoredField } from './types';

const OWNER = canAt('owner');

export function ScoredScreen({ scoredKey, id }: { scoredKey?: string; id?: string }) {
  if (id) return <ScoredRecord id={id} />;
  if (scoredKey) return <ScoredList scoredKey={scoredKey} />;
  return <ScoredHub />;
}

function useScoredList(): ToolStudy[] | null {
  const [list, setList] = useState<ToolStudy[] | null>(null);
  const load = useCallback(async () => setList((await listAllStudies()).filter(s => s.tool === 'scored')), []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  return list;
}

function useShown(list: ToolStudy[] | null) {
  const inP = useInProject();
  const [scope, setScope] = useState<ProjectScope>('project');
  const put = useArchivedPlaces();
  const shown = useMemo(() => inScope(list ?? [], scope, inP.id, inP.lineIds).filter(s => {
    const k = s.workspaceId ? `ws:${s.workspaceId}` : s.projectId ? `job:${s.projectId}` : 'none';
    return !put.has(k) || (inP.id && s.projectId === inP.id);
  }), [list, scope, inP.id, inP.lineIds, put]);
  return { shown, inP, scope, setScope };
}

/** Every study on the device, for a register that reads the records beside it (a control plan reads the FMEAs and the check logs of its line or project). */
function useBesideStudies(on: boolean): ToolStudy[] {
  const [beside, setBeside] = useState<ToolStudy[]>([]);
  useEffect(() => { if (!on) return undefined; const load = async () => setBeside(await listAllStudies()); void load(); return onDataChange(() => void load()); }, [on]);
  return beside;
}

function ScoredRowItem({ s, beside }: { s: ToolStudy; beside: readonly ToolStudy[] }) {
  const jobCan = useAccess(s.projectId ?? '');
  const may = s.projectId ? jobCan : OWNER;
  const [naming, setNaming] = useState(false);
  const said = scoredSays(s, { studies: beside });
  if (naming) return <li className="lt-li is-naming" data-study={s.id}><StudyRowName s={s} onDone={() => setNaming(false)} /></li>;
  return (
    <li className="lt-li" data-study={s.id}>
      <button type="button" className="lt-row" onClick={() => nav(studyHref(s))}>
        <b className="lt-what">{s.name || 'Not named'}</b>
        <span className={'lt-says ie-tone is-' + said.tone}>{said.text}</span>
        <span className="lt-where">{scoredTitle(s)} · {said.verdict}</span>
      </button>
      {may.remove && <span className="lt-acts"><button type="button" className="cw-link sp-rm" onClick={() => void removeStudy(s)}>Delete</button></span>}
      {may.edit && !s.closedAt && <span className="lt-acts"><button type="button" className="cw-link" onClick={() => setNaming(true)}>Rename</button></span>}
    </li>
  );
}

function ScoredHub() {
  const list = useScoredList();
  const { shown } = useShown(list);
  const beside = useBesideStudies(shown.some(s => !!scoredByKey(s.agreed?.scored?.key)?.register));
  const groups = scoredGroups();
  return (
    <div className="wrap ie">
      <PageHeader title="Scored registers" says="Machines and countermeasures ranked on agreed scales — criticality, impact and effort — and the Pugh matrix for choosing between solutions." />
      {groups.map(g => (
        <Section key={g.group} title={g.group}>
          <ul className="pl-tool">
            {g.defs.map(d => {
              const n = shown.filter(s => s.agreed?.scored?.key === d.key).length;
              return (
                <li key={d.key}><button type="button" className="pl-tool-card" onClick={() => nav(`/scored/${d.key}`)}>
                  <b>{d.title}</b><span className="sub">{d.says}</span><span className="sub">{n ? `${n} saved` : 'None yet'}</span>
                </button></li>
              );
            })}
          </ul>
        </Section>
      ))}
      {shown.length > 0 && (
        <Section title="Saved rankings">
          <ul className="lt-rows">{shown.map(s => <ScoredRowItem key={s.id} s={s} beside={beside} />)}</ul>
        </Section>
      )}
    </div>
  );
}

function ScoredList({ scoredKey }: { scoredKey: string }) {
  const def = scoredByKey(scoredKey);
  const list = useScoredList();
  const { shown, inP, scope, setScope } = useShown(list);
  const rows = shown.filter(s => s.agreed?.scored?.key === scoredKey);
  const beside = useBesideStudies(!!def?.register);
  const [adding, setAdding] = useState(() => asked('add') === '1');   // ?add=1 — a method page's New lands on the sheet
  const jobCan = useAccess(inP.id ?? '');
  const mayAdd = inP.id ? jobCan.edit : OWNER.edit;
  if (!def) return <div className="wrap ie"><p className="sub">This register isn’t in the app yet.</p></div>;
  return (
    <div className="wrap ie">
      <PageHeader eyebrow={<button type="button" className="linkish" onClick={() => nav('/scored')}>Scored registers</button>} title={def.title} says={def.says}
        primary={mayAdd ? { label: def.register?.asks.newLabel ?? 'New ranking', run: () => setAdding(true) } : undefined} />
      {inP.id && <ProjectScopeChips name={inP.project?.name} lines={inP.lineIds.length} scope={scope} onScope={setScope} />}
      {rows.length === 0 && <p className="sub qsl-empty">{def.matrix?.asks.empty ?? def.register?.asks.empty ?? `No ${def.title.toLowerCase()} yet — start one and score each ${def.noun ?? 'machine'}.`}</p>}
      <ul className="lt-rows">{rows.map(s => <ScoredRowItem key={s.id} s={s} beside={beside} />)}</ul>
      <NewScored open={adding} def={def} onClose={() => setAdding(false)} project={inP.project ? { id: inP.project.id, lineIds: inP.lineIds } : undefined} />
    </div>
  );
}

function NewScored({ open, def, onClose, project }: { open: boolean; def: ScoredDef; onClose: () => void; project?: { id: string; lineIds: string[] } }) {
  const [name, setName] = useState('');
  const [lineId, setLineId] = useState('');
  const lines = useFactoryLines();
  useEffect(() => { if (open && !lineId && project?.lineIds?.length) setLineId(startLine(project.lineIds)); }, [open, lineId, project]);
  const ready = name.trim() && lineId;
  const make = async () => {
    if (!ready) return;
    const s = newScoredStudy(def, { name: name.trim(), workspaceId: lineId, projectId: project?.id, now: now() });
    await putStudy(s);
    onClose();
    nav(studyHref(s));
  };
  return (
    <Sheet open={open} onClose={onClose} title={def.register?.asks.newLabel ?? `New ${def.title.toLowerCase()}`}>
      <form className="lt-new" onSubmit={e => { e.preventDefault(); void make(); }}>
        <label className="field"><span className="field-label">{def.matrix?.asks.name ?? def.register?.asks.name ?? 'What line is this for?'}</span>
          <input className="text-input" value={name} onChange={e => setName(e.target.value)} placeholder={def.matrix?.asks.placeholder ?? def.register?.asks.placeholder ?? 'e.g. Line 2 — October review'} /></label>
        <label className="field"><span className="field-label">Line</span>
          <select className="text-input" value={lineId} onChange={e => setLineId(e.target.value)}>
            <option value="">Choose a line</option>
            {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select></label>
        <button type="submit" className="btn btn-primary" disabled={!ready}>Start</button>
      </form>
    </Sheet>
  );
}

function ScoredRecord({ id }: { id: string }) {
  const [s, setS] = useState<ToolStudy | null | undefined>();
  const load = useCallback(async () => setS((await getStudy(id)) ?? null), [id]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const jobCan = useAccess(s?.projectId ?? '');
  const can = s?.projectId ? jobCan : OWNER;
  if (s === undefined) return <div className="wrap ie"><p className="sub">Opening…</p></div>;
  if (!s) return <div className="wrap ie"><p className="sub">Not on this device.</p></div>;
  const x = studyScored(s);
  if (!x) return <div className="wrap ie"><p className="sub">Not a scored register.</p></div>;
  return <Record s={s} def={x.def} can={can} onPatch={patch => void patchStudy(id, patch).then(() => load())} />;
}

function FieldBox({ f, row, disabled, onChange }: { f: ScoredField; row: ScoredRow; disabled: boolean; onChange: (v: number | boolean | undefined) => void }) {
  if (f.kind === 'tick') return <input type="checkbox" aria-label={f.label} disabled={disabled} checked={!!row[f.id as 'ccp' | 'standby']} onChange={e => onChange(e.target.checked)} />;
  const v = row[f.id as Exclude<ScoredField['id'], 'ccp' | 'standby'>];
  const score = f.kind === 'score';
  return (
    <input className={'text-input scored-num' + (score ? '' : ' scored-money')} type="number" aria-label={f.label} min={score ? 1 : 0} max={score ? 5 : undefined} step={score ? 1 : f.kind === 'hours' ? 0.5 : 1} inputMode={score ? 'numeric' : 'decimal'}
      disabled={disabled} value={v ?? ''} onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
  );
}

/** What a control plan prices its checks from, kept on the register beside the rows. */
const REGISTER_KEYS = ['speed', 'packCost', 'shiftMin', 'costToDate', 'margin', 'carryPct', 'eventCost', 'period', 'rsm'] as const;
const planInputs = (a: AgreedScored | undefined): Partial<Pick<AgreedScored, (typeof REGISTER_KEYS)[number]>> =>
  Object.fromEntries(REGISTER_KEYS.filter(k => a?.[k] !== undefined).map(k => [k, a?.[k]]));

function Record({ s, def, can, onPatch }: {
  s: ToolStudy; def: ScoredDef; can: ReturnType<typeof canAt>; onPatch: (fn: (cur: ToolStudy) => Partial<ToolStudy>) => void;
}) {
  const agreedKey = s.agreed?.scored?.key ?? def.key;
  const queue = useRef<{ rows: ScoredRow[]; criteria?: ScoredCriterion[]; datum?: string } | null>(null);
  const [rows, setRowsLocal] = useState<ScoredRow[]>(s.agreed?.scored?.rows ?? []);
  /* what the record holds is taken in only when nothing typed here is waiting to be saved — a reload of an older save must not undo the edit after it */
  useEffect(() => { if (!queue.current) setRowsLocal(s.agreed?.scored?.rows ?? []); }, [s.agreed?.scored?.rows]);
  /* a matrix (Pugh) also keeps its criteria and its datum */
  const [criteria, setCriteriaLocal] = useState<ScoredCriterion[]>(s.agreed?.scored?.criteria ?? []);
  useEffect(() => { if (!queue.current) setCriteriaLocal(s.agreed?.scored?.criteria ?? []); }, [s.agreed?.scored?.criteria]);
  const [datum, setDatumLocal] = useState<string>(s.agreed?.scored?.datum ?? def.matrix?.datumDefault ?? '');
  useEffect(() => { if (!queue.current) setDatumLocal(s.agreed?.scored?.datum ?? def.matrix?.datumDefault ?? ''); }, [s.agreed?.scored?.datum, def.matrix?.datumDefault]);
  const [rate, setRateLocal] = useState<number | undefined>(s.agreed?.scored?.rate);
  useEffect(() => { setRateLocal(s.agreed?.scored?.rate); }, [s.agreed?.scored?.rate]);
  const rateRef = useRef<number | undefined>(rate);
  rateRef.current = rate;
  /* a matrix may ask the cover wanted (a skills matrix) and what a day or a shift of the line not making costs (a readiness list, a skills matrix) */
  const [target, setTargetLocal] = useState<number | undefined>(s.agreed?.scored?.target);
  useEffect(() => { setTargetLocal(s.agreed?.scored?.target); }, [s.agreed?.scored?.target]);
  const targetRef = useRef<number | undefined>(target);
  targetRef.current = target;
  const [dayCost, setDayCostLocal] = useState<number | undefined>(s.agreed?.scored?.dayCost);
  useEffect(() => { setDayCostLocal(s.agreed?.scored?.dayCost); }, [s.agreed?.scored?.dayCost]);
  const dayCostRef = useRef<number | undefined>(dayCost);
  dayCostRef.current = dayCost;
  const lines = useFactoryLines();
  /* a register of cards reads the records beside it (a control plan: the FMEAs and the check logs of its line or project) */
  const beside = useBesideStudies(!!def.register);
  const line = lines.find(l => l.id === s.workspaceId);
  const lineRate = line?.labourRatePerHour && line.labourRatePerHour > 0 ? Math.round(line.labourRatePerHour * burdenOf(line) * 100) / 100 : undefined;
  /* what a day of the line not making is worth (its speed × its shifts less breaks × its margin a pack) — a shift's share when the page prices a shift */
  const dayMargin = line ? lineDay(line).margin : undefined;
  const lineMargin = dayMargin !== undefined && def.matrix?.dayCost ? Math.round(def.matrix.dayCost.unit === 'shift' ? dayMargin / Math.max(1, line?.shifts?.length ?? 1) : dayMargin) : undefined;
  const liveStudy = useMemo((): ToolStudy => ({
    ...s,
    agreed: { ...s.agreed, scored: { key: agreedKey, rows, ...(rate !== undefined ? { rate } : {}), ...(def.register ? planInputs(s.agreed?.scored) : {}), ...(def.matrix ? { criteria, datum, ...(target !== undefined ? { target } : {}), ...(dayCost !== undefined ? { dayCost } : {}) } : {}) } },
  }), [s, agreedKey, rows, rate, criteria, datum, target, dayCost, def.matrix, def.register]);
  const x = studyScored(liveStudy, { studies: beside });
  const result = x?.result;
  const problems = x?.problems;
  const ranked = x?.ranked && 'ok' in x.ranked ? x.ranked.ok : [];
  const canEdit = can.edit && !s.closedAt;
  const timer = useRef<number>();
  const flush = () => {
    if (!queue.current) return;
    const next = queue.current;
    queue.current = null;
    setRowsLocal(next.rows);
    onPatch(cur => ({
      agreed: {
        ...cur.agreed,
        scored: { ...cur.agreed?.scored, key: cur.agreed?.scored?.key ?? def.key, rows: next.rows, ...(next.criteria ? { criteria: next.criteria } : {}), ...(next.datum !== undefined ? { datum: next.datum } : {}), ...(rateRef.current !== undefined ? { rate: rateRef.current } : {}), ...(targetRef.current !== undefined ? { target: targetRef.current } : {}), ...(dayCostRef.current !== undefined ? { dayCost: dayCostRef.current } : {}) },
      },
      updatedAt: now(),
    }));
  };
  const setRate = (v: number | undefined) => {
    rateRef.current = v;
    setRateLocal(v);
    setRows(rows);
  };
  const setTarget = (v: number | undefined) => { targetRef.current = v; setTargetLocal(v); setRows(rows); };
  const setDayCost = (v: number | undefined) => { dayCostRef.current = v; setDayCostLocal(v); setRows(rows); };
  const setRows = (next: ScoredRow[]) => {
    queue.current = { ...queue.current, rows: next };
    setRowsLocal(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 400);
  };
  const setMatrix = (next: { rows: ScoredRow[]; criteria: ScoredCriterion[]; datum: string }) => {
    queue.current = { rows: next.rows, criteria: next.criteria, datum: next.datum };
    setRowsLocal(next.rows); setCriteriaLocal(next.criteria); setDatumLocal(next.datum);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 400);
  };
  const editRow = (rid: string, patch: Partial<ScoredRow>) => {
    setRows(rows.map(r => (r.id === rid ? { ...r, ...patch } : r)));
  };
  const addRow = () => setRows([...rows, { id: uid(), name: '' }]);
  const noun = def.noun ?? 'machine';
  const fields = def.fields ?? [];
  const cols = def.columns ?? [];
  const page = bandPage(def.title, s, result?.verdict, result?.tone, [['Catalogue', def.fc]]);
  return (
    <div className="wrap ie ie-scored" data-scored={def.key}>
      <StudyBand page={page} s={s} what={def.title} canEdit={canEdit} canRemove={can.remove} />
      <WhereItSits s={s} can={can} />
      <Commentary s={s} canEdit={can.edit} title="Notes" />
      <p className="sub">{def.question}</p>
      {problems?.length ? <p className="ie-warn" role="alert">{problems.join(' ')}</p> : null}
      {x?.left?.length ? <p className="ie-warn" role="alert">Left out of the order: {x.left.join(' ')}</p> : null}
      {result && <LeanTiles tiles={result.tiles} />}
      {result && <p className="ie-says">{result.sentence}</p>}
      {result?.money?.map(m => <p key={m} className="ie-says ie-money">{m}</p>)}
      {result?.also && (
        <LeanPanel title={result.also.title}>
          <ul className="ie-caveats">{result.also.lines.map(l => <li key={l}>{l}</li>)}</ul>
        </LeanPanel>
      )}
      {[...(result?.lists ?? []), ...(result?.screenLists ?? [])].map(l => (
        <LeanPanel key={l.title} title={l.title}>
          <ul className="ie-caveats">{l.lines.map(t => <li key={t}>{t}</li>)}</ul>
        </LeanPanel>
      ))}
      {def.matrix && (
        <Section title={def.matrix.section ?? 'Mark each option against the datum'}>
          {def.matrix.target && (
            <label className="field scored-rate"><span className="field-label">{def.matrix.target.label}</span>
              <input className="text-input scored-num" type="number" min={1} max={20} step={1} inputMode="numeric" aria-label="Cover wanted" disabled={!canEdit}
                value={target ?? def.matrix.target.default} onChange={e => setTarget(e.target.value === '' ? undefined : Number(e.target.value))} /></label>
          )}
          {def.matrix.dayCost && (
            <label className="field scored-rate"><span className="field-label">{def.matrix.dayCost.label}</span>
              <input className="text-input scored-num" type="number" min={0} step="1" inputMode="decimal" aria-label={`What a ${def.matrix.dayCost.unit} of the line not making costs`} disabled={!canEdit} value={dayCost ?? ''}
                onChange={e => setDayCost(e.target.value === '' ? undefined : Number(e.target.value))} />
              {canEdit && lineMargin !== undefined && dayCost !== lineMargin && <button type="button" className="cw-link" onClick={() => setDayCost(lineMargin)}>Use {line?.name ?? 'the line'}’s {fmtGBP(lineMargin)} a {def.matrix.dayCost.unit}</button>}
              {lineMargin === undefined && dayCost === undefined && <span className="sub">The line has no speed, shifts or margin a pack set — type one, or leave it and the money is named, not guessed.</span>}
            </label>
          )}
          {(def.matrix.editor ?? 'pugh') === 'skills'
            ? <SkillsEditor draft={{ rows, criteria }} table={x?.table} canEdit={canEdit} onChange={d => setMatrix({ rows: d.rows, criteria: d.criteria, datum })} />
            : def.matrix.editor === 'checklist' && def.matrix.checklist
              ? <ChecklistEditor rows={rows} list={def.matrix.checklist} canEdit={canEdit} onChange={next => setMatrix({ rows: next, criteria, datum })} />
              : <PughEditor draft={{ rows, criteria, datum }} table={x?.table} leaders={x?.leaders} canEdit={canEdit} onChange={setMatrix} />}
        </Section>
      )}
      {def.register && (
        <Section title={def.register.asks.noun === 'failure mode' ? 'Rate each failure mode' : def.key === 'fault-tree' ? 'The tree' : def.key === 'rsm' ? 'The runs' : `The ${def.register.asks.noun}s`}>
          <RegisterEditor def={def} rows={rows} canEdit={canEdit} study={liveStudy} studies={beside} onChange={setRows} rate={rate} onRate={setRate}
            line={line ? { name: line.name, rate: lineRate, speed: line.packsPerMin, packCost: line.marginPerPack, margin: line.marginPerPack, shiftMin: lineDay(line).minutes && line.shifts?.length ? Math.round((lineDay(line).minutes as number) / line.shifts.length) : undefined } : undefined}
            onInputs={patch => onPatch(cur => ({ agreed: { ...cur.agreed, scored: { ...(cur.agreed?.scored ?? { key: def.key, rows }), ...patch } }, updatedAt: now() }))} />
        </Section>
      )}
      {!def.matrix && !def.register && <Section title={`Score each ${noun}`}>
        <p className="sub">{def.help}</p>
        {def.asksRate && (
          <label className="field scored-rate"><span className="field-label">£ an hour for the people doing the work (optional)</span>
            <input className="text-input scored-num" type="number" min={0} step="0.01" inputMode="decimal" disabled={!canEdit} value={rate ?? ''}
              onChange={e => setRate(e.target.value === '' ? undefined : Number(e.target.value))} />
            {canEdit && lineRate !== undefined && rate !== lineRate && <button type="button" className="cw-link" onClick={() => setRate(lineRate)}>Use {line?.name ?? 'the line'}’s {fmtGBP(lineRate)} an hour</button>}
            {lineRate === undefined && rate === undefined && <span className="sub">The line has no wage set — type one, or leave it and the hours stay in hours.</span>}
          </label>
        )}
        <div className="scored-table-wrap">
          <table className="scored-table">
            <thead><tr><th>{noun[0].toUpperCase() + noun.slice(1)}</th>{fields.map(f => <th key={f.id}>{f.label}</th>)}{cols.map(c => <th key={c.label}>{c.label}</th>)}</tr></thead>
            <tbody>
              {rows.map(row => {
                const out = ranked.find(r => r.id === row.id || (row.name.trim() && r.name === row.name.trim()));
                return (
                  <tr key={row.id}>
                    <td><input className="text-input" aria-label={`${noun} name`} disabled={!canEdit} value={row.name} onChange={e => editRow(row.id, { name: e.target.value })} /></td>
                    {fields.map(f => <td key={f.id}><FieldBox f={f} row={row} disabled={!canEdit} onChange={v => editRow(row.id, { [f.id]: v })} /></td>)}
                    {cols.map(c => {
                      const tone = out && c.tone ? c.tone(out) : undefined;
                      return <td key={c.label}>{out ? (tone ? <span className={'ie-tone is-' + tone}>{c.of(out)}</span> : c.of(out)) : '—'}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {canEdit && <button type="button" className="btn" onClick={addRow}>+ Add a {noun}</button>}
      </Section>}
      {result && (
        <LeanPanel title="What this does not say">
          <ul className="ie-caveats">{result.caveats.map(c => <li key={c}>{c}</li>)}</ul>
          {def.limits.map(l => <p key={l} className="sub">{l}</p>)}
        </LeanPanel>
      )}
      {result && <LeanClosing closing={{ text: result.closing, tone: result.tone }} />}
      <p className="sub">Started {niceDay(isoDay(s.startedAt))}</p>
    </div>
  );
}
