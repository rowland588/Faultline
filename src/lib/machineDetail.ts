/* A MACHINE, IN FULL — the machine report's reading (Rowland, 27 October: "all you've done is headlines. There's no
 * contextualised information in there. The tests that have been done, you can't see the results. You can't see the
 * efforts that have been put in place ... when we present a report, the report must have the level of detail,
 * firstly following lean principles ... the contextualised information to show the journey ... the detail that lives
 * in the other applications").
 *
 * In the lean page's order (docs/LEAN-PAGE.md): where it is — its status, the project it is going through and where
 * it is up to, its four gates, a few counted tiles; what is wrong and who has it — everything open on it, each with
 * who and by when (the action plan); then the detail, as it was lived: every test and every attempt of it — what it
 * had to show, what it aimed at, what it did, how it went, what was seen, what was found on it; every program and
 * every test of it; every step of its install, set-up and hand-over with what was written; its problems and fixes
 * with each one's journey; the studies of it with what they found; every other project's work on it; its stops; and
 * the closing line.
 *
 * NOTHING IS WORKED OUT HERE. Every word is the module's that already says it: lib/machineRecord (the gates, the
 * steps, the fixes, what is open), lib/programJourney (every attempt of a test or a program), the Programs report
 * (lib/programsReport — a program's word, its proof, its tests), lib/studyLinks (a study's finding), lib/lineMachine
 * (the line's reading — every project, the register's problems, the studies, the stops), the register (a problem's
 * journey). Pure. */
import type { JobInput } from './portfolio';
import type { Snag } from '../snag/types';
import type { ToolStudy } from './study';
import type { LineMachineView } from './lineMachine';
import { STOP_DAYS } from './lineMachine';
import { machineRecord, machineTests, openOnMachine, type MachineTone } from './machineRecord';
import { programsReading, badgeOf, type ProgramLine } from './programsReport';
import { testJourney } from './programJourney';
import { ASSET_STATE_WORD, assetStateOf, filesSaid, latestAttempts, live, testOfFix, type Test, type TestItem } from './testing';
import { recordProvedLine, studyLine } from './studyLinks';
import { niceDay, isoDay } from './weeks';
import type { MachinePaper, PaperRow, PaperSection, PaperTone } from './machinePaper';
import { statusTone } from './machinePaper';

export interface DetailInput {
  name: string;
  today: string;
  /** Its line's name, when it is on one. */
  line?: string;
  /** The stage-gate project working on it, and its record there. */
  project?: { name: string; gate: JobInput; assetId: string };
  /** The line's reading of it (lib/lineMachine) — every project's work on it, the register's problems, the studies,
   *  the stops. */
  view?: LineMachineView;
  /** The register's problems, for each one's journey, priority, owner and day. */
  snags?: readonly Snag[];
  /** The studies, for each one's finding. */
  studies?: readonly ToolStudy[];
}

const LINE_TONE: Record<MachineTone, PaperTone> = { done: 'g', failed: 'r', late: 'r', problem: 'a', asking: 'a', ahead: 'w', none: 'n' };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const PRIORITY: Record<string, string> = { critical: 'Critical', high: 'High', low: 'Low' };
const toneOfOutcome = (t: Test): PaperTone => (t.outcome === 'passed' ? 'g' : t.outcome === 'failed' || t.outcome === 'notRun' ? 'r' : t.plannedFor ? 'w' : 'n');

/** What was written on a test or step — what was found, the next step agreed, a note — each with its day and who. */
function itemsOn(testId: string, items: readonly TestItem[]): string[] {
  const word: Record<TestItem['kind'], string> = { found: 'Found', next: 'Next', note: 'Note', today: 'Today' };
  return live([...items]).filter(i => i.testId === testId).sort((a, b) => a.createdAt - b.createdAt).map(i => [
    `${word[i.kind] ?? 'Note'} ${niceDay(isoDay(i.createdAt))}: ${i.what}`,
    i.critical ? ' — critical' : i.risk ? ' — high risk' : '',
    i.impact ? ` — ${i.impact}` : '',
    i.owner ? ` · ${i.owner}` : '', i.due ? ` · by ${niceDay(i.due)}` : '',
    i.hoursLost ? ` · ${i.hoursLost} h lost` : '',
    i.doneAt != null && i.kind !== 'note' ? ' · done' : '',
  ].join(''));
}

