/* A PROJECT'S FACTS, AND THE QUESTIONS THE APP ANSWERS ITSELF (slice 5).
 *
 * factsOf reads a project running a method into sentences, each with an id
 * and how it is known — what a person recorded (known), what the runtime
 * worked out from it (worked out), and what was asked for and is not there
 * (not recorded). They are what the assistant is sent (lib/flow/askCore),
 * and nothing else: no other project, no person's address.
 *
 * answerLocally answers the questions asked most — what next, what is late,
 * can the gate pass, who owes what, how far along, what problems — from the
 * same facts, with no assistant at all, so the app answers with AI off. */
import { niceDay } from '../weeks';
import { ANSWER_WORD, numbersOf } from './definition';
import type { FlowProject } from './operations';
import type { Fact, Said } from './askCore';

const many = (n: number, one: string, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;

export function factsOf(fp: FlowProject): Fact[] {
  const s = fp.state;
  const def = fp.method.definition;
  const out: Fact[] = [];
  const add = (id: string, text: string, basis: Fact['basis']) => out.push({ id, text, basis });
  add('project', `The project is “${fp.project.name}”, running the method “${def.name}”, version ${fp.method.version}${fp.project.flow?.startedOn ? `, started ${niceDay(fp.project.flow.startedOn, { year: true })}` : ''}.`, 'known');
  add('machines', fp.machines.length ? `Its machines: ${fp.machines.map(m => m.name).join(', ')}.` : 'It has no machines; every step is once for the job.', 'known');
  for (const r of def.roles) {
    const who = fp.project.flow?.people?.[r.key];
    add(`role:${r.key}`, who ? `${r.name}: ${who}.` : `Nobody is named as ${r.name}.`, who ? 'known' : 'not recorded');
  }
  add('verdict', s.verdict.text, 'worked out');
  add('counts', `${s.counts.done} of ${many(s.counts.steps, 'step')} done; ${s.counts.gatesPassed} of ${many(s.counts.gates, 'gate')} passed; ${s.counts.late} late; ${s.counts.failed} did not pass.`, 'worked out');
  for (const st of s.stages) {
    const g = st.gate;
    add(`stage:${st.key}`, `Stage ${st.index + 1}, ${st.name}: ${st.done} of ${many(st.total, 'step')} done${st.late ? `, ${st.late} late` : ''}${st.failed ? `, ${st.failed} did not pass` : ''}.`, 'worked out');
    if (g.pass) {
      add(`gate:${st.key}`, `${st.name}'s gate was passed${g.pass.doneOn ? ` on ${niceDay(g.pass.doneOn)}` : ''}${g.pass.who ? ` by ${g.pass.who}` : ''}${g.pass.override ? `, over what was unmet, because: “${g.pass.override}”` : ''}.`, 'known');
    } else {
      const unmet = g.conditions.filter(c => !c.met && !c.manual);
      add(`gate:${st.key}`, g.waitsOn ? `${st.name}'s gate waits on ${g.waitsOn}.`
        : g.canPass ? `${st.name}'s gate can be passed now${g.warnings.length ? `, with ${many(g.warnings.length, 'warning')}: ${g.warnings.map(w => w.label).join('; ')}` : ''}.`
          : `${st.name}'s gate needs: ${unmet.map(c => `${c.label} (${c.why})`).join('; ')}.`, 'worked out');
      const manual = g.conditions.filter(c => c.manual);
      if (manual.length) add(`checks:${st.key}`, `At ${st.name}'s gate these are confirmed by hand: ${manual.map(c => c.label).join('; ')}.`, 'known');
    }
    for (const x of st.steps) {
      const id = `step:${st.key}/${x.def.key}/${x.assetId ?? ''}`;
      const name = `“${x.def.title}”${x.machine ? ` on ${x.machine}` : ''}`;
      const r = x.record;
      if (x.complete) add(id, `${name} was done${r?.doneOn ? ` on ${niceDay(r.doneOn)}` : ''}${r?.who ? ` by ${r.who}` : ''}${r?.signedBy ? `, signed by ${r.signedBy}` : ''}.`, 'known');
      else if (x.failed) add(id, `${name} did not pass${r?.doneOn ? ` on ${niceDay(r.doneOn)}` : ''}${x.outOfLimits.length ? `: ${x.outOfLimits.join('; ')}` : r?.note ? `: ${r.note}` : ''}.`, 'known');
      else if (r) add(id, `${name} is not done; it ${x.missing.length ? `still needs ${x.missing.join(', ')}` : 'is started'}${x.due ? `; due ${niceDay(x.due)}` : ''}${x.late ? ' — late' : ''}.`, x.late ? 'worked out' : 'known');
      else add(id, `${name} (${ANSWER_WORD[x.def.answer].toLowerCase()}) has nothing recorded${x.due ? `; due ${niceDay(x.due)}${x.late ? ' — late' : ''}` : ', and no day'}${x.who ? `; for ${x.who}` : ''}.`, x.late ? 'worked out' : 'not recorded');
      const vals = Object.entries(x.values);
      /* a box typed on the step, or a figure its tool filled */
      const boxOf = (k: string) => x.def.fields?.find(f => f.key === k) ?? numbersOf(x.def).find(f => f.key === k);
      if (vals.length) add(`${id}:values`, `${name} recorded ${vals.map(([k, v]) => `${boxOf(k)?.label ?? k} ${String(v)}${boxOf(k)?.unit ? ` ${boxOf(k)?.unit}` : ''}`).join(', ')}${x.tool ? ` (from ${x.tool.name})` : ''} (worked-out boxes by the app).`, 'known');
    }
  }
  /* what it measures — read from the steps that feed it, so worked out */
  for (const m of s.measures) add(`measure:${m.def.key}`, m.says, m.now ? 'worked out' : 'not recorded');
  if (s.next) add('next', `Next: ${s.next.what}${s.next.who ? `, for ${s.next.who}` : ''}${s.next.due ? `, ${s.next.late ? 'was due' : 'due'} ${niceDay(s.next.due)}` : ''} — ${s.next.why}.`, 'worked out');
  const open = fp.problems.filter(p => p.open);
  add('problems', open.length ? `${many(open.length, 'problem')} open on the project: ${open.slice(0, 8).map(p => `${p.title ?? 'untitled'} (${p.priority ?? 'low'})`).join('; ')}.` : 'No problem is open on the project.', 'known');
  return out;
}

/** A question that has one of these words — each from the start of a word, so
 *  "template" is never asked as "late" nor "passenger" as "pass". */
const has = (q: string, ...w: string[]) => w.some(x => new RegExp(`(^|[^a-z])${x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(q));

/** The questions the app answers itself, from the same facts — null when it
 *  cannot, and the assistant (when on) is asked. */
export function answerLocally(question: string, fp: FlowProject): Said[] | null {
  const q = question.toLowerCase();
  const s = fp.state;
  const facts = factsOf(fp);
  const f = (id: string) => facts.find(x => x.id === id);
  if (has(q, 'next', 'do now', 'should i', 'start with')) {
    const n = f('next');
    return [n ? { text: n.text, basis: 'worked out', facts: ['next'] } : { text: s.done ? 'Nothing — every gate is passed.' : 'Nothing can move until a step it waits on is done.', basis: 'worked out', facts: ['verdict'] }];
  }
  if (has(q, 'late', 'behind', 'overdue', 'slipp')) {
    const late = s.outstanding.filter(o => o.late);
    return [{ text: late.length ? `${many(late.length, 'step')} late: ${late.slice(0, 5).map(o => `${o.what}${o.due ? ` (due ${niceDay(o.due)})` : ''}`).join('; ')}.` : 'Nothing is late.', basis: 'worked out', facts: ['counts'] }];
  }
  if (has(q, 'gate', 'pass', 'ready', 'move on', 'sign off', 'sign-off')) {
    const cur = s.current;
    if (!cur) return [{ text: 'Every gate is passed.', basis: 'worked out', facts: ['verdict'] }];
    const g = f(`gate:${cur.key}`), c = f(`checks:${cur.key}`);
    return [{ text: g?.text ?? '', basis: 'worked out', facts: [`gate:${cur.key}`] }, ...(c ? [{ text: c.text, basis: 'known' as const, facts: [`checks:${cur.key}`] }] : [])];
  }
  if (has(q, 'who', 'owe', 'waiting on', 'responsible')) {
    const by = new Map<string, number>();
    for (const o of s.outstanding.filter(x => x.kind === 'step')) by.set(o.who ?? 'nobody named', (by.get(o.who ?? 'nobody named') ?? 0) + 1);
    return [{ text: by.size ? `Still to do, by whom: ${[...by.entries()].sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w} ${n}`).join('; ')}.` : 'Nobody owes anything — every step on the open stages is done.', basis: 'worked out', facts: ['counts'] }];
  }
  if (has(q, 'how far', 'progress', 'done so far', 'how many', 'status', 'where are we', 'where is it')) {
    return [{ text: f('verdict')?.text ?? '', basis: 'worked out', facts: ['verdict'] }, { text: f('counts')?.text ?? '', basis: 'worked out', facts: ['counts'] }];
  }
  if (has(q, 'problem', 'issue', 'fault')) return [{ text: f('problems')?.text ?? '', basis: 'known', facts: ['problems'] }];
  if (has(q, 'when', 'finish', 'end date', 'complete by', 'handover')) {
    return [{ text: 'No finish date is worked out: the method gives steps days from the start, not a forecast. What is late and what is next say where it stands.', basis: 'unknown', facts: [] }, { text: f('verdict')?.text ?? '', basis: 'worked out', facts: ['verdict'] }];
  }
  return null;
}
