/* WHERE THE PROJECT IS ON ITS METHOD, AND WHAT ITS TOOLS ARE SHOWING (docs/METHODS.md §17; lib/methodDashboard) — the top of a
 * method project's page. One sentence that sums it up; what each tool is showing, in its own words, in the section it serves;
 * what needs attention; what to do next; and the
 * project report — viewed here, printed from Report ▾ — made from the same model. Tools feed it by being used: nothing here is typed. */
import { nav } from '../../state/useRoute';
import { showFold } from '../../ui/Fold';
import type { Dashboard } from '../../lib/methodDashboard';
import './methodDashboard.css';

const WORD: Record<string, string> = { r: 'Needs attention', a: 'Watch', g: 'Fine', w: 'Under way', n: '' };

export function MethodDashboard({ dash, methodKey }: { dash: Dashboard; methodKey: string }) {
  const here = dash.sections.find(s => s.here);
  return (
    <section className={'mdash is-' + dash.tone} aria-label="Where this project is">
      <p className="mdash-says" role="status"><b>{dash.closing || dash.says}</b></p>
      <div className="mdash-cols">
        <div className="mdash-col" aria-label="What the tools are showing">
          <h3 className="mdash-h">What the tools are showing</h3>
          {dash.findings.length === 0
            ? <p className="sub">No tool has been used in this project yet. A tool falls in where a question needs a number — it is offered beside the question.</p>
            : <ul className="mdash-list">{dash.findings.map(f => (
              <li key={f.tool + f.title} className={'mdash-f is-' + f.tone}>
                <span className="mdash-where">{f.section} · {f.tool}</span>
                <span className="mdash-says">{f.says}</span>
                <span className="mdash-meta">{WORD[f.tone] ? <b>{WORD[f.tone]}</b> : null}{f.more ? ` · and ${f.more} more of this tool` : ''} <button type="button" className="linkish" onClick={() => nav(f.href)}>Open {f.title}</button></span>
              </li>
            ))}</ul>}
        </div>
        <div className="mdash-col" aria-label="What needs attention">
          <h3 className="mdash-h">What needs attention</h3>
          {dash.attention.length === 0
            ? <p className="sub">Nothing is flagged.</p>
            : <ul className="mdash-list">{dash.attention.map(a => <li key={a.text} className={'mdash-a is-' + a.tone}>{a.text}</li>)}</ul>}
          <p className="mdash-next"><b>{dash.next}</b></p>
          {here && <button type="button" className="btn btn-primary mdash-work" onClick={() => showFold(`method-sec-${methodKey}-${here.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`)}>Work on {here.name}</button>}
        </div>
      </div>

    </section>
  );
}
