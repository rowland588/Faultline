/* METHODS — the library of methods of your own (lib/flow;
 * docs/PLATFORM-REVIEW.md, docs/PLATFORM-STATUS.md).
 *
 * Rowland's mandate, 18 October: a person describes what has to be done,
 * Faultline turns it into a method, it is approved, and it runs. This is
 * where a method lives: written once — from the stage gate's usual lists,
 * from a stage-gate job as it was actually run, or from nothing — approved,
 * then started on project after project, each pinned to the version it
 * started on. Faultline's own methods sit in the same library
 * (lib/flow/library), each one to use as it is or adapt; a person's own are
 * as much methods as those. And the way in for anything new is to say what
 * is needed (screens/DesignScreen) — the library is where it can start
 * from, never the limit of what can be made.
 *
 * WHICH RECORD: the Method (versioned; supabase/METHODS.sql). WHERE IT
 * SHOWS: here, the control room's rail (Methods), each project running one
 * (its rail's "The method", its Details) and the method's own page. */
import { useMemo, useState } from 'react';
import { nav } from '../state/useRoute';
import { useProjects } from '../lib/useProjects';
import { useCanStartProjects } from '../cloud/access';
import { listTests } from '../db';
import { planModel } from '../lib/planModel';
import { KIND_WORD, allSteps } from '../lib/flow/definition';
import { appStageGate, blankDefinition, definitionFromJob, stageGateDefinition } from '../lib/flow/templates';
import { createMethod } from '../lib/flow/operations';
import { LIBRARY, closeness } from '../lib/flow/library';
import { ESTABLISHED, establishedHref } from '../lib/flow/established';
import { needBrief, needsAsked, type NeedAsked } from '../lib/flow/needs';
import { useMethods, useOpContext } from '../lib/flow/useFlow';
import type { Method } from '../lib/flow/records';
import { Sheet, SheetRow } from '../ui/Sheet';
import { Icon } from '../ui/Icon';
import { niceDay, todayISO } from '../lib/weeks';

const STATUS_WORD: Record<Method['status'], string> = { draft: 'Draft', active: 'Approved', retired: 'Retired' };

/** A family's versions, the one in use first: the approved, else the newest draft. */
export function familiesOf(methods: readonly Method[]): { shown: Method; versions: Method[]; draft?: Method }[] {
  const by = new Map<string, Method[]>();
  for (const m of methods) by.set(m.familyId, [...(by.get(m.familyId) ?? []), m]);
  return [...by.values()].map(vs => {
    const versions = [...vs].sort((a, b) => b.version - a.version);
    const active = versions.find(v => v.status === 'active');
    const draft = versions.find(v => v.status === 'draft');
    return { shown: active ?? draft ?? versions[0], versions, ...(active && draft ? { draft } : {}) };
  }).sort((a, b) => (a.shown.status === 'retired' ? 1 : 0) - (b.shown.status === 'retired' ? 1 : 0) || b.shown.updatedAt - a.shown.updatedAt);
}

