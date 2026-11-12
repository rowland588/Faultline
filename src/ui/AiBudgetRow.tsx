/* THE AI BUDGET IN THE ACCOUNT MENU (12 November — Rowland: "in my profile setup i want to see the budget and as it goes down").
 * A bar and a sentence: what is left of the month's ceiling, read from the AI service when the menu opens and again after each
 * answer Luna gives, so it moves as it is spent. The administrator's (the service's whole bill); nobody else is shown it. Opens How
 * AI Mode is used. */
import { useEffect, useState } from 'react';
import { BUDGET_MOVED, budgetSaid, budgetState, leftShare, readAiBudget, type BudgetRead } from '../lib/aiBudget';

export function AiBudgetRow({ onOpen }: { onOpen: () => void }) {
  const [read, setRead] = useState<BudgetRead | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => void readAiBudget().then(r => { if (live) setRead(r); });
    load();
    window.addEventListener(BUDGET_MOVED, load);
    return () => { live = false; window.removeEventListener(BUDGET_MOVED, load); };
  }, []);
  if (!read) return <p className="sub" data-ai-budget="reading">Reading the AI budget…</p>;
  if (!read.ok) return <p className="sub" data-ai-budget="none">{read.why}</p>;
  const b = read.budget, st = budgetState(b), pct = Math.round(leftShare(b) * 100);
  return (
    <button type="button" className="ai-budget" data-ai-budget={st} onClick={onOpen} aria-label={`AI budget: ${budgetSaid(b)} Open how AI Mode is used.`}>
      <span className="ai-budget-h"><b>AI budget</b><span className={`ai-budget-pct is-${st}`}>{b.over ? 'Spent' : `${pct}% left`}</span></span>
      <svg className="ai-budget-bar" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden><rect className={`is-${st}`} x="0" y="0" height="8" width={pct} /></svg>
      <span className="ai-budget-says">{budgetSaid(b)}</span>
    </button>
  );
}
