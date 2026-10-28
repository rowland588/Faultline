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
import type { MachinePaper, PaperDetail, PaperRow, PaperSection, PaperTone } from './machinePaper';
import { attemptDetail, attemptFromLine, itemDetail, withSplit, runWords, statusWord, whenWords, type PlainKind } from './machinePlain';
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

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const PRIORITY: Record<string, string> = { critical: 'Critical', high: 'High', low: 'Low' };
const toneOfOutcome = (t: Test): PaperTone => (t.outcome === 'passed' ? 'g' : t.outcome === 'failed' || t.outcome === 'notRun' ? 'r' : t.plannedFor ? 'w' : 'n');

/** What was written on a test or step — what was found, the next step agreed, a note — each labelled with its day
 *  and who (lib/machinePlain itemDetail). */
function itemsOn(testId: string, items: readonly TestItem[]): PaperDetail[] {
  return live([...items]).filter(i => i.testId === testId).sort((a, b) => a.createdAt - b.createdAt).map(itemDetail);
}

/** Files and a study's proof, labelled. */
const filesLine = (t: { docs?: Test['docs'] }): PaperDetail[] => (filesSaid(t) ? [{ label: 'Files', text: filesSaid(t) }] : []);
const provedLine = (proof: string | undefined): PaperDetail[] => (proof ? [{ label: 'Proved by', text: proof.replace(/^Proved by: /, '') }] : []);

/** A row's status as its coloured word, and when, said whole (lib/machinePlain). */
function plainRow(kind: PlainKind, l: { word: string; tone: MachineTone; critical?: boolean; risk?: boolean }): { word: string; tone: PaperTone; when: string } {
  const st = statusWord(kind, l.tone, l.word, l);
  return { ...st, when: whenWords(kind, l.tone, l.word) };
}

/** A program on paper: its status as one word, when, what it runs and who, how it was proved, its run at speed, every
 *  test of it as an attempt, and what it said before. */
