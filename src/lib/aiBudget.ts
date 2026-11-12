/* THE MONTH'S AI BUDGET, READ AND SAID (12 November — Rowland: "in my profile setup i want to see the budget and as it goes down").
 * The ceiling and what has been spent against it are the AI service's own (supabase/functions/assist, task "budget" — no model is
 * asked, nothing is charged); this reads them and says them. The service counts in US dollars, as it is billed; a pound figure is
 * said beside it as "about", at the build's rate (VITE_USD_TO_GBP) or else 0.79 — an approximation, never the bill. */
import { supabase } from '../cloud/client';

export interface AiBudget { limitMicros: number; spentMicros: number; over: boolean; /** The day it comes back, YYYY-MM-DD. */ resets: string }
export type BudgetRead = { ok: true; budget: AiBudget } | { ok: false; why: string };

const RATE = Number((import.meta.env as Record<string, string | undefined> | undefined)?.VITE_USD_TO_GBP ?? '') || 0.79;
const usd = (micros: number) => `$${(micros / 1_000_000).toFixed(2)}`;
const gbp = (micros: number) => `£${((micros / 1_000_000) * RATE).toFixed(2)}`;
const dayLong = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/** How much of the budget is left, 0–1. */
export const leftShare = (b: AiBudget): number => (b.limitMicros > 0 ? Math.max(0, Math.min(1, 1 - b.spentMicros / b.limitMicros)) : 0);

/** Green while most is left, amber under a quarter, red when spent — the house's state meanings, always with the words beside them. */
export const budgetState = (b: AiBudget): 'g' | 'a' | 'r' => (b.over || leftShare(b) <= 0 ? 'r' : leftShare(b) < 0.25 ? 'a' : 'g');

/** "About £17.66 left of £19.75 this month ($22.36 of $25.00). It comes back on 1 December." */
export function budgetSaid(b: AiBudget): string {
  const left = Math.max(0, b.limitMicros - b.spentMicros);
  if (b.over || left <= 0) return `This month's AI budget is spent (about ${gbp(b.limitMicros)}, ${usd(b.limitMicros)}). It comes back on ${dayLong(b.resets)}. Everything by hand works meanwhile.`;
  return `About ${gbp(left)} left of ${gbp(b.limitMicros)} this month (${usd(left)} of ${usd(b.limitMicros)}). It comes back on ${dayLong(b.resets)}.`;
}

export async function readAiBudget(): Promise<BudgetRead> {
  if (!supabase) return { ok: false, why: 'Sign in to see the AI budget.' };
  try {
    const { data, error } = await supabase.functions.invoke('assist', { body: { task: 'budget' } });
    if (error) return { ok: false, why: 'The AI budget could not be read just now.' };
    const d = data as { ok?: boolean; why?: string; limitMicros?: number; spentMicros?: number; over?: boolean; resets?: string } | null;
    if (!d?.ok || typeof d.limitMicros !== 'number' || typeof d.spentMicros !== 'number' || typeof d.resets !== 'string') return { ok: false, why: d?.why ?? 'The AI budget could not be read just now.' };
    return { ok: true, budget: { limitMicros: d.limitMicros, spentMicros: d.spentMicros, over: !!d.over, resets: d.resets } };
  } catch { return { ok: false, why: 'No signal — the AI budget is read when it comes back.' }; }
}

/** Said to whoever shows the budget, after each answer from the AI service, so the figure moves as it is spent. */
export const BUDGET_MOVED = 'lunar:ai-budget-moved';
export const budgetMoved = (): void => { try { window.dispatchEvent(new Event(BUDGET_MOVED)); } catch { /* no window */ } };
