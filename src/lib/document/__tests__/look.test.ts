/* Independent cases for a document's first look — known amounts, named missing fields, nothing invented. */
import { describe, expect, it } from 'vitest';
import { DOCUMENT_FORM_CHIPS, documentLook, isChatDocument, isCommercial, keptOf } from '../look';

const TENDER = [
  `Invitation to Tender (ITT)
Contracting authority: Northfield Foods Ltd
Tender ref: ITT-2026-014
Supply of a vertical bagging line
Issued to: packing equipment contractors`,
  `Submission deadline: 14 January 2027
Total contract value: £48,000
VAT: £9,600
Supplier: not stated in this pack`,
];

const TENDER_THIN = [
  `Invitation to Tender
Buyer: Acme Foods
Tender ref: ITT-77
The line must bag 80 packs a minute.`,
];

const QUOTE = [
  `Quotation for film reel change parts
Issued by: Northfield Packaging Machinery
Quote no: Q-441
Date: 3 November 2026
Quoted price: £1,250`,
];

const INVOICE = [
  `VAT invoice
Invoice no: INV-908
Invoice date: 12/11/2026
Supplier: Film Supplies Ltd
Amount due: £640.00`,
];

const MANUAL = [
  `VFB-240 Vertical Form Fill Seal Bagger
Operating and Maintenance Manual
Document NPM-VFB240-OM-03
Rated speed: up to 85 bags per minute.`,
  `7 Maintenance
Lubricate the jaw carriage linear bearings every 500 operating hours.`,
];

describe('documentLook — classification and extraction, never invented', () => {
  it('a full tender pack: kind, parties, reference, deadline, amount and VAT from the file’s own words', () => {
    const l = documentLook({ name: 'ITT-2026-014 Northfield packing line.pdf', pages: TENDER });
    expect(l.kind).toBe('tender');
    expect(isCommercial(l.kind)).toBe(true);
    expect(l.facts.find(f => f.field === 'buyer')?.value).toBe('Northfield Foods Ltd');
    expect(l.facts.find(f => f.field === 'reference')?.value).toBe('ITT-2026-014');
    expect(l.facts.find(f => f.field === 'deadline')?.value).toBe('14 January 2027');
    const amount = l.facts.find(f => f.field === 'amount');
    expect(amount?.value).toBe('£48,000');
    expect(amount?.pounds).toBe(48000);
    expect(amount?.page).toBe(2);
    expect(amount?.quote).toMatch(/Total contract value: £48,000/);
    expect(l.facts.find(f => f.field === 'vat')?.value).toBe('£9,600');
    expect(l.missing).toEqual(['supplier']);
    expect(l.said).toMatch(/is a tender/);
    expect(l.said).toMatch(/£48,000/);
    expect(l.said).toMatch(/Not in the file: supplier/);
    expect(l.said).not.toMatch(/invent|approx|guess/i);
    expect(l.headline).toMatch(/tender/);
    expect(l.headline).toMatch(/£48,000/);
    expect(l.suggestions).toEqual([...DOCUMENT_FORM_CHIPS]);
    expect(l.said).toMatch(/no AI used/);
  });

  it('a thin tender names every missing commercial field and does not invent an amount', () => {
    const l = documentLook({ name: 'itt-77.pdf', pages: TENDER_THIN });
    expect(l.kind).toBe('tender');
    expect(l.facts.find(f => f.field === 'amount')).toBeUndefined();
    expect(l.facts.some(f => f.pounds === 80)).toBe(false);
    expect(l.missing).toEqual(expect.arrayContaining(['supplier', 'deadline', 'amount']));
    expect(l.missing).not.toContain('buyer');
    expect(l.missing).not.toContain('reference');
    expect(l.said).toMatch(/Not in the file:.*amount/);
    expect(l.said).not.toMatch(/£/);
  });

  it('a quotation and an invoice take only labelled totals', () => {
    const q = documentLook({ name: 'quote-441.docx', pages: QUOTE });
    expect(q.kind).toBe('quotation');
    expect(q.facts.find(f => f.field === 'supplier')?.value).toBe('Northfield Packaging Machinery');
    expect(q.facts.find(f => f.field === 'amount')?.pounds).toBe(1250);
    expect(q.missing).toEqual([]);
    const inv = documentLook({ name: 'INV-908.pdf', pages: INVOICE });
    expect(inv.kind).toBe('invoice');
    expect(inv.facts.find(f => f.field === 'amount')?.value).toBe('£640.00');
    expect(inv.facts.find(f => f.field === 'date')?.value).toBe('12/11/2026');
    expect(inv.missing).toEqual([]);
  });

  it('a machine manual is not a tender, and an interval or a rated speed is not an amount', () => {
    const l = documentLook({ name: 'VFB-240 operating manual.pdf', pages: MANUAL });
    expect(l.kind).toBe('manual');
    expect(isCommercial(l.kind)).toBe(false);
    expect(l.facts.find(f => f.field === 'amount')).toBeUndefined();
    expect(l.missing).toEqual([]);
    expect(l.suggestions).toEqual([]);
    expect(l.said).toMatch(/machine manual/);
    expect(l.said).not.toMatch(/£/);
    expect(l.said).toMatch(/Ask what it says/);
  });

  it('pages with no words extract nothing and say so', () => {
    const l = documentLook({ name: 'scan.pdf', pages: ['', '   '], blank: 2, pageCount: 2 });
    expect(l.kind).toBe('other');
    expect(l.facts).toEqual([]);
    expect(l.said).toMatch(/pictures/);
    expect(l.said).toMatch(/Nothing is extracted/);
  });

  it('keptOf stores the headline the files-known line will quote', () => {
    const l = documentLook({ name: 'ITT-2026-014.pdf', pages: TENDER });
    const k = keptOf(l, 1);
    expect(k.headline).toBe(l.headline);
    expect(k.kind).toBe('tender');
    expect(k.missing).toEqual(l.missing);
  });

  it('a PDF or Word file is a chat document; a CSV or text file is not', () => {
    expect(isChatDocument({ name: 'tender.pdf', type: 'application/pdf' })).toBe(true);
    expect(isChatDocument({ name: 'quote.docx' })).toBe(true);
    expect(isChatDocument({ name: 'notes.txt', type: 'text/plain' })).toBe(false);
    expect(isChatDocument({ name: 'register.csv' })).toBe(false);
  });
});
