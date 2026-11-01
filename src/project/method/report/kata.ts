/* THE IMPROVEMENT KATA'S OWN SECTIONS OF THE PROJECT REPORT (docs/METHODS.md §17; Rother, Toyota Kata). Three sections that
 * interpret the learner's storyboard rather than copy it: where the direction stands (challenge, the target condition and the
 * days left, the obstacles with the one being addressed), the experiments (every step with what was expected and what happened,
 * and what the results say about the team's predictions), and the coaching (the five questions answered from the board and the
 * routine's pulse). Every figure is lib/kataBoard's — the board and its paper read the same module; the tools' own sentences come
 * from the dashboard's findings, never rewritten. A missing answer is named. Pure. */
import type { MethodReportFn, ReportItem, ReportSection, ReportTone } from '../../../lib/methodReportModel';
import { coaching, dayWords, daysBetween, done, matchOf, pulse, rowsOf, tally, touched, type KataRow } from '../../../lib/kataBoard';
import { niceDay } from '../../../lib/weeks';

const NOT = 'Not written yet.';
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const MATCH_WORD = { yes: 'Yes', partly: 'Partly', no: 'No — the lesson' } as const;

/** The state of the target condition against its day, in words. */
function targetDay(by: string, today: string): { text: string; tone?: ReportTone } {
  if (!by) return { text: 'No day written', tone: 'a' };
  const left = daysBetween(today, by);
  if (left === undefined) return { text: by };
  if (left < 0) return { text: `${dayWords(by)} — ${plural(-left, 'day')} past`, tone: 'a' };
  if (left === 0) return { text: `${dayWords(by)} — today` };
  return { text: `${dayWords(by)} — ${plural(left, 'day')} left` };
}

const rowState = (r: KataRow): string => (r.step && !r.result ? 'Open' : done(r) ? (matchOf(r.matched) ? MATCH_WORD[matchOf(r.matched) as 'yes'] : 'Not said') : '—');

export const kataReport: MethodReportFn = ctx => {
  const a = ctx.answers;
  const w = ctx.answer;
  const rows = rowsOf(a).filter(touched);
  const t = tally(a);
  const pl = pulse(a, ctx.today);
  const tools = (section: string): ReportItem[] => {
    const f = ctx.findings.filter(x => x.section === section);
    return f.length ? [{ kind: 'bullets', items: f.map(x => ({ text: `${x.tool} — ${x.title}: ${x.says}`, tone: x.tone })) }] : [];
  };

  /* 1 · the direction */
  const day = targetDay(w('target_by'), ctx.today);
  const lines = w('obstacles').split('\n').map(s => s.trim()).filter(Boolean);
  const now = w('obstacle_now');
  const obstacleRows: string[][] = lines.map(o => [o, now && norm(o) === norm(now) ? 'Addressing now' : 'In the way']);
  if (now && !lines.some(o => norm(o) === norm(now))) obstacleRows.push([now, 'Addressing now — not on the list above']);
  const direction: ReportSection = {
    id: 'kata-direction', title: 'The challenge, the target and the obstacles',
    lead: !w('target') ? 'No target condition is written yet — the experiments have nothing to aim at.' : w('target_by') ? `The next target condition: ${day.text}.` : 'The target condition has no day written yet.',
    items: [
      { kind: 'facts', rows: [
        ['Challenge', w('challenge') || NOT], ['Learner and coach', w('coach') || NOT],
        ['Measure', w('measure') || NOT], ['Current condition', w('current') || NOT],
        ['Target condition', w('target') || NOT], ['Day to reach it', day.text],
      ] },
      ...(obstacleRows.length
        ? [{ kind: 'table', head: ['Obstacle', 'State'], shares: [0.72, 0.28], rows: obstacleRows, tones: obstacleRows.map(r => (r[1] === 'Addressing now' ? 'w' : undefined)) } as ReportItem]
        : [{ kind: 'paragraph', text: 'No obstacle is written yet.', tone: 'a' } as ReportItem]),
      ...(obstacleRows.length && !now ? [{ kind: 'paragraph', text: 'No obstacle is named as the one being addressed now — each step goes at one.', tone: 'a' } as ReportItem] : []),
      ...tools('Grasp the current condition'),
    ],
  };

  /* 2 · the experiments */
  const tableRows = rows.map(r => [`${r.n}${r.ran ? ` · ${niceDay(r.ran)}` : ''}`, r.step || NOT, r.prediction || 'Not written first', r.result || (r.step ? 'No result yet' : '—'), rowState(r), r.learning || '—']);
  const said = [t.yes && `${t.yes} matched`, t.partly && `${t.partly} partly`, t.no && `${t.no} missed`, t.notSaid && `${t.notSaid} not said`].filter(Boolean).join(', ');
  const last = [...rows].reverse().find(r => done(r) && r.learning);
  const experiments: ReportSection = {
    id: 'kata-experiments', title: 'The experiments — what we expected and what happened',
    lead: rows.length ? `${plural(t.written, 'experiment')} written: ${t.closed} with a result, ${t.open} open.` : 'No experiment is written yet.',
    items: [
      ...(rows.length ? [
        { kind: 'table', head: ['Experiment', 'Step', 'We expected', 'What happened', 'Matched?', 'What we learned'], shares: [0.12, 0.19, 0.17, 0.19, 0.11, 0.22], rows: tableRows,
          tones: rows.map(r => (r.step && !r.result ? 'w' : done(r) && !r.prediction ? 'a' : undefined)) } as ReportItem,
        ...(t.closed ? [{ kind: 'bars', title: 'What the results say about our predictions', bars: [
          { label: 'Steps with a result', v: t.written ? t.closed / t.written : 0, text: `${t.closed} of ${t.written}` },
          { label: 'Results that matched', v: t.yes / t.closed, text: said || 'none said' },
        ] } as ReportItem] : []),
        ...(t.closed ? [{ kind: 'paragraph', text: `A prediction that matches is confirmed; one that misses is the learning. ${t.no ? `${plural(t.no, 'step')} missed — that is where the team learned most.` : ''}`.trim() } as ReportItem] : []),
        ...(last ? [{ kind: 'callout', tone: 'n', word: 'Latest lesson', text: `Experiment ${last.n}: ${last.learning}` } as ReportItem] : []),
      ] : [{ kind: 'paragraph', text: 'No experiment is written yet. Write one small step at the obstacle being addressed, and what you expect from it, before you take it.', tone: 'a' } as ReportItem]),
      ...(t.noPrediction ? [{ kind: 'callout', tone: 'a', word: 'Watch', text: `${plural(t.noPrediction, 'result')} with no prediction written first — a prediction written after the step teaches nothing.` } as ReportItem] : []),
      ...tools('Experiment toward it'),
    ],
    flags: t.notSaid ? [{ text: `${plural(t.notSaid, 'experiment')} with a result but no answer to “Did it match what we expected?” — the report cannot say how well the team predicts.`, tone: 'n' }] : [],
  };

  /* 3 · the coaching */
  const cq = coaching(a);
  const coach: ReportSection = {
    id: 'kata-coaching', title: 'The five coaching questions and the pulse',
    lead: pl.says,
    items: [
      { kind: 'table', head: ['Question', 'Answer from the storyboard', 'State'], shares: [0.4, 0.45, 0.15],
        rows: cq.map(c => [`${c.n}. ${c.ask}`, c.said.length ? c.said.join(' · ') : (c.missing ?? NOT), c.said.length ? 'Answered' : 'Not written']),
        tones: cq.map(c => (c.said.length ? undefined : 'a')) },
    ],
  };
  return [direction, experiments, coach];
};
