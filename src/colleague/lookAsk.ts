/* WHAT IS SAID ABOUT A WORKBOOK THAT THE APP CAN ANSWER ITSELF (13 November, docs/WORKBOOKS.md). After a first look, four things a person
 * says need no AI at all — each is the whole of what was said, in a short sentence:
 *   "Make this a pack"                       the look laid out as a report (workbook_pack);
 *   "Start with “Sheet name”"                the sheet to read (read_workbook_as);
 *   "The headings are on row 5"              where the headings are;
 *   "Column M is the result" · "“FinVar £” is the result" · "Column C is the date"
 * Anything longer, or said another way, goes to Luna, who has the same two capabilities. This only DECIDES; the screen runs the call. Pure. */
import { PACK_OFFER } from '../lib/workbook/lookPack';

export interface LookAsk { name: 'workbook_pack' | 'read_workbook_as'; input: Record<string, unknown> }
/** The chip offered under a look that found no table: one a sheet. */
export const startWith = (sheet: string): string => `Start with “${sheet}”`;

const unq = (s: string): string => s.trim().replace(/^[“"'‘]+|[”"'’.]+$/g, '').trim();
const PACK = /^(yes[,. ]*)?(please[,. ]*)?((can|could) (you|we) |i'?d like (you )?to |let'?s )?(make|build|give|create|do|put|turn)( me| us)?( this| that| it)?( up)?( into| as| in)?( a| the)? ?(board |summary |report )?pack( of (this|that|it))?( for (me|us|them))?[,. ]*(please|thanks|thank you)?[.!?]*$/i;

export function lookAsked(said: string): LookAsk | null {
  const s = said.trim();
  if (!s || s.length > 140) return null;
  if (s === PACK_OFFER || PACK.test(s)) return { name: 'workbook_pack', input: {} };
  let m = /^(?:start|begin|lead) with (?:the )?(?:sheet )?(.+)$/i.exec(s);
  if (m && unq(m[1])) return { name: 'read_workbook_as', input: { sheet: unq(m[1]) } };
  m = /^(?:the )?(?:headings?|headers?|titles?|column names?) (?:are|is|start|sit) (?:on|in|at) (?:the )?row (\d{1,7})(?: (?:of|on|in) (?:the )?(?:sheet )?(.+))?[.!]?$/i.exec(s);
  if (m) return { name: 'read_workbook_as', input: { headerRow: Number(m[1]), ...(m[2] && unq(m[2]) ? { sheet: unq(m[2]) } : {}) } };
  m = /^(?:column )?(.+?) is (?:the )?(result|figure|one that matters|one|number that matters|date|dates)(?: column)?(?: we (?:manage|run|work) (?:by|to))?[.!]?$/i.exec(s);
  if (m && unq(m[1]) && unq(m[1]).split(/\s+/).length <= 8) return { name: 'read_workbook_as', input: { [/^date/i.test(m[2]) ? 'date' : 'result']: unq(m[1]) } };
  return null;
}
