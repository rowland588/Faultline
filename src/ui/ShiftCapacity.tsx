/* CAPACITY A SHIFT — under Line capacity's sheet, on a product's line
 * standard (docs/CAPACITY.md §2; docs/BUILD.md, Line capacity slice 5).
 *
 * Toyota's production capacity sheet works capacity a shift: the time a shift
 * less its planned stops, at the process's speed. Here the shift is the
 * line's own (its settings: the clock times and the breaks the line stops
 * for, relief 0 — the loss count set them), the planned stops are those
 * breaks and the changeovers SMED timed into this product (the standard's
 * agreed minutes, else the SMED as timed, × how many a shift the SMED says),
 * and the speed is the bottleneck's once its own stops count. A changeover
 * stops the whole line, so it comes off the shift once — and the stations'
 * own stops logged as changeovers are left out of their running share (the
 * panel's suggestion), so it is never taken twice.
 *
 * Nothing is assumed: a break not set, a changeover not timed or not counted,
 * is said so and left out of the sum. Neutral throughout — a changeover is
 * planned, not abnormal; the SMED's own page carries what it costs. */
import { useEffect, useState } from 'react';
import { getWorkspace, listAllStudies, onDataChange } from '../db';
import { nav } from '../state/useRoute';
import { analyse, fmtMoney, labourCost, labourInputs, shiftCapacity, shiftsIn, type CapacityResult, type ChangeoverIn, type ShiftIn } from '../lib/capacity';
import { fmtN, oneOf } from '../lib/capacityWords';
import { changeoverIn } from '../tools/changeover/changeover';
import { studyHref } from '../lib/studyLinks';
import type { StandardChangeover, ToolStudy } from '../lib/study';
import { headcount, type Standard } from '../lib/standard';

export interface ShiftInputs { shifts?: ShiftIn[]; co?: ChangeoverIn; smed?: ToolStudy }

/** The line's shifts and the changeover into this product, kept current.
 *  `shifts` is undefined until the line is read. */
export function useShiftInputs(workspaceId: string | undefined, standardId: string | undefined, agreed: StandardChangeover[] | undefined): ShiftInputs {
  const [out, setOut] = useState<ShiftInputs>({});
  const key = JSON.stringify(agreed ?? []);
  useEffect(() => {
    if (!standardId) return;
    let live = true;
    const load = async () => {
      const [ws, all] = await Promise.all([workspaceId ? getWorkspace(workspaceId) : Promise.resolve(undefined), listAllStudies()]);
      if (!live) return;
      const co = changeoverIn(agreed, all, standardId);
      const smed = all.filter(s => !s.deletedAt && s.tool === 'changeover' && s.standardId === standardId).sort((a, b) => b.startedAt - a.startedAt)[0];
      setOut({ shifts: shiftsIn(ws?.shifts), ...(co ? { co } : {}), ...(smed ? { smed } : {}) });
    };
    void load();
    const off = onDataChange(() => void load());
    return () => { live = false; off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the agreed list is read through its key
  }, [workspaceId, standardId, key]);
  return out;
}

const minCell = (m?: number) => (m == null ? '—' : `${fmtN(Math.round(m * 10) / 10)} min`);
const big = (n?: number) => (n == null ? '—' : Math.round(n).toLocaleString('en-GB'));

export function ShiftCapacityView({ r, inputs }: { r: CapacityResult; inputs: ShiftInputs }) {
  if (!inputs.shifts) return null;
  const c = shiftCapacity(r, inputs.shifts, inputs.co);
  if (!c) return null;
  const many = c.rows.length > 1;
  return (
    <div className="shc">
      <h3 className="shc-h">A shift</h3>
      {c.rows.length > 0 && (
        <div className="cap-sheet-box">
          <table className="cap-sheet shc-t">
            <thead><tr><th>Shift</th><th className="n">Its time</th><th className="n">Breaks</th><th className="n">Changeovers</th><th className="n">Making</th><th className="n">{r.unit} a shift</th></tr></thead>
            <tbody>
              {c.rows.map((x, i) => (
                <tr key={i}>
                  <td><b>{x.name}</b></td>
                  <td className="n">{minCell(x.min)}</td>
                  <td className="n">{x.breakMin == null ? <span className="sub">not set</span> : x.breakMin === 0 ? <span className="sub">relief — 0</span> : minCell(x.breakMin)}</td>
                  <td className="n">{x.changeoverMin == null ? <span className="sub">{inputs.co ? 'not counted' : 'none timed'}</span> : minCell(x.changeoverMin)}</td>
                  <td className="n">{minCell(x.making)}</td>
                  <td className="n"><b>{big(x.made)}</b>{x.without != null && <span className="cap-sheet-k">{big(x.without)} with none</span>}</td>
                </tr>
              ))}
              {many && c.day && (
                <tr className="shc-day">
                  <td><b>A day</b></td><td className="n" /><td className="n" />
                  <td className="n">{c.day.changeoverMin != null ? minCell(c.day.changeoverMin) : ''}</td><td className="n" />
                  <td className="n"><b>{big(c.day.made)}</b>{c.day.without != null && <span className="cap-sheet-k">{big(c.day.without)} with none</span>}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="vc-says shc-says">{c.sentence}</p>
      {inputs.smed && <button type="button" className="linkish shc-go" onClick={() => nav(studyHref(inputs.smed as ToolStudy))}>The SMED into this product ›</button>}
    </div>
  );
}

/** The card at the line's one line for each standard (lib/standardCard) —
 *  capacity a shift, short — read once for the paper, beside worksFor. */
export async function shiftShortsFor(list: Pick<Standard, 'id' | 'workspaceId' | 'capacity' | 'marks'>[]): Promise<Record<string, string | undefined>> {
  const all = await listAllStudies();
  const out: Record<string, string | undefined> = {};
  for (const s of list) {
    if (!s.capacity?.stations.length) continue;
    const r = analyse(s.capacity);
    if (!r.limit) continue;
    const ws = s.workspaceId ? await getWorkspace(s.workspaceId) : undefined;
    const shift = shiftCapacity(r, shiftsIn(ws?.shifts), changeoverIn(s.capacity.changeovers, all, s.id))?.short;
    /* WHAT A PACK COSTS IN LABOUR, on the same line of the card (lib/capacity labourCost) */
    const li = labourInputs(s.capacity, headcount(s), ws);
    const lc = labourCost(r, li.people, li.rate);
    const cost = lc ? `${fmtMoney(lc.perPack)} a ${oneOf(r.unit)} in labour — ${lc.people} ${lc.people === 1 ? 'person' : 'people'} at ${fmtMoney(li.rate ?? 0)} an hour` : undefined;
    out[s.id] = [shift, cost].filter(Boolean).join(' · ') || undefined;
  }
  return out;
}
