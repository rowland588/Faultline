/* A METHOD'S OWN PAGE — #/methods/:key (docs/METHODS.md §15 — Rowland, 1 November 2026: "Projects .. just like tools I want
 * pictures so user can see .. whats each step means"). What a tool has at #/tools/:key, a method has here: its picture (the
 * real project page of the method), when to reach for it and when not, an example on a food line, then every step of it said
 * as what it means · what to do · what you get (src/lib/methodGuide), with the tools that fit each step and what is built.
 * Every word is the method's (src/lib/methods) or its guide's — nothing is typed here, so a method added to METHODS has its
 * page by being added. A project that runs the method is started from here, never a second way to start. */
import { PageHeader } from '../ui/parts';
import { MethodPicture } from '../ui/MethodPicture';
import { StepMeans } from '../ui/StepGuide';
import { METHODS, methodByKey } from '../lib/methods';
import { METHOD_GUIDE } from '../lib/methodGuide';
import { howTool, openable, toolStateWord } from '../project/method/methodTools';
import { nav } from '../state/useRoute';

export function MethodPageScreen({ methodKey }: { methodKey: string }) {
  const m = methodByKey(methodKey);
  if (!m) {
    return (
      <div className="wrap tp">
        <PageHeader title="Method not found" says="No method has that name." />
        <p><button type="button" className="btn btn-primary" onClick={() => nav('/projects?new=1')}>The eight methods ›</button></p>
      </div>
    );
  }
  const g = METHOD_GUIDE[m.key];
  return (
    <div className="wrap tp" data-method={m.key}>
      <PageHeader
        eyebrow="METHODS"
        title={m.name}
        says={m.question}
        primary={{ label: `Start a ${m.name} project`, run: () => nav(`/projects?new=1&method=${m.key}`) }}
        more={[{ label: 'All the methods', run: () => nav('/projects?new=1') }]}
      />

      <section className="tp-hero" aria-label="What it looks like">
        <MethodPicture method={m} big />
        <div className="tp-hero-side">
          <p className="tp-problem"><b>Reach for it when</b> {g.whenToUse}</p>
          <p className="tp-problem"><b>Not for</b> {g.notFor}</p>
          <p className="sub"><b>On a food line:</b> {g.example}</p>
        </div>
      </section>

      <section className="tp-sec" aria-label="The steps of the method">
        <h2 className="ln-h">The steps — what each one means <span className="sub">{m.sections.length}</span></h2>
        <ol className="sg-steps mp-steps">
          {m.sections.map((s, i) => {
            const sg = g.sections[i];
            return (
              <li key={s.name} className="sg-step">
                <h3 className="sg-name">{s.name}</h3>
                <p className="mp-what">{s.what}</p>
                {sg && <StepMeans means={sg.means} doThis={sg.doThis} youGet={sg.youGet} />}
                <ul className="mp-tools" aria-label={`Tools that fit ${s.name}`}>
                  {s.tools.map(id => {
                    const h = howTool(id);
                    if (h.how === 'unknown') return null;
                    const tool = openable(h);
                    return (
                      <li key={id}>
                        {tool
                          ? <button type="button" className="mp-tool" onClick={() => nav(`/tools/${tool.key}`)}>{h.entry.name}</button>
                          : <span className="mp-tool is-plain">{h.entry.name}</span>}
                        <span className="sub"> — {toolStateWord(h)}</span>
                      </li>
                    );
                  })}
                </ul>
                {s.note && <p className="sub">{s.note}</p>}
              </li>
            );
          })}
        </ol>
        <p className="sub">The tools fit into the method’s steps — add or leave out whichever you need; a step is lit by a tool used in it, never locked behind the one before.</p>
      </section>

      <section className="tp-sec" aria-label="Where it comes from">
        <h2 className="ln-h">Where it comes from</h2>
        <p>{m.source}</p>
      </section>

      <section className="tp-sec" aria-label="The other methods">
        <h2 className="ln-h">The other methods</h2>
        <p className="mp-others">
          {METHODS.filter(x => x.key !== m.key).map(x => (
            <button key={x.key} type="button" className="chip" onClick={() => nav(`/methods/${x.key}`)}>{x.name}</button>
          ))}
        </p>
      </section>
    </div>
  );
}
