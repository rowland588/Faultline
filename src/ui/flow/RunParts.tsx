/* RUNNING A METHOD ON THE FLOOR — one step, and one gate, each in a sheet
 * over the project's page (screens/FlowProjectScreen).
 *
 * THE STEP asks only what its answer needs (lib/flow/definition ANSWERS):
 * a task is done or hit a problem; a test passed or did not; paperwork is
 * here; a sign-off says who signed; a measurement takes its numbers and is
 * judged against its limits by the app; a form takes its boxes. Its photos
 * and files go through the same doors as every other piece of evidence in
 * the app (ui/EvidenceDoors, lib/media). "Done" is refused, in words, while
 * anything it needs is missing — the runtime's own list.
 *
 * THE GATE says each thing it needs, met or not, in its colour and its
 * words; a check confirmed by hand is confirmed at the pass, by name; an
 * owner may pass over what is unmet only with a reason, which is kept on the
 * pass and in the log; a gate passed can be reopened, last first, with a
 * reason. Every write goes through lib/flow/operations — the one way a
 * project running a method changes, with its permission check and its log. */
import { useEffect, useRef, useState } from 'react';
import type { DocRef } from '../../lib/testing';
import type { MediaRef } from '../../types';
import { getBlob, listStandards, listStandardsForLine, listStudies, listStudiesForLine, onDataChange, putBlob } from '../../db';
import { nav } from '../../state/useRoute';
import type { ToolStudy } from '../../lib/study';
import { studySays, studyTitle } from '../../lib/studyLinks';
import { answeredByRecord, componentOf } from '../../lib/flow/components';
import { readCapacity } from '../../lib/flow/toolRead';
import { inCapacityTool, type Standard } from '../../lib/standard';
import { uid } from '../../lib/ids';
import { niceDay } from '../../lib/weeks';
import { deliverBlob } from '../../lib/savePdf';
import { isTest, type FlowField } from '../../lib/flow/definition';
import type { StageState, StepInstance } from '../../lib/flow/runtime';
import {
  completeStep, passGate, recordStep, reopenGate, reopenStep, stepDidNotPass, tryAgain,
  type FlowProject, type OpContext, type OpResult, type StepPatch, type StepRef,
} from '../../lib/flow/operations';
import { stepSquare, stepWhy, stepWord } from '../../lib/flow/view';
import { Sheet } from '../Sheet';
import { Evidence } from '../EvidenceDoors';
import { EvidenceViewer } from '../Evidence';
import { offerUndo } from '../Undo';
import { Num, Words } from './MethodParts';
import { askFor } from './Asking';

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

