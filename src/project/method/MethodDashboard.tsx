/* WHERE THE PROJECT IS ON ITS METHOD, AND WHAT ITS TOOLS ARE SHOWING (docs/METHODS.md §17; lib/methodDashboard) — the top of a
 * method project's page. One sentence that sums it up; what each tool is showing, in its own words, in the section it serves;
 * what needs attention; what to do next; and the
 * project report — viewed here, printed from Report ▾ — made from the same model. Tools feed it by being used: nothing here is typed. */
import { flushSync } from 'react-dom';
import { nav } from '../../state/useRoute';
import { showFold } from '../../ui/Fold';
import type { Dashboard } from '../../lib/methodDashboard';
import { SHAPES } from './shapes';
import type { MethodKey } from '../../lib/methods';
import './methodDashboard.css';

const WORD: Record<string, string> = { r: 'Needs attention', a: 'Watch', g: 'Fine', w: 'Under way', n: '' };

export function MethodDashboard({ dash, methodKey }: { dash: Dashboard; methodKey: MethodKey }) {
  const here = dash.sections.find(s => s.here);
  function workOn(section: string) {
    if (SHAPES[methodKey]?.sectionBoxes === 'none') {
      // An explicit press also opens a worksheet the person previously folded.
      flushSync(() => showFold(`method-review-${methodKey}`));
      const match = `[data-work-section="${CSS.escape(section)}"]`;
      const block = document.querySelector(`${match}[data-in-hand]`) ?? document.querySelector(match);
      const fold = block?.querySelector<HTMLElement>('[data-fold]')?.dataset.fold;
      if (fold) showFold(fold);
      return;
    }
    showFold(`method-sec-${methodKey}-${section.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`);
  }

  const results = [
    ...dash.findings.map(f => (
      <li key={'study:' + f.id} className={'mdash-f is-' + f.tone}>
        <span className="mdash-where">{f.section} · {f.tool}</span>
        <span className="mdash-says">{f.says}</span>
        <span className="mdash-meta">{WORD[f.tone] && <b>{WORD[f.tone]} </b>}<button type="button" className="linkish" onClick={() => nav(f.href)}>Open {f.title}</button></span>
      </li>
    )),
    ...dash.standards.map(st => <li key={'standard:' + st.id} className="mdash-f"><span className="mdash-where">{st.section} · {st.tool}</span>
      <button type="button" className="linkish" onClick={() => nav(st.href)}>Open {st.title}</button></li>),
  ];
  return (
    <section className={'mdash is-' + dash.tone} aria-label="Where this project is">
      <p className="mdash-says" role="status"><b>{dash.closing || dash.says}</b></p>
      <div className="mdash-cols">
        <div className="mdash-col" aria-label="What the tools are showing">
          <h3 className="mdash-h">What the tools are showing</h3>
          {results.length === 0
            ? <p className="sub">No saved tool results yet.</p>
            : <><ul className="mdash-list">{results.slice(0, 3)}</ul>
              {results.length > 3 && <details><summary>{results.length - 3} more saved results</summary><ul className="mdash-list">{results.slice(3)}</ul></details>}</>}

        </div>
        <div className="mdash-col" aria-label="What needs attention">
          <h3 className="mdash-h">What needs attention</h3>
          {dash.attention.length === 0
            ? <p className="sub">Nothing is flagged.</p>
            : <ul className="mdash-list">{dash.attention.map(a => <li key={a.text} className={'mdash-a is-' + a.tone}>{a.text}</li>)}</ul>}
          <p className="mdash-next"><b>{dash.next}</b></p>
          {here && <button type="button" className="btn btn-primary mdash-work" onClick={() => workOn(here.name)}>Work on {here.name}</button>}
        </div>
      </div>

    </section>
  );
}