/** A program on paper: its badge and word, how it was proved, its run, every test of it, what it said before. */
function programRow(l: ProgramLine): PaperRow {
  const b = badgeOf(l);
  return {
    what: l.what, says: [l.runs, l.who].filter(Boolean).join(' · '),
    word: l.word.trim().toUpperCase() === b ? b : `${b} — ${l.word}`, tone: l.tone,
    lines: [
      ...(l.note ? [`Seen: ${l.note}`] : []),
      ...(l.proof ? [l.proof.word] : []),
      ...(l.run ? [`Run: ${l.run}`] : []),
      ...(l.tests ?? []).flatMap(t => [t.text, ...t.studies.map(s => `   Study: ${s}`)]),
      ...l.earlier.map(e => `Before: ${e}`),
    ],
  };
}

export function machineDetailPaper(i: DetailInput): MachinePaper {
  const sections: PaperSection[] = [];
  const tiles: NonNullable<MachinePaper['tiles']> = [];
  const studiesById = new Map((i.studies ?? []).map(s => [s.id, s]));
  const snagsById = new Map((i.snags ?? []).map(s => [s.id, s]));
  let status: string | undefined, inProject: string | undefined, gates: MachinePaper['gates'], facts: string[] = [];
  let closing = '';

  if (i.project) {
    const { gate } = i.project;
    const tests = live(gate.tests), items = live(gate.items), assets = live(gate.assets);
    const asset = assets.find(a => a.id === i.project?.assetId);
    if (asset) {
      const m = machineRecord(asset, { tests, items, programs: gate.programs, today: i.today });
      const reading = programsReading({ tests, items, assets, programs: gate.programs, today: i.today, holder: gate.project, studies: gate.studies ?? [] });
      const progs = (reading?.lines ?? []).filter(l => l.assetId === asset.id);
      const handed = m.at.startsWith('Handed over');
      status = handed ? 'Handed over' : ASSET_STATE_WORD[assetStateOf(asset)];
      facts = [m.oem ? `Made by ${m.oem}` : '', m.arrival, i.line ? `On ${i.line}` : ''].filter(Boolean);
      inProject = `Going through ${i.project.name} — a stage-gate project — ${handed ? m.at.toLowerCase() : m.at.startsWith('at ') ? `up to ${m.at.slice(3)}` : m.at}.`;
      gates = m.gates.map(g => ({ label: g.label, says: g.says, tone: ({ done: 'g', going: 'w', late: 'r', problem: 'a', failed: 'r', ahead: 'n', none: 'n' } as const)[g.tone] }));

      /* THE TILES — counted, each of what it should be */
      const latest = machineTests(m);
      const passed = latest.filter(t => t.tone === 'done').length;
      const proved = progs.filter(l => l.bucket === 'done' || l.bucket === 'baseline').length;
      const open = openOnMachine(m);
      const late = open.filter(l => l.tone === 'late' || l.tone === 'failed').length;
      tiles.push(
        { label: 'Tests passed', value: String(passed), of: `of ${latest.length}`, tone: latest.length && passed < latest.length ? 'w' : 'g' },
        { label: 'Programs proved', value: String(proved), of: `of ${progs.length}`, tone: progs.some(l => l.bucket === 'failed' || l.bucket === 'late') ? 'r' : 'n' },
        { label: 'Open on it', value: String(open.length), tone: open.length ? 'a' : 'g' },
        { label: 'Late or failed', value: String(late), tone: late ? 'r' : 'n' },
        { label: 'Critical', value: String(m.problems.filter(p => p.critical).length), tone: m.problems.some(p => p.critical) ? 'r' : 'n' },
      );

      /* WHAT IS OPEN ON IT, AND WHO HAS IT — the action plan */
      sections.push({
        title: 'What is open on it, and who has it', count: open.length ? String(open.length) : 'nothing',
        rows: open.map(l => ({ what: l.title, says: [l.where, l.who ? `with ${l.who}` : ''].filter(Boolean).join(' · '), word: l.word, tone: LINE_TONE[l.tone] })),
        empty: 'Nothing open on it — no stage, fix or problem waiting.',
      });

      /* ITS TESTS — every attempt */
      const chains = latestAttempts(tests).filter(t => t.assetId === asset.id && (t.kind ?? 'test') === 'test').sort((a, b) => a.sort - b.sort);
      sections.push({
        title: 'Its tests — every attempt', count: chains.length ? `${passed} of ${chains.length} passed` : 'none yet',
        rows: chains.map(t => {
          const j = testJourney(t, tests, i.today);
          const cell = latest.find(x => x.id === t.id);
          const proof = recordProvedLine([...(gate.studies ?? [])], t);
          /* the test by its first name, and what it was agreed to show — a re-test carries neither again */
          const first = j.attempts[0]?.test ?? t;
          const passesIf = [...j.attempts].reverse().map(a => a.test.passesIf?.trim()).find(Boolean) ?? t.passesIf?.trim();
          return {
            what: first.title, says: [t.withWhom?.trim(), j.says].filter(Boolean).join(' · '),
            word: cell?.word ?? '', tone: cell ? LINE_TONE[cell.tone] : toneOfOutcome(t),
            lines: [
              ...(passesIf ? [`Has to show: ${passesIf}`] : []),
              ...j.attempts.map(a => a.text),
              ...(j.best ? [j.best] : []),
              ...j.attempts.flatMap(a => itemsOn(a.test.id, items)),
              ...(filesSaid(t) ? [filesSaid(t)] : []),
              ...(proof ? [proof] : []),
            ],
          };
        }),
        empty: 'No tests on it yet — they are planned on the project’s Commission.',
      });

      /* ITS PROGRAMS — every test of each */
      sections.push({
        title: 'Its programs — every test of each', count: progs.length ? `${proved} of ${progs.length} proved` : 'none',
        rows: progs.map(programRow), empty: 'No programs on it.',
      });

      /* EVERY STEP OF ITS INSTALL, SET-UP AND HAND-OVER — with what was written */
      for (const g of m.gates.filter(x => x.gate !== 'commission')) {
        const done = g.lines.filter(l => l.tone === 'done').length;
        sections.push({
          title: `${g.label} — every step`, count: g.lines.length ? `${done} of ${g.lines.length} done` : 'none',
          rows: g.lines.map(l => {
            const t = tests.find(x => x.id === l.id);
            return { what: l.title, says: l.who ? `with ${l.who}` : '', word: l.word, tone: LINE_TONE[l.tone],
              lines: [...(t?.result?.trim() ? [`Said: ${t.result.trim()}`] : []), ...(t && filesSaid(t) ? [filesSaid(t)] : []), ...itemsOn(l.id, items)] };
          }),
          empty: `No ${g.label.toLowerCase()} steps on it.`,
        });
      }

      /* ITS PROBLEMS AND FIXES — each with what was done */
      const fixesAll = tests.filter(t => t.kind === 'fix' && (t.assetId ?? testOfFix(t, tests)?.assetId) === asset.id);
      const pf: PaperRow[] = [
        ...m.problems.map(p => ({ what: p.title, says: p.critical ? 'Problem — critical' : p.risk ? 'Problem — high risk' : 'Problem, no fix yet', word: p.word, tone: LINE_TONE[p.tone] })),
        ...fixesAll.map(f => ({
          what: `Fix: ${f.title}`, says: [f.withWhom?.trim(), testOfFix(f, tests) ? `for ${testOfFix(f, tests)?.title}` : ''].filter(Boolean).join(' · '),
          word: f.outcome === 'passed' ? `fixed ${niceDay(f.ranTo ?? f.ranOn)}` : m.fixes.find(x => x.id === f.id)?.word ?? 'open',
          tone: f.outcome === 'passed' ? 'g' as const : LINE_TONE[m.fixes.find(x => x.id === f.id)?.tone ?? 'none'],
          lines: [...(f.result?.trim() ? [`Done: ${f.result.trim()}`] : []), ...itemsOn(f.id, items)],
        })),
      ];
      sections.push({ title: 'Its problems and fixes', count: pf.length ? `${m.problems.length} open problem${m.problems.length === 1 ? '' : 's'} · ${m.fixesDone} of ${fixesAll.length} fixes done` : 'none',
        rows: pf, empty: 'No problems found on it and no fixes.' });

      const next = open.find(l => l.tone !== 'done');
      closing = `${m.name} is ${status.toLowerCase()} and ${handed ? 'handed over' : m.at.startsWith('at ') ? `up to ${m.at.slice(3)}` : m.at} in ${i.project.name}: `
        + `${passed} of ${latest.length} tests passed, ${proved} of ${progs.length} programs proved, ${plural(open.length, 'thing')} open${late ? `, ${late} late or failed` : ''}`
        + `${next ? ` — next: ${next.title} (${next.word}${next.who ? `, ${next.who}` : ''})` : ''}.`;
    }
  }

  /* ON ITS LINE — the register's problems with each one's journey, every other project's work, the studies, the stops */
  const v = i.view;
  if (v) {
    if (!i.project) {
      facts = [v.says, v.oem ? `Made by ${v.oem}` : ''].filter(Boolean);
      sections.push({ title: 'Its programs', count: v.programs.length ? String(v.programs.length) : 'none', rows: v.programs.map(programRow), empty: 'No programs on it.' });
    }
    const others = i.project ? v.projects.filter(p => p.name !== i.project?.name) : v.projects;
    if (!i.project || others.length) {
      sections.push({
        title: i.project ? 'Other projects’ work on it' : 'The projects on it', count: others.length ? String(others.length) : 'none',
        rows: others.map(p => ({ what: p.name, says: [plural(p.tests, 'test'), p.last ? `last: ${p.last}` : ''].filter(Boolean).join(' · '),
          word: [p.open ? `${p.open} open` : 'none open', p.failed ? `${p.failed} didn’t pass` : ''].filter(Boolean).join(' · '), tone: p.failed ? 'r' as const : p.open ? 'w' as const : 'g' as const })),
        empty: 'No project has worked on it.',
      });
    }
    sections.push({
      title: 'Its problems on the register — each with what was done', count: v.problems.length ? `${v.problems.filter(p => p.open).length} open of ${v.problems.length}` : 'none',
      rows: v.problems.map(p => {
        const s = snagsById.get(p.id);
        return {
          what: p.what, says: [s?.owner ? `with ${s.owner}` : '', s?.dueAt ? `by ${niceDay(isoDay(s.dueAt))}` : '', s?.raisedAt ? `raised ${niceDay(isoDay(s.raisedAt))}` : ''].filter(Boolean).join(' · '),
          word: p.open ? PRIORITY[p.priority] ?? 'Low' : `closed${s?.closedAt ? ` ${niceDay(isoDay(s.closedAt))}` : ''}`,
          tone: !p.open ? 'g' as const : p.priority === 'critical' ? 'r' as const : p.priority === 'high' ? 'a' as const : 'n' as const,
          lines: (s?.journey ?? []).slice().sort((a, b) => a.at - b.at).map(j => `${niceDay(isoDay(j.at))} — ${j.did}${j.result ? ` — ${j.result}` : ''}`),
        };
      }),
      empty: 'No problem on the register names it.',
    });
    sections.push({
      title: 'Studies of it — what each found', count: v.studies.length ? String(v.studies.length) : 'none',
      rows: v.studies.map(x => {
        const s = studiesById.get(x.id);
        const f = s ? studyLine(s) : undefined;
        return { what: x.name, says: x.tool, word: '', tone: (f?.tone === 'r' ? 'r' : f?.tone === 'a' ? 'a' : f?.tone === 'g' ? 'g' : 'n') as PaperTone, lines: f ? [f.text] : [] };
      }),
      empty: 'No study names it yet.',
    });
    sections.push({
      title: 'Its stops', count: v.stops.n ? `${v.stops.n} in ${STOP_DAYS} days` : 'none',
      rows: v.stops.n ? [{ what: `${plural(v.stops.n, 'stop')} timed in the last ${STOP_DAYS} days`, word: `${v.stops.minutes} minutes`, tone: 'n' }] : [],
      empty: `No stops timed on it in the last ${STOP_DAYS} days.`,
    });
    if (!closing) {
      const openP = v.problems.filter(p => p.open).length;
      closing = `${v.name}${i.line ? ` on ${i.line}` : ''}: ${v.says}${openP ? ` — ${plural(openP, 'problem')} open on the register` : ''}.`.replace(/\.\.$/, '.');
    }
  }

  return {
    eyebrow: i.project ? `MACHINE · ${i.project.name}${i.line ? ` · ${i.line}` : ''}` : `MACHINE · ${i.line ?? ''}`,
    name: i.name,
    ...(status ? { status: { word: status, tone: statusTone(status) } } : {}),
    facts,
    ...(inProject ? { inProject } : {}),
    ...(gates ? { gates } : {}),
    ...(tiles.length ? { tiles } : {}),
    sections,
    ...(closing ? { closing } : {}),
  };
}
