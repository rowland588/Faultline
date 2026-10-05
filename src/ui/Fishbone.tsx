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
 * The bones are told apart by place and name, never by colour. The state
 * colours are on the phase word and on each cause's fixes tag ("1 fix · past
 * due") — the two things on the fish that are late, waiting or done; brand
 * blue is on what you press. From across the room: which bone holds the
 * root, and whether anything is late (docs/SIXM.md, the fishbone page).
 *
 * The head opens the problem (onHead), and with `fill` the drawn fish grows
 * into the height its box is given — the fishbone page hands it the room
 * under its bar. Pure: everything comes in through props. */
import { Fragment, createContext, useContext, useMemo, type CSSProperties, type ReactNode } from 'react';
import type { Can } from '../lib/access';
import { PHASE_WORD, type Bone, type ProblemMeasure, type ProblemView, type Suggestion } from '../lib/problems';
import { GRADES, KNOWN_WORD, sixmLabel, type Cause, type SixM } from '../lib/sixm';
import { plural } from '../lib/format';
import { boneWords, fixesOf, fixTag, isRoot, layoutFish, lossWords, orderItems, STATUS_WORD, type FixTag, type Item } from './fishbone/layout';
import { FixTagMark, GradeMeter, RootTag, StatusGlyph } from './fishbone/marks';
import { coarsePointer, useInnerBox, useWidth } from './fishbone/useWidth';

export interface FishboneProps {
  view: ProblemView;
  can: Can;
  onCause: (c: Cause) => void;
  onSuggestion: (s: Suggestion) => void;
  onAdd: (m: SixM) => void;
  /** The head and six bones with their counts only — for a dashboard or a drawer. */
  compact?: boolean;
  /** Tapping the head of the fish — the drawn head on a laptop, the title
   *  strip and the small head over the lanes on a phone — calls this (the
   *  fishbone page opens the problem from it). Without it the head is words. */
  onHead?: () => void;
  /** Grow to fill the height of the box it is put in (the fishbone page gives
   *  it the room under its bar): the drawn fish's bones spread to the height
   *  there is, and when that is short the fish scrolls inside its frame rather
   *  than squashing. The box must have a height of its own. Off, the fish is
   *  as tall as its marks need, as on the project page. */
  fill?: boolean;
  /** The cause open beside the fish (the fishbone page's panel): its mark is
   *  drawn as the one you are in — "I click, I go in" shows where you went. */
  selected?: string;
  /** The page already says the problem's title and phase above the fish (the
   *  fishbone page's bar): the phone's title strip over the lanes is left off
   *  so it is said once (CLAUDE.md, one thing one place). The small head
   *  still opens the problem. */
  untitled?: boolean;
}

/** The cause open beside the fish — read by each mark and lane row. */
const SelectedCause = createContext<string | undefined>(undefined);

/** Below this the bones stack as lanes. Measured on the fishbone's own box,
 *  so it is right wherever it is put, not just at the page's width. */
const DRAWN_MIN = 820;

