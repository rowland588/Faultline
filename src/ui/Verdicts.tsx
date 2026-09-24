/* THE QUESTION THE APP OWES YOU.
 *
 * Rowland: "I never get asked to start the test, I never get asked to save any
 * data." He ran a test, dated it, wrote what happened, and the app went on
 * filing it under Next up as "Not run yet" — on every device — because nobody
 * had tapped Passed or Didn't pass, and nothing ever asked.
 *
 * This is the asking. Every record that has run without a verdict sits at the
 * top of the list it belongs to, with the question in the face's own words and
 * the three answers under it. It is drawn from the same standing every other
 * screen reads, and it disappears the moment there is nothing left to answer —
 * a strip, not a fixture. Answering writes the same field the test screen
 * writes; there is no second place a verdict lives.
 */
import { nav } from '../state/useRoute';
import { niceDay } from '../lib/weeks';
import { needsVerdict, outcomeWord, verdictQuestion, type Outcome, type Test } from '../lib/testing';

const nice = (iso?: string): string => niceDay(iso) || '';

export function Verdicts({ tests, projectId, onAnswer }: {
  tests: Test[];
  projectId: string;
  onAnswer: (t: Test, outcome: Outcome) => void;
}) {
  const owed = tests.filter(needsVerdict);
  if (owed.length === 0) return null;
  return (
    <section className="tw-verdicts" aria-label="Waiting for a verdict">
      <div className="cw-sec-h">
        <h2 className="cmp-h">{owed.length === 1 ? 'One needs a verdict' : `${owed.length} need a verdict`}</h2>
        <span className="sub">{owed.length === 1 ? 'It happened — say how it went.' : 'They happened — say how they went.'}</span>
      </div>
      {owed.map(t => {
        const kind = t.kind ?? 'test';
        return (
          <div key={t.id} className="tw-verdict">
            <button className="tw-verdict-m" onClick={() => nav(`/project/${projectId}/testing/${encodeURIComponent(t.id)}`)}>
              <b>{t.title}</b>
              <span className="sub">
                {t.ranOn ? `Ran ${nice(t.ranOn)}` : 'Written up'}{t.withWhom ? ` · ${t.withWhom}` : ''}
                {t.result ? ` · ${t.result}` : ''}
              </span>
            </button>
            <span className="tw-verdict-q">{verdictQuestion(kind)}</span>
            <span className="tw-seg is-asking">
              {(['passed', 'failed', 'notRun'] as const).map(o => (
                <button key={o} className={'tw-seg-b is-' + o} onClick={() => onAnswer(t, o)}>
                  {outcomeWord({ kind, outcome: o })}
                </button>
              ))}
            </span>
          </div>
        );
      })}
    </section>
  );
}
