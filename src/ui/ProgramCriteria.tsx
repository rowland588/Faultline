/* A PROGRAM'S CRITERIA AND ITS SIGN-OFF, on its row (lib/programCriteria; docs/PROGRAM-GOAL.md).
 *
 * Rowland, 28 October: "the program has a set role of criteria. So I choose the criteria. So it's likely I'm going to
 * pick tools ... If they pass, I then need to be able to sign off. So I will sign off, me and my colleagues together,
 * but just leave it as signed off, passed."
 *
 *   its criteria    a row each — the tool and its name, its answer in its colour (Passed · Didn't pass · Not yet),
 *                   what the tool says; a tap opens the study or the test; × takes it off (the study stays)
 *   Add a criterion the tools that say pass or fail — a capability study, a control chart, a reliability study, an
 *                   analysis — each made for the program and set up in its tool with its own parameters; a study of
 *                   it already made, picked; or a run test (its tests as they are)
 *   Sign off        once every criterion has passed: who is signing (one or more names) and the day — the program
 *                   reads "Signed off — passed", and the day is its proved day; taken back with Undo or later
 *
 * No new record: the program (criteria, signedOff), the studies (ToolStudy.programId) and its tests. */
import { useEffect, useMemo, useState } from 'react';
import type { Program } from '../lib/programs';
import type { Test } from '../lib/testing';
import type { ToolStudy } from '../lib/study';
import { CRITERION_TOOLS, CRITERION_WORD, cannotSignOff, criteriaOf, criteriaVerdict, criterionStudy, signedOff, signersOf, studiesToPick, unsigned, withCriterion, withoutCriterion, type CriterionTool } from '../lib/programCriteria';
import { TOOL_NAME, studyHref } from '../lib/studyLinks';
import { attemptsOf, testJourney } from '../lib/programJourney';
import { listAllStudies, onDataChange, putProgram, putStudy } from '../db';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { now, uid } from '../lib/ids';
import { niceDay, todayISO } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { openRecord } from './RecordDrawer';
import { offerUndo } from './Undo';
import { Icon } from './Icon';

/* The studies naming programs, kept current — every device's, a line's own program's among them. ONE READ FOR EVERY
   ROW: a page of programs draws one of these a row, and each reading every study on every write slowed the page's
   redraw enough to lose what was typed in a drawer over it (program-edit, 28 October). */
let shared: ToolStudy[] | undefined;
const listeners = new Set<(s: ToolStudy[]) => void>();
let offShared: (() => void) | undefined;
let reading: Promise<void> | undefined;
const readShared = (): Promise<void> => (reading ??= listAllStudies()
  .then(s => { shared = s; for (const f of listeners) f(s); })
  .finally(() => { reading = undefined; }));
function useProgramStudies(on: boolean): ToolStudy[] | undefined {
  const [list, setList] = useState<ToolStudy[] | undefined>(shared);
  useEffect(() => {
    /* read only where they are wanted — a program with criteria, or one being given them */
    if (!on) return undefined;
    listeners.add(setList);
    if (!offShared) offShared = onDataChange(() => void readShared());
    if (shared) setList(shared); else void readShared();
    return () => {
      listeners.delete(setList);
      if (!listeners.size) { offShared?.(); offShared = undefined; shared = undefined; }
    };
  }, [on]);
  return list;
}

type Pick = CriterionTool | 'run';
const PICK_NAME: Record<Pick, string> = { capability: 'Capability study', chart: 'Control chart', reliability: 'Reliability study', analysis: 'Analysis', run: 'Run test' };

