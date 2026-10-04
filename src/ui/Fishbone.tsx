/* THE FISHBONE IS THE JOURNEY — the running line's equivalent of the stage
 * gate's Gantt (docs/SIXM.md). Rowland, 4 October: "you can click on it, it's
 * interactive, it all comes alive."
 *
 * The head is the problem and its number; six bones, People · Machine ·
 * Method above and Material · Measurement · Environment below; each cause a
 * rib on its bone with how it is known and how sure we are. What the data
 * suggests is drawn faint and dashed until somebody accepts it. Tapping a
 * cause opens it (the cause sheet); tapping a suggestion offers it.
 *
 * Three shapes, one set of marks (ui/fishbone/marks.tsx):
 *  - wide (a laptop): the drawn fish, laid out in real pixels by
 *    ui/fishbone/layout.ts so no two marks ever sit on each other;
 *  - narrow (a phone): a small drawn fish to show the shape, then the six
 *    bones as lanes — an empty one is one line;
 *  - compact: the head and six bones with their counts, for a dashboard.
 *
 * The bones are told apart by place and name, never by colour; the only
 * colour is the phase word (house state colours) and brand blue on what you
 * press. Pure: everything comes in through props. */
import { Fragment, useMemo, type CSSProperties } from 'react';
import type { Can } from '../lib/access';
import { PHASE_WORD, type Bone, type ProblemMeasure, type ProblemView, type Suggestion } from '../lib/problems';
import { GRADES, sixmLabel, type Cause, type SixM } from '../lib/sixm';
import { plural } from '../lib/format';
import { boneWords, isRoot, layoutFish, lossWords, orderItems, STATUS_WORD, type Item } from './fishbone/layout';
import { GradeMeter, RootTag, StatusGlyph } from './fishbone/marks';
import { coarsePointer, useWidth } from './fishbone/useWidth';

export interface FishboneProps {
  view: ProblemView;
  can: Can;
  onCause: (c: Cause) => void;
  onSuggestion: (s: Suggestion) => void;
  onAdd: (m: SixM) => void;
  /** The head and six bones with their counts only — for a dashboard or a drawer. */
  compact?: boolean;
}

/** Below this the bones stack as lanes. Measured on the fishbone's own box,
 *  so it is right wherever it is put, not just at the page's width. */
const DRAWN_MIN = 820;

export function Fishbone({ view: whole, can, onCause, onSuggestion, onAdd, compact }: FishboneProps) {
  const [ref, w] = useWidth<HTMLDivElement>();
  /* A suggestion is an offer to whoever works the fishbone ("add this?").
     Someone who only reads it (a client) is shown what is on the fish, not
     the data's guesses they cannot act on. */
  const view = useMemo(() => can.edit ? whole
    : { ...whole, bones: whole.bones.map(b => b.suggestions.length ? { ...b, suggestions: [] } : b) }, [whole, can.edit]);
  const mode = compact ? 'compact' : w >= DRAWN_MIN ? 'drawn' : 'lanes';
  /* The drawn fish and the lanes sit in a framed box; the drawing is laid
     out in the room inside its frame and padding (FRAME_X). */
  const inner = Math.max(0, w - (mode === 'drawn' ? FRAME_X.drawn : mode === 'lanes' ? FRAME_X.lanes : 0));
  return (
    <div ref={ref} className={'fb is-' + mode}>
      {w > 0 && mode === 'compact' && <CompactFish view={view} width={inner} />}
      {w > 0 && mode === 'drawn' && (
        <>
          <div className="fb-frame">
            <DrawnFish view={view} can={can} width={inner} onCause={onCause} onSuggestion={onSuggestion} onAdd={onAdd} />
          </div>
          <Key view={view} />
        </>
      )}
      {w > 0 && mode === 'lanes' && (
        <>
          <div className="fb-frame">
            <div className="fb-frame-top">
              <CompactFish view={view} width={inner} onBone={m => {
                document.getElementById(laneId(view, m))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }} />
            </div>
            <Lanes view={view} can={can} onCause={onCause} onSuggestion={onSuggestion} onAdd={onAdd} />
          </div>
          <Key view={view} />
        </>
      )}
    </div>
  );
}

/** Border and side padding of each frame, in px — kept with the CSS (.fb-frame). */
const FRAME_X = { drawn: 2 + 2 * 18, lanes: 2 + 2 * 12 };

