/* @vitest-environment jsdom
 *
 * THE SHEET, DRAWN FOR REAL.
 *
 * The pagination tests check the arithmetic and the builder tests check the
 * words. This checks that the whole drawing path actually runs and produces a
 * PDF — the thing Rowland emails out. Every string on every page goes through
 * san(), so a change there can break all of it at once, and a geometry helper
 * that disagrees with the drawing shows up here as a page count rather than as a
 * silently short report.
 *
 * DRAWN FROM REAL RECORDS, NOT A FIXTURE. Two earlier versions of this test built
 * the report data by hand — once inside a browser evaluate, which nothing
 * typechecks, and once behind `as unknown as` — and both were simply the wrong
 * shape, so the test was exercising a report the app could never produce. Here the
 * items are CommissionItems and the data goes through buildCommissionReport, which
 * means a change to the model reaches this test the same way it reaches the app.
 */
import { describe, it, expect } from 'vitest';
import { jsPDF } from 'jspdf';
import { drawCommissionReport, commissionSheets } from '../commissionPdf';
import { panel } from '../reportKit';
import { buildCommissionReport } from '../buildCommissionReport';
import type { Asset, CommissionItem, Material, Pack, Program, Punch, Run, Task, Check } from '../commissioning';

const AT = Date.parse('2026-09-14T08:00:00Z');
const NOW = Date.parse('2026-09-19T09:00:00Z');

let n = 0;
const base = (asset?: string) => {
  n += 1;
  return { id: `i${n}`, projectId: 'p1', title: `Item ${n}`, assetId: asset, sort: n, createdAt: 1, updatedAt: 1 };
};

/** The machine records behind whatever the items name. Assets used to be a
 *  string on each row; they are rows of their own now, so the fixture has to
 *  make them — and it makes them FROM the items, so a test can never describe a
 *  machine the report cannot see. */
const assetsFor = (items: CommissionItem[]): Asset[] =>
  [...new Set(items.map(i => i.assetId).filter((a): a is string => !!a))]
    .map((id, k): Asset => ({ id, projectId: 'p1', name: id, state: 'running', sort: (k + 1) * 10, updatedAt: 1 }));
const run = (achieved: number, extra: Partial<Run> = {}): Run => ({ id: `r${n}`, at: AT, achieved, ...extra });
const program = (p: Partial<Program> & { asset?: string } = {}): Program =>
  ({ ...base(p.asset), kind: 'program', agreedRate: 60, written: true, ...p });
const material = (m: Partial<Material> & { asset?: string } = {}): Material =>
  ({ ...base(m.asset), kind: 'material', need: 10, have: 4, onOrder: 6, ...m });
const check = (c: Partial<Check> & { asset?: string } = {}): Check =>
  ({ ...base(c.asset), kind: 'check', criterion: 'no metal above 2.0mm passes', outcome: 'notRun', ...c });
const punch = (p: Partial<Punch> & { asset?: string } = {}): Punch =>
  ({ ...base(p.asset), kind: 'punch', severity: 'B', raisedAt: AT, ...p });
const task = (t: Partial<Task> & { asset?: string } = {}): Task =>
  ({ ...base(t.asset), kind: 'task', state: 'todo', ...t });

/** A machine with one of everything on it — the ordinary case. */
const machine = (asset: string, each = 1): CommissionItem[] =>
  Array.from({ length: each }).flatMap((_, i) => [
    program({ asset, title: `${asset} format ${i + 1}`, runs: i % 2 ? [run(51, { by: 'A. Shaw' })] : [] }),
    material({ asset, title: `${asset} film ${i + 1}`, unit: 'rolls' }),
    check({ asset, title: `${asset} SAT ${i + 1}`, outcome: i % 3 === 0 ? 'fail' : 'pass', result: 'measured', witnessedBy: 'QA', at: AT }),
    punch({ asset, title: `${asset} defect ${i + 1}`, severity: i % 4 === 0 ? 'A' : 'C' }),
    task({ asset, title: `${asset} obligation ${i + 1}` }),
  ]);

interface Job { plannedAt?: string; expectedAt?: string; packs?: Pack[] }

const report = (items: CommissionItem[], job: Job = {}) =>
  buildCommissionReport({
    title: 'Line 2 — Brillopack upgrade', lead: 'Rowland Glew',
    items, assets: assetsFor(items), now: NOW, ...job,
  });

/** The band's inputs: the two dates the job is judged on, eight days apart. */
const dated = (): Job => ({ plannedAt: '2026-09-19', expectedAt: '2026-09-27' });

/** A film changeover with a rate proved on the spec that is going away. Two rows
 *  and a pointer; the sheet has to work out the rest. */
const filmRows = (asset: string): CommissionItem[] => {
  const oldFilm: Material = { ...base(asset), kind: 'material', title: 'Film', spec: '40u', need: 40, have: 40, unit: 'rolls' };
  const newFilm: Material = { ...base(asset), kind: 'material', title: 'Film', spec: '35u modified', need: 40, have: 10, onOrder: 30, unit: 'rolls', supersedes: oldFilm.id };
  const rate: Program = { ...base(asset), kind: 'program', title: '400g', agreedRate: 60, written: true, runs: [{ id: 'r-old', at: AT, achieved: 66, provenOn: oldFilm.id }] };
  return [oldFilm, newFilm, rate];
};

