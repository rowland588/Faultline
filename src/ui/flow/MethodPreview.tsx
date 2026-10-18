/* A METHOD, READ AT A GLANCE — what Faultline proposes, drawn as the method's
 * own page draws it (screens/MethodScreen), small enough to sit beside the
 * conversation that shapes it (screens/DesignScreen): what it is for, who
 * does what, what it measures, then every stage — its steps in a line of
 * words, the tool a step is done with, and what its gate needs. What the
 * last turn changed is marked on the stage it touched. */
import { KIND_WORD, allSteps, type FlowDefinition } from '../../lib/flow/definition';
import { componentOf } from '../../lib/flow/components';
import type { Issue } from '../../lib/flow/validate';
import { conditionSaid, measureSaid, stepSaid } from './MethodParts';

export function MethodPreview({ def, errors, warnings, touched }: { def: FlowDefinition; errors: Issue[]; warnings: Issue[]; touched?: ReadonlySet<string> }) {
  const steps = allSteps(def);
  const tools = [...new Set(steps.map(r => r.step.component?.tool).filter((t): t is string => !!t))];
  return (
    <div className="fw-preview" aria-label="The method proposed">
      <p className="pl-eyebrow">{KIND_WORD[def.kind].toUpperCase()} · {def.stages.length} stage{def.stages.length === 1 ? '' : 's'} · {steps.length} step{steps.length === 1 ? '' : 's'}</p>
      <h2 className="fw-prop-h">{def.name}</h2>
      {def.purpose && <p>{def.purpose}</p>}
      <div className={'fw-check-panel ' + (errors.length ? 'is-bad' : 'is-ok')} role="status">
        <b>{errors.length ? `${errors.length} thing${errors.length === 1 ? '' : 's'} to put right before it can run` : 'It can run — approve it when you are happy with it'}</b>
        {errors.length > 0 && <ul className="fw-issues">{errors.map((x, i) => <li key={i} className="is-r">{x.message}</li>)}</ul>}
        {warnings.length > 0 && <ul className="fw-issues">{warnings.map((x, i) => <li key={i} className="is-a">{x.message}</li>)}</ul>}
      </div>
      <p className="sub">
        {def.roles.length ? <>Who does what: {def.roles.map(r => r.name).join(', ')}.</> : 'No roles named yet.'}
        {tools.length ? <> Uses the app’s {tools.map(t => componentOf(t)?.name ?? t).join(', ')}.</> : null}
      </p>
      {(def.measures ?? []).length > 0 && (
        <div className="fw-prev-m">
          <span className="field-label">What it measures — before and after</span>
          <ul className="fw-list">{(def.measures ?? []).map(m => <li key={m.key} data-measure={m.key}><b>{m.name}</b> <span className="sub">· {measureSaid(def, m)}</span></li>)}</ul>
        </div>
      )}
      <ol className="fw-prop">
        {def.stages.map((st, i) => (
          <li key={st.key} className={'fw-prop-st' + (touched?.has(st.key) ? ' is-touched' : '')} data-stage={st.key}>
            <b>{i + 1}. {st.name}</b>{touched?.has(st.key) && <span className="fw-chip fw-touched">changed</span>}
            {st.purpose && <span className="sub"> — {st.purpose}</span>}
            <ul className="fw-list">
              {st.steps.map(t => (
                <li key={t.key}><span>{t.title}</span> <span className="sub">· {stepSaid(def, t)}</span>{t.passesIf && <span className="fw-passes"> · passes if {t.passesIf}</span>}</li>
              ))}
              {st.steps.length === 0 && <li className="sub">No steps yet.</li>}
            </ul>
            <p className="sub">The gate: {st.gate.conditions.map(c => `${conditionSaid(def, c)}${c.policy === 'warn' ? ' (warns)' : ''}`).join(' · ') || 'nothing'}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