/* ------------------------------- words ------------------------------- */

const laneId = (v: ProblemView, m: SixM) => `fb-lane-${v.problem.id}-${m}`;
const gradeLabel = (c: Cause) => GRADES.find(g => g.key === c.grade)?.label ?? '';

/** 3.2 · 47.8 · 1,250 — a tenth below a hundred, whole numbers above: the
 *  same figure the sentence and the paper print (lib/fishbone rounds to a tenth). */
export function num(n: number): string {
  return Math.abs(n) < 100 ? n.toFixed(1).replace(/\.0$/, '') : Math.round(n).toLocaleString('en-GB');
}

/** What a cause is, said in full — the mark's name for a screen reader, and its peek. */
function causeSays(c: Cause, withRoot = true): string {
  const bits = [gradeLabel(c).toLowerCase(), STATUS_WORD[c.status]];
  if (withRoot && isRoot(c)) bits.push('the root');
  const whys = c.whys.filter(x => x.text.trim()).length;
  if (whys) bits.push(plural(whys, 'why', 'whys'));
  return bits.join(' · ');
}

function suggestionSays(s: Suggestion): string {
  /* The loss once: the detail line often says it already. */
  const loss = lossWords(s.minutesWeek ?? s.source.minutesWeek);
  return [s.detail, loss && !/ a week/.test(s.detail ?? '') ? loss : '', s.guessed ? 'bone guessed from the stop’s words' : '']
    .filter(Boolean).join(' · ');
}

/** The head's number: before → now in the problem's unit, and the target. */
function Measure({ m }: { m: ProblemMeasure }) {
  const has = (x?: number): x is number => x != null && Number.isFinite(x);
  return (
    <span className="fb-num">
      {has(m.before) && has(m.now) && m.before !== m.now ? (
        <><span className="fb-num-was">{num(m.before)}</span> <span aria-label="now">→</span>{' '}
          <b className={m.moved === 'worse' ? 'is-worse' : ''}>{num(m.now)}</b> {m.unit}</>
      ) : has(m.now) ? <><b className={m.moved === 'worse' ? 'is-worse' : ''}>{num(m.now)}</b> {m.unit}</>
        : has(m.before) ? <><b>{num(m.before)}</b> {m.unit}</> : null}
      {has(m.target) && <span className="fb-num-t">target {num(m.target)}{has(m.now) || has(m.before) ? '' : ` ${m.unit}`}</span>}
    </span>
  );
}

function Phase({ view }: { view: ProblemView }) {
  return <span className={'fb-phase is-' + view.phase}>{PHASE_WORD[view.phase]}</span>;
}

/* ----------------------------- the drawn fish ----------------------------- */