const render = (items: CommissionItem[], job: Job = {}) => {
  const d = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
  drawCommissionReport(d, report(items, job));
  const buf = d.output('arraybuffer');
  return {
    pages: d.getNumberOfPages(),
    bytes: buf.byteLength,
    head: new TextDecoder().decode(new Uint8Array(buf).slice(0, 5)),
  };
};

describe('the handover sheet renders', () => {
  it('produces a real PDF for an ordinary job, on one sheet', () => {
    const { pages, bytes, head } = render([...machine('Brillopack bagger'), ...machine('Ishida multihead')]);
    expect(head).toBe('%PDF-');
    expect(pages).toBe(1);
    expect(bytes).toBeGreaterThan(2000);
  });

  it('spills onto a second sheet rather than shrinking the verdict', () => {
    // A long blocker list grows the panel, which leaves page 1 less room for the
    // detail — and that is the right trade. The verdict is why the sheet exists;
    // the evidence for it can run to a second page and often should.
    const busy = render([...machine('Brillopack bagger', 3), ...machine('Ishida multihead', 2)]);
    expect(busy.pages).toBeGreaterThan(1);
    expect(busy.head).toBe('%PDF-');
  });

  it('draws a job that is ready as well as one that is not', () => {
    // The verdict band branches on canSignOff, so the green path has to be drawn
    // at least once in anger — it is the one page nobody ever tests by hand,
    // because getting a real project to green takes months.
    const ready = render([program({ runs: [run(61)] }), check({ outcome: 'pass', witnessedBy: 'QA', at: AT })]);
    expect(ready.head).toBe('%PDF-');
    expect(report([program({ runs: [run(61)] }), check({ outcome: 'pass' })]).canSignOff).toBe(true);
  });

  it('runs with nothing recorded rather than throwing', () => {
    // A handover on its first day has nothing in it, and the sheet is the thing
    // you send to say so.
    const { pages, head } = render([]);
    expect(head).toBe('%PDF-');
    expect(pages).toBe(1);
  });

  it('grows to more pages as the job grows, rather than silently truncating', () => {
    const small = render([...machine('Bagger'), ...machine('Palletiser')]).pages;
    const big = render(
      ['Bagger', 'Palletiser', 'Multihead', 'Checkweigher', 'Metal detector', 'Case packer', 'Labeller']
        .flatMap(a => machine(a, 3)),
    ).pages;
    expect(big).toBeGreaterThan(small);
  });

  it('draws the second panel two-up once the line has more machines than fit', () => {
    // Seven machines in one column made the panels 250pt tall, which pushed the
    // detail onto a sheet that was then nine tenths white paper.
    const many = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].flatMap(a => machine(a));
    expect(report(many).assets).toHaveLength(7);
    expect(render(many).head).toBe('%PDF-');
  });

  it('every row is allotted a sheet, however lopsided the job', () => {
    // A single oversized machine used to be handed whole to one sheet, which drew
    // what fitted and dropped the rest without a word.
    const rows = report(machine('Bagger', 12)).rows;
    const total = commissionSheets(rows, 200, 300).reduce((k, s) => k + s.length, 0);
    expect(total).toBe(rows.length);
  });

  it('puts the pictures on their own sheet, and only when there are some', () => {
    const p = program({ title: 'With a photo', runs: [run(61)] });
    const data = buildCommissionReport({
      title: 'Line 2', items: [p], now: NOW,
      // A 1x1 JPEG: enough for addImage to accept, small enough to inline.
      shots: new Map([[p.id, [{
        data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDs0NDP/wAALCAABAAEBAREA/8QAFAABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJgA/9k=',
        w: 1, h: 1, caption: 'the crease in the film',
      }]]]),
    });
    const d = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
    drawCommissionReport(d, data);
    expect(d.getNumberOfPages()).toBe(2);
    // …and without pictures there is no picture sheet.
    expect(render([p]).pages).toBe(1);
  });

  it('survives text no PDF font can render', () => {
    // Straight out of an Excel cell: arrows, emoji, a NUL, and a multi-line log.
    const items = [
      program({ title: '44 → 49 ppm ✓', runs: [run(49, { note: 'ok' })] }),
      check({ title: 'rate 😀 ok', outcome: 'fail', result: '12/08 chased OEM\n19/08 parts fitted' }),
      punch({ title: 'NUL\u0000inside', severity: 'A' }),
      material({ title: 'Film 320mm — 12µm', unit: 'rolls' }),
    ];
    const { pages, head } = render(items);
    expect(head).toBe('%PDF-');
    expect(pages).toBeGreaterThanOrEqual(1);
  });
});

