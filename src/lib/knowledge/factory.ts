/* THE FACTORY — RELATIONSHIPS ACROSS LINES, WITHIN ONE CUSTOMER (12 November, docs/LUNAR-KNOWLEDGE.md §6). The first slice of reading the
 * brain across the Factory Knowledge Model: from each line's current knowledge (never its raw records again),
 *   recurring together — the same reason recurring on the same machine, or the same KIND of machine (docs/FACTORY-KNOWLEDGE.md F1), on two
 *     or more of one customer's lines;
 *   held elsewhere — a fix that held (counted or measured) on one line for a machine and reason that still recurs on another of the same
 *     customer's lines: the bridge to Spread what works (FC-155).
 * One customer's knowledge is never read beside another's: lines are grouped by their customer first. Products, shifts, materials and
 * schedules are not related yet — the stops carry too little of them (said, never guessed). Pure. */
import { customerKey } from '../customers';
import { currentOf, isLapsed, type Entry } from './model';

export interface LineLike { id: string; name: string; clientName?: string }
export interface Across {
  kind: 'recurring-together' | 'held-elsewhere';
  reason: string;
  machineLabel: string;
  lines: { lineId: string; lineName: string; machine: string; claimId?: string }[];
  /** For held-elsewhere: the fix that held and where. */
  held?: { lineId: string; lineName: string; fixTitle: string; outcomeId: string };
  says: string;
}

const norm = (s?: string) => (s ?? '').trim().toLowerCase();

/** What each line has recurring now (current, not lapsed), as machine and reason. */
function recurringNow(line: LineLike, ledger: readonly Entry[]): { machine: string; reason: string; claimId: string }[] {
  const claims = new Set(ledger.filter(e => e.workspaceId === line.id && e.kind === 'finding' && e.claim?.startsWith('recurs:')).map(e => e.claim ?? ''));
  const out: { machine: string; reason: string; claimId: string }[] = [];
  for (const c of claims) {
    const cur = currentOf(ledger, c);
    if (!cur || isLapsed(cur)) continue;
    const b = cur.body as { machine?: string; reason?: string };
    if (b.machine && b.reason) out.push({ machine: b.machine, reason: b.reason, claimId: cur.id });
  }
  return out;
}

/** Relationships across the lines of the customer `line` belongs to (or, with no line, every customer apart). */
export function acrossLines(lines: readonly LineLike[], ledger: readonly Entry[], kindOf: (lineId: string, machine: string) => string | undefined, onlyClientOf?: string): Across[] {
  const byCustomer = new Map<string, LineLike[]>();
  for (const l of lines) {
    const k = customerKey(l.clientName ?? '');
    byCustomer.set(k, [...(byCustomer.get(k) ?? []), l]);
  }
  const want = onlyClientOf ? customerKey(lines.find(l => l.id === onlyClientOf)?.clientName ?? '') : undefined;
  const out: Across[] = [];
  for (const [k, group] of byCustomer) {
    if (want !== undefined && k !== want) continue;
    if (group.length < 2) continue;
    /* recurring together: grouped by reason and by the machine's kind (else its name) */
    const groups = new Map<string, { reason: string; label: string; lines: Across['lines'] }>();
    for (const l of group) {
      for (const r of recurringNow(l, ledger)) {
        const kind = kindOf(l.id, r.machine);
        const label = kind ? `${kind} (${r.machine})` : r.machine;
        const key = `${norm(r.reason)}|${norm(kind || r.machine)}`;
        const g = groups.get(key) ?? { reason: r.reason, label: kind || r.machine, lines: [] };
        if (!g.lines.some(x => x.lineId === l.id)) g.lines.push({ lineId: l.id, lineName: l.name, machine: r.machine, claimId: r.claimId });
        g.label = kind || label.replace(/ \(.*\)$/, '');
        groups.set(key, g);
      }
    }
    for (const g of groups.values()) {
      if (g.lines.length < 2) continue;
      out.push({ kind: 'recurring-together', reason: g.reason, machineLabel: g.label, lines: g.lines,
        says: `${g.reason} keeps coming back on the ${g.label} on ${g.lines.length} lines — ${g.lines.map(x => `${x.lineName} (${x.machine})`).join(', ')}. The same pattern in more than one place points to the machine, the material or the method they share, not to one line — worth one investigation, not ${g.lines.length}.` });
    }
    /* held elsewhere: a fix that held on one line for what still recurs on another */
    const held = ledger.filter(e => e.kind === 'outcome' && group.some(l => l.id === e.workspaceId) && currentOf(ledger, e.claim ?? '')?.id === e.id
      && ['held', 'improved'].includes((e.body as { verdict?: string }).verdict ?? ''));
    for (const l of group) {
      for (const r of recurringNow(l, ledger)) {
        const kind = kindOf(l.id, r.machine);
        for (const h of held) {
          if (h.workspaceId === l.id) continue;
          const b = h.body as { machine?: string; reason?: string; fixTitle?: string; verdict?: string };
          if (norm(b.reason) !== norm(r.reason)) continue;
          const theirKind = b.machine ? kindOf(h.workspaceId, b.machine) : undefined;
          if (!(norm(b.machine) === norm(r.machine) || (kind && theirKind && norm(kind) === norm(theirKind)))) continue;
          const other = group.find(x => x.id === h.workspaceId);
          if (!other) continue;
          out.push({ kind: 'held-elsewhere', reason: r.reason, machineLabel: kind || r.machine,
            lines: [{ lineId: l.id, lineName: l.name, machine: r.machine, claimId: r.claimId }],
            held: { lineId: other.id, lineName: other.name, fixTitle: b.fixTitle ?? 'a fix', outcomeId: h.id },
            says: `${r.reason} still recurs on the ${r.machine} on ${l.name}; on ${other.name} the same ${kind ? `kind of machine (${kind})` : 'machine'} had “${b.fixTitle ?? 'a fix'}”, and it ${b.verdict === 'held' ? 'held' : 'improved it'} (counted). Worth trying here — it is evidence from another line, not proof for this one.` });
        }
      }
    }
  }
  return out;
}
