/* A SCREEN THAT BELONGS TO ONE PLAN MODEL WILL NOT RENDER FOR ANOTHER.
 *
 * Rowland: "I get the feeling that they're not truly separated. I just do...
 * We must get control of the code of the app."
 *
 * The concept was already right — lib/planModel.ts gives exactly one model per
 * project, derived in one place. What was missing was anything ENFORCING it:
 * five files in the whole app asked which model a project was on, and the
 * router asked none. So /project/<a-commissioning-job>/board rendered a 3P
 * board over a job that has no tracker, no ppm sheet and no actions — happily,
 * with no error, because nothing refused.
 *
 * This is the refusal, in one place. A screen wrapped in it either belongs to
 * this project or sends you to the project's own front page.
 *
 * IT IS A QUARANTINE, NOT A DELETION. The board and the tree still work, still
 * hold their data, and still open from a project actually on that model. They
 * are obsolete to Rowland today and that is not the same as gone: they carry
 * the Line 7 pace history, and a model is not a thing you can undelete.
 */
import { useEffect } from 'react';
import { useProject } from '../lib/useProjects';
import { planModel, type PlanModel } from '../lib/planModel';
import { navReplace } from '../state/useRoute';

export function RequireModel(
  { projectId, model, children }:
  { projectId: string; model: PlanModel | PlanModel[]; children: React.ReactNode },
) {
  const { project, loading } = useProject(projectId);
  /* An array because the Pareto is not a model of its own — it is an opt-in
     tool a PACED project may carry, so it belongs to board and tree alike and
     to commissioning not at all. */
  const allowed = Array.isArray(model) ? model : [model];
  const wrong = !loading && !!project && !allowed.includes(planModel(project));

  useEffect(() => {
    /* replace, not push: a screen this project cannot have should not sit in
       the back history waiting to be walked into again. */
    if (wrong) navReplace(`/project/${projectId}`);
  }, [wrong, projectId]);

  if (loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  /* A project that is genuinely missing is the dashboard's problem to explain,
     not this one's — it already has a screen that says so properly. */
  if (wrong) return null;
  return <>{children}</>;
}