export function Fishbone({ view: whole, can, onCause, onSuggestion, onAdd, compact, onHead, fill, selected, untitled }: FishboneProps) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [frameRef, room] = useInnerBox<HTMLDivElement>();
  /* A suggestion is an offer to whoever works the fishbone ("add this?").
     Someone who only reads it (a client) is shown what is on the fish, not
     the data's guesses they cannot act on. */
  const view = useMemo(() => can.edit ? whole
    : { ...whole, bones: whole.bones.map(b => b.suggestions.length ? { ...b, suggestions: [] } : b) }, [whole, can.edit]);
  /* Each cause's fixes, said once for the drawn mark and the lane row alike. */
  const fixes = useMemo(() => fixTagsOf(view), [view]);
  const mode = compact ? 'compact' : w >= DRAWN_MIN ? 'drawn' : 'lanes';
  const fills = !!fill && mode !== 'compact';
  /* The drawn fish and the lanes sit in a framed box; the drawing is laid
     out in the room inside its frame and padding (FRAME_X). */
  const inner = Math.max(0, w - (mode === 'drawn' ? FRAME_X.drawn : mode === 'lanes' ? FRAME_X.lanes : 0));
  return (
    <SelectedCause.Provider value={selected}>
    <div ref={ref} className={'fb is-' + mode + (fills ? ' is-fill' : '')}>
      {w > 0 && mode === 'compact' && <CompactFish view={view} width={inner} onHead={onHead} />}
      {w > 0 && mode === 'drawn' && (
        <>
          <div className="fb-frame" ref={fills ? frameRef : undefined}>
            <DrawnFish view={view} can={can} width={fills && room.w ? Math.min(inner, room.w) : inner} fixes={fixes} room={fills ? room.h : undefined}
              onCause={onCause} onSuggestion={onSuggestion} onAdd={onAdd} onHead={onHead} />
          </div>
          <Key view={view} />
        </>
      )}
      {w > 0 && mode === 'lanes' && (
        <>
          <div className="fb-frame">
            <div className="fb-frame-top">
              <CompactFish view={view} width={inner} onHead={onHead} untitled={untitled} onBone={m => {
                document.getElementById(laneId(view, m))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }} />
            </div>
            <Lanes view={view} can={can} fixes={fixes} onCause={onCause} onSuggestion={onSuggestion} onAdd={onAdd} />
            {/* Filling a phone's screen, the key ends the scroll rather than
                taking a strip off the bottom of it. */}
            {fills && <Key view={view} />}
          </div>
          {!fills && <Key view={view} />}
        </>
      )}
    </div>
    </SelectedCause.Provider>
  );
}

/** Border and side padding of each frame, in px — kept with the CSS (.fb-frame). */
const FRAME_X = { drawn: 2 + 2 * 18, lanes: 2 + 2 * 12 };

/* ------------------------------- words ------------------------------- */

/** Every cause's fixes tag, by cause id — only the causes that have a fix. */
function fixTagsOf(v: ProblemView): Map<string, FixTag> {
  const out = new Map<string, FixTag>();
  for (const c of v.bones.flatMap(b => b.causes)) {
    const t = fixTag(fixesOf(v.actions, v.problem.id, c.id));
    if (t) out.set(c.id, t);
  }
  return out;
}

/** The head's name for a screen reader, and the words on its tap. */
const headSays = (title: string) => `Open the problem — ${title}`;

const laneId = (v: ProblemView, m: SixM) => `fb-lane-${v.problem.id}-${m}`;
/* How a cause is known, in the working method's words — seen · data ·
   counted · told (lib/sixm KNOWN_WORD), the same on the card, the sheet and
   the paper. The stored grade keys do not change. */
const gradeLabel = (c: Cause) => KNOWN_WORD[c.grade] ?? '';

/** 3.2 · 47.8 · 1,250 — a tenth below a hundred, whole numbers above: the
 *  same figure the sentence and the paper print (lib/fishbone rounds to a tenth). */
export function num(n: number): string {
  return Math.abs(n) < 100 ? n.toFixed(1).replace(/\.0$/, '') : Math.round(n).toLocaleString('en-GB');
}

/** What a cause is, said in full — the mark's name for a screen reader, and its peek. */
function causeSays(c: Cause, withRoot = true, fix?: FixTag): string {
  const bits = [gradeLabel(c), STATUS_WORD[c.status]];
  if (withRoot && isRoot(c)) bits.push('the root');
  const whys = c.whys.filter(x => x.text.trim()).length;
  if (whys) bits.push(plural(whys, 'why', 'whys'));
  if (fix) bits.push(fix.words);
  return bits.join(' · ');
}

function suggestionSays(s: Suggestion): string {
  /* The loss once: the detail line often says it already. */
  const loss = lossWords(s.minutesWeek ?? s.source.minutesWeek);
  return [s.detail, loss && !/ a week/.test(s.detail ?? '') ? loss : '', s.guessed ? 'bone guessed from the stop’s words' : '']
    .filter(Boolean).join(' · ');
}

/** The head's number: before → now in the problem's unit, and the target.
 *  Shared with the problem card (ui/ProblemCard), so the two say one figure. */
