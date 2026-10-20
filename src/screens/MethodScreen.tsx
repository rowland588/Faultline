/* ONE METHOD — read as a plan, written while it is a draft, approved, and
 * started on a project from here (lib/flow; docs/PLATFORM-REVIEW.md §6).
 *
 * The page says the method the way a person reads it: what it is for, who
 * does what, then every stage — its steps, each in a line of words, and what
 * its gate needs. While it is a draft every part is written where it sits
 * (a step and a gate's condition in a sheet), and the validator says, in
 * words, what still stops it running; Approve is offered only when nothing
 * does. An approved version is never edited — "Change it" makes the next
 * version as a draft, and the projects on this one keep running on it.
 * "Change it with the assistant" opens the design studio on this method
 * (screens/DesignScreen ?version=) — every change said before it is kept;
 * "Adapt it into a new method" opens it as the start of another (?from=);
 * "Make a copy" makes one at once. What it measures — each number with a
 * before and an after, read from its steps — is written here too. A
 * project on an older version is moved from here or its own page, only
 * after what moving does has been said.
 *
 * WHICH RECORD: the Method and its family (versions). WHERE IT SHOWS: the
 * library (screens/MethodsScreen), each project running it (its rail, its
 * Details), and the activity log. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { nav } from '../state/useRoute';
import { getMethod, listMethodActivity, methodFamily, onDataChange } from '../db';
import { useCanStartProjects } from '../cloud/access';
import { useProjects } from '../lib/useProjects';
import { niceDay, todayISO } from '../lib/weeks';
import { fmtRelative } from '../lib/format';
import { KIND_WORD, allSteps, fieldKeyOf, keyOf, rekeyField, rekeyStep, type FlowDefinition } from '../lib/flow/definition';
import { validateDefinition } from '../lib/flow/validate';
import { approveMethod, copyMethod, deleteDraft, draftNewVersion, saveDraft, startProject } from '../lib/flow/operations';
import { useOpContext } from '../lib/flow/useFlow';
import type { ActivityEntry, Method } from '../lib/flow/records';
import { ConditionEditor, MeasureEditor, NeedsList, StepEditor, Words, conditionSaid, measureSaid, stepSaid } from '../ui/flow/MethodParts';
import { MoveSheet } from '../ui/flow/ChangeParts';
import { useRoute } from '../state/useRoute';
import { useFactoryLines } from '../lib/useFactoryLines';
import { Sheet } from '../ui/Sheet';
import { Icon } from '../ui/Icon';
import { offerUndo } from '../ui/Undo';
import { useBuilderShown } from '../lib/parked';

const STATUS_WORD: Record<Method['status'], string> = { draft: 'Draft', active: 'Approved', retired: 'Retired' };

function useMethodPage(id: string) {
  const [m, setM] = useState<Method | null | undefined>(undefined);
  const [family, setFamily] = useState<Method[]>([]);
  const [log, setLog] = useState<ActivityEntry[]>([]);
  useEffect(() => {
    let live = true;
    const load = async () => {
      const one = await getMethod(id);
      if (!live) return;
      setM(one ?? null);
      if (!one) return;
      const fam = await methodFamily(one.familyId);
      const entries = await listMethodActivity(fam.map(f => f.id));
      if (!live) return;
      setFamily(fam);
      setLog(entries);
    };
    void load();
    const off = onDataChange(() => void load());
    return () => { live = false; off(); };
  }, [id]);
  return { m, family, log };
}

export function MethodScreen({ id }: { id: string }) {
  const { m, family, log } = useMethodPage(id);
  const may = useCanStartProjects();
  const builder = useBuilderShown();
  const ctx = useOpContext(may ? 'owner' : 'client');
  const { projects } = useProjects();
  /* THE DRAFT AS IT IS BEING WRITTEN — every change saved as it is made,
     one save after another so a quick second change never lands under the
     first; a change synced in from another device replaces it only when
     nothing here is waiting to be saved. */
  const [def, setDef] = useState<FlowDefinition | null>(null);
  const pending = useRef(0);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    if (m && pending.current === 0) setDef(m.definition);
  }, [m]);
  const [editing, setEditing] = useState<{ stage: number; step: string } | null>(null);
  const [cond, setCond] = useState<{ stage: number; id?: string } | null>(null);
  const route = useRoute();
  /* ?start=1: approved in the design studio — straight on to starting a project */
  const [starting, setStarting] = useState(() => route.query.get('start') === '1');
  const [moving, setMoving] = useState<{ id: string; name: string } | null>(null);
  const [measuring, setMeasuring] = useState<{ key?: string } | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const checked = useMemo(() => (def ? validateDefinition(def) : null), [def]);

  if (m === undefined || (m && !def)) return <div className="wrap fw"><p className="sub">Opening…</p></div>;
  if (m === null || !def) {
    return (
      <div className="wrap fw">
        <p className="sub">That method is not on this device.</p>
        <button type="button" className="btn btn-primary" onClick={() => nav('/methods')}>Every method</button>
      </div>
    );
  }
  const draft = m.status === 'draft';
  const edit = draft && ctx.can.agree;
  const change = (fn: (d: FlowDefinition) => void) => {
    const next = structuredClone(def);
    fn(next);
    setDef(next);
    pending.current++;
    chain.current = chain.current.then(async () => {
      const r = await saveDraft(ctx, m.id, next);
      if (!r.ok) setErr(r.why);
    }).finally(() => { pending.current--; });
  };
  const running = projects.filter(p => p.flow?.familyId === m.familyId);
  const steps = allSteps(def);
  const active = family.find(f => f.status === 'active');
  const openDraft = family.find(f => f.status === 'draft');
  const tell = (t: string) => { setSaid(t); window.setTimeout(() => setSaid(s => (s === t ? null : s)), 3200); };

  const approve = async () => {
    setErr(null);
    await chain.current;
    const r = await approveMethod(ctx, m.id);
    if (!r.ok) { setErr(r.issues?.length ? `${r.why} ${r.issues.map(i => i.message).join(' ')}` : r.why); return; }
    tell(r.said);
  };
  const newVersion = async () => {
    setErr(null);
    const r = await draftNewVersion(ctx, m.id);
    if (!r.ok) { setErr(r.why); return; }
    nav(`/methods/${r.value.id}`);
  };
  const copy = async () => {
    setErr(null);
    await chain.current;
    const r = await copyMethod(ctx, m.id);
    if (!r.ok) { setErr(r.why); return; }
    nav(`/methods/${r.value.id}`);
  };
  const remove = async () => {
    if (!confirm(`Delete the draft of “${def.name}” (version ${m.version})?`)) return;
    await chain.current;
    const r = await deleteDraft(ctx, m.id);
    if (!r.ok) { setErr(r.why); return; }
    const back = family.find(f => f.id !== m.id);
    nav(back ? `/methods/${back.id}` : '/methods');
    if (r.undo) offerUndo(`Deleted the draft of “${def.name}”`, r.undo);
  };

  const stageKeys = def.stages.map(s => s.key);
  const stepKeys = steps.map(s => s.step.key);
  const editingStep = editing ? def.stages[editing.stage]?.steps.find(s => s.key === editing.step) : undefined;
  const editingCond = cond?.id ? def.stages[cond.stage]?.gate.conditions.find(c => c.id === cond.id) : undefined;

  return (
    <div className="wrap fw">
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pl-eyebrow">METHOD{def.kind === 'other' ? '' : ` · ${KIND_WORD[def.kind].toUpperCase()}`} · <a href="#/methods" className="pl-fac">Every method ›</a></p>
          {edit
            ? <h1 className="fw-h1"><Words value={def.name} label="The method's name" onSave={v => { if (v) change(d => { d.name = v; }); }} /></h1>
            : <h1>{def.name}</h1>}
          <p className="pl-says">
            <span className={'fw-chip is-' + m.status}>{STATUS_WORD[m.status]} · version {m.version}</span>{' '}
            {m.status === 'active' && m.approvedAt ? `Approved ${niceDay(todayISO(new Date(m.approvedAt)))}${m.approvedBy ? ` by ${m.approvedBy}` : ''}.` : ''}
            {m.status === 'retired' ? ` Replaced${active ? ` by version ${active.version}` : ''} — projects on it still run on it.` : ''}
            {draft ? ' Write it here; approve it when it says it can run.' : ''}
          </p>
        </div>
        <div className="pace-head-actions">
          {m.status === 'active' && ctx.can.agree && <button type="button" className="btn btn-primary" onClick={() => setStarting(true)}>Start a project on it</button>}
          {m.status === 'active' && ctx.can.agree && <button type="button" className="btn" onClick={() => void newVersion()}>{openDraft ? `Open the draft (v${openDraft.version})` : 'Change it — a new version'}</button>}
          {/* the studio is parked (20 October, docs/DIRECTION.md) */}
          {builder && m.status === 'active' && ctx.can.agree && <button type="button" className="btn" onClick={() => nav(`/design?version=${m.id}`)}>Change it with the assistant</button>}
          {builder && ctx.can.agree && <button type="button" className="btn btn-ghost" onClick={() => nav(`/design?from=${m.id}`)}>Adapt it into a new method</button>}
          {ctx.can.agree && <button type="button" className="btn btn-ghost" onClick={() => void copy()}>Make a copy</button>}
          {m.status === 'retired' && active && <button type="button" className="btn" onClick={() => nav(`/methods/${active.id}`)}>Version {active.version}, in use ›</button>}
          {edit && <button type="button" className="btn btn-primary" disabled={!checked?.ok} onClick={() => void approve()}>Approve version {m.version}</button>}
          {edit && <button type="button" className="btn btn-ghost" onClick={() => void remove()}>Delete the draft</button>}
        </div>
      </header>
      {said && <p className="fac-saved" role="status">{said}</p>}
      {err && <p className="sub is-r" role="alert">{err}</p>}
      {!ctx.can.agree && <p className="sub">You can read this method. Only someone invited to the app writes and approves methods.</p>}

      {family.length > 1 && (
        <nav className="fw-versions" aria-label="Versions">
          {[...family].sort((a, b) => a.version - b.version).map(v => (
            <button key={v.id} type="button" className={'fw-ver is-' + v.status + (v.id === m.id ? ' on' : '')} aria-current={v.id === m.id ? 'page' : undefined}
              onClick={() => nav(`/methods/${v.id}`)}>v{v.version} · {STATUS_WORD[v.status]}</button>
          ))}
        </nav>
      )}
      {m.changeNote && <p className="sub">What changed in this version: {m.changeNote}</p>}
      {m.origin === 'assistant' && draft && (
        <p className="fw-state is-a fw-prop-note"><b>Proposed by the assistant — read every step before you approve it.</b> It is a draft like any other: change anything here; it runs only when you approve it.</p>
      )}

      {/* WHAT STOPS IT RUNNING — the validator's words, while it is a draft */}
      {draft && checked && (
        <section className={'fw-check-panel ' + (checked.ok ? 'is-ok' : 'is-bad')} aria-label="Can it run?">
          <h2 className="ln-h">{checked.ok ? 'It can run — approve it when you are happy with it' : `${checked.errors.length} thing${checked.errors.length === 1 ? '' : 's'} to put right before it can run`}</h2>
          {checked.errors.length > 0 && <ul className="fw-issues">{checked.errors.map((x, i) => <li key={i} className="is-r">{x.message}</li>)}</ul>}
          {checked.warnings.length > 0 && <ul className="fw-issues">{checked.warnings.map((x, i) => <li key={i} className="is-a">{x.message}</li>)}</ul>}
        </section>
      )}

      <section className="ln-panel">
        <h2 className="ln-h">What it is for</h2>
        {edit
          ? <Words value={def.purpose} label="What it is for" long placeholder="The question it answers, in a sentence" onSave={v => change(d => { d.purpose = v; })} />
          : <p>{def.purpose || <span className="sub">Not said yet.</span>}</p>}
        {edit && (
          <label className="fw-f fw-inline"><span className="field-label">Kind of work</span>
            <select className="text-input fw-in" value={def.kind} aria-label="Kind of work" onChange={e => change(d => { d.kind = e.target.value as FlowDefinition['kind']; })}>
              {(Object.keys(KIND_WORD) as FlowDefinition['kind'][]).map(k => <option key={k} value={k}>{KIND_WORD[k]}</option>)}
            </select></label>
        )}
        <p className="sub">{def.stages.length} stage{def.stages.length === 1 ? '' : 's'} · {steps.length} step{steps.length === 1 ? '' : 's'} · {steps.filter(s => s.step.per === 'machine').length} done on every machine</p>
      </section>

      {/* WHAT IT MEASURES — each number with a before and an after, read from its steps */}
      <section className="ln-panel" aria-label="What it measures">
        <h2 className="ln-h">What it measures</h2>
        {(def.measures ?? []).length === 0 && <p className="sub">Nothing yet{edit ? ' — add the number the work has to move (changeover minutes, packs a shift, Cpk); it is read from a step’s box or a tool’s figure, first reading the before, latest the after.' : '.'}</p>}
        <ul className="fw-list fw-measures">
          {(def.measures ?? []).map(x => (
            <li key={x.key} data-measure={x.key}>
              {edit ? <button type="button" className="fw-step-b" onClick={() => setMeasuring({ key: x.key })}><b>{x.name}</b><span className="sub">{measureSaid(def, x)}</span></button>
                : <><b>{x.name}</b> <span className="sub">· {measureSaid(def, x)}</span></>}
            </li>
          ))}
        </ul>
        {edit && <button type="button" className="btn btn-sm" onClick={() => setMeasuring({})}>Add a measure</button>}
      </section>

      <NeedsList def={def} />

      <section className="ln-panel" aria-label="Who does what">
        <h2 className="ln-h">Who does what</h2>
        {def.roles.length === 0 && <p className="sub">No roles yet{edit ? ' — add the people a step is given to: the OEM’s fitter, the site engineer, quality.' : '.'}</p>}
        <ul className="fw-roles">
          {def.roles.map((r, i) => (
            <li key={r.key} className="fw-role">
              {edit
                ? <>
                  <Words value={r.name} label={`Role ${i + 1}`} onSave={v => { if (v) change(d => { d.roles[i].name = v; }); }} />
                  <select className="text-input fw-in" value={r.side ?? ''} aria-label={`${r.name}: whose`} onChange={e => change(d => {
                    const side = e.target.value;
                    if (side === 'supplier' || side === 'site') d.roles[i].side = side; else delete d.roles[i].side;
                  })}>
                    <option value="">—</option><option value="supplier">the supplier’s</option><option value="site">the site’s</option>
                  </select>
                  <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove the role ${r.name}`} onClick={() => change(d => {
                    d.roles.splice(i, 1);
                    for (const s of d.stages) for (const t of s.steps) if (t.role === r.key) delete t.role;
                  })}>Remove</button>
                </>
                : <><b>{r.name}</b>{r.side ? <span className="sub"> · the {r.side}’s</span> : null}</>}
            </li>
          ))}
        </ul>
        {edit && <button type="button" className="btn btn-sm" onClick={() => change(d => {
          const name = `Role ${d.roles.length + 1}`;
          d.roles.push({ key: keyOf(name, d.roles.map(x => x.key)), name });
        })}>Add a role</button>}
      </section>

      {def.stages.map((st, si) => (
        <section key={st.key} className="ln-panel fw-stage" data-stage={st.key} aria-label={`Stage ${si + 1}: ${st.name}`}>
          <h2 className="ln-h fw-stage-h">
            <span className="fw-stage-n">{si + 1}</span>
            {edit ? <Words value={st.name} label={`Stage ${si + 1}'s name`} onSave={v => { if (v) change(d => { d.stages[si].name = v; }); }} /> : st.name}
          </h2>
          {edit
            ? <Words value={st.purpose ?? ''} label={`Stage ${si + 1}: what it is for`} placeholder="What this stage is for" onSave={v => change(d => { if (v) d.stages[si].purpose = v; else delete d.stages[si].purpose; })} />
            : st.purpose && <p className="sub">{st.purpose}</p>}
          <ol className="fw-steps">
            {st.steps.map(t => (
              <li key={t.key}>
                <button type="button" className="fw-step-b" onClick={() => setEditing({ stage: si, step: t.key })}>
                  <b>{t.title}</b>
                  <span className="sub">{stepSaid(def, t)}</span>
                  {t.passesIf && <span className="fw-passes">Passes if: {t.passesIf}</span>}
                </button>
              </li>
            ))}
          </ol>
          {st.steps.length === 0 && <p className="sub">No steps yet.</p>}
          {edit && <button type="button" className="btn btn-sm" onClick={() => {
            const title = 'A new step';
            const key = keyOf(title, stepKeys);
            change(d => { d.stages[si].steps.push({ key, title, per: 'machine', answer: 'done' }); });
            setEditing({ stage: si, step: key });
          }}><Icon name="plus" size="1em" />Add a step</button>}

          <div className="fw-gate">
            <h3 className="fw-gate-h">The gate — what {st.name} needs before the work moves on</h3>
            {st.gate.conditions.length === 0 && <p className="sub">Nothing — the gate can be passed at any time.</p>}
            <ul className="fw-conds">
              {st.gate.conditions.map(c => (
                <li key={c.id}>
                  <button type="button" className="fw-cond-b" disabled={!edit} onClick={() => setCond({ stage: si, id: c.id })}>
                    <span className={'fw-pol is-' + c.policy}>{c.policy === 'block' ? 'Waits' : 'Warns'}</span>
                    <span>{conditionSaid(def, c)}</span>
                  </button>
                </li>
              ))}
            </ul>
            {edit && <button type="button" className="btn btn-sm" onClick={() => setCond({ stage: si })}>Add what the gate needs</button>}
          </div>

          {edit && (
            <div className="fw-acts">
              <button type="button" className="btn btn-ghost btn-sm" disabled={si === 0} onClick={() => change(d => { const [x] = d.stages.splice(si, 1); d.stages.splice(si - 1, 0, x); })}>Move up</button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={si === def.stages.length - 1} onClick={() => change(d => { const [x] = d.stages.splice(si, 1); d.stages.splice(si + 1, 0, x); })}>Move down</button>
              <span className="fw-gap" />
              <button type="button" className="btn btn-ghost btn-sm is-danger" disabled={def.stages.length === 1} onClick={() => {
                if (st.steps.length && !confirm(`Take the stage “${st.name}” and its ${st.steps.length} step${st.steps.length === 1 ? '' : 's'} off the method?`)) return;
                change(d => { d.stages.splice(si, 1); });
              }}>Delete the stage</button>
            </div>
          )}
        </section>
      ))}
      {edit && <button type="button" className="btn" onClick={() => change(d => {
        const name = `Stage ${d.stages.length + 1}`;
        d.stages.push({ key: keyOf(name, stageKeys), name, steps: [], gate: { conditions: [{ id: 'all-done', type: 'stepsDone', policy: 'block' }] } });
      })}><Icon name="plus" size="1em" />Add a stage</button>}

      <section className="ln-panel" aria-label="Projects on it">
        <h2 className="ln-h">Projects on it</h2>
        {running.length === 0
          ? <p className="sub">None yet{m.status === 'active' ? ' — start one from the top of the page.' : '.'}</p>
          : <ul className="fw-list">{running.map(p => (
            <li key={p.id}><a href={`#/project/${p.id}`}>{p.name}</a> <span className="sub">· on version {p.flow?.version}{p.flow?.startedOn ? ` · started ${niceDay(p.flow.startedOn)}` : ''}</span>
              {active && p.flow && p.flow.version < active.version && ctx.can.agree && (
                <> <button type="button" className="btn btn-sm" onClick={() => setMoving({ id: p.id, name: p.name })}>Move to version {active.version}</button></>
              )}
            </li>
          ))}</ul>}
      </section>

      <section className="ln-panel" aria-label="Its history">
        <h2 className="ln-h">Its history</h2>
        {log.length === 0 ? <p className="sub">Nothing yet.</p> : (
          <ul className="fw-log">
            {log.slice(0, 20).map(e => (
              <li key={e.id}><span>{e.summary}</span><span className="sub"> · {e.who} · {fmtRelative(e.at)}{e.source === 'assistant' ? ' · proposed by the assistant' : ''}</span></li>
            ))}
          </ul>
        )}
      </section>

      {editingStep && editing && (
        <StepEditor open def={def} stageIndex={editing.stage} step={editingStep} readOnly={!edit}
          onClose={() => setEditing(null)}
          onChange={next => {
            /* A FIRST DRAFT takes its keys from its words as they are written
               (lib/flow/definition rekeyStep) — no project has a record on it
               yet; a later version keeps every key, its records point at them. */
            const fresh = !m.parentId;
            let stepKey = editingStep.key;
            change(d => {
              const list = d.stages[editing.stage].steps;
              const i = list.findIndex(x => x.key === editingStep.key);
              if (i < 0) return;
              list[i] = next;
              if (!fresh) return;
              if (next.title !== editingStep.title) {
                const taken = d.stages.flatMap(st => st.steps).filter(x => x !== list[i]).map(x => x.key);
                stepKey = keyOf(next.title, taken);
                rekeyStep(d, editingStep.key, stepKey);
              }
              (next.fields ?? []).forEach((f, j) => {
                const was = editingStep.fields?.[j];
                if (was && was.key === f.key && was.label !== f.label) {
                  rekeyField(d, stepKey, f.key, fieldKeyOf(f.label, (list[i].fields ?? []).filter(x => x.key !== f.key).map(x => x.key)));
                }
              });
            });
            if (stepKey !== editingStep.key) setEditing({ stage: editing.stage, step: stepKey });
          }}
          onMove={by => change(d => {
            const list = d.stages[editing.stage].steps;
            const i = list.findIndex(x => x.key === editingStep.key);
            const j = i + by;
            if (i < 0 || j < 0 || j >= list.length) return;
            const [x] = list.splice(i, 1); list.splice(j, 0, x);
          })}
          onRemove={() => {
            change(d => {
              d.stages[editing.stage].steps = d.stages[editing.stage].steps.filter(x => x.key !== editingStep.key);
              for (const s of d.stages) for (const t of s.steps) if (t.after) { t.after = t.after.filter(a => a !== editingStep.key); if (!t.after.length) delete t.after; }
            });
            setEditing(null);
          }} />
      )}
      {cond && (
        <ConditionEditor open def={def} stageIndex={cond.stage} cond={editingCond} onClose={() => setCond(null)}
          onSave={c => change(d => {
            const list = d.stages[cond.stage].gate.conditions;
            const i = list.findIndex(x => x.id === c.id);
            if (i >= 0) list[i] = c; else list.push(c);
          })}
          {...(editingCond ? { onRemove: () => change(d => { d.stages[cond.stage].gate.conditions = d.stages[cond.stage].gate.conditions.filter(x => x.id !== editingCond.id); }) } : {})} />
      )}
      {starting && <StartSheet method={m} lineId0={route.query.get('line') ?? ''} onClose={() => setStarting(false)} ctx={ctx} />}
      {measuring && (
        <MeasureEditor open def={def} {...(measuring.key ? { measure: def.measures?.find(x => x.key === measuring.key) } : {})} onClose={() => setMeasuring(null)}
          onSave={x => change(d => {
            const list = d.measures ?? [];
            const i = list.findIndex(y => y.key === (measuring.key ?? x.key));
            if (i >= 0) list[i] = x; else list.push(x);
            d.measures = list;
          })}
          {...(measuring.key ? { onRemove: () => change(d => {
            d.measures = (d.measures ?? []).filter(y => y.key !== measuring.key);
            if (!d.measures.length) delete d.measures;
            for (const st of d.stages) st.gate.conditions = st.gate.conditions.filter(c => !(c.type === 'measureMet' && c.measure === measuring.key));
          }) } : {})} />
      )}
      {moving && active && <MoveSheet projectId={moving.id} projectName={moving.name} to={active} ctx={ctx} onClose={() => setMoving(null)} />}
    </div>
  );
}

