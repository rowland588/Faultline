/* THE COLOURS PAINTED ON A WORKBOOK'S CELLS, READ AS WORDS (13 November, docs/WORKBOOKS.md — "cell colours as a column"). A site that marks
 * a bad hour red and a good one green by hand has put information in the fill that no column holds. The styles part says which fill each
 * cell style carries; this turns each style's SOLID fill into one plain word — red, orange, yellow, green, blue, purple, pink, grey,
 * black — so the reader can keep "Row colour" or "Colour of <heading>" as a column to split by. White, no fill and the patterned fills
 * are no colour. What a colour MEANS is never in the file and is never guessed. Colours a rule puts on (conditional formatting) are not
 * in the cell's style and are not read — said, where a sheet has such rules. Pure. */
import { tagsOf } from './xml';

/** Office's own theme, used when the workbook carries none: lt1, dk1, lt2, dk2, accent1–6 — the order a cell's `theme` index counts in. */
const OFFICE = ['FFFFFF', '000000', 'E7E6E6', '44546A', '4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5', '70AD47'];
/** The legacy palette a cell's `indexed` colour counts in (0–63). */
const INDEXED = ['000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF', '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
  '800000', '008000', '000080', '808000', '800080', '008080', 'C0C0C0', '808080', '9999FF', '993366', 'FFFFCC', 'CCFFFF', '660066', 'FF8080', '0066CC', 'CCCCFF',
  '000080', 'FF00FF', 'FFFF00', '00FFFF', '800080', '800000', '008080', '0000FF', '00CCFF', 'CCFFFF', 'CCFFCC', 'FFFF99', '99CCFF', 'FF99CC', 'CC99FF', 'FFCC99',
  '3366FF', '33CCCC', '99CC00', 'FFCC00', 'FF9900', 'FF6600', '666699', '969696', '003366', '339966', '003300', '333300', '993300', '993366', '333399', '333333'];

/** The theme's colours in the order a cell counts them (Excel swaps the first two pairs: 0 is light 1, 1 is dark 1). */
export function themeColours(themeXml: string | undefined): string[] {
  if (!themeXml) return OFFICE;
  const of = (name: string): string | undefined => {
    const m = new RegExp(`<a:${name}>([\\s\\S]*?)</a:${name}>`).exec(themeXml);
    if (!m) return undefined;
    return /<a:srgbClr[^>]*\bval="([0-9A-Fa-f]{6})"/.exec(m[1])?.[1] ?? /<a:sysClr[^>]*\blastClr="([0-9A-Fa-f]{6})"/.exec(m[1])?.[1];
  };
  const order = ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6'];
  return order.map((n, i) => (of(n) ?? OFFICE[i]).toUpperCase());
}

const hsl = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(0, 2), 16) / 255, g = parseInt(hex.slice(2, 4), 16) / 255, b = parseInt(hex.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};

/** A colour as the one word a person would call it — or nothing for white and near-white (no colour at all). `tint` is Excel's
 *  lighter (above zero) or darker (below) of a theme colour: it moves the lightness, never the hue. */
export function colourWord(hex: string, tint = 0): string | undefined {
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return undefined;
  const [h, s, l0] = hsl(hex);
  const l = tint < 0 ? l0 * (1 + tint) : l0 * (1 - tint) + tint;
  if (s < 0.15 || l > 0.97 || l < 0.03) return l > 0.93 ? undefined : l < 0.2 ? 'black' : 'grey';
  if (h < 15 || h >= 345) return 'red';
  if (h < 48) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 170) return 'green';
  if (h < 255) return 'blue';
  if (h < 290) return 'purple';
  return 'pink';
}

/** Each cell style's fill as a word: the style's index (a cell's `s`) → red, green …; a style with no solid fill is not in the map. */
export function fillWords(stylesXml: string, themeXml?: string): Map<number, string> {
  const out = new Map<number, string>();
  const theme = themeColours(themeXml);
  const fills = tagsOf(tagsOf(stylesXml, 'fills')[0]?.inner ?? '', 'fill').map(f => {
    const pf = tagsOf(f.inner, 'patternFill')[0];
    if (!pf || pf.attrs('patternType') !== 'solid') return undefined;
    const fg = tagsOf(pf.inner, 'fgColor')[0];
    if (!fg) return undefined;
    const rgb = fg.attrs('rgb'), th = fg.attrs('theme'), ix = fg.attrs('indexed');
    const hex = rgb ? rgb.slice(-6) : th !== undefined ? theme[Number(th)] : ix !== undefined ? INDEXED[Number(ix)] : undefined;
    return hex ? colourWord(hex, Number(fg.attrs('tint') ?? 0) || 0) : undefined;
  });
  const xfs = tagsOf(stylesXml, 'cellXfs')[0];
  if (!xfs) return out;
  tagsOf(xfs.inner, 'xf').forEach((xf, i) => { const w = fills[Number(xf.attrs('fillId') ?? 0)]; if (w) out.set(i, w); });
  return out;
}