export function Measure({ m }: { m: ProblemMeasure }) {
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

function DrawnFish({ view, can, width, fixes, room, onCause, onSuggestion, onAdd, onHead }: Omit<FishboneProps, 'compact' | 'fill'> & {
  width: number; fixes: Map<string, FixTag>;
  /** The height the fish is given to fill, when it fills its box. */
  room?: number;
}) {
  const coarse = coarsePointer();
  const rowH = coarse ? 44 : 34;
  const headH = view.says && view.measure ? 196 : 172;
  const L = useMemo(() => layoutFish(view.bones, width, {
    rowH, headH, labelH: coarse ? 64 : 46, minHeight: room || undefined,
    tall: it => it.kind === 'cause' && fixes.has(it.cause.id),
  }), [view.bones, width, rowH, headH, coarse, room, fixes]);
  const title = view.problem.title || 'The problem';
  const headStyle = { left: L.head.x, top: L.head.y, width: L.head.w, height: L.head.h };
  const headIn = (
    <>
      <Phase view={view} />
      <b className="fb-title">{title}</b>
      {view.measure && <Measure m={view.measure} />}
      {view.says && <span className="fb-says">{view.says}</span>}
    </>
  );
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

      {onHead
        ? <button type="button" className="fb-head is-tap" style={headStyle} onClick={onHead} aria-label={headSays(title)}>{headIn}</button>
        : <div className="fb-head" style={headStyle}>{headIn}</div>}

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
            <Mark key={pi.item.key} item={pi.item} m={pb.bone.m} two={pi.two} onCause={onCause} onSuggestion={onSuggestion}
              fix={pi.item.kind === 'cause' ? fixes.get(pi.item.cause.id) : undefined}
              style={{ left: pi.x, top: pi.y, width: pi.w, height: pi.h }} />
          ))}
        </Fragment>
      ))}
    </div>
  );
}

function Mark({ item, m, style, fix, two, onCause, onSuggestion }: {
  item: Item; m: SixM; style: CSSProperties; fix?: FixTag; two?: boolean; onCause: (c: Cause) => void; onSuggestion: (s: Suggestion) => void;
}) {
  const sel = useContext(SelectedCause);
  const bone = sixmLabel(m);
  if (item.kind === 'suggestion') {
    const s = item.s, says = suggestionSays(s);
    return (
      <button type="button" className={'fb-mark is-sugg' + (two ? ' is-two' : '')} style={style} onClick={() => onSuggestion(s)}
        aria-label={`Suggested for ${bone}: ${s.text}${says ? ` — ${says}` : ''}. Tap to look at it.`}>
        <StatusGlyph suggestion />
        <span className="fb-mark-t">{s.text}</span>
        <span className="fb-peek" aria-hidden><b>{s.text}</b>{says && <small>Suggested · {says}</small>}</span>
      </button>
    );
  }
  const c = item.cause, root = isRoot(c), says = causeSays(c, true, fix);
  return (
    <button type="button" className={`fb-mark is-${c.status}${root ? ' is-root' : ''}${two ? ' is-two' : ''}${sel === c.id ? ' is-selected' : ''}`} style={style} onClick={() => onCause(c)}
      aria-current={sel === c.id ? 'true' : undefined}
      aria-label={`${bone}: ${c.text} — ${says}. Tap to open it.`}>
      <StatusGlyph status={c.status} root={root} />
      <span className="fb-mark-t">{c.text || 'A cause with no words yet'}</span>
      {/* One line, these follow the words; two, they sit under them on the rib. */}
      <span className="fb-mark-tags">
        {root && <RootTag />}
        <GradeMeter grade={c.grade} />
        {fix && <FixTagMark tag={fix} />}
      </span>
      <span className="fb-peek" aria-hidden><b>{c.text}</b><small>{says}</small></span>
    </button>
  );
}

/* --------------------------- the phone's lanes --------------------------- */