function DrawnFish({ view, can, width, onCause, onSuggestion, onAdd }: Omit<FishboneProps, 'compact'> & { width: number }) {
  const coarse = coarsePointer();
  const rowH = coarse ? 44 : 34;
  const headH = view.says && view.measure ? 196 : 172;
  const L = useMemo(() => layoutFish(view.bones, width, { rowH, headH, labelH: coarse ? 64 : 46 }), [view.bones, width, rowH, headH, coarse]);
  const title = view.problem.title || 'The problem';
  return (
    <div className="fb-fish" style={{ height: L.height }} role="group" aria-label={`The fishbone for ${title}`}>
      <svg className="fb-svg" width={L.width} height={L.height} viewBox={`0 0 ${L.width} ${L.height}`} aria-hidden focusable="false">
        {/* the tail */}
        <path className="fb-tail" d={`M${L.tailX} ${L.spineY} L${L.tailX - 20} ${L.spineY - 10} L${L.tailX - 15} ${L.spineY} L${L.tailX - 20} ${L.spineY + 10} Z`} />
        {/* the ribs, under the bones so a bone crosses cleanly over their ends */}
        {L.bones.flatMap(pb => pb.items.map(pi => {
          const sugg = pi.item.kind === 'suggestion';
          const c = pi.item.kind === 'cause' ? pi.item.cause : undefined;
          return (
            <line key={pi.item.key} x1={pi.x} y1={pi.lineY} x2={pi.attachX} y2={pi.lineY}
              className={'fb-rib' + (sugg ? ' is-sugg' : '') + (c && isRoot(c) ? ' is-root' : '') + (c?.status === 'ruled_out' ? ' is-out' : '')} />
          );
        }))}
        {L.bones.map(pb => <line key={pb.bone.m} className="fb-bone" x1={pb.outer.x} y1={pb.outer.y} x2={pb.spine.x} y2={pb.spine.y} />)}
        <line className="fb-spine" x1={L.tailX} y1={L.spineY} x2={L.head.x + 8} y2={L.spineY} />
      </svg>

      <div className="fb-head" style={{ left: L.head.x, top: L.head.y, width: L.head.w, height: L.head.h }}>
        <Phase view={view} />
        <b className="fb-title">{title}</b>
        {view.measure && <Measure m={view.measure} />}
        {view.says && <span className="fb-says">{view.says}</span>}
      </div>

      {L.bones.map(pb => (
        <Fragment key={pb.bone.m}>
          <div className={'fb-lab' + (pb.upper ? ' is-up' : ' is-down') + (pb.bone.causes.length ? '' : ' is-empty')}
            style={{ left: pb.label.x, top: pb.label.y, width: pb.label.w, height: pb.label.h }}>
            <span className="fb-lab-row">
              <b className="fb-lab-n">{sixmLabel(pb.bone.m)}</b>
              {can.edit && (
                <button type="button" className="fb-add" onClick={() => onAdd(pb.bone.m)} aria-label={`Add a cause on ${sixmLabel(pb.bone.m)}`}>+ Add</button>
              )}
            </span>
            <span className="fb-lab-c">{boneWords(pb.bone)}</span>
          </div>
          {pb.items.map(pi => (
            <Mark key={pi.item.key} item={pi.item} m={pb.bone.m} onCause={onCause} onSuggestion={onSuggestion}
              style={{ left: pi.x, top: pi.y, width: pi.w, height: pi.h }} />
          ))}
        </Fragment>
      ))}
    </div>
  );
}

function Mark({ item, m, style, onCause, onSuggestion }: {
  item: Item; m: SixM; style: CSSProperties; onCause: (c: Cause) => void; onSuggestion: (s: Suggestion) => void;
}) {
  const bone = sixmLabel(m);
  if (item.kind === 'suggestion') {
    const s = item.s, says = suggestionSays(s);
    return (
      <button type="button" className="fb-mark is-sugg" style={style} onClick={() => onSuggestion(s)}
        aria-label={`Suggested for ${bone}: ${s.text}${says ? ` — ${says}` : ''}. Tap to look at it.`}>
        <StatusGlyph suggestion />
        <span className="fb-mark-t">{s.text}</span>
        <span className="fb-peek" aria-hidden><b>{s.text}</b>{says && <small>Suggested · {says}</small>}</span>
      </button>
    );
  }
  const c = item.cause, root = isRoot(c), says = causeSays(c);
  return (
    <button type="button" className={`fb-mark is-${c.status}${root ? ' is-root' : ''}`} style={style} onClick={() => onCause(c)}
      aria-label={`${bone}: ${c.text} — ${says}. Tap to open it.`}>
      <StatusGlyph status={c.status} root={root} />
      <span className="fb-mark-t">{c.text || 'A cause with no words yet'}</span>
      {root && <RootTag />}
      <GradeMeter grade={c.grade} />
      <span className="fb-peek" aria-hidden><b>{c.text}</b><small>{says}</small></span>
    </button>
  );
}

/* --------------------------- the phone's lanes --------------------------- */

