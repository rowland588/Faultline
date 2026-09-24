/* EVERYTHING IN THE APP, AS A WORKBOOK.
 *
 * Rowland: "I don't want to lose what I have just done — everything in the app
 * data I want." The business is moving to an Excel tool built around the whole
 * start-up (arrival, installation, commissioning, training, handover), and the
 * job already run in here has to arrive in it whole.
 *
 * One sheet per list, and the column headings are EXACTLY the ones the Excel
 * tool's tables use, so the export is the tool's starting data rather than a
 * dump somebody has to reshape. A project column on every row, because the
 * tool keeps every line in one workbook. Dates are real Excel dates.
 *
 * Two sheets arrive empty on purpose — Stages and Training. The app never kept
 * either; the Excel tool does, and they are there so the shape is complete.
 *
 * Photos, videos and documents stay in the app: a workbook cannot carry them
 * and a link to a phone's own storage would open nothing. Each row says how
 * many it has, so nobody thinks they were lost.
 */
import type { Project } from '../types';
import type { Snag, SnagAsset } from '../snag/types';
import type { Material } from './materials';
import type { Program } from './programs';
import { stateOf as programState } from './programs';
import type { Asset, Test, TestItem } from './testing';
import { rootTestOf, testOfFix } from './testing';
import { planModel } from './planModel';
import type { XCell, XSheet } from './xlsxWrite';

export interface ProjectData {
  project: Project;
  assets: Asset[];
  tests: Test[];
  items: TestItem[];
  materials: Material[];
  programs: Program[];
}

export interface WalkData {
  /** The project the walk belongs to, or the workspace's own name. */
  projectName: string;
  snags: Snag[];
  assets: SnagAsset[];
}

/* The headings — the contract with the Excel tool. Change one here and the
   tool's prompt has to change with it. */
export const HEADS = {
  Projects: ['Project', 'Kind', 'Lead', 'Handover agreed', 'Handover expected', 'Description'],
  Stages: ['Project', 'Stage', 'Start', 'End', 'Owner', 'Status', 'Notes'],
  Machines: ['Project', 'Machine', 'OEM', 'Expected on site', 'On site', 'Installed', 'Running', 'Documents'],
  Tests: ['Project', 'Test', 'Re-test of', 'Machine', 'Program', 'Planned for', 'Planned to', 'Done with',
    'Passes if', 'Product planned', 'Ran on', 'Ran to', 'Product run', 'What happened', 'Outcome', 'Photos'],
  Issues: ['Project', 'Issue', 'Type', 'For test', 'Machine', 'The problem', 'Who', 'Due', 'Done on',
    'What was done', 'Latest update', 'Status', 'Photos'],
  Notes: ['Project', 'Test', 'What we saw', 'Whose', 'Photos'],
  Materials: ['Project', 'What', 'How much', 'From', 'Due', 'Arrived on', 'Here', 'Notes'],
  Programs: ['Project', 'Program', 'Runs', 'Machine', 'Written?', 'Test on', 'Proved on', 'From', 'Test', 'Notes'],
  Training: ['Project', 'Who', 'Trained on', 'Trainer', 'Planned for', 'Done on', 'Signed off by', 'Notes'],
} as const;

const d = (iso?: string): XCell => (iso ? { date: iso } : '');
const ms = (t?: number): XCell => {
  if (t == null) return '';
  const x = new Date(t);
  return { date: `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` };
};
const count = (n: number, one: string): string => (n ? `${n} ${one}${n === 1 ? '' : 's'} (in the app)` : '');
const live = <T extends { deletedAt?: number }>(rows: T[]): T[] => rows.filter(r => !r.deletedAt);

const TEST_OUTCOME: Record<Test['outcome'], string> = {
  planned: 'Planned', passed: 'Passed', failed: 'Didn’t pass', notRun: 'Didn’t run',
};
const FIX_STATUS: Record<Test['outcome'], string> = {
  planned: 'Open', passed: 'Done', failed: 'Didn’t fix it', notRun: 'Didn’t happen',
};
const KIND: Record<ReturnType<typeof planModel>, string> = {
  commissioning: 'Commissioning', board: '3P board', tree: 'Lever tree',
};

/** A name per record that is unique inside its project — the Excel tool links
 *  rows by name, and two re-tests called the same thing would be one row. */
function uniqueNames(tests: Test[]): Map<string, string> {
  const seen = new Map<string, number>();
  const out = new Map<string, string>();
  for (const t of tests) {
    const base = t.title.trim() || 'Untitled';
    const n = (seen.get(base.toLowerCase()) ?? 0) + 1;
    seen.set(base.toLowerCase(), n);
    out.set(t.id, n === 1 ? base : `${base} (${n})`);
  }
  return out;
}