export function MethodsScreen() {
  const methods = useMethods();
  const { projects } = useProjects();
  const may = useCanStartProjects();
  const ctx = useOpContext(may ? 'owner' : 'client');
  const [adding, setAdding] = useState(false);
  const [fromJob, setFromJob] = useState(false);
  const [find, setFind] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [brief, setBrief] = useState<NeedAsked | null>(null);
  const [copied, setCopied] = useState(false);
  const families = useMemo(() => familiesOf(methods ?? []), [methods]);
  const asked = useMemo(() => needsAsked(methods ?? []), [methods]);
  const gateJobs = projects.filter(p => planModel(p) === 'commissioning');

  const make = async (definition: ReturnType<typeof blankDefinition>, origin: Method['origin'], note?: string) => {
    setErr(null);
    const r = await createMethod(ctx, { definition, origin, ...(note ? { changeNote: note } : {}) });
    if (!r.ok) { setErr(r.why); return; }
    setAdding(false); setFromJob(false);
    nav(`/methods/${r.value.id}`);
  };

  if (!methods) return <div className="wrap fw"><p className="sub">Opening…</p></div>;
  /* a word finds a method by its name, what it is for and its own words */
  const words = find.trim().toLowerCase();
  const hit = (m: { name: string; purpose: string; words?: readonly string[] }) => !words || `${m.name} ${m.purpose}`.toLowerCase().includes(words) || closeness(words, m) > 0;
  const shownFamilies = families.filter(f => hit({ name: f.shown.definition.name, purpose: f.shown.definition.purpose }));
  const shownLibrary = LIBRARY.filter(hit);
  const shownEstablished = ESTABLISHED.filter(hit);
  const approved = families.filter(f => f.shown.status === 'active').length;
  const drafts = families.filter(f => f.shown.status === 'draft' || f.draft).length;
  const says = families.length
    ? `${families.length} method${families.length === 1 ? '' : 's'} — ${approved} approved${drafts ? `, ${drafts} with a draft open` : ''}.`
    : 'No methods yet.';

  return (
    <div className="wrap fw">
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pl-eyebrow">METHODS · <a href="#/room" className="pl-fac">Control room ›</a></p>
          <h1>Methods</h1>
          <p className="pl-says">{says}</p>
        </div>
        <div className="pace-head-actions">
          {may && <button type="button" className="btn btn-primary" onClick={() => nav('/design')}>Describe what you need</button>}
          {may && <button type="button" className="btn" onClick={() => setAdding(true)}><Icon name="plus" size="1em" />New method by hand</button>}
        </div>
      </header>
      <p className="sub fw-why">
        A method is how a kind of work is run — its stages, the steps in each, who does them, what each must show, and what
        a gate needs before the work moves on. Write it once, approve it, then start a project on it; each project keeps the
        version it started on, so changing a method never changes work already under way.
      </p>
      {err && <p className="sub is-r" role="alert">{err}</p>}

      {families.length === 0 && (
        <div className="fac-empty">
          <p>Say what you need and Faultline designs a method for it — or take one of Faultline’s below and adapt it, or write one by hand.</p>
          {may && <button type="button" className="btn btn-primary" onClick={() => nav('/design')}>Describe what you need</button>}
        </div>
      )}

      {(families.length > 0 || LIBRARY.length > 0) && (
        <label className="fw-f fw-find"><span className="field-label">Find a method</span>
          <input className="text-input fw-in" value={find} placeholder="a word — changeover, trial, commissioning…" aria-label="Find a method" onChange={e => setFind(e.target.value)} /></label>
      )}

      {families.length > 0 && <h2 className="ln-h fw-lib-h">Yours</h2>}
      {families.length > 0 && shownFamilies.length === 0 && <p className="sub">None of yours match “{find}”.</p>}
      {families.length > 0 && (
        <ul className="fw-lib" aria-label="The methods">
          {shownFamilies.map(({ shown, versions, draft }) => {
            const d = shown.definition;
            const steps = allSteps(d).length;
            const running = projects.filter(p => p.flow?.familyId === shown.familyId);
            return (
              <li key={shown.familyId} className={'fw-card is-' + shown.status} data-method={d.name}>
                <button type="button" className="fw-card-b" onClick={() => nav(`/methods/${shown.id}`)}>
                  <span className="fw-card-h">
                    <b className="fw-card-t">{d.name}</b>
                    <span className={'fw-chip is-' + shown.status}>{STATUS_WORD[shown.status]} · v{shown.version}</span>
                    {draft && <span className="fw-chip is-draft">Draft v{draft.version} open</span>}
                  </span>
                  {d.purpose && <span className="fw-card-p">{d.purpose}</span>}
                  <span className="fw-card-m">
                    {KIND_WORD[d.kind]} · {d.stages.length} stage{d.stages.length === 1 ? '' : 's'} · {steps} step{steps === 1 ? '' : 's'}
                    {d.roles.length ? ` · ${d.roles.length} role${d.roles.length === 1 ? '' : 's'}` : ''}
                    {versions.length > 1 ? ` · ${versions.length} versions` : ''}
                  </span>
                  <span className="fw-card-m">
                    {running.length
                      ? <>Running on {running.map(p => p.name).join(', ')}</>
                      : shown.status === 'active' ? 'Approved — no project on it yet' : shown.approvedAt ? '' : `Started ${niceDay(todayISO(new Date(shown.createdAt)))}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* FAULTLINE'S LIBRARY — methods built from the app's own tools and
          measures, each used as it is (a draft of your own) or adapted */}
      <h2 className="ln-h fw-lib-h">From Faultline’s library</h2>
      <p className="sub">Each is a method like yours — taken, it is a copy in your library to change, approve and version. Adapting it asks what is different about your line, machine or customer.</p>
      {shownLibrary.length === 0 && <p className="sub">Nothing in the library matches “{find}” — <a href="#/design">describe what you need</a> instead.</p>}
      <ul className="fw-lib" aria-label="Faultline’s library">
        {shownLibrary.map(e => (
          <li key={e.id} className="fw-card is-library" data-library={e.id}>
            <div className="fw-card-b">
              <span className="fw-card-h"><b className="fw-card-t">{e.name}</b><span className="fw-chip">From Faultline</span></span>
              <span className="fw-card-p">{e.purpose}</span>
              {e.uses.length > 0 && <span className="fw-card-m">Uses {e.uses.join(', ')}</span>}
              {may && (
                <span className="fw-acts">
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => nav(`/design?template=${e.id}`)}>Adapt it</button>
                  <button type="button" className="btn btn-sm" onClick={() => void make(e.build(), 'library', `From Faultline’s library: “${e.name}”`)}>Use it as it is</button>
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* FAULTLINE'S ESTABLISHED METHODS — the stage gate, 6M and the lever
          tree, each on screens of its own and proven on real jobs; in the
          library so every way of running work is found in one place, and
          started the one way every job starts (lib/flow/established) */}
      {shownEstablished.length > 0 && <>
        <h2 className="ln-h fw-lib-h">Faultline’s established methods</h2>
        <p className="sub">Each runs on screens of its own, built for that kind of work — not copied and changed like the methods above, but started as a job.</p>
        <ul className="fw-lib" aria-label="Faultline’s established methods">
          {shownEstablished.map(e => {
            const running = projects.filter(p => planModel(p) === e.id).length;
            return (
              <li key={e.id} className="fw-card is-established" data-established={e.id}>
                <div className="fw-card-b">
                  <span className="fw-card-h"><b className="fw-card-t">{e.name}</b><span className="fw-chip">Its own screens</span></span>
                  <span className="fw-card-p">{e.purpose}</span>
                  <span className="fw-card-m">Runs on {e.screens}{running ? ` · ${running} job${running === 1 ? '' : 's'} on it` : ''}</span>
                  {may && <span className="fw-acts"><button type="button" className="btn btn-sm btn-primary" onClick={() => nav(establishedHref(e.id))}>Start a job on it</button></span>}
                </div>
              </li>
            );
          })}
        </ul>
      </>}

      {/* WHAT FAULTLINE CANNOT DO YET — every need a method has said, gathered,
          each with the brief a developer builds it from (lib/flow/needs) */}
      {asked.length > 0 && <>
        <h2 className="ln-h fw-lib-h">What Faultline cannot do yet — asked for by your methods</h2>
        <p className="sub">Arithmetic no block does. The methods run on what exists; each of these is work for development, with a brief to build it from — one block, its tests, and it reaches every method with nothing else rebuilt.</p>
        <ul className="fw-asks" aria-label="What Faultline cannot do yet">
          {asked.map(a => (
            <li key={a.need.what} className="fw-ask-need" data-need={a.need.what}>
              <span className="fw-ask-need-b"><b>{a.need.what}</b> <span className="sub">— {a.need.why}</span>
                <span className="sub fw-ask-need-by">Asked for by {a.askedBy.map((m, i) => <span key={m.id}>{i ? ', ' : ''}<a href={`#/methods/${m.id}`}>{m.name}</a></span>)}</span></span>
              <button type="button" className="btn btn-sm" onClick={() => { setCopied(false); setBrief(a); }}>The brief to build it</button>
            </li>
          ))}
        </ul>
      </>}

      <Sheet open={!!brief} onClose={() => setBrief(null)} title={brief ? `To build: ${brief.need.what}` : ''}>
        {brief && (
          <div className="fw-sheet">
            <pre className="fw-brief" aria-label="The development brief">{needBrief(brief)}</pre>
            <div className="fw-acts">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void navigator.clipboard?.writeText(needBrief(brief)).then(() => setCopied(true), () => setCopied(false))}>Copy the brief</button>
              {copied && <span className="sub" role="status">Copied — paste it where development work is kept.</span>}
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={adding} onClose={() => { setAdding(false); setFromJob(false); }} title={fromJob ? 'From a stage-gate job' : 'A new method — start from'}>
        {!fromJob ? (
          <div className="fw-sheet">
            <SheetRow icon="route" label="The stage gate you use" hint="Its usual lists at each gate — install, set up, commission, hand over — as a method"
              onClick={() => void make({ ...stageGateDefinition(undefined, gateJobs, 'Stage gate'), purpose: 'New equipment taken through its gates to handover.' }, 'usual')} />
            {gateJobs.length > 0 && (
              <SheetRow icon="machine" label="A stage-gate job, as it was run" hint={`Every step and test it used, gate by gate — ${gateJobs.length} job${gateJobs.length === 1 ? '' : 's'} to pick from`}
                onClick={() => setFromJob(true)} />
            )}
            <SheetRow icon="plus" label="Nothing — a blank method" hint="One stage to start; add the stages, steps and gates" onClick={() => void make(blankDefinition(), 'hand')} />
            <p className="sub fw-sheet-note">Each starts as a draft: change anything, then approve it when it says it can run.</p>
          </div>
        ) : (
          <div className="fw-sheet">
            {gateJobs.map(p => (
              <SheetRow key={p.id} label={p.name} hint="Read its steps and tests into a method"
                onClick={() => void (async () => {
                  const tests = await listTests(p.id);
                  const def = definitionFromJob(tests);
                  const total = allSteps(def).length;
                  await make({ ...(total ? def : appStageGate()), name: `${p.name} — as a method`, purpose: `The stage gate as ${p.name} ran it.` }, 'copy', total ? `Read from ${p.name}` : undefined);
                })()} />
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}