function programRow(l: ProgramLine): PaperRow {
  const b = badgeOf(l);
  /* the word without the badge said again — "DONE — done 24 Oct" read as two things */
  const rest = l.word.trim().toLowerCase().startsWith(b.toLowerCase()) ? l.word.trim().slice(b.length).replace(/^[\s—·-]+/, '') : l.word.trim();
  return {
    what: l.what, says: [l.runs ? `Runs: ${l.runs}` : '', l.who ? `With: ${l.who}` : ''].filter(Boolean).join(' · '),
    word: b, tone: l.tone,
    detail: [
      ...(rest && rest.toUpperCase() !== b ? [{ label: 'Where it stands', text: b === 'FAILED' ? `marked failed — ${rest}` : /^\d{1,2} [A-Z][a-z]{2}( \d{4})?$/.test(rest) ? `${b.toLowerCase()} ${rest}` : rest }] : []),
      /* a program marked failed though its last test passed — said, so the two are never read as one answer */
      ...(b === 'FAILED' && (l.tests ?? []).slice(-1)[0]?.tone === 'g' ? [{ label: 'Read this', text: 'This program is marked FAILED on the program itself, though its last test below passed. The status at the top is the one that stands.' }] : []),
      ...(l.note ? [{ label: 'What was seen', text: l.note }] : []),
      ...(l.proof ? [{ label: 'How it was proved', text: l.proof.word, tone: l.proof.tone }] : []),
      ...(l.run ? [{ label: 'Its run at speed', text: l.run }] : []),
      ...(l.tests ?? []).flatMap(t => [withSplit(attemptFromLine(t.text, t.tone), t.split), ...t.studies.map(st => ({ label: 'Study of it', text: st }))]),
      ...(!(l.tests ?? []).length && l.bucket !== 'done' && l.bucket !== 'baseline' && !/booked|passed|proved/i.test(l.word) ? [{ label: 'Tests', text: 'not tested yet' }] : []),
      ...l.earlier.map(e => ({ label: 'Before', text: e })),
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
      const KIND: Record<string, string> = { Install: 'Install step', 'Set up': 'Set-up step', 'Hand over': 'Hand-over step', Fix: 'Fix' };
      sections.push({
        title: 'What is open on it, and who has it', count: open.length ? `${open.length} open` : 'nothing',
        intro: 'Everything not finished on this machine — its install, set-up and hand-over steps, its fixes and the problems found on it — the most urgent first.',
        table: true,
        rows: open.map(l => {
          const problem = l.where.startsWith('Problem');
          const pr = problem ? (l as typeof l & { critical?: boolean; risk?: boolean }) : undefined;
          const st = plainRow(problem ? 'problem' : l.where === 'Fix' ? 'fix' : 'step', { ...l, ...(pr?.critical ? { critical: true } : {}), ...(pr?.risk ? { risk: true } : {}) });
          /* a problem's word is where it was found and the day: "Seal integrity — Finest Red 2kg · 27 Oct" */
          const at = problem ? l.word.lastIndexOf(' · ') : -1;
          return {
            what: l.title, word: st.word, tone: st.tone,
            kind: problem ? `Problem${at > 0 ? ` found on ${l.word.slice(0, at)}` : ''}` : KIND[l.where] ?? l.where,
            who: l.who ?? (problem ? 'nobody yet — no fix raised' : 'nobody named'),
            when: problem ? `found ${at > 0 ? l.word.slice(at + 3) : l.word}` : st.when,
          };
        }),
        empty: 'Nothing open on it — no stage, fix or problem waiting.',
      });

      /* ITS TESTS — every attempt */
      const chains = latestAttempts(tests).filter(t => t.assetId === asset.id && (t.kind ?? 'test') === 'test').sort((a, b) => a.sort - b.sort);
      sections.push({
        title: 'Its tests — every attempt', count: chains.length ? `${passed} of ${chains.length} passed` : 'none yet',
        intro: 'Each test agreed for this machine: what it has to show, then every attempt in order — the day, how it went, what was seen — and anything found while testing.',
        rows: chains.map(t => {
          const j = testJourney(t, tests, i.today);
          const cell = latest.find(x => x.id === t.id);
          const proof = recordProvedLine([...(gate.studies ?? [])], t);
          /* the test by its first name, and what it was agreed to show — a re-test carries neither again */
          const first = j.attempts[0]?.test ?? t;
          const passesIf = [...j.attempts].reverse().map(a => a.test.passesIf?.trim()).find(Boolean) ?? t.passesIf?.trim();
          const st = cell ? plainRow('test', cell) : { word: '', tone: toneOfOutcome(t), when: '' };
          return {
            what: first.title, says: [t.withWhom?.trim() ? `With: ${t.withWhom.trim()}` : '', j.says ? `Attempts: ${j.says.replace(/^\d+ tests? · /, '')}` : ''].filter(Boolean).join(' · '),
            word: st.word, tone: st.tone,
            detail: [
              { label: 'Has to show', text: passesIf ?? 'not written down yet' },
              ...j.attempts.map(attemptDetail),
              /* the fastest pass, when there was more than one attempt to choose from */
              ...(j.best && j.attempts.length > 1 ? [{ label: 'Best pass', text: runWords(j.best.replace(/^Passed /, '')).replace(/\(test (\d+)\)/, '(attempt $1)') }] : []),
              ...j.attempts.flatMap(a => itemsOn(a.test.id, items)),
              ...filesLine(t),
              ...provedLine(proof),
            ],
          };
        }),
        empty: 'No tests on it yet — they are planned on the project’s Commission.',
      });

      /* ITS PROGRAMS — every test of each */
      sections.push({
        title: 'Its programs — every test of each', count: progs.length ? `${proved} of ${progs.length} proved` : 'none',
        intro: 'Each program for this machine — what it runs, where it stands, and every test run of it.',
        rows: progs.map(programRow), empty: 'No programs on it.',
      });

      /* EVERY STEP OF ITS INSTALL, SET-UP AND HAND-OVER — with what was written */
      for (const g of m.gates.filter(x => x.gate !== 'commission')) {
        const done = g.lines.filter(l => l.tone === 'done').length;
        sections.push({
          title: `${g.label} — every step`, count: g.lines.length ? `${done} of ${g.lines.length} done` : 'none',
          intro: `Every ${g.label.toLowerCase()} step for this machine, when it was done or is due, and what was written about it.`,
          rows: g.lines.map(l => {
            const t = tests.find(x => x.id === l.id);
            const st = plainRow('step', l);
            return { what: l.title, says: l.who ? `With: ${l.who}` : '', word: st.word, tone: st.tone,
              detail: [{ label: l.tone === 'done' ? 'Done on' : 'When', text: st.when },
                ...(t?.result?.trim() ? [{ label: 'What was written', text: t.result.trim() }] : []), ...(t ? filesLine(t) : []), ...itemsOn(l.id, items)] };
          }),
          empty: `No ${g.label.toLowerCase()} steps on it.`,
        });
      }

      /* ITS PROBLEMS AND FIXES — each with what was done */
      const fixesAll = tests.filter(t => t.kind === 'fix' && (t.assetId ?? testOfFix(t, tests)?.assetId) === asset.id);
      const pf: PaperRow[] = [
        ...m.problems.map(p => {
          const st = statusWord('problem', p.tone, p.word, p);
          const at = p.word.lastIndexOf(' · ');
          return { what: `Problem: ${p.title}`, word: st.word, tone: st.tone,
            detail: [{ label: 'Found on', text: at > 0 ? `${p.word.slice(0, at)}, ${p.word.slice(at + 3)}` : p.word }, { label: 'Fix', text: 'no fix raised yet' }] };
        }),
        ...fixesAll.map(f => {
          const open = m.fixes.find(x => x.id === f.id);
          const st = f.outcome === 'passed' ? { word: 'FIXED', tone: 'g' as const, when: niceDay(f.ranTo ?? f.ranOn) } : open ? plainRow('fix', open) : { word: 'OPEN', tone: 'a' as const, when: '' };
          return {
            what: `Fix: ${f.title}`, says: [f.withWhom?.trim() ? `With: ${f.withWhom.trim()}` : '', testOfFix(f, tests) ? `For: ${testOfFix(f, tests)?.title}` : ''].filter(Boolean).join(' · '),
            word: st.word, tone: st.tone,
            detail: [...(st.when ? [{ label: f.outcome === 'passed' ? 'Fixed on' : 'When', text: st.when }] : []),
              ...(f.result?.trim() ? [{ label: 'What was done', text: f.result.trim() }] : []), ...itemsOn(f.id, items)],
          };
        }),
      ];
      sections.push({ title: 'Its problems and fixes', count: pf.length ? `${m.problems.length} open problem${m.problems.length === 1 ? '' : 's'} · ${m.fixesDone} of ${fixesAll.length} fixes done` : 'none',
        intro: 'The problems found on this machine that have no fix yet, then every fix raised for it — what it was for, who has it and where it stands.',
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
      sections.push({ title: 'Its programs', count: v.programs.length ? plural(v.programs.length, 'program') : 'none', intro: 'Each program for this machine on its line — what it runs, where it stands, and every test run of it.',
        rows: v.programs.map(programRow), empty: 'No programs on it.' });
    }
    const others = i.project ? v.projects.filter(p => p.name !== i.project?.name) : v.projects;
    if (!i.project || others.length) {
      sections.push({
        title: i.project ? 'Other projects’ work on it' : 'The projects on it', count: others.length ? plural(others.length, 'project') : 'none',
        intro: 'Every project that has worked on this machine, how many of its tests and steps are still open, and the last thing it did.',
        rows: others.map(p => ({ what: p.name, word: p.failed ? `${p.failed} DIDN’T PASS` : p.open ? `${p.open} OPEN` : 'NOTHING OPEN', tone: p.failed ? 'r' as const : p.open ? 'w' as const : 'g' as const,
          detail: [{ label: 'Its work on it', text: plural(p.tests, 'test or step', 'tests and steps') }, ...(p.last ? [{ label: 'Last thing done', text: p.last }] : [])] })),
        empty: 'No project has worked on it.',
      });
    }
    sections.push({
      title: 'Its problems on the register — each with what was done', count: v.problems.length ? `${v.problems.filter(p => p.open).length} open of ${v.problems.length}` : 'none',
      intro: 'Problems written on the line’s register that name this machine — open ones first by priority — with who has each, by when, and every step taken on it.',
      rows: v.problems.map(p => {
        const s = snagsById.get(p.id);
        /* RAG is the priority's own (CLAUDE.md, 12 October): Critical red, High amber, Low green — a closed one green, with its word */
        return {
          what: p.what, says: [s?.owner ? `Who has it: ${s.owner}` : 'Who has it: nobody yet', s?.dueAt ? `By: ${niceDay(isoDay(s.dueAt))}` : ''].filter(Boolean).join(' · '),
          word: p.open ? `${(PRIORITY[p.priority] ?? 'Low').toUpperCase()} — OPEN` : 'CLOSED',
          tone: !p.open ? 'g' as const : p.priority === 'critical' ? 'r' as const : p.priority === 'high' ? 'a' as const : 'g' as const,
          detail: [
            ...(s?.raisedAt ? [{ label: 'Raised', text: niceDay(isoDay(s.raisedAt)) }] : []),
            ...(!p.open && s?.closedAt ? [{ label: 'Closed', text: niceDay(isoDay(s.closedAt)) }] : []),
            ...(s?.journey ?? []).slice().sort((a, b) => a.at - b.at).map(j => ({ label: `Step taken · ${niceDay(isoDay(j.at))}`, text: j.did, ...(j.result ? { more: `What came of it: ${j.result}` } : {}) })),
          ],
        };
      }),
      empty: 'No problem on the register names it.',
    });
    sections.push({
      title: 'Studies of it — what each found', count: v.studies.length ? plural(v.studies.length, 'study', 'studies') : 'none',
      intro: `Studies that measured this machine, and what each one found.${v.studies.some(x => /reliab/i.test(x.tool)) ? ' MTBF is the average running time between one stop and the next; “90% sure” gives the range it is 90% likely to lie in.' : ''}`,
      rows: v.studies.map(x => {
        const s = studiesById.get(x.id);
        const f = s ? studyLine(s) : undefined;
        return { what: x.name, says: `Tool: ${x.tool}`, word: '', tone: (f?.tone === 'r' ? 'r' : f?.tone === 'a' ? 'a' : f?.tone === 'g' ? 'g' : 'n') as PaperTone,
          detail: f ? [{ label: 'What it found', text: f.text }] : [{ label: 'What it found', text: 'nothing yet — no readings taken' }] };
      }),
      empty: 'No study names it yet.',
    });
    sections.push({
      title: 'Its stops', count: v.stops.n ? `${v.stops.n} in ${STOP_DAYS} days` : 'none',
      intro: `Stops timed on this machine in the last ${STOP_DAYS} days.`,
      rows: v.stops.n ? [{ what: `${plural(v.stops.n, 'stop')} timed in the last ${STOP_DAYS} days`, word: '', tone: 'n', detail: [{ label: 'Time stopped', text: `${v.stops.minutes} minutes in all` }] }] : [],
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
