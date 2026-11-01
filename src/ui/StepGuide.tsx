/* WHAT EACH STEP MEANS, SHOWN (Rowland, 1 November 2026: "all tools must have user guidance .. what's each step means").
 *
 * The guide's words are written once (src/catalogue/guide.ts for a tool, src/lib/methodGuide.ts for a method's sections) and
 * drawn here, so a tool's page, the frame's "How it works" and a method's section never word the same thing twice.
 *   <GuideSteps guide />   a tool's steps in order: what it means · what to do · what you get
 *   <StepMeans … />        one step (a method's section) the same three ways
 *   <GuideFold … />        the folded form, for a page that already has plenty on it */
import type { ReactNode } from 'react';
import type { Guide, GuideStep } from '../catalogue/guide';

type Three = Pick<GuideStep, 'means' | 'doThis' | 'youGet'>;

/** One step: the three things a first-time user wants to know, each under its own small label. */
export function StepMeans({ means, doThis, youGet }: Three) {
  return (
    <dl className="sg-three">
      <div><dt>What it means</dt><dd>{means}</dd></div>
      <div><dt>What to do</dt><dd>{doThis}</dd></div>
      <div><dt>What you get</dt><dd>{youGet}</dd></div>
    </dl>
  );
}

/** A tool's guide: who it is for, then its steps numbered in the order a person meets them, and the one thing people get wrong. */
export function GuideSteps({ guide, label }: { guide: Guide; label?: string }) {
  return (
    <div className="sg" role="group" aria-label={label ?? 'How it works, step by step'}>
      {guide.intro && <p className="sg-intro">{guide.intro}</p>}
      <ol className="sg-steps">
        {guide.steps.map(s => (
          <li key={s.step} className="sg-step">
            <h3 className="sg-name">{s.step}</h3>
            <StepMeans means={s.means} doThis={s.doThis} youGet={s.youGet} />
          </li>
        ))}
      </ol>
      {guide.watch && <p className="sg-watch"><b>Watch for this.</b> {guide.watch}</p>}
    </div>
  );
}

/** The folded form: a line to open, the guide inside. */
export function GuideFold({ summary, open, children }: { summary: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="sg-fold" {...(open ? { open: true } : {})}>
      <summary>{summary}</summary>
      {children}
    </details>
  );
}
