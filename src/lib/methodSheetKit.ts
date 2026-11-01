/* The shape of a method's questions and the one way to write one (lib/methodSheet; lib/methodSheets/<method>.ts). Kept apart so a
 * method's file and the engine never import each other in a circle. */
export interface SheetField {
  /** Stable, lower-case, unique within its method. Kept in the answer's scope — never rename one. */
  id: string;
  /** The question, as a person reads it. */
  label: string;
  /** One line on what a good answer holds. */
  hint: string;
  /** A short line (a number, a name, a date) rather than a paragraph. */
  line?: boolean;
  /** The catalogue tools that answer it, offered beside it — never required (FC ids). */
  tools?: readonly string[];
}
/** The fields of each section, by the method's own section name (lib/methods). */
export type SheetSections = Readonly<Record<string, readonly SheetField[]>>;

export const f = (id: string, label: string, hint: string, o: { line?: boolean; tools?: readonly string[] } = {}): SheetField => ({ id, label, hint, ...o });

