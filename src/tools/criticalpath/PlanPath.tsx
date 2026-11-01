/* THIS PROJECT'S PLAN — the critical path read from the stage-gate plan (FC-215 part 2; knowledge/specs/FC-215-critical-path.md, Part 2).
 *
 * Shown above the typed calculations on `#/calc/critical-path?project=<id>` when the project has machines or dated steps: the earliest
 * finish, the machine whose chain decides the handover, each step's float, the handover date against the chain, what one step being
 * late does — all the module's (./plan), the paper's too. The owner says what each step waits for; until then the page proposes from
 * the dates, and says which is which. */
import { useEffect, useMemo, useState } from 'react';
import { useAccess } from '../../cloud/access';
import { Section } from '../../ui/parts';
import { Sheet } from '../../ui/Sheet';
import { LeanClosing, LeanPanel, LeanTiles } from '../../ui/Lean';
import { niceDay } from '../../lib/weeks';
import { plural } from '../../lib/format';
import { CalcPictureView } from '../calc/CalcPicture';
import {
  DEFAULT_WATCH, GATE_WORD, keepProposal, lateStep, marginSays, nearCritical, planCaveats, planClosing, planMoney, planPath, planPicture, planSays, planTiles,
  withWaits, withoutWaits, type PlanNode, type PlanReading, type PlanRow,
} from './plan';
import { useCriticalPath } from './useCriticalPath';

const dayWord = (n: number): string => `${n} ${n === 1 ? 'day' : 'days'}`;
/** What a step waits for, in words: only what is not done yet can hold it back. */
const waitsSaid = (s: PlanRow): string => {
  const live = s.waits.filter(w => !w.done);
  return live.length ? `waits for ${live.map(w => w.label).join(', ')}` : s.waits.length ? 'nothing left to wait for' : 'starts at the beginning';
};

