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
import { getWorkspace, listAllStudies, onDataChange } from '../../db';
import { nav } from '../../state/useRoute';
import { analyse, shiftCapacity, shiftsIn, type CapacityResult, type ChangeoverIn, type ShiftIn } from './capacity';
import { countedShiftOf, threeCapacities, type CountedShift } from './capacityThree';
import { contributionOf } from '../losses/losses';
import { fmtN } from './capacityWords';
import { changeoverIn } from '../changeover/changeover';
import { studyHref } from '../../lib/studyLinks';
import type { StandardChangeover, ToolStudy } from '../../lib/study';
import type { Standard } from '../linestandard/standard';
import { standardMoney, standardMoneySays } from '../linestandard/standardMoney';
import type { CardFacts } from '../linestandard/standardCard';

export interface ShiftInputs {
  shifts?: ShiftIn[]; co?: ChangeoverIn; smed?: ToolStudy;
  /** The line's newest counted shift (its loss count), and the line's contribution a pack — for the three numbers (FC-041). */
  counted?: CountedShift; contribution?: number;
}

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
      const counted = countedShiftOf(all.filter(s => !s.deletedAt && s.tool === 'losses' && s.workspaceId === workspaceId), standardId);
      const contribution = ws ? contributionOf(ws)?.perPack : undefined;
      setOut({ shifts: shiftsIn(ws?.shifts), ...(co ? { co } : {}), ...(smed ? { smed } : {}), ...(counted ? { counted } : {}), ...(contribution != null ? { contribution } : {}) });
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
      <ThreeNumbers r={r} inputs={inputs} />
      {inputs.smed && <button type="button" className="linkish shc-go" onClick={() => nav(studyHref(inputs.smed as ToolStudy))}>The SMED into this product ›</button>}
    </div>
  );
}

/** CAPACITY'S THREE NUMBERS (FC-041) — what the shift was built to make, what it can really make and what a counted
 *  shift made, with the two ratios told apart and where design went (tools/linebalance/capacityThree). */
function ThreeNumbers({ r, inputs }: { r: CapacityResult; inputs: ShiftInputs }) {
  const t = threeCapacities(r, inputs.shifts ?? [], inputs.co, inputs.counted, { ...(inputs.contribution != null ? { contribution: inputs.contribution } : {}), ...(r.target != null ? { targetPerMin: r.target } : {}) });
  if (!t || !t.rows.length) return null;
  const c = t.counted;
  return (
    <div className="thr" aria-label="Capacity’s three numbers">
      <h3 className="shc-h">The three numbers</h3>
      <div className="cap-sheet-box">
        <table className="cap-sheet thr-t">
          <thead><tr><th>Shift</th><th className="n">Built to make</th><th className="n">Breaks</th><th className="n">Changeovers</th><th className="n">Stops &amp; rejects</th><th className="n">Can really make</th></tr></thead>
          <tbody>
            {t.rows.map((x, i) => (
              <tr key={i}>
                <td><b>{x.name}</b></td>
                <td className="n">{big(x.design)}</td>
                <td className="n">{x.breaks == null ? <span className="sub">not set</span> : `− ${big(x.breaks)}`}</td>
                <td className="n">{x.changeovers == null ? <span className="sub">—</span> : x.changeovers > 0 ? `− ${big(x.changeovers)}` : <span className="sub">none</span>}</td>
                <td className="n">{x.pace == null ? <span className="sub">—</span> : `− ${big(x.pace)}`}</td>
                <td className="n"><b>{big(x.effective)}</b>{x.share != null && <span className="cap-sheet-k">{Math.round(x.share * 100)}% of design</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="vc-says thr-says">{t.sentence}</p>
      {t.countSays && <p className="vc-says thr-count">{t.countSays}</p>}
      {c && c.utilisation != null && (
        <ul className="thr-ratios" aria-label="The two ratios">
          <li><b>{Math.round(c.utilisation * 100)}%</b> <span className="sub">utilisation — made ÷ built to make</span></li>
          {c.efficiency != null && <li><b>{Math.round(c.efficiency * 100)}%</b> <span className="sub">efficiency — made ÷ can really make</span></li>}
          {c.loading != null && <li><b>{Math.round(c.loading * 100)}%</b> <span className="sub">loading — what the target asks ÷ can really make</span></li>}
        </ul>
      )}
      {t.money && <p className={'cap-money thr-money' + (c?.short != null && c.short > 0 ? ' is-r' : '')}>{t.money}</p>}
      {t.notes.length > 0 && <ul className="cap-notes thr-notes" role="note">{t.notes.map(n => <li key={n}>{n}</li>)}</ul>}
      {inputs.counted?.id && <button type="button" className="linkish thr-go" onClick={() => nav(`#/losses/${inputs.counted?.id}`)}>Where the shift’s packs went — the loss count ›</button>}
    </div>
  );
}

/** The card at the line's one line for each standard (lib/standardCard) —
 *  capacity a shift, short, and what the people placed cost (one module,
 *  tools/linestandard/standardMoney — the same sentence the map's page says;
 *  knowledge/specs/FC-006-line-standard-money.md) — read once for the paper,
 *  beside worksFor. The money is said for every standard, Line capacity or
 *  not; the shift only where the product's capacity can be counted. */
export async function shiftShortsFor(list: Pick<Standard, 'id' | 'workspaceId' | 'capacity' | 'marks'>[]): Promise<Record<string, CardFacts | undefined>> {
  const all = await listAllStudies();
  const out: Record<string, CardFacts | undefined> = {};
  for (const s of list) {
    const ws = s.workspaceId ? await getWorkspace(s.workspaceId) : undefined;
    const money = standardMoneySays(standardMoney(s, ws));
    let shift: string | undefined;
    if (s.capacity?.stations.length) {
      const r = analyse(s.capacity);
      if (r.limit) shift = shiftCapacity(r, shiftsIn(ws?.shifts), changeoverIn(s.capacity.changeovers, all, s.id))?.short;
    }
    out[s.id] = { ...(shift ? { shift } : {}), money };
  }
  return out;
}