describe('a panel heading never prints on top of its own subtitle', () => {
  /** Every string the panel draws, with the width it measured to AT THE MOMENT
   *  it was drawn — the font is whatever the drawing had set, which is the only
   *  way to measure it honestly. */
  const headingsOf = (w: number, title: string, sowhat: string) => {
    const d = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
    const drawn: { text: string; x: number; width: number; right: boolean }[] = [];
    const real = d.text.bind(d);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (d as any).text = (txt: any, x: number, y: number, opts?: any) => {
      if (typeof txt === 'string') drawn.push({ text: txt, x, width: d.getTextWidth(txt), right: opts?.align === 'right' });
      return real(txt, x, y, opts);
    };
    panel(d, 26, 26, w, 200, '1', title, sowhat);
    return drawn;
  };

  it('keeps them apart at a width where they used to collide', () => {
    // THE BUG, at the width panel 1 of the handover sheet happens to be: the
    // title ran straight through the right-aligned line beside it and the two
    // printed on top of one another. Nothing truncated and no string was wrong —
    // the page was simply unreadable.
    const drawn = headingsOf(390, 'The line, machine by machine',
      'each accepted in its own right — the line is signed off when all of them are');
    const title = drawn.find(t => t.text.startsWith('The line'))!;
    const sub = drawn.find(t => t.right);
    if (sub) {
      const titleEnds = title.x + title.width;
      const subStarts = sub.x - sub.width;
      expect(subStarts, 'the subtitle starts before the title has finished').toBeGreaterThan(titleEnds);
    }
    // Dropping the subtitle entirely is the acceptable outcome; drawing it over
    // the title is not.
    expect(title.width).toBeLessThanOrEqual(390 - 36 - 14);
  });

  it('still draws both when there is room, at every width the sheet uses', () => {
    for (const width of [390, 700, 1000]) {
      const drawn = headingsOf(width, 'Machine by machine', 'each accepted in its own right');
      const title = drawn.find(t => t.text.startsWith('Machine'))!;
      const sub = drawn.find(t => t.right)!;
      expect(sub, `no subtitle at ${width}pt`).toBeTruthy();
      expect(sub.x - sub.width).toBeGreaterThan(title.x + title.width);
    }
  });

  it('truncates a title too long for the panel instead of running off the edge', () => {
    const drawn = headingsOf(200, 'A heading far longer than two hundred points could ever hold', 'so what');
    const title = drawn.find(t => t.text.includes('heading'))!;
    expect(title.text.endsWith('…')).toBe(true);
    expect(title.x + title.width).toBeLessThanOrEqual(26 + 200 - 14 + 0.5);
  });
});

describe('the programme band', () => {
  it('draws the stages across the top when there is a programme', () => {
    const { head, bytes } = render([...machine('Bagger')], dated());
    expect(head).toBe('%PDF-');
    // The band costs real ink: the same job without dates draws less.
    expect(bytes).toBeGreaterThan(render([...machine('Bagger')]).bytes);
  });

  it('puts the slip on the band, and calls a big one bad rather than amber', () => {
    const data = report([...machine('Bagger')], dated());
    expect(data.band.map(c => c.label)).toEqual(['Planned', 'Now expecting']);
    expect(data.band[1].value).toBe('27 Sept');
    expect(data.band[1].note).toBe('8 days later');
    expect(data.band[1].state).toBe('bad');
  });

  it('puts the changeover on the band, with the results it costs us', () => {
    /* The single most important thing this sheet can say, and the thing four
       earlier versions could not say at all: the number in the detail was got on
       something that is being taken away. */
    const data = report(filmRows('Bagger'), dated());
    const film = data.band.find(c => c.label.includes('35u'));
    expect(film, 'the changeover has to reach the band').toBeDefined();
    expect(film?.label).toBe('40u \u2192 35u modified');
    expect(film?.value).toBe('10 of 40 rolls here');
    expect(film?.note).toBe('1 result stops counting');
    expect(film?.state).toBe('bad');
    expect(data.stale).toBe(1);
  });

  it('marks the row itself as needing re-proving, not as proven', () => {
    const data = report(filmRows('Bagger'));
    const row = data.rows.find(r => r.title.startsWith('400g'))!;
    expect(row.stateLabel).toBe('Re-prove');
    expect(row.evidence).toContain('withdrawn, not proof');
  });

  it('still draws a sheet for a job with no dates and no changeover', () => {
    // Every commissioning file written before either existed is in this state.
    const data = report([...machine('Bagger')]);
    expect(data.band).toEqual([]);
    expect(render([...machine('Bagger')]).head).toBe('%PDF-');
  });

  it('keeps the page count honest once the band is on the sheet', () => {
    // The band eats into what page 1 has left for the detail. If the geometry
    // the counter uses and the geometry the drawing uses ever disagree, the
    // footer stamps "page 2 of 3" on a four-page report.
    const busy = [...machine('Bagger', 3), ...machine('Multihead', 2)];
    expect(render(busy, dated()).pages).toBeGreaterThanOrEqual(render(busy).pages);
  });
});
