/* THE WORDS CODE CAN ANSWER BY ITSELF — NO AI ASKED (12 November; docs/AI-COST.md, step 0 — Rowland: "how much can we take into code
 * and not use API at all"; and of the floor: "walking around the factory, headset on, talking away").
 *
 * While a measurement is running, most of what is said on a walk is a tap said out loud: "bagger stopped, jam", "running again",
 * "undo that". Each of those cost a whole answer from the AI service — every rule and every capability sent, to press one button.
 * This reads them in code: a STRICT grammar over the line's own machines and reasons, and when the whole of what was said fits it,
 * the same capability the colleague would have asked for is run (capture_event, undo_capture, end_measurement — all `local`, none
 * needs a card) and its own sentence is the answer. Anything else — a question, a doubt, a machine not on the line, a word too many —
 * is not guessed at: it goes to Luna exactly as before. As `spokenAnswer` (colleague/floor) answers a card on whole phrases only.
 *
 * What it never does: invent a machine or a reason (the machine must be the line's own, or the one the measurement is on; the reason is
 * the person's words, and a stop is taken only when they said it stopped or gave a reason the line already knows); write anything a
 * card would be asked for; answer a question. Pure — the screen hands it what the line holds. */
import { normalise } from './floor';

export interface FastCtx {
  /** The running measurement's tool — only `stops` is read in code yet. */
  tool: string;
  /** The line's machines, by the names it has them under. */
  machines: readonly string[];
  /** The reasons the line already knows (its categories, and those said earlier in this measurement). */
  reasons: readonly string[];
  /** The machine the measurement is on, when it was started on one. */
  machine?: string;
}
export interface FastCall { name: 'capture_event' | 'undo_capture' | 'end_measurement'; input: Record<string, unknown> }

/** Whole phrases only — each is the whole of what was said. */
const RUNNING = ['running', 'running again', 'its running', 'its running again', 'it is running again', 'back running', 'back up', 'back up again', 'were running', 'were running again', 'we are running again', 'line running', 'line is running', 'lines running', 'the line is running', 'the line is running again', 'back on', 'started again', 'its started again', 'going again', 'its going again'];
const UNDO = ['undo', 'undo that', 'scrap that', 'take that back', 'that didnt happen', 'undo the last one', 'undo last'];
const END = ['end the measurement', 'end measurement', 'stop timing', 'stop the timing', 'end the timing', 'end timing', 'finish timing', 'finish the measurement'];

/** Said that it stopped. */
const STOP_WORDS = new Set(['stop', 'stopped', 'stops', 'stopping', 'down']);
/** Words that carry nothing between the machine, the stop and the reason. */
const FILLER = new Set(['the', 'a', 'an', 'on', 'at', 'is', 'has', 'its', 'it', 'for', 'with', 'of', 'because', 'due', 'to', 'again', 'just', 'now', 'gone', 'went', 'weve', 'got', 'we', 'have', 'theres', 'there', 'and', 'reason', 'was', 'by']);
/** Any of these and it is not a tap said out loud — Luna reads it. */
const NOT_A_TAP = new Set(['why', 'what', 'whats', 'how', 'when', 'where', 'which', 'who', 'can', 'could', 'should', 'would', 'do', 'does', 'did', 'luna', 'please', 'think', 'maybe', 'might', 'no', 'isnt', 'wasnt', 'dont', 'didnt', 'if', 'or', 'but', 'then', 'also', 'earlier', 'yesterday', 'before', 'ago', 'minutes', 'minute', 'mins', 'hour', 'hours', 'about', 'around', 'roughly', 'count', 'note', 'photo', 'picture', 'problem', 'raise', 'report', 'show', 'tell', 'many', 'much', 'long']);

const words = (s: string): string[] => normalise(s).split(' ').filter(Boolean);
/** Where `needle`'s words stand in `hay`, as whole words in order; -1 when they do not. */
function at(hay: readonly string[], needle: readonly string[]): number {
  if (!needle.length) return -1;
  for (let i = 0; i + needle.length <= hay.length; i++) if (needle.every((w, k) => hay[i + k] === w)) return i;
  return -1;
}
const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** The call the words are, or null — which sends them to Luna. `said` is exactly what was typed or heard. */
export function fastCall(said: string, ctx: FastCtx): FastCall | null {
  if (ctx.tool !== 'stops' || /[?]/.test(said)) return null;
  const n = normalise(said);
  if (!n) return null;
  if (UNDO.includes(n)) return { name: 'undo_capture', input: {} };
  if (END.includes(n)) return { name: 'end_measurement', input: {} };
  if (RUNNING.includes(n)) return { name: 'capture_event', input: { event: 'running' } };

  const w = words(said);
  if (w.length > 9 || w.some(x => NOT_A_TAP.has(x))) return null;

  /* the machine: the line's own, the longest name that stands in the words — one, never two */
  const found = ctx.machines
    .map(name => ({ name, ws: words(name) }))
    .filter(m => m.ws.length && at(w, m.ws) >= 0)
    .sort((a, b) => b.ws.length - a.ws.length);
  const longest = found[0];
  if (longest && found.some(m => m !== longest && at(longest.ws, m.ws) < 0)) return null; /* two machines named */
  const machine = longest?.name ?? ctx.machine;
  if (!machine) return null;

  const rest = [...w];
  if (longest) { const i = at(rest, longest.ws); rest.splice(i, longest.ws.length); }

  /* "<machine> running again" — the line runs */
  const restSaid = rest.filter(x => !FILLER.has(x)).join(' ');
  if (longest && (RUNNING.includes(restSaid) || restSaid === 'running' || restSaid === 'back up' || restSaid === 'back running')) return { name: 'capture_event', input: { event: 'running' } };

  const saidStopped = rest.some(x => STOP_WORDS.has(x));
  /* the reason: a reason the line already knows, as it has it — else, only when they said it stopped, their own words */
  const known = ctx.reasons
    .map(name => ({ name, ws: words(name) }))
    .filter(r => r.ws.length && at(rest, r.ws) >= 0)
    .sort((a, b) => b.ws.length - a.ws.length)[0];
  let reason: string;
  if (known) {
    const i = at(rest, known.ws);
    const left = [...rest.slice(0, i), ...rest.slice(i + known.ws.length)].filter(x => !FILLER.has(x) && !STOP_WORDS.has(x));
    if (left.length || rest.includes('not')) return null; /* something else was said too — Luna reads it */
    reason = known.name;
  } else {
    if (!saidStopped) return null;
    const own = rest.filter(x => !STOP_WORDS.has(x));
    while (own.length && FILLER.has(own[0])) own.shift();
    while (own.length && FILLER.has(own[own.length - 1])) own.pop();
    if (!own.length || own.length > 4 || own[0] === 'not') return null; /* no reason said (Luna asks), a denial, or too much to be one */
    reason = cap(own.join(' '));
  }
  return { name: 'capture_event', input: { event: 'stopped', machine, reason } };
}