/** One box of a step, as the person fills it — or, worked out, as the app says it. */
function FieldBox({ f, value, worked, onSave, disabled }: {
  f: FlowField; value: unknown; worked: unknown; onSave: (v: string | number | boolean) => void; disabled: boolean;
}) {
  const limit = f.min !== undefined && f.max !== undefined ? `between ${f.min} and ${f.max}` : f.min !== undefined ? `at least ${f.min}` : f.max !== undefined ? `at most ${f.max}` : '';
  const head = <span className="field-label">{f.label}{f.unit ? ` (${f.unit})` : ''}{f.required ? ' · needed' : ''}{limit ? ` · ${limit}` : ''}</span>;
  switch (f.type) {
    case 'calc':
      return (
        <div className="fw-f fw-calc" data-field={f.key}>{head}
          <b className="fw-calc-v">{typeof worked === 'number' ? `${fmt(worked)}${f.unit ? ` ${f.unit}` : ''}` : '—'}</b>
          <span className="sub">Worked out by the app{f.formula ? `: ${f.formula}` : ''}{typeof worked !== 'number' ? ' — once the numbers it needs are in' : ''}.</span>
        </div>
      );
    case 'number': case 'reading':
      return <label className="fw-f" data-field={f.key}>{head}<Num value={typeof value === 'number' ? value : typeof value === 'string' && value !== '' ? Number(value) : undefined} label={f.label} disabled={disabled} onSave={v => onSave(v ?? '')} /></label>;
    case 'date':
      return <label className="fw-f" data-field={f.key}>{head}<input type="date" className="text-input fw-in" aria-label={f.label} disabled={disabled} value={typeof value === 'string' ? value : ''} onChange={e => onSave(e.target.value)} /></label>;
    case 'choice':
      return (
        <label className="fw-f" data-field={f.key}>{head}
          <select className="text-input fw-in" aria-label={f.label} disabled={disabled} value={typeof value === 'string' ? value : ''} onChange={e => onSave(e.target.value)}>
            <option value="">—</option>
            {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
      );
    case 'yesno':
      return (
        <div className="fw-f" data-field={f.key}>{head}
          <div className="fw-seg" role="radiogroup" aria-label={f.label}>
            {[true, false].map(b => (
              <button key={String(b)} type="button" role="radio" aria-checked={value === b} disabled={disabled} className={'fw-seg-b' + (value === b ? ' on' : '')} onClick={() => onSave(b)}>{b ? 'Yes' : 'No'}</button>
            ))}
          </div>
        </div>
      );
    default:
      return <label className="fw-f" data-field={f.key}>{head}<Words value={typeof value === 'string' ? value : ''} label={f.label} disabled={disabled} onSave={v => onSave(v)} /></label>;
  }
}

/** A record a tool step may be answered by, as the step offers it. */
interface Offer { id: string; title: string; says: string }

/** A STEP DONE WITH ONE OF THE APP'S TOOLS — the tool's record attached and
 *  read: its verdict and its figures, which the step's gate and the method's
 *  measures read as boxes (lib/flow/toolRead). The tool's studies on the
 *  project's lines, and the project's own, are offered newest first; one
 *  not made yet is started in the tool itself, on the line, and attached
 *  here when it is. */
function ToolAnswer({ fp, inst, live, onAttach }: { fp: FlowProject; inst: StepInstance; live: boolean; onAttach: (studyId: string | undefined) => void }) {
  const tool = componentOf(inst.def.component?.tool);
  const [found, setFound] = useState<Offer[] | null>(null);
  const lines = fp.project.workspaceIds ?? [];
  useEffect(() => {
    if (!tool || !answeredByRecord(tool)) return;
    let alive = true;
    /* a product's Line capacity lives on its line standard; every other tool's record is a study */
    const load = () => void (tool.onStandard
      ? Promise.all([listStandards(fp.project.id), ...lines.map(l => listStandardsForLine(l))]).then(all => {
        const seen = new Map<string, Standard>();
        for (const sd of all.flat()) if (!sd.deletedAt && inCapacityTool(sd)) seen.set(sd.id, sd);
        return [...seen.values()].sort((a, b) => b.updatedAt - a.updatedAt).map(sd => { const r = readCapacity(sd); return { id: sd.id, title: r.name, says: r.verdict ?? '' }; });
      })
      : Promise.all([listStudies(fp.project.id), ...lines.map(l => listStudiesForLine(l))]).then(all => {
        const seen = new Map<string, ToolStudy>();
        for (const st of all.flat()) if (!st.deletedAt && st.tool === tool.studyTool) seen.set(st.id, st);
        return [...seen.values()].sort((a, b) => b.startedAt - a.startedAt).map(st => ({ id: st.id, title: studyTitle(st), says: studySays(st).verdict ?? '' }));
      })).then(offers => { if (alive) setFound(offers); });
    load();
    const off = onDataChange(load);
    return () => { alive = false; off(); };
  }, [fp.project.id, tool?.id, lines.join()]); // eslint-disable-line react-hooks/exhaustive-deps -- the lines by value
  if (!tool) return null;
  const studyId = inst.record?.studyId;
  /* the tool's own list on the job's line, its New open — the study is made
     there, as any of that tool's, and attached to this step as it is made
     (ui/flow/Asking: the New says so, and Undo takes it back off) */
  const open = (path = tool.listPath) => {
    if (live && answeredByRecord(tool)) {
      askFor({ ref: { projectId: fp.project.id, stageKey: inst.stageKey, stepKey: inst.def.key, ...(inst.assetId ? { assetId: inst.assetId } : {}) },
        tool: tool.studyTool ?? tool.id, step: inst.def.title, project: fp.project.name });
    }
    nav(`${path}?add=1${lines[0] ? `&line=${encodeURIComponent(lines[0])}` : ''}`);
  };
  if (!answeredByRecord(tool)) {
    return (
      <div className="fw-tool" data-tool={tool.id}>
        <span className="field-label">Done with {tool.name}</span>
        <p className="sub">{tool.gives}. Open it on the line, then say the step is done here.</p>
        <button type="button" className="btn btn-sm" onClick={() => open()}>Open {tool.name}</button>
      </div>
    );
  }
  return (
    <div className="fw-tool" data-tool={tool.id}>
      <span className="field-label">Answered by {tool.name}</span>
      {inst.tool ? (
        <div className="fw-tool-r">
          <a href={`#${inst.tool.href ?? ''}`}><b>{inst.tool.name}</b></a>
          <p className="sub">{inst.tool.verdict ? <b>{inst.tool.verdict}. </b> : null}{inst.tool.says}</p>
          {tool.figures.some(f => inst.tool?.figures[f.key] !== undefined) && (
            <ul className="fw-figs">
              {tool.figures.filter(f => inst.tool?.figures[f.key] !== undefined).map(f => (
                <li key={f.key} data-figure={f.key}><span className="sub">{f.label}</span> <b>{inst.tool?.figures[f.key]}{f.unit ? ` ${f.unit}` : ''}</b></li>
              ))}
            </ul>
          )}
          {live && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onAttach(undefined)}>Take it off the step</button>}
        </div>
      ) : studyId ? (
        <p className="sub">Its study has not reached this device yet — it will once this device has synced.</p>
      ) : (
        <>
          <p className="sub">{tool.gives}. Attach the one that answers this step, or start one — it is attached as it is made. Its figures{tool.figures.length ? ` (${tool.figures.map(f => f.label.toLowerCase()).join(', ')})` : ''} come into the step.</p>
          {found === null && <p className="sub">Looking…</p>}
          {found && found.length === 0 && <p className="sub">No {tool.name} on {lines.length ? 'this project’s line' : 'this project'} yet.</p>}
          {found && found.length > 0 && (
            <ul className="fw-list fw-tool-list">
              {found.slice(0, 8).map(o => (
                <li key={o.id} className="fw-tool-c" data-study={o.id}>
                  <span><b>{o.title}</b>{o.says ? <span className="sub"> · {o.says}</span> : null}</span>
                  {live && <button type="button" className="btn btn-sm" onClick={() => onAttach(o.id)}>Use this</button>}
                </li>
              ))}
            </ul>
          )}
          {live && <button type="button" className="btn btn-sm btn-ghost" onClick={() => open()}>Start a {tool.name} on the line</button>}
          {live && tool.alsoFrom && <button type="button" className="btn btn-sm btn-ghost" data-also={tool.alsoFrom.path} onClick={() => open(tool.alsoFrom?.path)}>{tool.alsoFrom.label}</button>}
        </>
      )}
    </div>
  );
}

