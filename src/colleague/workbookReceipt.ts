import type { ColleagueTurn } from './conversation';
import type { ColleagueWorkbook } from '../capabilities/types';
import { CLOUD_FILE_LIMIT } from '../lib/transcode';
import { PACK_OFFER } from '../lib/workbook/lookPack';

type ReadFile = { name: string; status: ColleagueWorkbook['status']; localOnly?: boolean };
export function workbookReceipt(files: readonly ReadFile[], failed: readonly {name: string; why: string}[] = []): string {
  const messages: string[] = [];
  if (files.length === 1) {
    const f = files[0];
    messages.push(f.status === 'partial' ? `I could only read part of ${f.name}.` : `${f.name} is ready${f.localOnly ? ' on this device' : ''}.`);
  } else if (files.length > 1) {
    messages.push(`${files.length} workbooks are ready${files.some(f => f.localOnly) ? ' on this device' : ''}.`);
    const partial = files.filter(f => f.status === 'partial').length;
    if (partial) messages.push(`Only part of ${partial === 1 ? 'one workbook' : `${partial} workbooks`} could be read.`);
  }
  for (const f of failed) messages.push(`Couldn’t open ${f.name}. ${f.why}`);
  if (files.length) messages.push(`What would you like to do with ${files.length === 1 ? 'it' : 'them'}?`);
  return messages.join(' ');
}

/** Match only the previous attachment handler's stock messages about a named workbook. */
export function legacyWorkbookReceipt(turn: ColleagueTurn, books: readonly ColleagueWorkbook[]): string | undefined {
  if (turn.kind !== 'reply' || !turn.byCode || turn.who !== 'The app' || turn.used?.length || !turn.text) return;
  const text = turn.text;
  const book = books.find(b => {
    const quoted = `“${b.name}”`;
    return (text.startsWith(quoted + ' has ') && (turn.suggestions?.[0] === PACK_OFFER || text.includes(' reads as a filled-in form, not a table'))) ||
      text.startsWith('I read ' + quoted + ', but I cannot tell by myself which sheet') ||
      text.startsWith('I read ' + quoted + ' but the first look could not be worked');
  });
  return book && workbookReceipt([{ ...book, localOnly: book.bytes > CLOUD_FILE_LIMIT }]);
}
