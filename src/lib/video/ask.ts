/* WHAT A PERSON ASKS OF THE FOOTAGE, AND THE APP'S ANSWER (docs/VIDEO.md,
 * conversational integration).
 *
 * "Analyse this video for line balance." "What else do you need to work out
 * takt?" "Show the longest waits." Read here without an assistant — the
 * words a person uses for the study they want, and the questions the app can
 * answer from what it has worked out — so the study is asked for in words and
 * answered in words whether the assistant is on or not. Every answer is made
 * from lib/video/study's figures and says how it is known; anything the
 * figures cannot say is said to be not known, never guessed. */
import { KIND_WORD, type VideoStudyKind } from './record';
import { clock, findings, sec1, type VideoStudyFigures } from './study';

const has = (t: string, ...ws: string[]) => ws.some(w => new RegExp(`\\b${w}`, 'i').test(t));

/** What kind of study the words ask for, and what they ask of it. */
export function readObjective(text: string): { kind: VideoStudyKind; wants: string[]; said: string } {
  const t = text.trim();
  const kind: VideoStudyKind = has(t, 'changeover', 'change over', 'smed', 'setup', 'set-up', 'format change') ? 'changeover'
    : has(t, 'wait', 'idle', 'starv', 'blocked') && !has(t, 'balanc') ? 'waiting'
    : has(t, 'cycle', 'repeat', 'rate', 'output') && !has(t, 'balanc', 'workload', 'operator', 'station') ? 'cycles'
    : 'balance';
  const wants: string[] = [];
  if (has(t, 'takt', 'demand', 'customer')) wants.push('takt');
  if (has(t, 'wait', 'idle')) wants.push('waiting');
  if (has(t, 'cycle', 'repeat')) wants.push('cycles');
  if (has(t, 'report', 'paper', 'pdf')) wants.push('report');
  const said = `Read as ${KIND_WORD[kind].toLowerCase()}${wants.length ? `, with ${wants.join(', ')}` : ''}.`;
  return { kind, wants, said };
}

/** WHAT THE STUDY STILL NEEDS FROM A PERSON — asked, in the order it matters. */
export function questionsFor(kind: VideoStudyKind, f: VideoStudyFigures | undefined, o: { zones: number; wantsTakt: boolean }): string[] {
  const out: string[] = [];
  if (!o.zones) out.push('Where are the stations in the picture? Mark each one, left to right — a station is a place, its worker a label like Operator A.');
  if (kind === 'changeover') out.push('A changeover study reads from the last good piece to the first good piece: say when each was, and the app times every activity between.');
  if (f && f.candidates) out.push(`Watch the ${f.candidates} event${f.candidates === 1 ? '' : 's'} found and accept, correct or reject each — the figures use only what is accepted.`);
  if ((o.wantsTakt || kind === 'balance') && f && !f.takt) out.push('To compare with takt: how many does the line have to make, and in how many minutes (a shift or a day)?');
  return out;
}

export interface Answer { text: string; how: 'worked out' | 'not known' }

/** An answer from the figures, for the questions the app can answer itself. */
export function answer(q: string, f: VideoStudyFigures): Answer | undefined {
  const t = q.trim();
  if (!t) return undefined;
  const basis = f.basis === 'verified' ? `from ${f.accepted} accepted event${f.accepted === 1 ? '' : 's'}` : `provisionally, from ${f.accepted + f.candidates} events not all reviewed`;
  if (has(t, 'takt')) {
    if (!f.takt) return { how: 'not known', text: 'To work out takt I need the demand — how many the line has to make — and the minutes it has to make them in (a shift or a day, less the breaks). Put them in under Takt.' };
    return { how: 'worked out', text: `Takt is ${sec1(f.takt)} a unit. ${f.overTakt.length ? f.overTakt.map(o => `${o.station.zone.label} is over by ${sec1(o.bySec)}`).join('; ') : 'Every station is within it'} — ${basis}.` };
  }
  if (has(t, 'wait', 'idle')) {
    const ws = f.stations.flatMap(s => s.waits.map(w => ({ ...w, label: s.zone.label }))).sort((a, b) => b.sec - a.sec).slice(0, 5);
    if (!ws.length) return { how: 'not known', text: `No waiting between pieces of work ${f.basis === 'verified' ? 'among the accepted events' : 'was found'} yet.` };
    return { how: 'worked out', text: `The longest waits: ${ws.map(w => `${sec1(w.sec)} at ${w.label} from ${clock(w.start)}`).join('; ')} — ${basis}.` };
  }
  if (has(t, 'cycle', 'repeat', 'duration')) {
    const ss = f.stations.filter(s => s.cycleTime || s.workTime);
    if (!ss.length) return { how: 'not known', text: 'No whole cycle yet — accept the events at a station and its cycles are timed.' };
    return { how: 'worked out', text: `${ss.map(s => `${s.zone.label}: ${s.workTime ? `${sec1(s.workTime.mean)} of work` : 'no whole piece of work'}${s.cycleTime ? `, a cycle every ${sec1(s.cycleTime.mean)} (${s.cycleTime.n} cycles, ${sec1(s.cycleTime.min)}–${sec1(s.cycleTime.max)})` : ''}`).join('; ')} — ${basis}.` };
  }
  if (has(t, 'bottleneck', 'slowest', 'contribut', 'most', 'longest')) {
    const ss = f.stations.filter(s => s.workTime).sort((a, b) => (b.workTime?.mean ?? 0) - (a.workTime?.mean ?? 0));
    if (!ss.length) return { how: 'not known', text: 'Nothing is timed yet to compare.' };
    const total = ss.reduce((x, s) => x + (s.workTime?.mean ?? 0), 0);
    return { how: 'worked out', text: `${ss.map(s => `${s.zone.label} ${sec1(s.workTime?.mean ?? 0)} (${Math.round(((s.workTime?.mean ?? 0) / total) * 100)}%)`).join(', ')} — ${ss[0].zone.label} sets the pace; ${basis}.` };
  }
  if (has(t, 'report')) return { how: 'worked out', text: `The report is made from ${f.accepted} accepted event${f.accepted === 1 ? '' : 's'}${f.candidates ? `; ${f.candidates} still to review are listed as not verified` : ''}. Press Report.` };
  if (has(t, 'need', 'missing', 'else', 'information')) {
    const unknown = findings(f).filter(x => x.kind === 'unknown').map(x => x.text);
    return { how: unknown.length ? 'not known' : 'worked out', text: unknown.length ? unknown.join(' ') : 'Nothing more — every figure the study gives can be worked out from what is accepted.' };
  }
  return undefined;
}
