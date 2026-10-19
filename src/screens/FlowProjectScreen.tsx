/* A PROJECT RUNNING A METHOD OF ITS OWN — its front page (lib/flow;
 * docs/PLATFORM-REVIEW.md §6.3).
 *
 * The lean page (docs/LEAN-PAGE.md), as every report and tool's page is
 * now: the band (the project, its method and version, where it is), the
 * tiles (steps done, gates passed, late, did not pass, problems open), then
 * the method's own picture — its stages in a strip, the stage open below it
 * with its steps on each machine and what its gate needs — then what it
 * means, the action plan (what is owed, by whom, by when) and the closing
 * line. Everything is read by the one runtime (lib/flow/runtime) the paper,
 * the rail and the control room read too.
 *
 * A step or a gate opens in a sheet over the page (ui/flow/RunParts). The
 * route carries the stage (?view=stage-<key>) so the phone's Back walks out
 * of it, and a step (?step=<stage>/<step>/<machine>) so a row in the control
 * room opens it.
 *
 * When a later version of its method is approved, the page says so under
 * the band and what moving would do is one tap away (ui/flow/ChangeParts
 * MoveSheet) — the project stays on its version until its owner moves it.
 * Under the closing line, Ask: a question answered from the project's own
 * facts, each sentence saying how it is known (lib/flow/ground; the
 * assistant, when on, for what the app cannot answer itself). */
import { useEffect, useMemo, useState } from 'react';
import { useRoute, withQuery } from '../state/useRoute';
import { listActivity, listAssets, methodFamily, onDataChange, putAsset } from '../db';
import { useAccess } from '../cloud/access';
import { accessLine } from '../lib/access';
import { uid, now } from '../lib/ids';
import { niceDay, todayISO } from '../lib/weeks';
import { fmtRelative } from '../lib/format';
import { setPeople } from '../lib/flow/operations';
import { useFlowProject, useOpContext } from '../lib/flow/useFlow';
import { flowLean, stageSquare, stageWord, stepSquare, stepWhy, stepWord } from '../lib/flow/view';
import type { ActivityEntry, GateCheck, Method } from '../lib/flow/records';
import { checkOfPass } from '../lib/flow/gateCheck';
import { measureNumber, stepsDoneSaid, type StageState, type StepInstance } from '../lib/flow/runtime';
import { LeanActions, LeanBand, LeanClosing, LeanInsights, LeanPanel, LeanTiles } from '../ui/Lean';
import { GateSheet, StepSheet } from '../ui/flow/RunParts';
import { Words } from '../ui/flow/MethodParts';
import { AskPanel, MoveSheet } from '../ui/flow/ChangeParts';
import { Icon } from '../ui/Icon';