export function exportSheets(projects: ProjectData[], walks: WalkData[], exportedAt: string): XSheet[] {
  const rows: Record<keyof typeof HEADS, XCell[][]> = {
    Projects: [], Stages: [], Machines: [], Tests: [], Issues: [], Notes: [], Materials: [], Programs: [], Training: [],
  };

  for (const pd of projects) {
    const p = pd.project;
    const name = p.name;
    rows.Projects.push([name, KIND[planModel(p)], p.lead ?? '', d(p.plannedAt), d(p.expectedAt), p.description ?? '']);

    const assets = live(pd.assets);
    const machine = (id?: string) => assets.find(a => a.id === id)?.name ?? '';
    for (const a of assets) {
      rows.Machines.push([name, a.name, a.oem ?? '', d(a.dueOn), d(a.onSiteOn), d(a.installedOn), d(a.runningOn),
        count(a.docs?.length ?? 0, 'document')]);
    }

    const all = live(pd.tests).slice().sort((x, y) =>
      /* By date, and anything with no date last — not first. */
    (x.plannedFor ?? x.ranOn ?? '\uffff').localeCompare(y.plannedFor ?? y.ranOn ?? '\uffff') || x.sort - y.sort);
    const tests = all.filter(t => (t.kind ?? 'test') === 'test');
    const fixes = all.filter(t => t.kind === 'fix');
    const names = uniqueNames(tests);
    const programs = live(pd.programs);
    const programName = (id?: string) => programs.find(x => x.id === id)?.what ?? '';

    for (const t of tests) {
      /* A re-test names the ORIGINAL test — the tool never chains re-tests. */
      const parent = t.fromTestId ? all.find(x => x.id === t.fromTestId) : undefined;
      const original = parent ? rootTestOf(parent, all) : undefined;
      rows.Tests.push([
        name, names.get(t.id) ?? t.title,
        original && original.id !== t.id ? names.get(original.id) ?? original.title : '',
        machine(t.assetId), programName(t.programId),
        d(t.plannedFor), d(t.plannedTo), t.withWhom ?? '', t.passesIf ?? '', t.planned ?? '',
        d(t.ranOn), d(t.ranTo), t.product ?? '', t.result ?? '', TEST_OUTCOME[t.outcome],
        count((t.media?.length ?? 0) + (t.docs?.length ?? 0), 'photo or file'),
      ]);
    }

    for (const f of fixes) {
      const forTest = testOfFix(f, all);
      rows.Issues.push([
        name, f.title, 'Fix',
        forTest ? names.get(forTest.id) ?? forTest.title : 'Not from a test',
        machine(f.assetId), f.passesIf ?? '', f.withWhom ?? '', d(f.plannedFor), d(f.ranOn),
        f.result ?? '', '', FIX_STATUS[f.outcome],
        count((f.media?.length ?? 0) + (f.docs?.length ?? 0), 'photo or file'),
      ]);
    }

    /* What was found, on tests and on fixes that carry notes from before. */
    const items = live(pd.items).filter(i => i.kind === 'found');
    for (const i of items) {
      const on = all.find(t => t.id === i.testId);
      if (!on) continue;
      rows.Notes.push([name, on.kind === 'fix' ? on.title : names.get(on.id) ?? on.title,
        i.what, i.owner ?? '', count(i.media?.length ?? 0, 'photo')]);
    }

    for (const m of live(pd.materials)) {
      rows.Materials.push([name, m.what, m.howMuch ?? '', m.from ?? '', d(m.due), d(m.inOn),
        m.here || m.inOn ? 'Yes' : '', m.note ?? '']);
    }

    for (const pr of programs) {
      const st = programState(pr);
      const test = pr.testId ? tests.find(t => t.id === pr.testId) : undefined;
      rows.Programs.push([name, pr.what, pr.runs ?? '', machine(pr.assetId),
        st === 'needed' ? 'Not written' : 'On the machine',
        d(pr.testOn), d(pr.provedOn), pr.from ?? '', test ? names.get(test.id) ?? test.title : '', pr.note ?? '']);
    }
  }

  /* THE SNAG LISTS, as issues — the same list in the tool, typed Snag. */
  for (const w of walks) {
    const assetName = (id?: string) => w.assets.find(a => a.id === id)?.name ?? '';
    for (const s of live(w.snags)) {
      rows.Issues.push([
        w.projectName, s.problem, 'Snag', '', assetName(s.assetId) || s.targetAsset || '',
        s.proposedSolution ? `Proposed: ${s.proposedSolution}` : '',
        s.owner ?? '', ms(s.dueAt), ms(s.closedAt), s.closeNote ?? '', s.latestUpdate ?? '',
        s.status === 'closed' ? 'Done' : s.status === 'in_progress' ? 'In progress' : 'Open',
        count((s.detailPhotoKey ? 1 : 0) + (s.fixedPhotoKey ? 1 : 0), 'photo'),
      ]);
    }
  }

  const n = (k: keyof typeof HEADS) => rows[k].length;
  const readMe: XSheet = {
    name: 'Read me', header: false, widths: [28, 70],
    rows: [
      ['Faultline — everything in the app', ''],
      ['Exported', { date: exportedAt }],
      ['', ''],
      ['Projects', `${n('Projects')}`],
      ['Machines', `${n('Machines')}`],
      ['Tests', `${n('Tests')} (re-tests name the original test in "Re-test of")`],
      ['Issues', `${n('Issues')} — fixes and snags together; "Type" says which`],
      ['Notes', `${n('Notes')} — what was seen during a test`],
      ['Materials', `${n('Materials')}`],
      ['Programs', `${n('Programs')}`],
      ['Stages', 'Empty — the Excel tool fills it for each start-up'],
      ['Training', 'Empty — the Excel tool keeps it from here on'],
      ['', ''],
      ['Photos and files', 'Stay in the app. Each row says how many it has.'],
      ['Dates', 'Real Excel dates, so formulas can compare them with today.'],
    ],
  };

  return [
    readMe,
    ...(Object.keys(HEADS) as (keyof typeof HEADS)[]).map(k => ({
      name: k,
      rows: [[...HEADS[k]] as XCell[], ...rows[k]],
    })),
  ];
}
