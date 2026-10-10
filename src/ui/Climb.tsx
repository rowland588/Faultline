/* THE CLIMB TO RATE — a product's runs on a machine, drawn as the climb they
 * are, with what it says (lib/rampUp; docs/LEAN40.md, step 1).
 *
 * Table in, picture out: nothing is typed here. Each run is a dot in ink at
 * its net rate; the agreed rate is a dashed line; while it is climbing, the
 * fitted curve runs on, dotted, to the run where it meets the line — a
 * projection, drawn as one, never as a fact. No state's colour on the
 * picture: the sentence beside it carries the tone, in words, amber only when
 * it is not climbing (CLAUDE.md, visual management 1 and 4). */
import type { Climb } from '../lib/rampUp';
import { num } from '../lib/run';

const W = 240, H = 64, PAD = { l: 6, r: 44, t: 8, b: 10 };

function ClimbPicture({ c }: { c: Climb }) {
  const lastN = Math.max(c.points.length, c.runNo ?? 0);
  const nets = [...c.points.map(p => p.net), c.agreed];
  const lo = Math.min(...nets) * 0.96, hi = Math.max(...nets) * 1.03;
  const x = (n: number) => PAD.l + ((n - 1) / Math.max(1, lastN - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (H - PAD.t - PAD.b);
  const fit = c.kind === 'climbing' && c.fit && c.runNo
    ? Array.from({ length: (c.runNo - 1) * 4 + 1 }, (_, i) => 1 + i / 4).map(n => `${x(n).toFixed(1)},${y(Math.min(hi, (c.fit as (n: number) => number)(n))).toFixed(1)}`).join(' ')
    : '';
  return (
    <svg className="cl-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={c.text} preserveAspectRatio="xMinYMid meet">
      <line className="cl-agreed" x1={PAD.l} x2={W - PAD.r} y1={y(c.agreed)} y2={y(c.agreed)} />
      <text className="cl-agreed-w" x={W - PAD.r + 8} y={y(c.agreed) + 3}>{num(c.agreed)} agreed</text>
      {fit && <polyline className="cl-fit" points={fit} />}
      {c.kind === 'climbing' && c.runNo && <circle className="cl-meet" cx={x(c.runNo)} cy={y(c.agreed)} r={3.2} />}
      {c.points.map((p, i) => <circle key={p.runId} className="cl-dot" cx={x(i + 1)} cy={y(p.net)} r={3.2} />)}
    </svg>
  );
}

/** One climb: the picture, and the sentence with its tone in words. */
export function ClimbLine({ c, machine }: { c: Climb; machine?: boolean }) {
  return (
    <div className={'cl is-' + c.tone}>
      <ClimbPicture c={c} />
      <p className="cl-say">{machine && c.machine ? <b>{c.machine} · </b> : null}{c.text}</p>
    </div>
  );
}

/** Every climb given, under one small heading — the run's own, or a machine's. */
export function Climbs({ cs, machine }: { cs: Climb[]; machine?: boolean }) {
  if (!cs.length) return null;
  return (
    <div className="cl-list">
      <small className="cl-h">The climb to rate</small>
      {cs.map(c => <ClimbLine key={`${c.machineId ?? ''}|${c.product}`} c={c} machine={machine} />)}
    </div>
  );
}
