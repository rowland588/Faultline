/* THE PROJECT REPORT — viewed here, printed from Print (docs/METHODS.md §17; Rowland, 1 November: "let me view what everything is
 * telling me right now; then a beautiful dynamic report appropriately presenting everything"). Drawn from the same model the
 * paper is poured from (lib/methodReportModel): the band with the teal edge, the tiles, then the journey, what everything is
 * telling us, what needs attention, the method's own sections, what we wrote, and the closing line. Live — it re-reads as the
 * project's data moves. A client may open it; it writes nothing. */
import { nav } from '../../state/useRoute';
import { PageHeader } from '../../ui/parts';
import { LeanBand, LeanClosing, LeanTiles } from '../../ui/Lean';
import { useSaveOnArrival } from '../../lib/useSaveOnArrival';
import { leanPageOf, type ReportItem, type ReportTone } from '../../lib/methodReportModel';
import { saveMethodReportPdf } from '../../lib/report/methodReport';
import { PAPERS } from './papers';
import { loadMethodReport, useMethodReport } from './reportData';
import './methodReport.css';

const WORD: Record<string, string> = { r: 'Needs attention', a: 'Watch', g: 'Fine', w: 'Under way', n: '' };

/** Make the project's report on paper — the page's Print, the method page's Report ▾ and the Reports sheet all come here. */
export async function printMethodReport(projectId: string): Promise<void> {
  const l = await loadMethodReport(projectId);
  if (!l) return;
  await saveMethodReportPdf({ project: l.projectName, methodName: l.method.name, report: l.report, data: l.paper, todayISO: l.today });
}

function Item({ it }: { it: ReportItem }) {
  switch (it.kind) {
    case 'paragraph': return <p className={'mrep-p' + (it.tone ? ' is-' + it.tone : '')}>{it.text}</p>;
    case 'facts': return <dl className="mrep-facts">{it.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
    case 'bullets': return <ul className="mrep-bullets">{it.items.map(b => <li key={b.text} className={b.tone ? 'is-' + b.tone : undefined}>{b.text}</li>)}</ul>;
    case 'table': return (
      <div className="mrep-tablewrap"><table className="mrep-table">
        <thead><tr>{it.head.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{it.rows.map((r, i) => <tr key={i} className={it.tones?.[i] ? 'is-' + it.tones[i] : undefined}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody>
      </table></div>
    );
    case 'callout': return <div className={'mrep-call is-' + it.tone}><b className="mrep-word">{it.word}</b><span>{it.text}</span></div>;
    case 'money': return <div className={'mrep-call mrep-money' + (it.missing ? ' is-missing' : '')}><b className="mrep-word">{it.missing ? 'Money not said' : 'Money'} · {it.tool} ({it.title})</b><span>{it.text}</span></div>;
    case 'bars': return (
      <div className="mrep-bars" role="group" aria-label={it.title}>
        <p className="mrep-bars-h">{it.title}</p>
        {it.bars.map(b => (
          <div key={b.label} className={'mrep-bar' + (b.here ? ' is-here' : '')}>
            <span className="mrep-bar-l">{b.label}</span>
            <span className="mrep-bar-t" aria-hidden><i className={b.v >= 1 ? 'is-full' : undefined} style={{ width: `${Math.round(Math.min(1, b.v) * 100)}%` }} /></span>
            <span className="mrep-bar-x">{b.text}</span>
          </div>
        ))}
      </div>
    );
    case 'tool': return (
      <article className={'mrep-tool is-' + it.tone}>
        <p className="mrep-tool-where">{it.section} · {it.tool} · {it.title}{it.more ? ` · and ${it.more} more of this tool` : ''}</p>
        <p className="mrep-tool-says">{it.says}</p>
        <p className="mrep-tool-meta">{WORD[it.tone] ? <b className="mrep-word">{WORD[it.tone]}</b> : null} <button type="button" className="linkish" onClick={() => nav(it.href)}>Open {it.title}</button></p>
      </article>
    );
    case 'qa': return (
      <div className="mrep-qa">
        <h3 className="mrep-qa-h">{it.title}</h3>
        <dl>{it.rows.map(r => <div key={r.q} className={r.written ? undefined : 'is-none'}><dt>{r.q}</dt><dd>{r.a}</dd></div>)}</dl>
      </div>
    );
  }
}

export function MethodReportScreen({ projectId }: { projectId: string }) {
  const got = useMethodReport(projectId);
  useSaveOnArrival(!!got, () => printMethodReport(projectId));
  if (got === undefined) return <p className="sub wrap">Reading the project…</p>;
  if (!got) return <p className="sub wrap">That project is not on this device, or it does not run a method.</p>;
  const { report: r, method } = got;
  const tone: ReportTone = r.cover.verdict.tone;
  return (
    <div className="wrap mrep">
      <PageHeader
        eyebrow={`${method.name.toUpperCase()} · ${got.projectName.toUpperCase()}`}
        title="Project report"
        says="Everything the project is telling us now — the journey, each tool’s result in its own words, the money, what needs attention, what the team wrote."
        back={{ label: 'Project', to: `/project/${projectId}` }}
        primary={{ label: 'Print', run: () => void printMethodReport(projectId) }}
        papers={[
          { label: 'Project report', for: 'This page, on paper — with each tool’s own figures.', make: () => printMethodReport(projectId) },
          ...(PAPERS[method.key] ?? []).map(p => ({ label: p.label, ...(p.for ? { for: p.for } : {}), make: () => p.make(projectId) })),
        ]}
      />
      <div className={'mrep-top is-' + tone}>
        <LeanBand page={leanPageOf(r)}>
          <p className="mrep-printed sub">Printed {r.cover.printed}</p>
        </LeanBand>
        <LeanTiles tiles={r.cover.tiles} />
      </div>
      {r.sections.map(s => (
        <section key={s.id} className="mrep-sec" aria-label={s.title}>
          <h2 className="mrep-h">{s.title}</h2>
          {s.lead && <p className="mrep-lead sub">{s.lead}</p>}
          {s.items.map((it, i) => <Item key={i} it={it} />)}
        </section>
      ))}
      <LeanClosing closing={r.closing} />
    </div>
  );
}
