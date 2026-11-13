/* THE FACTORY OVERVIEW (13 November, docs/OVERVIEW.md — Rowland: "a collective view that I can present to a customer … a living picture
 * that develops as I carry out further work, retaining the original baseline … I do not want to enter information twice").
 * One page of the Factory, the first tab: the customer's factory as the records say it today — what is costing the most, what holds each
 * line, where we have looked, what Faultline found, what needs attention, what has improved, and how it stands against the baseline (the
 * Story's first approved chapter). NOTHING IS TYPED HERE and nothing is kept: lib/overview reads what the tools, the register, the
 * findings engine and the Story already hold, and every row is a door to the record it came from. PRESENT draws it full screen for the
 * room; Report ▾ › Factory overview is the same model on paper (lib/report/overviewPaper). */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAllStandards, listAllStudies, listWorkspaces, onDataChange } from '../db';
import type { Workspace } from '../types';
import type { ToolStudy } from '../lib/study';
import type { Standard } from '../tools/linestandard/standard';
import { useProjects } from '../lib/useProjects';
import { productionLines } from '../lib/lines';
import { clientShown, storyOfClient } from '../lib/storyPick';
import { useClientScope, type Placed } from '../lib/activeClient';
import { useFactoryRead } from '../lib/useFactoryRead';
import { linesOfClient } from '../lib/clientStory';
import { isHolding, visitsOf } from '../lib/visits';
import { neckOf } from '../lib/lineLoss';
import { lineBrain } from '../lib/brain/homework';
import { outcomesOn } from '../lib/knowledge/fixes';
import type { Finding } from '../lib/brain/engine';
import type { Outcome } from '../lib/knowledge/outcomes';
import { overviewOf, type Overview } from '../lib/overview';
import { PageHeader } from '../ui/parts';
import { LeanTiles } from '../ui/Lean';
import { Fold } from '../ui/Fold';
import { useSaveOnArrival } from '../lib/useSaveOnArrival';
import { fmtGBP } from '../lib/cost';
import { nav } from '../state/useRoute';

