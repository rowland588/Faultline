/* WHAT IS SAID ABOUT A WORKBOOK THAT THE APP CAN ANSWER ITSELF (13 November, docs/WORKBOOKS.md). After a first look, four things a person
 * says need no AI at all — each is the whole of what was said, in a short sentence:
 *   "Make this a pack"                       the look laid out as a report (workbook_pack);
 *   "Start with “Sheet name”"                the sheet to read (read_workbook_as);
 *   "The headings are on row 5"              where the headings are;
 *   "Column M is the result" · "“FinVar £” is the result" · "Column C is the date"
 *   "Read every row" · "Leave them out"    the rows the workbook's own reports leave out, in or out (14 November)
 * and, since 15 November, THE READING (lib/workbook/reading) — what a column is, what is ignored, which rows count, and forgetting it:
 *   "“Score” is a rate" · "Never add “Std hrs”" · "“Count” is a total" · "“Idle” is time lost" · "“Charge” is money"
 *   "Ignore “Notes ref”" · "Leave out rows where “Type” is “Trial”" · "Only rows where “Site” is “Hull”"
 *   "What have I told you?" · "Forget what I told you"
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
  if (/^(?:(?:please )?(?:read|count|include|use|take|show)(?: it (?:on|with|over))? (?:every|all)(?: (?:of )?the)? rows?|include them(?: all)?|(?:put|have|count) them in|every row)(?: please)?[.!]?$/i.test(s)) return { name: 'read_workbook_as', input: { everyRow: true } };
  if (/^(?:leave them out(?: again)?|(?:read|count) (?:it )?as the reports do|(?:on )?the reports[’']? basis|(?:take|leave) them (?:back )?out)(?: please)?[.!]?$/i.test(s)) return { name: 'read_workbook_as', input: { everyRow: false } };
  let m = /^(?:start|begin|lead) with (?:the )?(?:sheet )?(.+)$/i.exec(s);
  if (m && unq(m[1])) return { name: 'read_workbook_as', input: { sheet: unq(m[1]) } };
  m = /^(?:the )?(?:headings?|headers?|titles?|column names?) (?:are|is|start|sit) (?:on|in|at) (?:the )?row (\d{1,7})(?: (?:of|on|in) (?:the )?(?:sheet )?(.+))?[.!]?$/i.exec(s);
  if (m) return { name: 'read_workbook_as', input: { headerRow: Number(m[1]), ...(m[2] && unq(m[2]) ? { sheet: unq(m[2]) } : {}) } };
  m = /^(?:column )?(.+?) is (?:the )?(result|figure|one that matters|one|number that matters|date|dates)(?: column)?(?: we (?:manage|run|work) (?:by|to))?[.!]?$/i.exec(s);
  if (m && unq(m[1]) && unq(m[1]).split(/\s+/).length <= 8) return { name: 'read_workbook_as', input: { [/^date/i.test(m[2]) ? 'date' : 'result']: unq(m[1]) } };
  /* THE READING (15 November) */
  const about = '(?: about (?:this|the|that) (?:workbook|report|sheet|file|spreadsheet))?';
  if (new RegExp(`^(?:please )?(?:forget (?:what i(?:'ve|’ve| have)? (?:told|said)(?: (?:to )?you)?|that|it|all (?:of )?that|everything i (?:told|said)(?: (?:to )?you)?)|read it (?:your own way|by yourself|as you would(?: by yourself)?|afresh|fresh|unaided))${about}(?: please)?[.!]?$`, 'i').test(s)) return { name: 'read_workbook_as', input: { forget: true } };
  if (new RegExp(`^what (?:have i|did i|'ve i|have you been) (?:told|tell|said|say)(?: (?:to )?you)?(?: so far)?${about}\\??$`, 'i').test(s)) return { name: 'read_workbook_as', input: { told: true } };
  const col = (x: string): string | null => { const c = unq(x.replace(/^(?:the )?column /i, '').replace(/ column$/i, '')); return c && c.split(/\s+/).length <= 8 ? c : null; };
  /* rows, by what one column holds */
  m = /^(?:please )?(leave out|ignore|drop|exclude|take out|skip|only|just|keep only|read only|use only|only read|only use)(?: the)? rows? (?:where|with|when|in which) (.+?) (?:is|=|equals|says|reads) (.+?)[.!]?$/i.exec(s);
  if (m && col(m[2]) && unq(m[3])) return { name: 'read_workbook_as', input: { [/only|just/i.test(m[1]) ? 'only' : 'leaveOut']: { column: col(m[2]), is: unq(m[3]) } } };
  const kind = (c: string | null, say: string): LookAsk | null => (c ? { name: 'read_workbook_as', input: { columns: { [c]: say } } } : null);
  /* never added up */
  m = /^(?:please )?(?:never|do not|don[’']?t) (?:add(?: up)?|sum|total) (.+?)(?: up)?[.!]?$/i.exec(s) ?? /^(.+?) (?:is not|isn[’']?t) (?:a figure|a total|added(?: up)?|to be added(?: up)?|something to add(?: up)?)[.!]?$/i.exec(s) ?? /^(.+?) (?:is|should be|must be) never added(?: up)?[.!]?$/i.exec(s);
  if (m) return kind(col(m[1]), 'never');
  /* averaged */
  /* said as what the column IS — never the bare "average X" or "add up X", which ask for a figure and are Luna's */
  m = /^(.+?) (?:is|should be|must be) (?:an? )?(?:rate|percentage|percent|ratio|average|averaged)(?:,? not (?:an? )?(?:total|sum|added(?: up)?))?[.!]?$/i.exec(s);
  if (m) return kind(col(m[1]), 'average');
  /* added up */
  m = /^(.+?) (?:is|should be|must be) (?:a total|added up|to be added up|a figure to add up|something to add up)[.!]?$/i.exec(s);
  if (m) return kind(col(m[1]), 'add');
  m = /^(.+?) is (?:the )?(?:time lost|lost time|downtime|down time)[.!]?$/i.exec(s);
  if (m) return kind(col(m[1]), 'lost');
  m = /^(.+?) is (?:money|a cost|cost|in pounds|pounds|£)[.!]?$/i.exec(s);
  if (m) return kind(col(m[1]), 'money');
  m = /^(.+?) is (?:a |the )?(?:volume|output|what was made|quantity made)[.!]?$/i.exec(s);
  if (m) return kind(col(m[1]), 'volume');
  /* a column that is neither a figure nor something to split by — only a column of the workbook is taken; anything else goes to Luna */
  m = /^(?:please )?(?:ignore|skip|drop|leave out)(?: the)?(?: column)? (.+?)(?: column)?[.!]?$/i.exec(s);
  if (m && col(m[1]) && !/^(them|it|that|this|those|these|all)$/i.test(col(m[1]) as string)) return { name: 'read_workbook_as', input: { ignore: [col(m[1])] } };
  return null;
}