function Lanes({ view, can, fixes, onCause, onSuggestion, onAdd }: Omit<FishboneProps, 'compact' | 'fill' | 'onHead'> & { fixes: Map<string, FixTag> }) {
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
                {items.map(it => (
                  <li key={it.key}>
                    <Row item={it} bone={label} onCause={onCause} onSuggestion={onSuggestion}
                      fix={it.kind === 'cause' ? fixes.get(it.cause.id) : undefined} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Row({ item, bone, fix, onCause, onSuggestion }: {
  item: Item; bone: string; fix?: FixTag; onCause: (c: Cause) => void; onSuggestion: (s: Suggestion) => void;
}) {
  const sel = useContext(SelectedCause);
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
    <button type="button" className={`fb-row is-${c.status}${root ? ' is-root' : ''}${sel === c.id ? ' is-selected' : ''}`} onClick={() => onCause(c)}
      aria-current={sel === c.id ? 'true' : undefined}
      aria-label={`${bone}: ${c.text} — ${causeSays(c, true, fix)}. Tap to open it.`}>
      <StatusGlyph status={c.status} root={root} />
      <span className="fb-row-main">
        <span className="fb-row-t">{c.text || 'A cause with no words yet'}</span>
        <span className="fb-row-s"><GradeMeter grade={c.grade} /> {causeSays(c, false)}{from ? ` · ${from}` : ''}</span>
        {fix && <span className="fb-row-fix"><FixTagMark tag={fix} /></span>}
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

function CompactFish({ view, width, onBone, onHead, untitled }: { view: ProblemView; width: number; onBone?: (m: SixM) => void; onHead?: () => void; untitled?: boolean }) {
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
  /* NARROW, THE TITLE STRIP AND THE SMALL HEAD ARE ONE TAP — both are the
     head of the fish. The strip is the tap a screen reader is given; the
     small head repeats it for the thumb and stays out of the tab order. */
  const Top = onHead ? 'button' : 'div';
  return (
    <div className={'fb-mini' + (narrow ? ' is-narrow' : '')}>
      {narrow && !untitled && (
        <Top className={'fb-mini-top' + (onHead ? ' is-tap' : '')} {...(onHead ? { type: 'button' as const, onClick: onHead, 'aria-label': headSays(title) } : {})}>
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
        </Top>
      )}
      {/* A picture while nothing on it is pressed; a group once its bones or
          head are buttons, so a screen reader can reach them (an img's
          children are not read). */}
      <div className="fb-mini-fish" style={{ height: H }} role={onBone || onHead ? 'group' : 'img'}
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
        <MiniHead narrow={narrow} onHead={onHead} label={headSays(title)}
          style={{ left: headX, top: spineY - (narrow ? 28 : 50), width: headW, height: narrow ? 56 : 100 }}>
          {!narrow ? <><Phase view={view} /><b className="fb-title">{title}</b>{m && <Measure m={m} />}</>
            : headNum != null && m ? (
              <span className="fb-head-num" aria-label={`now ${num(headNum)} ${m.unit}`}>
                <b className={m.moved === 'worse' ? 'is-worse' : ''}>{num(headNum)}</b>
                <small>{m.unit}</small>
              </span>
            ) : <i className="fb-eye" aria-hidden />}
        </MiniHead>
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

/** The small fish's head: words, or a tap that opens the problem. Narrow, the
 *  title strip above carries the name and the focus; this repeats its tap. */
function MiniHead({ narrow, onHead, label, style, children }: {
  narrow: boolean; onHead?: () => void; label: string; style: CSSProperties; children: ReactNode;
}) {
  if (!onHead) return <div className="fb-head is-mini" style={style}>{children}</div>;
  return narrow
    ? <button type="button" className="fb-head is-mini is-tap" style={style} onClick={onHead} tabIndex={-1} aria-hidden>{children}</button>
    : <button type="button" className="fb-head is-mini is-tap" style={style} onClick={onHead} aria-label={label}>{children}</button>;
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
        {GRADES.map(g => <span key={g.key}><GradeMeter grade={g.key} />{KNOWN_WORD[g.key]}</span>)}
      </span>
      <span className="fb-key-say">Tap a cause to open it.</span>
    </p>
  );
}
