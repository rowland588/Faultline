/* A CARD FOR EVERY RECORD ON A GATE'S BOARD — Commission's tests, or a
 * gate's steps (Install, Set up, Hand over), each on its own card, one
 * document (screens/TestsScreen, screens/InstallScreen; docs/AUDIT.md, bar
 * 3: "a record that has a card offers the cards for all that are shown, as
 * well as one at a time").
 *
 * Each card is the one its record prints (lib/trialCard reads it, lib/
 * trialCardPdf draws it, ui/RecordMore CardPdf presses it): what was agreed,
 * what happened, what was found with its pictures, what we do next. The
 * board's records, machine by machine in the order the machines stand, the
 * line itself last, then by day — Commission's tests its latest attempts
 * (lib/testing latestAttempts, as the board and the client report count
 * them); each card numbers its own pages. */
import { allPaceLines, listAssets, listStudies, listTestItems, listTests, listWorkspaces } from '../db';
import { gateOf, itemsOf, latestAttempts, type Asset, type StepGate, type Test } from './testing';

/** Which board: Commission's tests, or one gate's steps. */
export type CardBoard = 'tests' | StepGate;

/** The board's records, in the order the board reads: machine by machine, then by day. */
export function boardOrder(tests: Test[], assets: Asset[], board: CardBoard = 'tests'): Test[] {
  const rank = new Map(assets.filter(a => !a.deletedAt).sort((a, b) => a.sort - b.sort).map((a, i) => [a.id, i]));
  const at = (t: Test) => (t.assetId != null && rank.has(t.assetId) ? (rank.get(t.assetId) as number) : Number.MAX_SAFE_INTEGER);
  const day = (t: Test) => t.ranOn ?? t.plannedFor ?? '9999';
  const on = board === 'tests' ? latestAttempts(tests) : tests.filter(t => !t.deletedAt && t.kind === 'install' && gateOf(t) === board);
  return on.sort((a, b) => at(a) - at(b) || day(a).localeCompare(day(b)) || (a.sort ?? 0) - (b.sort ?? 0) || a.title.localeCompare(b.title));
}

/** Every record on the board as a card, saved; the bar offers Open and Send.
 *  Returns how many cards were drawn. `what` names the file: "test cards". */
export async function saveBoardCards(projectId: string, project: { name: string; lead?: string }, board: CardBoard, what: string): Promise<number> {
  const { loadPdfLib, deliverPdf, titlePdf } = await import('./savePdf');
  const { drawTrialCard } = await import('./trialCardPdf');
  const { trialCard } = await import('./trialCard');
  const { shotsOf } = await import('./testReport');
  const { pdfFileName } = await import('./fileName');
  const { todayISO } = await import('./weeks');
  const [tests, items, assets, studies, paceLines, workspaces] = await Promise.all([listTests(projectId), listTestItems(projectId), listAssets(projectId), listStudies(projectId), allPaceLines(), listWorkspaces()]);
  const { runLineOf } = await import('./runMoney');
  const list = boardOrder(tests, assets, board);
  if (!list.length) return 0;
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const builtAt = Date.now();
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if (i > 0) doc.addPage('a4', 'landscape');
    const c = trialCard(t, tests, items, assets, studies, runLineOf(t, assets, paceLines, workspaces));
    const shots = await shotsOf([...(t.media ?? []), ...itemsOf(items, t.id, 'found').flatMap(x => x.media ?? [])]);
    drawTrialCard(doc, c, { project: project.name, lead: project.lead, builtAt, shots });
  }
  titlePdf(doc, `${project.name} — ${what}`);
  /* each card's band carries the mark, as one card's does */
  await deliverPdf(doc, pdfFileName(project.name, what, todayISO()), { brand: false });
  return list.length;
}

export async function saveTestCard(projectId: string, testId: string, project: { name: string; lead?: string }) {
  const { loadPdfLib, deliverPdf } = await import('./savePdf');
  const { drawTrialCard } = await import('./trialCardPdf');
  const { trialCard } = await import('./trialCard');
  const { shotsOf } = await import('./testReport');
  const { pdfFileName } = await import('./fileName');
  const { todayISO } = await import('./weeks');
  const [tests, items, assets, studies, paceLines, workspaces] = await Promise.all([listTests(projectId), listTestItems(projectId), listAssets(projectId), listStudies(projectId), allPaceLines(), listWorkspaces()]);
  const t = tests.find(x => x.id === testId && !x.deletedAt);
  if (!t) throw new Error('test not found');
  const { runLineOf } = await import('./runMoney');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const c = trialCard(t, tests, items, assets, studies, runLineOf(t, assets, paceLines, workspaces));
  const shots = await shotsOf([...(t.media ?? []), ...itemsOf(items, t.id, 'found').flatMap(x => x.media ?? [])]);
  drawTrialCard(doc, c, { project: project.name, lead: project.lead, builtAt: Date.now(), shots });
  return deliverPdf(doc, pdfFileName(project.name, `${t.title} test card`, todayISO()), { brand: false });
}