function useActivity(projectId: string): ActivityEntry[] {
  const [log, setLog] = useState<ActivityEntry[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => void listActivity(projectId).then(x => { if (live) setLog(x); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId]);
  return log;
}

/** The approved version of a method's family, read as it changes. */
function useApproved(familyId: string | undefined): Method | undefined {
  const [m, setM] = useState<Method | undefined>(undefined);
  useEffect(() => {
    if (!familyId) return;
    let live = true;
    const load = () => void methodFamily(familyId).then(f => { if (live) setM(f.find(x => x.status === 'active')); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [familyId]);
  return m;
}

function StepRow({ s, onOpen, machineShown }: { s: StepInstance; onOpen: () => void; machineShown?: boolean }) {
  const why = stepWhy(s);
  return (
    <button type="button" className={'fw-row is-' + stepSquare(s)} onClick={onOpen} data-step={s.def.key} data-machine={s.machine ?? ''}
      aria-label={`${s.def.title}${s.machine ? ` — ${s.machine}` : ''}: ${stepWord(s)}`}>
      <span className={'nv-sq is-' + stepSquare(s)} aria-hidden />
      <span className="fw-row-t">
        <b>{s.def.title}{machineShown && s.machine ? <span className="sub"> — {s.machine}</span> : null}</b>
        {why && <span className="fw-row-why">{why}</span>}
      </span>
      <span className="fw-row-w">{stepWord(s)}{s.who ? <span className="sub"> · {s.who}</span> : null}</span>
    </button>
  );
}

export function FlowProjectScreen({ projectId }: { projectId: string }) {
  const { fp } = useFlowProject(projectId);
  const can = useAccess(projectId);
  const ctx = useOpContext(can.level);
  const route = useRoute();
  const log = useActivity(projectId);
  const [gateOpen, setGateOpen] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [adding, setAdding] = useState('');
  /* the version being moved onto, kept while the sheet says what happened */
  const [moving, setMoving] = useState<Method | null>(null);
  const approved = useApproved(fp?.method.familyId);
  const today = todayISO();
  const page = useMemo(() => (fp ? flowLean({
    project: fp.project, def: fp.method.definition, version: fp.method.version, startedOn: fp.project.flow?.startedOn,
    state: fp.state, problems: fp.problems, records: fp.records, machines: fp.machines, checks: fp.checks,
  }, today) : null), [fp, today]);

  if (fp === undefined) return <div className="wrap fw"><p className="sub">Opening…</p></div>;
  if (fp === null || !page) {
    return (
      <div className="wrap fw">
        <p className="sub">This project runs a method that has not reached this device yet. It will show once this device has synced.</p>
      </div>
    );
  }
  const s = fp.state;
  const view = route.query.get('view') ?? '';
  const chosen = s.stages.find(st => `stage-${st.key}` === view) ?? s.current ?? s.stages[s.stages.length - 1];
  const stepParam = route.query.get('step');
  const opened = stepParam ? (() => {
    const [sk, tk, ak] = stepParam.split('/');
    return s.stages.find(st => st.key === sk)?.steps.find(x => x.def.key === tk && (x.assetId ?? '') === (ak ?? ''));
  })() : undefined;
  const openStep = (x: StepInstance) => withQuery('step', `${x.stageKey}/${x.def.key}/${x.assetId ?? ''}`);
  const gateStage = gateOpen ? s.stages.find(st => st.key === gateOpen) : undefined;
  const roles = fp.method.definition.roles;
  const people = fp.project.flow?.people ?? {};
  const lineOf = accessLine(can, fp.project.lead ?? '');
  const newer = approved && approved.version > fp.method.version ? approved : undefined;

  const print = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      const { printFlowReport } = await import('../lib/flow/printReport');
      await printFlowReport(fp.project.id);
    } catch (e) {
      console.error('method report failed', e);
      window.alert('Sorry — the PDF could not be made. Please try again.');
    } finally { setPrinting(false); }
  };

  /* the chosen stage's steps: those done once for the job first, then each machine's */
  const once = chosen ? chosen.steps.filter(x => !x.assetId) : [];
  const byMachine = chosen ? fp.machines.map(m => ({ m, steps: chosen.steps.filter(x => x.assetId === m.id) })).filter(g => g.steps.length) : [];

  return (
    <div className="wrap fw fw-proj">
      <LeanBand page={page}>
        <div className="fw-band-acts">
          <button type="button" className="btn btn-sm" disabled={printing} onClick={() => void print()}><Icon name="document" size="1.05em" />Method report</button>
          <a className="btn btn-ghost btn-sm" href={`#/methods/${fp.method.id}`}>The method ›</a>
        </div>
      </LeanBand>
      {lineOf && <p className="sub">{lineOf}</p>}
      {newer && (
        <p className="fw-state is-n fw-newer" data-newer={newer.version}>
          <b>Version {newer.version} of the method is approved — this project runs version {fp.method.version}.</b>{' '}
          Its work stays as it is until {ctx.can.agree ? 'you move it' : 'its owner moves it'}.{' '}
          <button type="button" className="btn btn-sm" onClick={() => setMoving(newer)}>See what moving would do</button>
        </p>
      )}
      <LeanTiles tiles={page.tiles} />

      {/* THE STAGES, IN ORDER — each in its colour with its word */}
      <nav className="fw-strip" aria-label="The stages">
        {s.stages.map(st => {
          /* a pass the server's reading does not bear out is a failure, said */
          const unborne = checkOfPass(st.gate.pass, fp.checks)?.verdict === 'disagrees';
          return (
            <button key={st.key} type="button" className={'fw-sg is-' + (unborne ? 'r' : stageSquare(st)) + (chosen?.key === st.key ? ' on' : '')} aria-current={chosen?.key === st.key ? 'step' : undefined}
              onClick={() => withQuery('view', `stage-${st.key}`, true)} data-stage={st.key}>
              <span className="fw-sg-n">{st.index + 1}</span>
              <span className="fw-sg-t"><b>{st.name}</b><span className="fw-sg-w">{unborne ? 'Passed — not borne out' : stageWord(st)}</span></span>
            </button>
          );
        })}
      </nav>

      {chosen && (
        <LeanPanel title={`${chosen.name} — ${stepsDoneSaid(chosen, false)}`} className="fw-stage-run">
          {fp.method.definition.stages[chosen.index]?.purpose && <p className="sub">{fp.method.definition.stages[chosen.index].purpose}</p>}
          {chosen.ahead && <p className="sub is-a">Work recorded here before {chosen.gate.waitsOn} — kept; the gate still waits on it.</p>}
          {once.length > 0 && (
            <div className="fw-group">
              {byMachine.length > 0 && <h3 className="fw-group-h">For the whole job</h3>}
              {once.map(x => <StepRow key={x.def.key} s={x} onOpen={() => openStep(x)} />)}
            </div>
          )}
          {byMachine.map(({ m, steps }) => (
            <div key={m.id} className="fw-group" data-machine={m.name}>
              <h3 className="fw-group-h">{m.name}<span className="sub"> · {steps.filter(x => x.complete).length} of {steps.length} done</span></h3>
              {steps.map(x => <StepRow key={x.def.key} s={x} onOpen={() => openStep(x)} />)}
            </div>
          ))}
          {chosen.steps.length === 0 && <p className="sub">No steps in this stage.</p>}
          <GateLine stage={chosen} check={checkOfPass(chosen.gate.pass, fp.checks)} onOpen={() => setGateOpen(chosen.key)} />
        </LeanPanel>
      )}

      {/* WHAT IT MEASURES — each number before → now, against its target, every reading */}
      {s.measures.length > 0 && (
        <LeanPanel title="What it measures" className="fw-measured">
          <ul className="fw-list">
            {s.measures.map(m => (
              <li key={m.def.key} data-measure={m.def.key} className={m.met === true ? 'is-g' : ''}>
                <b>{m.says}</b>
                {m.readings.length > 0 && (
                  <span className="sub"> Readings: {m.readings.map(r => `${measureNumber(m.def, r.value)} — ${r.step}${r.machine ? `, ${r.machine}` : ''}${r.on ? `, ${niceDay(r.on)}` : ''}`).join(' · ')}.</span>
                )}
              </li>
            ))}
          </ul>
        </LeanPanel>
      )}

      <LeanPanel title="What it means"><LeanInsights insights={page.insights} /></LeanPanel>
      <LeanPanel title="The action plan">
        <LeanActions actions={page.actions} empty={page.actionsEmpty} onOpen={a => {
          if (a.open?.ref) withQuery('step', a.open.ref);
        }} />
      </LeanPanel>
      <LeanClosing closing={page.closing} />

      <LeanPanel title="Ask about it"><AskPanel fp={fp} /></LeanPanel>

      <LeanPanel title="Who does what">
        {roles.length === 0 ? <p className="sub">The method names no roles.</p> : (
          <ul className="fw-roles">
            {roles.map(r => (
              <li key={r.key} className="fw-role">
                <span className="fw-role-k">{r.name}</span>
                {ctx.can.agree
                  ? <Words value={people[r.key] ?? ''} label={`Who is ${r.name}`} placeholder="a name" onSave={v => void setPeople(ctx, fp.project.id, { ...people, [r.key]: v })} />
                  : <span>{people[r.key] || <span className="sub">nobody named</span>}</span>}
              </li>
            ))}
          </ul>
        )}
      </LeanPanel>

      <LeanPanel title={`Machines · ${fp.machines.length}`}>
        {fp.machines.length === 0 ? <p className="sub">None — every step is done once for the job.</p>
          : ctx.can.agree ? (
            /* a name typed over — the machine's steps stay with it (they hang off its id) */
            <ul className="fw-roles">
              {fp.machines.map((m, i) => (
                <li key={m.id} className="fw-role">
                  <Words value={m.name} label={`Machine ${i + 1}'s name`} onSave={v => {
                    if (!v) return;
                    void listAssets(fp.project.id).then(all => { const a = all.find(x => x.id === m.id); if (a) return putAsset({ ...a, name: v, updatedAt: now() }); });
                  }} />
                </li>
              ))}
            </ul>
          ) : <p>{fp.machines.map(m => m.name).join(' · ')}</p>}
        {ctx.can.agree && (
          <form className="fw-acts" onSubmit={e => {
            e.preventDefault();
            const name = adding.trim();
            if (!name) return;
            void putAsset({ id: uid(), projectId: fp.project.id, name, state: 'onSite', sort: fp.machines.length, updatedAt: now() }).then(() => setAdding(''));
          }}>
            <input className="text-input fw-in" value={adding} maxLength={80} placeholder="Another machine" aria-label="Another machine" onChange={e => setAdding(e.target.value)} />
            <button type="submit" className="btn btn-sm" disabled={!adding.trim()}>Add the machine</button>
          </form>
        )}
      </LeanPanel>

      <LeanPanel title="What has happened">
        {log.length === 0 ? <p className="sub">Nothing yet.</p> : (
          <ul className="fw-log">
            {log.slice(0, 25).map(e => (
              <li key={e.id}><span>{e.summary}</span><span className="sub"> · {e.who} · {fmtRelative(e.at)}{e.source === 'assistant' ? ' · proposed by the assistant' : ''}</span></li>
            ))}
          </ul>
        )}
      </LeanPanel>

      {opened && <StepSheet fp={fp} inst={opened} ctx={ctx} onClose={() => withQuery('step', null, true)} />}
      {gateStage && <GateSheet fp={fp} stage={gateStage} ctx={ctx} onClose={() => setGateOpen(null)} />}
      {moving && <MoveSheet projectId={fp.project.id} projectName={fp.project.name} to={moving} ctx={ctx} onClose={() => setMoving(null)} />}
    </div>
  );
}

/** The stage's gate in one line, under its steps — opens the gate. */
function GateLine({ stage, check, onOpen }: { stage: StageState; check?: GateCheck; onOpen: () => void }) {
  const g = stage.gate;
  const unmet = g.conditions.filter(c => c.blocking);
  /* Not met yet is not wrong: a gate waiting on its own steps is grey, one
     waiting on something else amber; red is kept for a day gone or a failure
     (CLAUDE.md, visual management) — the steps above carry those. */
  const onSteps = unmet.length > 0 && unmet.every(c => c.type === 'stepsDone');
  /* the server's reading beside the pass: borne out is quiet, not borne out red */
  const server = check?.verdict === 'disagrees' ? ' — not borne out by its records' : check?.verdict === 'agrees' ? ' — checked on the server' : '';
  const word = g.passed ? `Passed${g.pass?.doneOn ? ` ${niceDay(g.pass.doneOn)}` : ''}${g.pass?.override ? ' — over what was unmet' : ''}${server}`
    : g.waitsOn ? `Waits on ${g.waitsOn}`
      : g.canPass ? 'Ready to pass'
        : onSteps ? `Waits on its steps — ${stepsDoneSaid(stage, false)}` : `${unmet.length} thing${unmet.length === 1 ? '' : 's'} not met`;
  const tone = check?.verdict === 'disagrees' ? 'r' : g.passed ? 'g' : g.canPass ? 'a' : g.waitsOn || onSteps ? 'n' : 'a';
  return (
    <button type="button" className={'fw-gate-line is-' + tone} onClick={onOpen} data-gate={stage.key} {...(check ? { 'data-check': check.verdict } : {})}>
      <span className="fw-gate-k">The gate</span>
      <b>{word}</b>
      <span className="sub">{g.conditions.map(c => c.label).join(' · ')}</span>
      <span className="fw-gate-go">Open ›</span>
    </button>
  );
}
