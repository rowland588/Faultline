/* SCAN THE MACHINE (lib/qr, lib/machineLabels, lib/report/codeHeader). The
   code itself is proved by scanning it: the browser check renders the PDF and
   decodes every label back to its link. Here: the shape of the code, the
   links, the labels, and the header's two forms. */
import { describe, it, expect } from 'vitest';
import { qrModules, QUIET } from '../qr';
import { jobLink, machineLabels, machineLink } from '../machineLabels';
import { codeHeader } from '../report/codeHeader';
import type { Asset } from '../testing';

const BASE = 'https://faultline.example/';
const a = (o: Partial<Asset>): Asset => ({ id: 'x', projectId: 'p', name: 'M', state: 'onSite', sort: 1, updatedAt: 1, ...o } as Asset);

describe('the code', () => {
  it('is a square of a QR size, with the three finder squares in their corners', () => {
    const m = qrModules(machineLink(BASE, 'p1', 'a1'));
    const n = m.length;
    expect(m.every(r => r.length === n)).toBe(true);
    expect((n - 21) % 4).toBe(0);
    /* A finder square: its outer ring dark, the ring inside it light, a 3×3 dark heart. */
    const finder = (r0: number, c0: number) => {
      for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
        const ring = i === 0 || i === 6 || j === 0 || j === 6, heart = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        if (m[r0 + i][c0 + j] !== (ring || heart)) return false;
      }
      return true;
    };
    expect(finder(0, 0) && finder(0, n - 7) && finder(n - 7, 0)).toBe(true);
    expect(QUIET).toBe(4);
  });
  it('the same link, the same code', () => {
    expect(qrModules('abc')).toEqual(qrModules('abc'));
    expect(qrModules('abc')).not.toEqual(qrModules('abd'));
  });
});

describe('the links', () => {
  it('a machine opens over its job’s Install page, the way the app already opens it', () => {
    expect(machineLink(BASE, 'p1', 'a 1')).toBe('https://faultline.example/#/project/p1/install?open=a%201');
  });
  it('a report’s code opens the job', () => {
    expect(jobLink(BASE, 'p1')).toBe('https://faultline.example/#/project/p1');
  });
});

describe('the labels', () => {
  it('one per machine, in the job’s order, deleted ones left out, the supplier said', () => {
    const ls = machineLabels({ project: { id: 'p1', name: 'Line 2' }, base: BASE, assets: [
      a({ id: 'b', name: 'Ishida checkweigher', sort: 2 }), a({ id: 'a', name: 'Ilapak flow wrapper', oem: 'Ilapak UK', sort: 1 }),
      a({ id: 'c', name: 'Old', sort: 3, deletedAt: 9 }), a({ id: 'd', name: '  ', sort: 4 }),
    ] });
    expect(ls.map(l => l.machine)).toEqual(['Ilapak flow wrapper', 'Ishida checkweigher', 'Machine not named']);
    expect(ls[0]).toEqual({ machine: 'Ilapak flow wrapper', oem: 'Ilapak UK', job: 'Line 2', link: machineLink(BASE, 'p1', 'a') });
  });
});

describe('the header', () => {
  const o = { eyebrow: 'CLIENT REPORT · STAGE GATE', title: 'Line 2', line: 'Printed 10 Oct 2026', colour: '#1f63e0' };
  it('with no address, the three lines it always was', () => {
    expect(codeHeader(o, 'comfortable').length).toBe(3);
  });
  it('with the job’s address, one block: the lines and the code beside them', () => {
    expect(codeHeader({ ...o, link: jobLink(BASE, 'p1') }, 'comfortable').length).toBe(1);
  });
});