export function PlanPath({ projectId, onPaper }: { projectId: string; onPaper?: (make: (() => Promise<void>) | null) => void }) {
  const cp = useCriticalPath(projectId);
  const can = useAccess(projectId);
  const [watch, setWatch] = useState(DEFAULT_WATCH);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [lateId, setLateId] = useState('');
  const [lateBy, setLateBy] = useState('');
  const r = cp.reading;
  const x: PlanReading | undefined = r.ok ? r : undefined;

  const money = useMemo(() => planMoney(cp.day), [cp.day]);
  /* the paper — offered to the page's Report ▾ once there is something to print */
  useEffect(() => {
    if (!x || !onPaper) return;
    onPaper(async () => {
      const [{ savePlanPaper }] = await Promise.all([import('./planPaper')]);
      await savePlanPaper({ name: cp.project?.name ?? 'Project', lead: cp.project?.lead, reading: x, money, watch, projectId });
    });
    return () => onPaper(null);
  }, [x, onPaper, cp.project?.name, cp.project?.lead, money, watch, projectId]);

  if (cp.loading) return null;
  if (!r.ok && r.why === 'empty' && !r.left.length) return null;
  if (!r.ok && r.why === 'empty') {
    return (
      <Section title="This project’s plan">
        <p className="sub cpp-empty">Nothing on the plan has a day yet — {plural(r.left.length, 'step')} {r.left.length === 1 ? 'is' : 'are'} waiting for one. Book a day on a step and the chain of waits is worked out here.</p>
      </Section>
    );
  }
  if (!r.ok && r.why === 'nothing-left') {
    return (
      <Section title="This project’s plan">
        <p className="ie-says cpp-empty">Nothing is left on the plan: every dated step ({r.done}) is done and every machine is here.</p>
      </Section>
    );
  }
  if (!r.ok) {
    return (
      <Section title="This project’s plan">
        <p className="ie-warn" role="alert">The steps wait for each other in a circle — {r.cycle.join(' → ')} — so none of them can start. Take one of those waits out, or put a step back to the plan’s order.</p>
        {can.agree && (
          <button type="button" className="btn" onClick={() => void cp.keep(undefined)}>Put every step back to the plan’s order</button>
        )}
      </Section>
    );
  }
  const view = x as PlanReading;
  const tiles = planTiles(view, money, watch);
  const closing = planClosing(view, watch);
  const near = nearCritical(view, watch);
  const picture = planPicture(view);
  const late = lateId && lateBy !== '' && Number(lateBy) >= 0 ? lateStep(view, lateId, Number(lateBy)) : undefined;
  const lateMoney = late && cp.day ? planMoney(cp.day, late.moved) : undefined;
  const steps = view.todo;
  const mayAgree = can.agree;

  return (
    <Section title="This project’s plan">
      <div className="cpp" data-critical-path>
        <LeanTiles tiles={tiles} />
        <p className="ie-says" data-cpp="says">{planSays(view)}</p>
        <p className="ie-says" data-cpp="margin">{marginSays(view)}</p>
        {view.notes.map(n => <p key={n} className="sub cpp-note">{n}</p>)}
        <CalcPictureView pic={picture} />

        <LeanPanel title="Machine by machine">
          <ul className="lt-rows cpp-machines" aria-label="Machines">
            {view.machines.map(m => (
              <li key={m.id} className="lt-li" data-cpp-machine={m.name}>
                <span className="lt-row cpp-m">
                  <b className="lt-what">{m.name}</b>
                  <span className={'lt-says ie-tone is-' + (m.critical ? 'a' : 'n')}>
                    {m.critical ? 'Its chain decides the handover — a day lost on a critical step is a day later' : `${dayWord(m.float)} of float — it can slip that far before the handover moves`}
                  </span>
                  <span className="lt-where">{plural(m.left, 'step')} left{m.done ? ` · ${m.done} done` : ''}</span>
                </span>
              </li>
            ))}
          </ul>
        </LeanPanel>

        <LeanPanel title={`What is left — ${plural(steps.length, 'step')}`}
          aside={mayAgree ? <button type="button" className="cw-link" onClick={() => void cp.keep(keepProposal(view.rows.map(z => z.node), cp.project?.gateStages?.waitsFor))}>Keep the plan’s order for every step</button> : undefined}>
          <p className="sub">
            {view.told} of {plural(view.told + view.proposed, 'step')} {view.told === 1 ? 'has' : 'have'} the owner’s word on what they wait for; the rest follow the plan’s dates.
            {view.dead ? ` ${plural(view.dead, 'wait')} on steps that have gone ${view.dead === 1 ? 'is' : 'are'} ignored.` : ''}
            {!mayAgree ? ' The owner sets what each step waits for.' : ''}
          </p>
          <label className="field cpp-watch"><span className="field-label">Call float this small near critical (days) — a choice, not a measurement</span>
            <input className="text-input scored-num" type="number" min={0} inputMode="numeric" aria-label="Near critical, days" value={watch} onChange={e => setWatch(Math.max(0, Number(e.target.value) || 0))} /></label>
          <ul className="lt-rows cpp-steps" aria-label="Steps left">
            {steps.map(s => (
              <li key={s.id} className="lt-li" data-cpp-step={s.id}>
                <span className="lt-row cpp-s">
                  <b className="lt-what">{s.node.label}</b>
                  <span className={'lt-says ie-tone is-' + (s.critical ? 'r' : near.includes(s) ? 'a' : 'n')}>
                    {s.days === 0 ? 'nothing left of it' : `${dayWord(s.days)} · ${niceDay(s.startOn)} to ${niceDay(s.endOn)}`}{' · '}
                    {s.critical ? (s.days > 0 ? 'critical — no float' : 'on the path') : `float ${dayWord(s.float)}`}
                  </span>
                  <span className="lt-where">
                    {s.node.gate === 'arrival' ? 'On site' : GATE_WORD[s.node.gate]}{' · '}
                    {waitsSaid(s)}{' · '}
                    {s.node.gate === 'arrival' ? 'the machine’s due date' : s.told ? 'the owner’s word' : 'the plan’s order'}
                  </span>
                </span>
                {mayAgree && s.node.gate !== 'arrival' && (
                  <span className="lt-acts"><button type="button" className="cw-link" aria-label={`What ${s.node.label} waits for`} onClick={() => setEditing(s)}>Waits for</button></span>
                )}
              </li>
            ))}
          </ul>
          {view.left.length > 0 && (
            <p className="sub cpp-left">Left out of the chain — {view.left.map(l => `${l.label} (${l.why})`).join('; ')}.</p>
          )}
        </LeanPanel>

        <LeanPanel title="If a step is late">
          <div className="cpp-late">
            <label className="field"><span className="field-label">Which step</span>
              <select className="text-input" value={lateId} onChange={e => setLateId(e.target.value)} aria-label="Which step is late">
                <option value="">Choose a step</option>
                {steps.filter(s => s.days > 0).map(s => <option key={s.id} value={s.id}>{s.node.label}</option>)}
              </select></label>
            <label className="field"><span className="field-label">Late by (days)</span>
              <input className="text-input scored-num" type="number" min={0} inputMode="numeric" aria-label="Late by, days" value={lateBy} onChange={e => setLateBy(e.target.value)} /></label>
          </div>
          {late && <p className="ie-says" data-cpp="late">{late.says}</p>}
          {lateMoney && <p className="ie-says ie-money" data-cpp="late-money">{lateMoney.says}</p>}
          {!late && <p className="sub">Choose a step and how late it is to see whether the handover moves.</p>}
        </LeanPanel>

        <p className="ie-says ie-money" data-cpp="money">{money.says}</p>
        <LeanPanel title="What this does not say">
          <ul className="ie-caveats">{planCaveats(view).map(c => <li key={c}>{c}</li>)}</ul>
        </LeanPanel>
        <LeanClosing closing={closing} />
      </div>
      {editing && (
        <WaitsSheet row={editing} reading={view} onClose={() => setEditing(null)}
          onSave={async (after, back) => {
            const stored = cp.project?.gateStages?.waitsFor;
            await cp.keep(back ? withoutWaits(stored, editing.id) : withWaits(stored, editing.id, after));
            setEditing(null);
          }}
          check={after => {
            const stored = cp.project?.gateStages?.waitsFor;
            const test = planPath({ ...cp.inputs, waitsFor: withWaits(stored, editing.id, after) });
            return !test.ok && test.why === 'cycle' ? test.cycle : undefined;
          }} />
      )}
    </Section>
  );
}