export function ProgramCriteria({ program, ensure, tests, edit, machine, planRun }: {
  /** The program — or, for a line on a machine's programs stage with no record yet, none (`ensure` makes it). */
  program?: Program;
  /** Make its program record, the first time a criterion is picked. */
  ensure?: () => Promise<Program | undefined>;
  /** Every test that could be its run test (Test.programId). */
  tests: readonly Test[];
  /** May change the work: pick criteria and sign off (useAccess can.edit; a client reads it). */
  edit: boolean;
  /** Its machine's name — a new study is on it. */
  machine?: string;
  /** Make its first run test, when it has none to pick (ui/ProgramTest's own way). Absent: pick one it has. */
  planRun?: (p: Program) => Promise<string | undefined>;
}) {
  const [adding, setAdding] = useState(false);
  const studies = useProgramStudies(!!program?.criteria?.length || !!program?.signedOff || adding);
  const { session } = useSession();
  const me = displayName(session?.user.email) || '';
  const today = todayISO();
  const [tool, setTool] = useState<Pick>('capability');
  const [name, setName] = useState('');
  const [signing, setSigning] = useState(false);
  const [by, setBy] = useState('');
  const [day, setDay] = useState(today);

  const p = program;
  const answers = useMemo(() => (p ? criteriaOf(p, studies, tests, today) : []), [p, studies, tests, today]);
  const v = p ? criteriaVerdict(p, answers) : undefined;
  const mine = p ? attemptsOf(p, [...tests]) : [];
  const runRoots = mine.filter(t => !t.fromTestId || !mine.some(x => x.id === t.fromTestId))
    .filter(t => !(p?.criteria ?? []).some(c => c.kind === 'run' && c.id === t.id));
  const toPick = p && studies ? studiesToPick(p, studies, mine.map(t => t.id)) : [];
  if (!p?.criteria?.length && !p?.signedOff && !edit) return null;

  const save = async (next: Program, said: string, before: Program) => {
    await putProgram(next);
    offerUndo(said, () => putProgram(before));
  };
  const record = async (): Promise<Program | undefined> => p ?? await ensure?.();
  /* A NEW STUDY FOR IT, in the tool picked — set up in the tool (open: there now) */
  const addStudy = async (open: boolean) => {
    if (tool === 'run') return;
    const cur = await record();
    if (!cur) return;
    const n = (cur.criteria ?? []).filter(c => c.kind === 'study').length;
    const s = criterionStudy(cur, tool, name.trim() || `${cur.what} — ${PICK_NAME[tool].toLowerCase()}${n ? ` ${n + 1}` : ''}`, { id: uid(), at: now(), ...(machine ? { machine } : {}) });
    await putStudy(s);
    await putProgram(withCriterion(cur, { kind: 'study', id: s.id }));
    setName(''); setAdding(false);
    if (open) nav(studyHref(s));
  };
  const pickStudy = async (s: ToolStudy) => {
    const cur = await record();
    if (cur) await save(withCriterion(cur, { kind: 'study', id: s.id }), `${s.name} — a criterion of ${cur.what}`, cur);
    setAdding(false);
  };
  const pickRun = async (id?: string) => {
    const cur = await record();
    if (!cur) return;
    const tid = id ?? await planRun?.(cur);
    if (!tid) return;
    await save(withCriterion(cur, { kind: 'run', id: tid }), `Its run test — a criterion of ${cur.what}`, cur);
    setAdding(false);
  };
  const off = (i: number) => {
    if (!p) return;
    const a = answers[i];
    void save(withoutCriterion(p, a.c), `${a.title} — taken off ${p.what}’s criteria (the ${a.c.kind === 'study' ? 'study' : 'test'} is kept)`, p);
  };
  const signers = signersOf(by);
  const refused = p ? cannotSignOff(p, answers, signers, day) : 'No program.';
  const signOff = () => {
    if (!p || refused) return;
    void save(signedOff(p, signers, day, now()), `${p.what} — signed off, passed ${niceDay(day)}`, p);
    setSigning(false);
  };

  /* NONE PICKED: one quiet door — a passed test proves it, as it always has */
  if (!answers.length && !p?.signedOff && !adding) {
    return (
      <div className="pgc pgc-empty">
        <button type="button" className="cw-link pgc-add" onClick={() => setAdding(true)}>+ Pick its criteria</button>
      </div>
    );
  }

  return (
    <div className="pgc" aria-label={`The criteria of ${p?.what ?? 'the program'}`}>
      <div className="pgc-h">
        <b>Its criteria</b>
        {v && <span className={'spp-pill pgc-v is-' + v.tone}>{v.words}</span>}
      </div>
      {v?.since && <p className="pgc-since">{v.since}</p>}
      {answers.length > 0 && (
        <ul className="pgc-list">
          {answers.map((a, i) => (
            <li key={`${a.c.kind}:${a.c.id}`} className={'pgc-row is-' + a.tone}>
              <button type="button" className="pgc-open" onClick={() => { if (a.study) nav(studyHref(a.study)); else if (a.test) openRecord(a.test.projectId, a.test.id); }}>
                <span className="pgc-t">{a.title}</span>
                <span className={'spp-pill is-' + a.tone}>{CRITERION_WORD[a.word]}</span>
                <span className="pgc-says">{a.says}</span>
              </button>
              {edit && !p?.signedOff && (
                <button type="button" className="pgc-x" aria-label={`Take ${a.title} off the criteria`} title="Take it off the criteria" onClick={() => off(i)}>
                  <Icon name="close" size={13} /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!answers.length && !p?.signedOff && (
        <p className="sub pgc-none">None picked yet — a passed test proves it until one is. Pick what it must pass: the tools you will judge it by, each set up with its own limits; once picked, only the sign-off proves it.</p>
      )}

      {/* SIGNED OFF — PASSED */}
      {/* SIGNED OFF — PASSED is said by the pill above, who and when with it; here only the way back */}
      {p?.signedOff && edit && (
        <p className="pgc-signed">
          <button type="button" className="cw-link" onClick={() => void save(unsigned(p), `${p.what} — sign-off taken back`, p)}>Take the sign-off back</button>
        </p>
      )}

      {edit && !p?.signedOff && (
        <div className="pgc-acts">
          {!adding && <button type="button" className="btn btn-sm" onClick={() => { setAdding(true); setSigning(false); }}>Add a criterion</button>}
          {v?.ready && !signing && (
            <button type="button" className="btn btn-primary btn-sm pgc-sign" onClick={() => { setSigning(true); setAdding(false); setBy(me); setDay(today); }}>Sign off</button>
          )}
          {!!answers.length && !v?.ready && <span className="sub">Sign off comes once every criterion has passed.</span>}
        </div>
      )}

      {edit && adding && (
        <div className="pgc-panel" role="group" aria-label={`Add a criterion to ${p?.what ?? 'the program'}`}>
          <span className="spp-pick" role="radiogroup" aria-label="Which tool">
            {([...CRITERION_TOOLS, 'run'] as Pick[]).map(k => (
              <button key={k} type="button" role="radio" aria-checked={tool === k} className={'chip' + (tool === k ? ' on' : '')} onClick={() => setTool(k)}>{PICK_NAME[k]}</button>
            ))}
          </span>
          {tool !== 'run' ? (
            <>
              <label className="ptx-f">
                <span className="field-label">Name it — what it judges</span>
                <input className="text-input" value={name} maxLength={120} aria-label="Name the study" autoFocus
                  placeholder={tool === 'capability' ? 'e.g. Placement weight at 75 ppm' : tool === 'reliability' ? 'e.g. Robot faults' : tool === 'chart' ? 'e.g. Seal temperature' : 'e.g. Fill before and after'}
                  onChange={e => setName(e.target.value)} />
              </label>
              <small className="sub">It is made for {p?.what ?? 'the program'}{machine ? ` on the ${machine}` : ''} and set up in the {TOOL_NAME[tool]?.toLowerCase()} — its limits or what it must reach are set there, and its verdict is the answer.</small>
              <span className="pgc-go">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => void addStudy(true)}>Set it up now</button>
                <button type="button" className="btn btn-sm" onClick={() => void addStudy(false)}>Add it, set up later</button>
              </span>
              {toPick.filter(s => s.tool === tool).length > 0 && (
                <span className="pgc-pick" aria-label="Or pick a study of it already made">
                  <span className="sub">Or pick one already made:</span>
                  {toPick.filter(s => s.tool === tool).map(s => (
                    <button key={s.id} type="button" className="chip" onClick={() => void pickStudy(s)}>{s.name}</button>
                  ))}
                </span>
              )}
            </>
          ) : (
            <>
              <small className="sub">Its run as it is tested — Test it, Go again — speed, minutes, rejects, and net only where a net rate target is given. Passed once any attempt passed.</small>
              <span className="pgc-pick">
                {runRoots.map(t => {
                  const j = testJourney(t, [...tests], today);
                  return <button key={t.id} type="button" className="chip" onClick={() => void pickRun(t.id)}>{j.attempts[0]?.aim ? `Its run — ${j.attempts[0].aim}` : 'Its run'} · {j.says}</button>;
                })}
                {!runRoots.length && planRun && <button type="button" className="btn btn-sm" onClick={() => void pickRun()}>Add its run test</button>}
                {!runRoots.length && !planRun && <span className="sub">It has no run test here — test it on its project’s Programs, then pick it.</span>}
              </span>
            </>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
        </div>
      )}

      {edit && signing && p && (
        <div className="pgc-panel" role="group" aria-label={`Sign off ${p.what}`}>
          <span className="ptx-h">Sign off {p.what} — every criterion passed</span>
          <label className="ptx-f">
            <span className="field-label">Who is signing — one or more, a comma between</span>
            <input className="text-input" value={by} maxLength={200} aria-label="Who is signing it off" autoFocus placeholder="e.g. R. Glew, J. Smith" onChange={e => setBy(e.target.value)} />
          </label>
          <label className="ptx-f ptx-day">
            <span className="field-label">The day</span>
            <input className="text-input" type="date" value={day} aria-label="The day it is signed off" onChange={e => setDay(e.target.value)} />
          </label>
          {refused && signers.length > 0 && <small className="sub pgc-refused">{refused}</small>}
          <span className="pgc-go">
            <button type="button" className="btn btn-primary btn-sm" disabled={!!refused} onClick={signOff}>Signed off — passed</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSigning(false)}>Cancel</button>
          </span>
        </div>
      )}
    </div>
  );
}
