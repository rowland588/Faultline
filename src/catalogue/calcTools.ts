/* CALCULATORS THAT ARE TOOLS OF THEIR OWN (Rowland, 8 November: "if we've got calculators in there that are obviously hidden that's
 * not the purpose"). The spaghetti diagram, the process flow chart, micro-movements and stops across workstations are each built on
 * the calculator shape (src/tools/calc) and kept as a calculator's record; each is also a tool of its own in the registry, its card
 * and its line's row reading only its own records (`reads: 'calc:<tool>'`), and Calculators reading the rest. Nothing stored changes. */
import type { ToolStudy } from '../lib/study';

/** A calculator definition's key → the tool it belongs to, as the registry's `reads` names it. */
const OWNER: Record<string, string> = {
  spaghetti: 'calc:spaghetti',
  'spaghetti-walkers': 'calc:spaghetti',
  'process-flow': 'calc:process-flow',
  'micro-movements': 'calc:micro-movements',
  'workstation-stops': 'calc:workstation-stops',
};

/** The tool a calculator's record belongs to: its own tool's `reads`, else plain 'calc'. */
export const calcToolOf = (s: Pick<ToolStudy, 'agreed'>): string => OWNER[s.agreed?.calc?.key ?? ''] ?? 'calc';
/** A calculator definition's key → its own tool's `reads`, when it has one. */
export const calcOwner = (key: string | undefined): string | undefined => (key ? OWNER[key] : undefined);
export const isCalcTool = (v: string | undefined): v is `calc:${string}` => !!v && v.startsWith('calc:');