/** One step's waits: every other node ticked or not, the loop refused before it is stored. */
function WaitsSheet({ row, reading, onClose, onSave, check }: {
  row: PlanRow; reading: PlanReading; onClose: () => void; onSave: (after: string[], back: boolean) => Promise<void>; check: (after: string[]) => string[] | undefined;
}) {
  const [ticked, setTicked] = useState<string[]>(() => row.waits.map(w => w.id));
  const others: PlanNode[] = reading.rows.map(z => z.node).filter(n => n.id !== row.id);
  const loop = check(ticked);
  const groups = [...new Set(others.map(n => n.machine ?? ''))];
  return (
    <Sheet open onClose={onClose} title={`What ${row.node.label} waits for`}>
      <div className="cpp-sheet">
        <p className="sub">Tick every step that must be finished before this one can start. Tick none and it starts at the beginning.</p>
        {groups.map(g => (
          <fieldset key={g || 'line'} className="cpp-group">
            <legend>{g || 'On the line'}</legend>
            {others.filter(n => (n.machine ?? '') === g).map(n => (
              <label key={n.id} className="cpp-tick">
                <input type="checkbox" checked={ticked.includes(n.id)} onChange={e => setTicked(t => (e.target.checked ? [...t, n.id] : t.filter(i => i !== n.id)))} />
                <span>{n.gate === 'arrival' ? `${n.machine} arrives` : n.label.replace(`${n.machine} — `, '')}{n.done ? ' (done)' : n.days ? ` · ${dayWord(n.days)}` : ''}</span>
              </label>
            ))}
          </fieldset>
        ))}
        {loop && <p className="ie-warn" role="alert">That makes a circle — {loop.join(' → ')} — so none of them could start. Untick one.</p>}
        <div className="cpp-acts">
          <button type="button" className="btn btn-primary" disabled={!!loop} onClick={() => void onSave(ticked, false)}>Save</button>
          <button type="button" className="btn" onClick={() => void onSave([], true)}>Back to the plan’s order</button>
        </div>
      </div>
    </Sheet>
  );
}

