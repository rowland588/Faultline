/* A METHOD'S OWN SHAPE AND PAPER (docs/METHODS.md §16). The default is the method's questions as boxes under each section
 * (MethodSheet). A method that has a shape of its own — the A3's one sheet, the PDCA cycle drawn as a loop, the Kata's storyboard —
 * registers it here: a BOARD drawn at the top of the project's method page, reading and writing the same answers. A method's papers
 * (the A3 on one page, the 8D report, the charter) are registered in papers.ts. One line a method, so each is worked on alone. */
import type { ComponentType } from 'react';
import type { MethodKey } from '../../../lib/methods';
import type { TestItem } from '../../../lib/testing';

export interface ShapeProps {
  projectId: string;
  method: MethodKey;
  /** Every answer, field id → words. */
  answers: Record<string, string>;
  items: Map<string, TestItem>;
  canEdit: boolean;
  /** Write one answer (kept when the person leaves the box; Undo offered). */
  save: (field: string, what: string) => void;
  /** Open a catalogue tool in this project (a tool falling in where it is wanted — never required). */
  onTool: (fcId: string) => void;
}
export interface Shape {
  Board: ComponentType<ShapeProps>;
  /** `none`: the board is the whole interface and the default boxes under each section are not drawn (the tool rows stay). */
  sectionBoxes?: 'default' | 'none';
}
import { TOC_SHAPE } from './toc';
export const SHAPES: Partial<Record<MethodKey, Shape>> = {
  toc: TOC_SHAPE,
};