const PRI = { critical: 'Critical', high: 'High', low: 'Low' } as const;
const dayWord = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function OverviewScreen({ present = false }: { present?: boolean } = {}) {
  const { projects } = useProjects();
  const [all, setAll] = useState<Workspace[] | null>(null);
  const [studies, setStudies] = useState<ToolStudy[] | null>(null);
  const [standards, setStandards] = useState<Standard[]>([]);
  const load = useCallback(async () => { const [ws, st, std] = await Promise.all([listWorkspaces(), listAllStudies(), listAllStandards()]); setAll(ws); setStudies(st.filter(s => !s.deletedAt)); setStandards(std); }, []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const prodLines = useMemo(() => productionLines(all ?? []), [all]);
  const cs = useClientScope();
  const client = clientShown(prodLines, cs.ready ? cs.clients : undefined);
  const lines = useMemo(() => linesOfClient(prodLines, client).filter(l => !isHolding(l)), [prodLines, client]);
  const ofClient = useMemo(() => projects.filter(p => cs.projectOf(p.id, client)), [projects, cs, client]);
  const keep = useCallback((r: Placed) => cs.recordOf(r, client), [cs, client]);
  const read = useFactoryRead(ofClient, lines, keep);

  /* what the findings engine keeps on each line, and whether each closed fix held — read, never written from here */
  const [deep, setDeep] = useState<{ findings: Finding[]; outcomes: Outcome[] }>({ findings: [], outcomes: [] });
  const lineKey = lines.map(l => l.id).join('|');
  useEffect(() => {
    let on = true;
    void (async () => {
      const now = Date.now();
      const brains = await Promise.all(lines.map(l => lineBrain(l, now).catch(() => null)));
      const outs = await Promise.all(lines.map(l => outcomesOn(l, now, { write: false }).catch(() => [] as Outcome[])));
      if (on) setDeep({ findings: brains.flatMap(b => b?.findings ?? []), outcomes: outs.flat() });
    })();
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the lines by their ids; the records under them by the read
  }, [lineKey, read]);

  const story = useMemo(() => storyOfClient(studies ?? [], client), [studies, client]);
  const baseline = useMemo(() => (story?.facts.chapters ?? []).filter(c => c.approvedAt).sort((a, b) => a.at - b.at)[0]?.snapshot, [story]);
  const ov: Overview | null = useMemo(() => {
    if (!read) return null;
    const necks = new Map<string, readonly string[]>();
    for (const l of lines) { const n = neckOf(standards, l.id); if (n) necks.set(l.id, n.names); }
    return overviewOf({ client, now: Date.now(), today: read.today, lines, wrong: read.wrong, actions: read.actions, proved: read.proved, studies: read.studies, snags: read.snags,
      necks, findings: deep.findings, outcomes: deep.outcomes, visits: visitsOf(studies ?? [], client), ...(baseline ? { baseline } : {}) });
  }, [read, lines, standards, client, deep, studies, baseline]);

  const paper = async () => {
    if (!ov) return;
    const { makeOverviewPaper } = await import('../lib/report/overviewPaper');
    const { deliverPdf } = await import('../lib/savePdf');
    const printed = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    await deliverPdf(await makeOverviewPaper(ov, printed), `Factory overview — ${client || 'the factory'} — ${printed.replace(/ /g, '-')}.pdf`);
  };
  useSaveOnArrival(!!ov, paper);
  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') nav('/overview'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [present]);

  if (all === null || studies === null || !ov) return <div className="wrap ov"><p className="sub">Reading the factory…</p></div>;
  const lineHref = (id: string) => `#/lines/${id}`;

  const body = (
    <>
      <section className="ov-sec" aria-label="What is costing the most" data-ov="losses">
        <h2 className="ln-h">What is costing the most</h2>
        {!ov.losses.length ? <p className="sub">No problem is open.</p> : (
          <ul className="ov-rows">
            {ov.losses.map(l => (
              <li key={l.id}>
                <a className="ov-row" href={`#/snags?open=${l.id}`} data-ov-loss>
                  <span className="ov-what">{l.what}</span>
                  <span className="ov-where">{l.line}{l.machine ? ` · ${l.machine}` : ''}{l.owner ? ` · ${l.owner}` : ' · nobody yet'}</span>
                  <span className="ov-tags">
                    <span className="ov-pri" data-pri={l.priority}>{PRI[l.priority]}</span>
                    {l.late && <span className="ov-late">Late</span>}
                    <b className="ov-money" data-none={l.poundsDay == null ? '' : undefined}>{l.poundsDay != null ? `${fmtGBP(l.poundsDay)} a day` : 'not priced yet'}</b>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
        {ov.unpriced > 0 && <p className="sub">{ov.unpriced} of the open problems {ov.unpriced === 1 ? 'has' : 'have'} no cost a day — the minutes it takes, or the line’s rate, is not said yet.</p>}
      </section>

      <section className="ov-sec" aria-label="What holds each line" data-ov="constraints">
        <h2 className="ln-h">What holds each line</h2>
        {!ov.constraints.length ? <p className="sub">No line is set up yet.</p> : (
          <ul className="ov-rows">
            {ov.constraints.map(c => (
              <li key={c.lineId}>
                <a className="ov-row" href={lineHref(c.lineId)} data-ov-neck>
                  <span className="ov-what">{c.line}</span>
                  <span className="ov-where" data-none={c.neck ? undefined : ''}>{c.neck ? `Held by ${c.neck.join(' and ')}` : 'The bottleneck is not worked out yet — Line capacity works it out'}</span>
                  <span className="ov-tags">{c.open ? `${c.open} open` : 'nothing open'}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ov-sec" aria-label="What needs attention" data-ov="risks">
        <h2 className="ln-h">What needs attention</h2>
        {!ov.risks.length ? <p className="sub">Nothing stands out.</p> : (
          <ul className="ov-list">{ov.risks.map((r, k) => <li key={k} className="ov-risk" data-tone={r.tone}>{r.says}</li>)}</ul>
        )}
      </section>

      <section className="ov-sec" aria-label="What has improved" data-ov="improved">
        <h2 className="ln-h">What has improved</h2>
        <p className="ov-says">{ov.improved.says}</p>
        {ov.improved.proved.length > 0 && (
          <ul className="ov-rows">
            {ov.improved.proved.map(p => (
              <li key={p.id}>
                <a className="ov-row" href={lineHref(p.lineId)} data-ov-proved>
                  <span className="ov-what">{p.what}</span>
                  <span className="ov-where">{p.lineName}{p.machine ? ` · ${p.machine}` : ''}</span>
                  <span className="ov-tags"><b className="ov-proof">{p.proof}</b></span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ov-sec" aria-label="Since the baseline" data-ov="progress">
        <h2 className="ln-h">Since the baseline{ov.progress.since ? <span className="sub"> · {dayWord(ov.progress.since)}</span> : null}</h2>
        <p className="ov-says">{ov.progress.says}</p>
        {ov.progress.rows.length > 0 && (
          <table className="ov-table">
            <thead><tr><th scope="col">&nbsp;</th><th scope="col">Then</th><th scope="col">Now</th><th scope="col">&nbsp;</th></tr></thead>
            <tbody>{ov.progress.rows.map(r => (
              <tr key={r.k} data-ov-moved><th scope="row">{r.k}</th><td>{r.before}</td><td><b>{r.now}</b></td><td className="ov-better" data-better={r.better === undefined ? undefined : String(r.better)}>{r.better === true ? 'Better' : r.better === false ? 'Worse' : ''}</td></tr>
            ))}</tbody>
          </table>
        )}
        {!ov.progress.since && !present && <p><a className="btn btn-ghost" href="#/story">Open the Story ›</a></p>}
      </section>
    </>
  );

  const coverage = (
    <>
      <p className="ov-says">{ov.coverage.says}</p>
      {ov.coverage.areas.map(a => (
        <div key={a.title} className="ov-area">
          <h3 className="ov-area-h">{a.title}</h3>
          <ul className="ov-rows">
            {a.lines.map(l => (
              <li key={l.lineId}>
                <a className="ov-row" href={lineHref(l.lineId)} data-ov-cover>
                  <span className="ov-what">{l.line}</span>
                  <span className="ov-where" data-none={l.studies + l.problems ? undefined : ''}>{l.studies + l.problems
                    ? `${l.studies} tool record${l.studies === 1 ? '' : 's'} · ${l.problems} problem${l.problems === 1 ? '' : 's'}${l.machines ? ` · ${l.machinesLooked} of ${l.machines} machines` : ''}`
                    : 'Not looked at yet'}</span>
                  <span className="ov-tags">{l.last ? `last ${dayWord(l.last)}` : ''}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
  const found = (
    <ul className="ov-list">{ov.findings.map((f, k) => <li key={k} data-ov-finding><b>{f.line}:</b> {f.says}{f.money ? ` ${f.money}` : ''} <span className="sub">· {f.sure}</span></li>)}</ul>
  );

  if (present) {
    return (
      <div className="st-present ov-present" data-overview-present>
        <button type="button" className="btn btn-ghost st-present-exit" onClick={() => nav('/overview')} aria-label="Exit the presentation (Escape)">× Exit</button>
        <header className="st-present-head">
          <p className="st-present-client">{client || 'The factory'}</p>
          <p className="st-present-brief">{ov.says}</p>
        </header>
        <div className="st-present-figs" role="list" aria-label="The four figures">
          {ov.tiles.map(t => (
            <div key={t.k} className="st-present-fig" role="listitem" data-tone={t.tone ?? 'n'}>
              <span className="st-present-k">{t.k}</span>
              <b className="st-present-v">{t.v}</b>
              {t.of && <span className="st-present-of">{t.of}</span>}
            </div>
          ))}
        </div>
        <div className="ov ov-big">
          {body}
          <section className="ov-sec" aria-label="Where we have looked"><h2 className="ln-h">Where we have looked</h2>{coverage}</section>
          {ov.findings.length > 0 && <section className="ov-sec" aria-label="What Faultline found"><h2 className="ln-h">What Faultline found</h2>{found}</section>}
        </div>
      </div>
    );
  }

  return (
    <div className="wrap ov" data-overview>
      <PageHeader eyebrow="FACTORY OVERVIEW" title={client || 'The factory'} says={ov.says}
        primary={{ label: 'Present', run: () => nav('/overview?present=1') }}
        papers={[{ label: 'Factory overview', for: 'for the customer: what is costing the most, what holds each line, where we have looked, what has improved and how it stands against the baseline', make: paper }]}
        more={[{ label: 'The Story', hint: 'the updates approved — the first is the baseline', run: () => nav('/story') }, { label: 'Lines and set up', run: () => nav('/room') }]} />
      <LeanTiles tiles={ov.tiles} />
      {body}
      <Fold id="ov-coverage" title="Where we have looked" says={ov.coverage.says} start={false}>{coverage}</Fold>
      {ov.findings.length > 0 && <Fold id="ov-findings" title="What Faultline found" says={`${ov.findings.length} finding${ov.findings.length === 1 ? '' : 's'} from the stops timed — the surest first`} start={false}>{found}</Fold>}
      <p className="sub ov-foot">Nothing on this page is typed here — every line is read from the records kept on {client || 'the factory'}’s lines, and moves as they do.</p>
    </div>
  );
}
