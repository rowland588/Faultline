/* THE FIVE ASME SYMBOLS, as shapes (FC-003) — one geometry for the screen (SVG) and the paper (jsPDF), so the two draw the same chart. A symbol is centred on
 * (cx, cy) and fits a square of side 2·s: an operation a circle, a transport an arrow, an inspection a square, a delay a D, a storage an inverted triangle. Told
 * apart by SHAPE and its letter, never by a state colour. */
import type { FlowSymbol } from './processFlow';

export type Shape = { circle: { cx: number; cy: number; r: number } } | { poly: [number, number][] };

export function symbolShape(sym: FlowSymbol, cx: number, cy: number, s: number): Shape {
  const p = (pts: [number, number][]): Shape => ({ poly: pts.map(([x, y]) => [cx + x * s, cy + y * s] as [number, number]) });
  switch (sym) {
    case 'O': return { circle: { cx, cy, r: s } };
    case 'T': return p([[-1, -0.38], [0.15, -0.38], [0.15, -0.85], [1, 0], [0.15, 0.85], [0.15, 0.38], [-1, 0.38]]);
    case 'I': return p([[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]]);
    case 'D': {
      const arc: [number, number][] = [];
      for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + (Math.PI * i) / 12; arc.push([0.1 + 0.9 * Math.cos(a), 0.9 * Math.sin(a)]); }
      return p([[-0.9, -0.9], [0.1, -0.9], ...arc.slice(1, -1), [0.1, 0.9], [-0.9, 0.9]]);
    }
    case 'S': return p([[-1, -0.8], [1, -0.8], [0, 0.95]]);
  }
}
