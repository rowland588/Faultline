/* LINE CAPACITY'S PAPER, GATHERED — each product's capacity with what its
 * page reads beside it, read once for the PDF (lib/capacityPaper reads them;
 * lib/capacityPaperPdf draws them).
 *
 * The same sources the page uses, in the same way: the line's shifts and its
 * crew and rate (its settings), the changeover SMED timed into the product
 * (lib/ie/changeover changeoverIn), the people placed on its line standard,
 * the latest bottleneck walk (lib/ie/walk) and the latest work balance
 * (lib/ie/balance) on the standard. Loaded here, never typed twice. */
import type { jsPDF } from 'jspdf';
import { allProjects, listAllStudies, listWorkspaces } from '../db';
import { analyse, labourInputs, shiftsIn } from './capacity';
import { capacityPaper, type CapacityPaper } from './capacityPaper';
import { changeoverIn } from './ie/changeover';
import { walkVerdict } from './ie/walk';
import { balance, balanceSays } from './ie/balance';
import { currentBalance } from './studyLinks';
import { headcount, peopleOf, type Standard } from './standard';

/** The day printed on the paper: "13 October 2026". */
export const printedOn = (d = new Date()): string => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/** Each product read for its page, in the order given. */
export async function capacityPapersFor(list: Standard[], printed = printedOn()): Promise<CapacityPaper[]> {
  const [ws, studies, projects] = await Promise.all([listWorkspaces(), listAllStudies(), allProjects()]);
  return list.map(s => {
    const w = s.workspaceId ? ws.find(x => x.id === s.workspaceId) : undefined;
    const job = s.projectId ? projects.find(p => p.id === s.projectId)?.name : undefined;
    const cap = s.capacity;
    const r = cap ? analyse(cap) : undefined;
    /* the latest walk on the standard, against the bottleneck the sums give */
    const walks = studies.filter(x => !x.deletedAt && x.tool === 'sampling' && !!x.agreed?.sampling?.walk && x.standardId === s.id).sort((a, b) => b.startedAt - a.startedAt);
    const stations = (r?.ok ?? []).map(x => x.station.name.trim() || `Station ${x.index + 1}`);
    const walk = walks[0] && stations.length >= 2
      ? walkVerdict(walks[0].agreed?.sampling?.who ?? stations, walks[0].facts.taps ?? [], r?.limit ? r.limit.station.name.trim() || `Station ${r.limit.index + 1}` : undefined)
      : undefined;
    /* the people's work against takt, as the standard's People view says it */
    const b = currentBalance(studies, s.id);
    const f = b?.agreed?.balance ? balance(b.facts.steps, b.agreed.balance, b.facts.crew) : undefined;
    const said = f && f.people.length ? balanceSays(f, peopleOf(s).length || undefined) : undefined;
    return capacityPaper({
      product: s.product, line: w?.name ?? (job ? `Job: ${job}` : 'On no line'), ...(job ? { job } : {}), printed,
      ...(cap ? { capacity: cap } : {}),
      ...(w ? { shifts: shiftsIn(w.shifts) } : {}),
      ...(cap ? (() => { const co = changeoverIn(cap.changeovers, studies, s.id); return co ? { co } : {}; })() : {}),
      labour: labourInputs(cap, headcount(s), w),
      ...(walk ? { walk } : {}),
      ...(said ? { work: { text: said.text, lines: said.lines } } : {}),
    });
  });
}

/** The paper for these products, drawn: one product's page, or — with
 *  `scope` — every product shown, the front first. */
/** Each line read as its capacity panel reads it, for the paper's front —
 *  only the lines the list's products stand on, in the order first met. */
async function weeksFor(list: Standard[]): Promise<{ brief: string[] }[]> {
  const ids = [...new Set(list.map(s => s.workspaceId).filter((x): x is string => !!x))];
  if (!ids.length) return [];
  const [{ readLine }, studies, ws, { listObservations, listStandardsForLine }] = await Promise.all([import('./lineRead'), listAllStudies(), listWorkspaces(), import('../db')]);
  const now = Date.now();
  return Promise.all(ids.map(async id => {
    const w = ws.find(x => x.id === id);
    const [obs, products] = await Promise.all([listObservations(id), listStandardsForLine(id)]);
    const mine = studies.filter(x => x.workspaceId === id && !x.deletedAt);
    return { brief: readLine({
      obs, counts: mine.filter(x => x.tool === 'losses' && x.facts.losses), now,
      smeds: mine.filter(x => x.tool === 'changeover' && x.facts.running).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)),
      ...(w ? { ws: w, lineName: w.name } : {}), products: products.filter(p => !p.deletedAt),
    }).brief };
  }));
}

export async function capacityPdf(list: Standard[], o: { scope?: string } = {}): Promise<jsPDF> {
  const { loadPdfLib, titlePdf } = await import('./savePdf');
  const { drawCapacityPaper } = await import('./capacityPaperPdf');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const printed = printedOn();
  const papers = await capacityPapersFor(list, printed);
  titlePdf(doc, list.length === 1 && !o.scope ? `Line capacity — ${list[0].product}` : 'Line capacity');
  const weeks = o.scope ? await weeksFor(list) : [];
  await drawCapacityPaper(doc, papers, { ...(o.scope ? { scope: o.scope } : {}), printed, weeks });
  return doc;
}

/** Made and handed over: saved to the device, the bar offering Open and Send. */
export async function saveCapacityPdf(list: Standard[], o: { scope?: string; name: string }): Promise<void> {
  const { deliverPdf } = await import('./savePdf');
  const { pdfFileName } = await import('./fileName');
  const { todayISO } = await import('./weeks');
  const doc = await capacityPdf(list, o);
  await deliverPdf(doc, pdfFileName(o.name, list.length === 1 && !o.scope ? `line capacity ${list[0].product}` : 'line capacity', todayISO()));
}
