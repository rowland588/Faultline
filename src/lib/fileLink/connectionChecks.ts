import { fetchMicrosoftLink, type LinkDeps } from './linkCore';
import { fetchPublicLink, SAMPLE_LINK } from './link';
import { tabularToXlsx } from '../workbook/csv';
import { tagsOf } from '../workbook/xml';
import { entryString, fromBlob, zipIndex } from '../workbook/zip';

export const PUBLIC_ONEDRIVE_SAMPLE = 'https://1drv.ms/x/s!AjP7y6eiYDDSafV7BusEaDHrI0o?e=cL0Fqi';

export async function inspectWorkbook(file: File): Promise<string[]> {
  const source = fromBlob(file);
  const entries = await zipIndex(source);
  const manifest = entries.find(entry => entry.name === 'xl/workbook.xml');
  if (!manifest) throw new Error('This file has no Excel workbook index. Choose an .xlsx or .xlsm file.');
  const sheets = tagsOf(await entryString(source, manifest, 2_000_000), 'sheet')
    .map(sheet => sheet.attrs('name')).filter((name): name is string => !!name);
  if (!sheets.length || !entries.some(entry => /^xl\/worksheets\/[^/]+\.xml$/.test(entry.name))) throw new Error('Excel worksheets could not be found in this file.');
  return sheets;
}

export function describeWorkbook(file: File, sheets: string[]): string {
  return `${file.name} · ${sheets.length} ${sheets.length === 1 ? 'sheet' : 'sheets'} · ${sheets.slice(0, 4).join(', ')}${sheets.length > 4 ? '…' : ''}`;
}

async function checkPublic(url: string, expected: string[], signal: AbortSignal): Promise<string> {
  const file = await fetchPublicLink(url, signal);
  const sheets = await inspectWorkbook(file);
  if (!expected.every(name => sheets.includes(name))) throw new Error(`The sample changed. Worksheets received: ${sheets.join(', ')}.`);
  return describeWorkbook(file, sheets);
}

/** The guest scenarios execute the same shared-file connector used by the Edge Function.
 * This transport is local to the test. Its token and all Microsoft responses are synthetic. */
async function checkGuest(status: 200 | 403 | 401): Promise<string> {
  const share = 'https://demo.sharepoint.com/:x:/s/Operations/Shift';
  const download = 'https://download.example.test/Shift.xlsx';
  const graphUrl = 'https://graph.microsoft.com/v1.0/shares/u!' + btoa(share).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_') + '/driveItem/content';
  const token = 'demo-only';
  let reachedFile = false;
  const route: LinkDeps['fetch'] = async (url, init) => {
    if (url === graphUrl && init.headers.Authorization === 'Bearer ' + token) {
      if (status !== 200) return Response.json({ error: { code: status === 403 ? 'accessDenied' : 'InvalidAuthenticationToken' } }, { status });
      return new Response(null, { status: 302, headers: { location: download } });
    }
    if (url !== download || init.headers.Authorization) throw new Error('Unexpected demo download request.');
    reachedFile = true;
    const bytes = tabularToXlsx([['Shift', 'Units'], ['Morning', '120']], 'Shift output');
    return new Response(new Uint8Array(bytes), { headers: { 'content-disposition': 'attachment; filename="Shift.xlsx"' } });
  };
  const result = await fetchMicrosoftLink(share, token, { fetch: route, refuse: url => url === graphUrl || url === download ? undefined : 'Unknown demo route' });
  if (status !== 200) {
    const expected = status === 403 ? 'cannot open that link' : 'Sign in to Microsoft again';
    if (result.ok || reachedFile || result.code !== 'sign-in' || !result.why.includes(expected)) throw new Error('The connector returned an unexpected permission result.');
    return status === 403 ? 'The guest was refused. No workbook was downloaded.' : 'The expired sign-in was detected. Faultline asked for sign-in again.';
  }
  if (!result.ok) throw new Error(result.why);
  const file = new File([await new Response(result.body).blob()], result.name);
  const sheets = await inspectWorkbook(file);
  if (!reachedFile || !sheets.includes('Shift output')) throw new Error('The expected practice worksheet was missing.');
  return describeWorkbook(file, sheets);
}

export const CONNECTION_CHECKS = [
  { id: 'faultline', name: 'Faultline sample workbook', mode: 'Live', run: (signal: AbortSignal) => checkPublic(SAMPLE_LINK, ['Production', 'Downtime log', 'Products'], signal) },
  { id: 'onedrive', name: 'Public OneDrive link', mode: 'Live', run: (signal: AbortSignal) => checkPublic(PUBLIC_ONEDRIVE_SAMPLE, ['Sales-Grid view'], signal) },
  { id: 'guest', name: 'SharePoint guest with access', mode: 'Simulated', run: () => checkGuest(200) },
  { id: 'denied', name: 'SharePoint guest without access', mode: 'Simulated', run: () => checkGuest(403) },
  { id: 'expired', name: 'Expired Microsoft sign-in', mode: 'Simulated', run: () => checkGuest(401) },
] as const;