function Lanes({ view, can, onCause, onSuggestion, onAdd }: Omit<FishboneProps, 'compact'>) {
  return (
    <div className="fb-lanes">
      {view.bones.map(b => {
        const items = orderItems(b);
        const label = sixmLabel(b.m);
        return (
          <section key={b.m} id={laneId(view, b.m)} className={'fb-lane' + (items.length ? '' : ' is-empty')} aria-label={label}>
            <div className="fb-lane-h">
              <h4 className="fb-lane-n">{label}</h4>
              <span className="fb-lane-c">{boneWords(b)}</span>
              {can.edit && <button type="button" className="fb-add" onClick={() => onAdd(b.m)} aria-label={`Add a cause on ${label}`}>+ Add</button>}
            </div>
            {items.length > 0 && (
              <ul className="fb-rows">
                {items.map(it => <li key={it.key}><Row item={it} bone={label} onCause={onCause} onSuggestion={onSuggestion} /></li>)}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Row({ item, bone, onCause, onSuggestion }: {
  item: Item; bone: string; onCause: (c: Cause) => void; onSuggestion: (s: Suggestion) => void;
}) {
  if (item.kind === 'suggestion') {
    const s = item.s, says = suggestionSays(s);
    return (
      <button type="button" className="fb-row is-sugg" onClick={() => onSuggestion(s)}
        aria-label={`Suggested for ${bone}: ${s.text}${says ? ` — ${says}` : ''}. Tap to look at it.`}>
        <StatusGlyph suggestion />
        <span className="fb-row-main">
          <span className="fb-row-t">{s.text}</span>
          <span className="fb-row-s">Suggested{says ? ` · ${says}` : ''}</span>
        </span>
      </button>
    );
  }
  const c = item.cause, root = isRoot(c);
  const from = c.source?.label ? [c.source.label, lossWords(c.source.minutesWeek)].filter(Boolean).join(', ') : '';
  return (
    <button type="button" className={`fb-row is-${c.status}${root ? ' is-root' : ''}`} onClick={() => onCause(c)}
      aria-label={`${bone}: ${c.text} — ${causeSays(c)}. Tap to open it.`}>
      <StatusGlyph status={c.status} root={root} />
      <span className="fb-row-main">
        <span className="fb-row-t">{c.text || 'A cause with no words yet'}</span>
        <span className="fb-row-s"><GradeMeter grade={c.grade} /> {causeSays(c, false)}{from ? ` · ${from}` : ''}</span>
      </span>
      {root && <RootTag />}
    </button>
  );
}

/* ------------------------- the small drawn fish ------------------------- */

/** Causes and roots only — the lanes or the screen it opens carry the rest. */
function shortCount(b: Bone): string {
  const n = b.causes.length, r = b.causes.filter(isRoot).length;
  if (!n) return b.suggestions.length ? `${b.suggestions.length} suggested` : 'Nothing found yet';
  return plural(n, 'cause') + (r ? ` · ${plural(r, 'root')}` : '');
}

const finite = (x?: number): x is number => x != null && Number.isFinite(x);

function CompactFish({ view, width, onBone }: { view: ProblemView; width: number; onBone?: (m: SixM) => void }) {
  const narrow = width < 520;
  const m = view.measure;
  /* NARROW, THE HEAD CARRIES THE PROBLEM'S NUMBER — what it is now, in its
     unit. It was a circle with a dot in it, which on a phone read as an empty
     box rather than the head of the fish; the head is "the problem and its
     number" (docs/SIXM.md), so the number is what goes in it. The title, the
     phase and what the number was (and is aimed at) stay on the line above,
     so nothing is said twice. With no number yet, the head is the shape. */
  const headNum = narrow && m ? (finite(m.now) ? m.now : finite(m.before) ? m.before : undefined) : undefined;
  const headW = narrow ? (headNum != null ? 78 : 48) : Math.round(Math.min(230, Math.max(150, width * 0.3)));
  const labH = 46, boneH = 44;
  const spineY = labH + boneH + 2;
  const H = spineY + boneH + labH + 2;
  const padL = narrow ? 18 : 22;
  const headX = width - headW - 2;
  const colW = (headX - (narrow ? 8 : 14) - padL) / 3;
  const dx = colW * 0.3;
  const title = view.problem.title || 'The problem';
  const was = m && headNum != null && finite(m.before) && finite(m.now) && m.before !== m.now ? m.before : undefined;
  return (
    <div className={'fb-mini' + (narrow ? ' is-narrow' : '')}>
      {narrow && (
        <div className="fb-mini-top">
          <b className="fb-title">{title}</b>
          <span className="fb-mini-meta">
            <Phase view={view} />
            {m && headNum == null && <Measure m={m} />}
            {m && headNum != null && (was != null || finite(m.target)) && (
              <span className="fb-num">
                {was != null && <span className="fb-num-was">was {num(was)}</span>}
                {was != null && finite(m.target) && ' · '}
                {finite(m.target) && <span className="fb-num-was">target {num(m.target)}</span>}
                {' '}{m.unit}
              </span>
            )}
          </span>
        </div>
      )}
      <div className="fb-mini-fish" style={{ height: H }} role="img"
        aria-label={`Fishbone for ${title}: ${view.bones.map(b => `${sixmLabel(b.m)} ${shortCount(b)}`).join('; ')}`}>
        <svg className="fb-svg" width={width} height={H} viewBox={`0 0 ${width} ${H}`} aria-hidden focusable="false">
          <path className="fb-tail" d={`M${padL} ${spineY} L${padL - 16} ${spineY - 8} L${padL - 12} ${spineY} L${padL - 16} ${spineY + 8} Z`} />
          {view.bones.slice(0, 6).map((b, idx) => {
            const upper = idx < 3, i = idx % 3;
            const xs = padL + colW * (i + 1), ys = spineY;
            const xo = xs - dx, yo = upper ? spineY - boneH : spineY + boneH;
            const marks = orderItems(b).slice(0, 6);
            return (
              <g key={b.m}>
                <line className="fb-bone" x1={xo} y1={yo} x2={xs} y2={ys} />
                {marks.map((it, k) => {
                  const t = (k + 1) / (marks.length + 1);
                  const x = xo + (xs - xo) * t, y = yo + (ys - yo) * t;
                  const c = it.kind === 'cause' ? it.cause : undefined;
                  const cls = !c ? 'is-sugg' : isRoot(c) ? 'is-root' : `is-${c.status}`;
                  return <circle key={it.key} className={'fb-dot ' + cls} cx={x} cy={y} r={c && isRoot(c) ? 4.8 : 3.6} />;
                })}
              </g>
            );
          })}
          <line className="fb-spine" x1={padL} y1={spineY} x2={headX + 6} y2={spineY} />
        </svg>
        <div className="fb-head is-mini" style={{ left: headX, top: spineY - (narrow ? 28 : 50), width: headW, height: narrow ? 56 : 100 }}>
          {!narrow ? <><Phase view={view} /><b className="fb-title">{title}</b>{m && <Measure m={m} />}</>
            : headNum != null && m ? (
              <span className="fb-head-num" aria-label={`now ${num(headNum)} ${m.unit}`}>
                <b className={m.moved === 'worse' ? 'is-worse' : ''}>{num(headNum)}</b>
                <small>{m.unit}</small>
              </span>
            ) : <i className="fb-eye" aria-hidden />}
        </div>
        {view.bones.slice(0, 6).map((b, idx) => {
          const upper = idx < 3, i = idx % 3;
          const xo = padL + colW * (i + 1) - dx;
          const style: CSSProperties = { left: Math.max(0, xo - (colW - 6) / 2), top: upper ? 0 : spineY + boneH + 2, width: colW - 6, height: labH };
          const inner = <><b>{sixmLabel(b.m)}</b><span>{shortCount(b)}</span></>;
          return onBone
            ? <button key={b.m} type="button" className={'fb-mini-lab' + (upper ? ' is-up' : ' is-down')} style={style} onClick={() => onBone(b.m)}
              aria-label={`${sixmLabel(b.m)}: ${shortCount(b)} — go to it`}>{inner}</button>
            : <span key={b.m} className={'fb-mini-lab' + (upper ? ' is-up' : ' is-down')} style={style} aria-hidden>{inner}</span>;
        })}
      </div>
    </div>
  );
}

/* --------------------------------- the key --------------------------------- */

function Key({ view }: { view: ProblemView }) {
  const all = view.bones.flatMap(b => b.causes);
  const anySugg = view.bones.some(b => b.suggestions.length > 0);
  /* Nothing on the fish yet: nothing to explain. */
  if (!all.length && !anySugg) return null;
  return (
    <p className="fb-key sub">
      <span><StatusGlyph status="confirmed" />confirmed</span>
      <span><StatusGlyph status="suspected" />suspected</span>
      {all.some(c => c.status === 'ruled_out') && <span><StatusGlyph status="ruled_out" />ruled out</span>}
      <span><RootTag />drilled to its root with the five whys</span>
      {anySugg && <span><StatusGlyph suggestion />the data suggests it — tap to look</span>}
      <span className="fb-key-g">How it is known:
        {GRADES.map(g => <span key={g.key}><GradeMeter grade={g.key} />{g.label.toLowerCase()}</span>)}
      </span>
      <span className="fb-key-say">Tap a cause to open it.</span>
    </p>
  );
}
