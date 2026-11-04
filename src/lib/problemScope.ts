/* WHAT A PROBLEM IS ABOUT, IN WORDS (PROBLEM_PROGRAM.sql — Rowland, 4 November: "link a problem to the program ... which products it actually affects"):
 * "Program 10 · Maris Piper, King Edward", "Program 10 · every product", "Maris Piper" (a product with no program), nothing for a problem about the whole line.
 * One reading for the register's row, the Problems report, the cards and the Programs report — so they never part. Pure. */
import type { Snag } from '../snag/types';
import type { Program } from './programs';

export type ScopeOf = (s: Pick<Snag, 'programId' | 'products'>) => string | undefined;

/** The words for a problem's program and products; undefined when it is about the whole line. */
export function scopeWords(s: Pick<Snag, 'programId' | 'products'>, programName: (id: string) => string | undefined): string | undefined {
  const products = (s.products ?? []).map(x => x.trim()).filter(Boolean);
  const prog = s.programId ? (programName(s.programId)?.trim() || 'a program no longer here') : undefined;
  if (prog) return products.length ? `${prog} · ${products.join(', ')}` : `${prog} · every product`;
  return products.length ? products.join(', ') : undefined;
}

/** A scope reader over a list of programs. */
export const scopeReader = (programs: readonly Pick<Program, 'id' | 'what'>[]): ScopeOf => {
  const names = new Map(programs.map(p => [p.id, p.what]));
  return s => scopeWords(s, id => names.get(id));
};

/** Does this problem touch the program — and, if a product is asked, that product (a program-wide problem touches every product it makes)? */
export function touches(s: Pick<Snag, 'programId' | 'products'>, programId: string, product?: string): boolean {
  if (s.programId !== programId) return false;
  if (!product) return true;
  const ps = s.products ?? [];
  return !ps.length || ps.some(x => x.trim().toLowerCase() === product.trim().toLowerCase());
}