/** THE STEP — what it is, what it needs, and its answer. */
export function StepSheet({ fp, inst, ctx, onClose }: { fp: FlowProject; inst: StepInstance; ctx: OpContext; onClose: () => void }) {
  const ref: StepRef = { projectId: fp.project.id, stageKey: inst.stageKey, stepKey: inst.def.key, ...(inst.assetId ? { assetId: inst.assetId } : {}) };
  const rec = inst.record;
  const step = inst.def;
  const [said, setSaid] = useState<{ text: string; bad: boolean } | null>(null);
  const [why, setWhy] = useState<'fail' | null>(null);
  const [note, setNote] = useState('');
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const edit = ctx.can.edit;
  const passed = fp.state.stages.find(s => s.key === inst.stageKey)?.gate.passed ?? false;
  /* a step on a gate already passed is the record of that gate: it is read, not changed */
  const live = edit && !passed;
  const done = inst.complete;
  const failedNow = rec?.outcome === 'failed';
  const said$ = (r: OpResult<unknown>) => setSaid(r.ok ? { text: r.said, bad: false } : { text: r.why, bad: true });
  const save = async (patch: StepPatch) => { const r = await recordStep(ctx, ref, patch); if (!r.ok) said$(r); };
  useEffect(() => { setSaid(null); setWhy(null); setNote(''); }, [inst.def.key, inst.assetId]);

  const attempts = fp.records.filter(r => r.kind === 'step' && r.stageKey === inst.stageKey && r.stepKey === step.key && (r.assetId ?? undefined) === (inst.assetId ?? undefined) && !r.deletedAt)
    .sort((a, b) => b.createdAt - a.createdAt);
  const earlier = attempts.slice(1);
  const media = rec?.media ?? [];
  const docs = rec?.docs ?? [];
  const failWord = isTest(step) ? 'Did not pass' : 'Hit a problem';

  const attach = async (files: FileList | null) => {
    if (!files?.length) return;
    const next: DocRef[] = [];
    for (const f of Array.from(files)) {
      const blobKey = `doc-${uid()}`;
      await putBlob(blobKey, f);
      next.push({ id: uid(), name: f.name, blobKey, mime: f.type || 'application/pdf', bytes: f.size, savedAt: Date.now() });
    }
    await save({ docs: [...docs, ...next] });
  };

  return (
    <Sheet open onClose={onClose} title={`${step.title}${inst.machine ? ` — ${inst.machine}` : ''}`}>
      <div className="fw-sheet fw-run" data-step={step.key} data-machine={inst.machine ?? ''}>
        <p className={'fw-state is-' + stepSquare(inst)}>
          <b>{stepWord(inst)}</b>
          {stepWhy(inst) && <span> — {stepWhy(inst)}</span>}
        </p>
        <p className="sub">
          {inst.who ? `For ${inst.who}` : 'Nobody named'}{inst.due && !done ? ` · due ${niceDay(inst.due)}` : ''}
          {inst.attempts > 1 ? ` · attempt ${inst.attempts}` : ''}{passed ? ' · its gate is passed' : ''}
        </p>
        {step.passesIf && <p className="fw-passes">Passes if: {step.passesIf}</p>}
        {step.help && <p className="sub">{step.help}</p>}

        {!done && live && (
          <div className="fw-row3">
            <label className="fw-f"><span className="field-label">Planned for</span>
              <input type="date" className="text-input fw-in" aria-label="Planned for" value={rec?.plannedFor ?? ''} onChange={e => void save({ plannedFor: e.target.value || undefined })} /></label>
            <label className="fw-f"><span className="field-label">Who</span>
              <Words value={rec?.who ?? ''} label="Who does it" placeholder={inst.who ?? 'a name'} onSave={v => void save({ who: v || undefined })} /></label>
          </div>
        )}

        {step.component && <ToolAnswer fp={fp} inst={inst} live={live && !done} onAttach={id => void save({ studyId: id })} />}

        {(step.fields ?? []).map(f => (
          <FieldBox key={f.key} f={f} value={rec?.values?.[f.key]} worked={inst.values[f.key]} disabled={!live || done}
            onSave={v => void save({ values: { [f.key]: v } })} />
        ))}
        {inst.outOfLimits.length > 0 && <p className="sub is-r">Outside its limit: {inst.outOfLimits.join('; ')}.</p>}

        {step.answer === 'signoff' && (
          <label className="fw-f"><span className="field-label">Signed by</span>
            <Words value={rec?.signedBy ?? ''} label="Signed by" placeholder={inst.who ?? 'who signed'} disabled={!live || done} onSave={v => void save({ signedBy: v || undefined })} /></label>
        )}

        {(edit || media.length > 0) && (
          <Evidence media={media} kind={isTest(step) ? 'test' : 'install'} onView={setViewing}
            {...(live ? { onAdd: async (refs: MediaRef[]) => { await save({ media: [...media, ...refs] }); } } : {})} />
        )}
        {(step.answer === 'paperwork' || (step.evidence?.files ?? 0) > 0 || docs.length > 0) && (
          <div className="fw-docs">
            <span className="field-label">Files{step.evidence?.files ? ` · ${step.evidence.files} needed` : ''}</span>
            {docs.map(d => (
              <div key={d.id} className="cx-doc">
                <button type="button" className="cx-doc-open" onClick={() => void (async () => {
                  const blob = await getBlob(d.blobKey);
                  if (!blob) { setSaid({ text: 'That file hasn’t reached this device yet — it will once this device has synced.', bad: true }); return; }
                  await deliverBlob(blob, d.name);
                })()}>
                  <span className="cx-pdf" aria-hidden>{d.mime.startsWith('image/') ? 'IMG' : 'PDF'}</span>
                  <span className="cx-doc-n">{d.name}</span>
                </button>
                {live && ctx.can.remove && <button type="button" className="btn btn-ghost btn-sm" onClick={() => void (async () => {
                  await save({ docs: docs.filter(x => x.id !== d.id) });
                  offerUndo(`Removed “${d.name}”`, async () => { await recordStep(ctx, ref, { docs: [...(inst.record?.docs ?? []).filter(x => x.id !== d.id), d] }); });
                })()}>Remove</button>}
              </div>
            ))}
            {live && <>
              <button type="button" className="cw-add" onClick={() => fileIn.current?.click()}>+ Attach a file</button>
              <input ref={fileIn} type="file" accept="application/pdf,image/*" multiple hidden aria-label="Attach a file" onChange={e => { void attach(e.target.files); e.target.value = ''; }} />
            </>}
          </div>
        )}

        <label className="fw-f"><span className="field-label">What was seen</span>
          <Words value={rec?.note ?? ''} label="What was seen" long disabled={!live} placeholder="Anything worth knowing — what was done, what was found" onSave={v => void save({ note: v || undefined })} /></label>

        {said && <p className={'sub' + (said.bad ? ' is-r' : ' is-g')} role="status">{said.text}</p>}

        {live && !done && !failedNow && why !== 'fail' && (
          <div className="fw-acts">
            <button type="button" className="btn btn-primary" onClick={() => void completeStep(ctx, ref).then(said$)}>
              {step.answer === 'check' ? 'Passed' : step.answer === 'measure' ? 'Save the result' : step.answer === 'signoff' ? 'Signed' : step.answer === 'paperwork' ? 'Here they are' : 'Done'}
            </button>
            <button type="button" className="btn" onClick={() => setWhy('fail')}>{failWord}</button>
            {inst.missing.length > 0 && <span className="sub">Still needs {inst.missing.join(', ')}.</span>}
          </div>
        )}
        {live && why === 'fail' && (
          <div className="fw-f">
            <span className="field-label">{failWord} — what happened?</span>
            <textarea className="text-input fw-in" rows={2} autoFocus value={note} aria-label="What happened" onChange={e => setNote(e.target.value)} />
            <div className="fw-acts">
              <button type="button" className="btn btn-primary" disabled={!note.trim()} onClick={() => void stepDidNotPass(ctx, ref, note).then(r => { said$(r); if (r.ok) setWhy(null); })}>Keep it</button>
              <button type="button" className="btn btn-ghost" onClick={() => setWhy(null)}>Cancel</button>
            </div>
          </div>
        )}
        {live && failedNow && (
          <div className="fw-acts">
            <button type="button" className="btn btn-primary" onClick={() => void tryAgain(ctx, ref).then(said$)}>Try again</button>
            <span className="sub">A new attempt; this one is kept as its history.</span>
          </div>
        )}
        {done && rec && ctx.can.agree && !passed && (
          <div className="fw-acts">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void reopenStep(ctx, rec.id, fp.project.id).then(said$)}>Take back “done”</button>
          </div>
        )}

        {earlier.length > 0 && (
          <div className="fw-f"><span className="field-label">Earlier attempts</span>
            <ul className="fw-log">
              {earlier.map(a => (
                <li key={a.id}>
                  <b className={a.outcome === 'failed' ? 'is-r' : a.outcome === 'done' ? 'is-g' : ''}>{a.outcome === 'failed' ? failWord : a.outcome === 'done' ? 'Done' : a.outcome === 'notRun' ? 'Did not happen' : 'Planned'}</b>
                  {a.doneOn ? <span className="sub"> · {niceDay(a.doneOn)}</span> : null}
                  {a.values && Object.keys(a.values).length ? <span className="sub"> · {Object.entries(a.values).map(([k, v]) => `${(step.fields ?? []).find(f => f.key === k)?.label ?? k} ${String(v)}`).join(', ')}</span> : null}
                  {a.note ? <span className="sub"> — {a.note}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)}
        {...(live && ctx.can.remove ? { onRemove: () => {
          const m = viewing;
          void save({ media: media.filter(x => x.id !== m.id) }).then(() => offerUndo('Removed the picture', async () => { await recordStep(ctx, ref, { media: [...(inst.record?.media ?? []).filter(x => x.id !== m.id), m] }); }));
          setViewing(null);
        } } : {})} />}
    </Sheet>
  );
}

/** THE GATE — what it needs, met or not, and the pass. */
export function GateSheet({ fp, stage, ctx, onClose }: { fp: FlowProject; stage: StageState; ctx: OpContext; onClose: () => void }) {
  const g = stage.gate;
  const manual = g.conditions.filter(c => c.manual);
  const [checks, setChecks] = useState<Record<string, string>>({});
  const [override, setOverride] = useState('');
  const [reason, setReason] = useState('');
  const [said, setSaid] = useState<{ text: string; bad: boolean } | null>(null);
  const blockers = g.conditions.filter(c => c.blocking);
  const unchecked = manual.filter(c => !checks[c.id]?.trim());
  const needsOverride = blockers.length > 0 || unchecked.length > 0;
  const owner = ctx.can.agree;
  const pass = g.pass;

  const doPass = async () => {
    const r = await passGate(ctx, { projectId: fp.project.id, stageKey: stage.key, checks, ...(needsOverride && override.trim() ? { override } : {}) });
    setSaid(r.ok ? { text: r.said, bad: false } : { text: r.why, bad: true });
  };
  const doReopen = async () => {
    const r = await reopenGate(ctx, fp.project.id, stage.key, reason);
    setSaid(r.ok ? { text: r.said, bad: false } : { text: r.why, bad: true });
    if (r.ok && r.undo) offerUndo(`${stage.name}'s gate reopened`, r.undo);
  };

  return (
    <Sheet open onClose={onClose} title={`${stage.name}'s gate`}>
      <div className="fw-sheet fw-run" data-gate={stage.key}>
        {pass ? (
          <p className="fw-state is-g"><b>Passed {pass.doneOn ? niceDay(pass.doneOn) : ''}{pass.who ? ` by ${pass.who}` : ''}</b>
            {pass.override ? <span> — over what was unmet: “{pass.override}”</span> : null}</p>
        ) : g.waitsOn ? (
          <p className="fw-state is-n"><b>Waits on {g.waitsOn}</b> — the gates are passed in order.</p>
        ) : g.canPass && !manual.length ? (
          <p className="fw-state is-a"><b>Ready to pass</b>{g.warnings.length ? ` — ${g.warnings.length} warning${g.warnings.length === 1 ? '' : 's'} to note` : ''}</p>
        ) : (
          <p className="fw-state is-a"><b>{blockers.length ? `${blockers.length} thing${blockers.length === 1 ? '' : 's'} not met yet` : 'Its checks to confirm'}</b></p>
        )}

        <ul className="fw-gate-list">
          {g.conditions.map(c => {
            /* unmet is waiting, not wrong: amber when it holds the gate, grey for a warning or a check to confirm */
            const tone = c.met ? 'g' : c.manual ? (pass?.checks?.[c.id] ? 'g' : 'n') : c.blocking ? 'a' : 'n';
            return (
              <li key={c.id} className={'fw-gc is-' + tone} data-cond={c.id}>
                <span className="fw-gc-m" aria-hidden>{tone === 'g' ? '✓' : tone === 'a' ? '✕' : '·'}</span>
                <span className="fw-gc-t"><b>{c.label}</b>
                  <span className="sub"> — {c.manual && pass?.checks?.[c.id] ? `confirmed by ${pass.checks[c.id]}` : c.why}{!c.met && !c.manual && c.policy === 'warn' ? ' (a warning)' : ''}</span>
                </span>
                {c.manual && !pass && owner && !g.waitsOn && (
                  <input className="text-input fw-in fw-gc-in" aria-label={`${c.label} — confirmed by`} placeholder="confirmed by — a name"
                    value={checks[c.id] ?? ''} onChange={e => setChecks(x => ({ ...x, [c.id]: e.target.value }))} />
                )}
              </li>
            );
          })}
        </ul>
        {pass?.openAtPass?.length ? <p className="sub">Open when it was passed: {pass.openAtPass.join('; ')}.</p> : null}

        {!pass && !owner && <p className="sub">Passing a gate is the project owner’s.</p>}
        {!pass && owner && !g.waitsOn && (
          <>
            {needsOverride && (
              <label className="fw-f"><span className="field-label">To pass it with {blockers.length ? 'what is unmet' : 'a check not confirmed'} — say why (kept with the pass)</span>
                <textarea className="text-input fw-in" rows={2} value={override} aria-label="Why it is passed anyway" onChange={e => setOverride(e.target.value)} /></label>
            )}
            <div className="fw-acts">
              <button type="button" className="btn btn-primary" disabled={needsOverride && !override.trim()} onClick={() => void doPass()}>
                {needsOverride ? 'Pass it anyway' : 'Pass the gate'}
              </button>
              {g.warnings.length > 0 && <span className="sub">The pass will say: {g.warnings.map(w => w.label).join('; ')}.</span>}
            </div>
          </>
        )}
        {pass && owner && (
          <div className="fw-f">
            <span className="field-label">Reopen it — say why</span>
            <textarea className="text-input fw-in" rows={2} value={reason} aria-label="Why it is reopened" onChange={e => setReason(e.target.value)} />
            <div className="fw-acts">
              <button type="button" className="btn" disabled={!reason.trim()} onClick={() => void doReopen()}>Reopen the gate</button>
              <span className="sub">The pass stays in the history.</span>
            </div>
          </div>
        )}
        {said && <p className={'sub' + (said.bad ? ' is-r' : ' is-g')} role="status">{said.text}</p>}
        <p className="sub">{stage.done} of {stage.total} step{stage.total === 1 ? '' : 's'} done in {stage.name}.</p>
      </div>
    </Sheet>
  );
}
