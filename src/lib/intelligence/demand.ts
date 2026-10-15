/* LOAD AGAINST DEMAND — will next week's orders fit? (docs/upgrade-plan.md, C;
 * the brief: "headroom or overflow in hours, units and £, constraint
 * highlighted"). A simple input, never an ERP: the week's demand per product,
 * typed or pasted. Each product's hours are its demand at the rate the line
 * can be planned on — its Line capacity's speed (the bottleneck's) times the
 * share of that speed the counted shifts proved four times in five
 * (plannable ÷ theoretical); unproved, its speed as worked out, said so. The
 * hours there are come from the line's running pattern (its SMED's shifts ×
 * days) — never assumed. Pure. */

export interface DemandRow { product: string; demand: number; perMin?: number; hours?: number; why?: string }
export interface LoadVsDemand {
  rows: DemandRow[];
  neededH: number;
  availableH?: number;
  /** Positive: hours spare; negative: hours over. */
  headroomH?: number;
  /** The headroom as packs at the average planned rate. */
  headroomPacks?: number;
  /** The overflow's contribution at risk, when the line's margin is known. */
  atRisk?: number;
  says: string;
}

export function loadVsDemand(rows: readonly { product: string; demand?: number; ratePerMin?: number }[], efficiency: number | undefined, minutesPerWeek: number | undefined, marginPerPack?: number, unit = 'packs'): LoadVsDemand {
  const eff = efficiency != null && efficiency > 0 ? Math.min(1, efficiency) : undefined;
  const out: DemandRow[] = rows.filter(r => (r.demand ?? 0) > 0).map(r => {
    const perMin = r.ratePerMin && r.ratePerMin > 0 ? r.ratePerMin * (eff ?? 1) : undefined;
    return { product: r.product, demand: r.demand as number, ...(perMin ? { perMin, hours: (r.demand as number) / perMin / 60 } : { why: 'no speed worked out in its Line capacity' }) };
  });
  const fmt = (n: number, d = 1) => n.toLocaleString('en-GB', { maximumFractionDigits: d });
  const neededH = out.reduce((n, r) => n + (r.hours ?? 0), 0);
  const availableH = minutesPerWeek && minutesPerWeek > 0 ? minutesPerWeek / 60 : undefined;
  const totalDemand = out.filter(r => r.hours).reduce((n, r) => n + r.demand, 0);
  const avgPerH = neededH > 0 ? totalDemand / neededH : undefined;
  const headroomH = availableH != null ? availableH - neededH : undefined;
  const headroomPacks = headroomH != null && avgPerH ? headroomH * avgPerH : undefined;
  const atRisk = headroomPacks != null && headroomPacks < 0 && marginPerPack ? -headroomPacks * marginPerPack : undefined;
  const missing = out.filter(r => !r.hours).map(r => r.product);
  const basis = eff != null ? `at ${Math.round(eff * 100)}% of each product’s speed — what four shifts in five proved` : 'at each product’s worked-out speed — no shifts counted to plan on yet';
  const says = !out.length ? 'Type or paste next week’s orders to see whether they fit.'
    : availableH == null ? `The orders need ${fmt(neededH)} h ${basis}. The hours the line has are not known — set how it runs (shifts and days) on its SMED.`
      : (headroomH as number) >= 0 ? `It fits: the orders need ${fmt(neededH)} h of the ${fmt(availableH)} h the line runs (${basis}) — ${fmt(headroomH as number)} h spare${headroomPacks ? `, about ${fmt(headroomPacks, 0)} more ${unit}` : ''}.`
        : `It does not fit: the orders need ${fmt(neededH)} h, the line runs ${fmt(availableH)} h (${basis}) — ${fmt(-(headroomH as number))} h over${headroomPacks ? `, about ${fmt(-headroomPacks, 0)} ${unit} short` : ''}${atRisk ? ` (£${fmt(atRisk, 0)} of contribution)` : ''}.`;
  return { rows: out, neededH, ...(availableH != null ? { availableH } : {}), ...(headroomH != null ? { headroomH } : {}), ...(headroomPacks != null ? { headroomPacks } : {}), ...(atRisk != null ? { atRisk } : {}),
    says: missing.length && out.length ? `${says} ${missing.join(', ')}: no speed worked out, left out.` : says };
}

/** "Maris Piper 2kg, 12000" lines pasted from a sheet, matched to the
 *  line's products by name (case and spaces aside). */
export function parseDemand(text: string, products: readonly string[]): { product: string; demand: number }[] {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const out: { product: string; demand: number }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const m = /^(.*?)[\t,;]\s*([\d,. ]+)\s*$/.exec(raw.trim());
    if (!m) continue;
    const name = products.find(p => norm(p) === norm(m[1]));
    const n = Number(m[2].replace(/[ ,]/g, ''));
    if (name && Number.isFinite(n) && n >= 0) out.push({ product: name, demand: n });
  }
  return out;
}