/** START A PROJECT ON IT — its name, the machines it runs on, the day it
 *  starts, and who does each role; on the line it was asked for from
 *  (?line=, New job on a line), when there was one. */
function StartSheet({ method, lineId0, onClose, ctx }: { method: Method; lineId0: string; onClose: () => void; ctx: ReturnType<typeof useOpContext> }) {
  const def = method.definition;
  const perMachine = def.stages.some(s => s.steps.some(t => t.per === 'machine'));
  const [name, setName] = useState('');
  const [machines, setMachines] = useState('');
  const [startedOn, setStartedOn] = useState(todayISO());
  const [people, setPeople] = useState<Record<string, string>>({});
  const lines = useFactoryLines();
  const usesTools = def.stages.some(s => s.steps.some(t => t.component));
  const [lineId, setLineId] = useState(lineId0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setErr(null); setBusy(true);
    const r = await startProject(ctx, {
      methodId: method.id, name: name.trim() || def.name, machines: machines.split('\n'), startedOn, people, ...(lineId && lines.some(l => l.id === lineId) ? { lineId } : {}),
    });
    setBusy(false);
    if (!r.ok) { setErr(r.why); return; }
    onClose();
    nav(`/project/${r.value.id}`);
  };
  return (
    <Sheet open onClose={onClose} title={`Start a project on ${def.name}`}>
      <div className="fw-sheet fw-edit">
        <label className="fw-f"><span className="field-label">The project</span>
          <input className="text-input fw-in" autoFocus value={name} maxLength={120} placeholder={`e.g. Line 7 — ${def.name}`} aria-label="The project's name" onChange={e => setName(e.target.value)} /></label>
        <label className="fw-f"><span className="field-label">The machines it runs on — one a line{perMachine ? '' : ' (none needed: every step is once for the job)'}</span>
          <textarea className="text-input fw-in" rows={4} value={machines} aria-label="The machines, one a line" placeholder={'Tray sealer\nCase packer'} onChange={e => setMachines(e.target.value)} /></label>
        {lines.length > 0 && (
          <label className="fw-f"><span className="field-label">On which line{usesTools ? ' — its tools’ studies are made and found there' : ''}</span>
            <select className="text-input fw-in" value={lineId} aria-label="On which line" onChange={e => setLineId(e.target.value)}>
              <option value="">No line</option>
              {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select></label>
        )}
        <label className="fw-f"><span className="field-label">It starts</span>
          <input className="text-input fw-in" type="date" value={startedOn} aria-label="The day it starts" onChange={e => setStartedOn(e.target.value || todayISO())} /></label>
        {def.roles.length > 0 && (
          <div className="fw-f"><span className="field-label">Who does each role</span>
            {def.roles.map(r => (
              <label key={r.key} className="fw-pair"><span>{r.name}</span>
                <input className="text-input fw-in" value={people[r.key] ?? ''} aria-label={`Who is ${r.name}`} placeholder="a name"
                  onChange={e => setPeople(p => ({ ...p, [r.key]: e.target.value }))} /></label>
            ))}
          </div>
        )}
        {err && <p className="sub is-r" role="alert">{err}</p>}
        <div className="fw-acts">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void go()}>Start it</button>
          <span className="sub">It runs on version {method.version}; a later version changes nothing on it.</span>
        </div>
      </div>
    </Sheet>
  );
}

