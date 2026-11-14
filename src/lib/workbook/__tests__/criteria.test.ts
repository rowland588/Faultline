/* THE CONDITIONS A REPORT'S FORMULAS SUM UNDER (docs/WORKBOOKS.md, the model on top of the rows): a constant written in the formula is a
 * rule; a cell, or anything built from one, is what the person picked and is not. */
import { describe, it, expect } from 'vitest';
import { criteriaOf } from '../criteria';

describe('the rules read from a formula', () => {
  it('a flag held to 0 is a rule; the window and the shift picked on the report are not', () => {
    const f = 'IFERROR(((SUMIFS(Data!$L$2:$L$900,Data!$A$2:$A$900,">="&Control!$F$5,Data!$A$2:$A$900,"<="&Control!$F$6,Data!$B$2:$B$900,Control!$F$7,Data!$E$2:$E$900,0)+SUMIFS(Entry!$W$4:$W$45003,Entry!$L$4:$L$45003,">="&Control!$F$5,Entry!$P$4:$P$45003,0))))/SUMIFS(Data!$K$2:$K$900,Data!$E$2:$E$900,0),0)';
    const c = criteriaOf(f);
    expect(c.on.sort()).toEqual(['Data', 'Entry']);
    expect(c.held).toEqual(expect.arrayContaining([{ sheet: 'Data', letter: 'E', op: 'eq', value: 0 }, { sheet: 'Entry', letter: 'P', op: 'eq', value: 0 }]));
    /* held once a formula, however often the formula says it; nothing held on the dates or the shift */
    expect(c.held).toHaveLength(2);
  });
  it('a word, "=x" and "<>x" are rules; a comparison, a wildcard and an empty string are not', () => {
    expect(criteriaOf('SUMIFS(\'Raw data\'!$M:$M,\'Raw data\'!$E:$E,"Approved")').held).toEqual([{ sheet: 'Raw data', letter: 'E', op: 'eq', value: 'Approved' }]);
    expect(criteriaOf('COUNTIFS(Log!C:C,"<>1",Log!D:D,"=Days")').held).toEqual([{ sheet: 'Log', letter: 'C', op: 'ne', value: 1 }, { sheet: 'Log', letter: 'D', op: 'eq', value: 'Days' }]);
    expect(criteriaOf('SUMIFS(Log!F:F,Log!C:C,">5",Log!D:D,"Li*",Log!E:E,"")').held).toEqual([]);
    expect(criteriaOf('SUMIFS(Log!F:F,Log!C:C,">5")').on).toEqual(['Log']);
  });
  it('the single forms, a quote inside a word, and a formula that is not a conditional sum', () => {
    expect(criteriaOf('COUNTIF(Downtime!$C$2:$C$420,"Unclassified")').held).toEqual([{ sheet: 'Downtime', letter: 'C', op: 'eq', value: 'Unclassified' }]);
    expect(criteriaOf('SUMIF(Log!A:A,"He said ""no"", then left",Log!B:B)').held).toEqual([{ sheet: 'Log', letter: 'A', op: 'eq', value: 'He said "no", then left' }]);
    /* a lookup's 0 is not a rule; a range of several columns is not a column */
    expect(criteriaOf('INDEX(Master!$C$4:$C$67,MATCH($E14,Master!$A$4:$A$67,0))')).toEqual({ on: [], held: [] });
    expect(criteriaOf('SUMIFS(Log!F:F,Log!A:C,0)').held).toEqual([]);
    expect(criteriaOf('SUMIFS(Log!F:F,Log!C:C')).toEqual({ on: [], held: [] });
  });
  it('SUMPRODUCT: a column compared with a constant', () => {
    const c = criteriaOf('SUMPRODUCT((Data!$I$2:$I$900>0)*(Data!$E$2:$E$900=0)*(Data!$C$2:$C$900<>"Line 9"))');
    expect(c.on).toEqual(['Data']);
    expect(c.held).toEqual([{ sheet: 'Data', letter: 'E', op: 'eq', value: 0 }, { sheet: 'Data', letter: 'C', op: 'ne', value: 'Line 9' }]);
  });
});
