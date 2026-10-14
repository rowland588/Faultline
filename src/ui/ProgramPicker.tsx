/* PICK PROGRAMS TO PROVE — in Commission (Rowland, 14 October: "go into
 * commission, find the programs that should be available because they're in
 * programs ... available to pick").
 *
 * Every program this job may prove (lib/commissionPrograms programsToPick):
 * its own, then each of its lines' own, in the lists' order. One still to
 * prove with no test is a box to tick; one already with a test on this job
 * says where that test has got to and opens it; the proved are counted, and
 * shown on a tap. Tick as many as the day holds and Plan: a proving test
 * each, on its machine, carrying the program's runs, day and who brings it
 * — ordinary planned tests from then on, on the board under their machine's
 * programs, and passing one proves its program (db/programs followTest).
 * A long list is found by a word — a program's name, its machine, its runs. */
import { useMemo, useState } from 'react';
import type { PickGroup, PickRow } from '../lib/commissionPrograms';
import { testCell } from '../lib/commission';
import { niceDay, todayISO } from '../lib/weeks';

export function ProgramPicker({ groups, onPlan, onOpen, onClose, busy }: {
  groups: PickGroup[];
  /** The ticked rows, in the order shown. */
  onPlan: (rows: PickRow[]) => void;
  onOpen: (testId: string) => void;
  onClose: () => void;
  busy?: boolean;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [find, setFind] = useState('');
  const [showProved, setShowProved] = useState(false);
  const today = todayISO();
  const all = useMemo(() => groups.flatMap(g => g.rows), [groups]);
  const q = find.trim().toLowerCase();
  const hit = (r: PickRow) => !q || [r.program.what, r.machine ?? '', r.program.runs ?? '', r.program.note ?? ''].some(s => s.toLowerCase().includes(q));
  const toggle = (id: string) => setPicked(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const chosen = all.filter(r => picked.has(r.program.id));
  const free = (g: PickGroup) => g.rows.filter(r => !r.proved && !r.test && hit(r));
  const anyFree = groups.some(g => free(g).length > 0);
  return (
    <section className="cmp-sec pk" aria-label="Prove programs">
      <div className="cw-sec-h">
        <h2 className="cmp-h">Prove programs</h2>
        <span className="sub">Tick the programs to test — each gets a proving test on its machine. Passing it proves the program.</span>
      </div>
      {all.length > 8 && (
        <input className="text-input pk-find" type="search" placeholder="Find a program, a machine or a run" value={find}
          onChange={e => setFind(e.target.value)} aria-label="Find a program" />
      )}
      {groups.map(g => {
        const toProve = g.rows.filter(r => !r.proved);
        const proved = g.rows.filter(r => r.proved);
        const shown = toProve.filter(hit);
        return (
          <div key={g.key} className="pk-g">
            <h3 className="pk-h">{g.title} <span className="sub">{toProve.length} to prove · {proved.length} proved</span></h3>
            {shown.length === 0 && <p className="sub pk-none">{toProve.length ? 'None match that.' : 'Every one is proved.'}</p>}
            <ul className="pk-rows">
              {shown.map(r => {
                const p = r.program;
                const where = [r.machine ?? 'the line itself', p.runs ? `runs ${p.runs}` : '', p.testOn ? `test day ${niceDay(p.testOn)}` : ''].filter(Boolean).join(' · ');
                /* a line's machine with no machine of its name on this job: its test is the line's */
                const off = r.machine && !r.assetId ? ` — no ${r.machine} on this job yet, so its test is on the line itself` : '';
                if (r.test) {
                  const c = testCell(r.test, today);
                  return (
                    <li key={p.id} className="pk-row has-test">
                      <span className="pk-main"><b>{p.what}</b><span className="sub">{where}</span></span>
                      <span className="pk-test">Its test: <span className={'cg-pstate is-' + c.tone}>{c.word}</span></span>
                      <button type="button" className="cw-link" onClick={() => onOpen(r.test?.id ?? '')}>Open it</button>
                    </li>
                  );
                }
                return (
                  <li key={p.id} className={'pk-row' + (picked.has(p.id) ? ' is-on' : '')}>
                    <label className="pk-pick">
                      <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Prove ${p.what}`} />
                      <span className="pk-main"><b>{p.what}</b><span className="sub">{where}{off}</span></span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {proved.length > 0 && (showProved
              ? <ul className="pk-rows pk-proved">{proved.filter(hit).map(r => (
                  <li key={r.program.id} className="pk-row is-proved">
                    <span className="pk-main"><b>{r.program.what}</b><span className="sub">{r.machine ?? 'the line itself'} · proved {niceDay(r.program.provedOn)}</span></span>
                  </li>))}</ul>
              : null)}
          </div>
        );
      })}
      {groups.some(g => g.rows.some(r => r.proved)) && (
        <button type="button" className="cw-link pk-show" onClick={() => setShowProved(s => !s)}>{showProved ? 'Hide the proved' : 'Show the proved'}</button>
      )}
      <div className="pk-go">
        <button type="button" className="btn btn-primary" disabled={!chosen.length || busy} onClick={() => onPlan(chosen)}>
          {busy ? 'Planning…' : chosen.length > 1 ? `Plan ${chosen.length} tests` : chosen.length === 1 ? 'Plan its test' : 'Tick a program'}
        </button>
        {anyFree && chosen.length < groups.reduce((n, g) => n + free(g).length, 0) && (
          <button type="button" className="btn btn-ghost" onClick={() => setPicked(new Set(groups.flatMap(g => free(g).map(r => r.program.id))))}>Tick all shown</button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </section>
  );
}
