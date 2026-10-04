/* THE LEVER TREE FOLLOWS WHO IS LOOKING (CLAUDE.md, "Who can do what").
 *
 * The boxes are tree_nodes rows: supabase/ACCESS_LEVELS.sql refuses a
 * client's insert and update on them (restrictive "editors only" policies),
 * and lets the team write them. So a client's box takes no typing and offers
 * nothing that writes — a box that did would be a button that lies — while
 * still showing everything on it: the words, the state, the number it follows
 * and that the board fills it. The team works the tree; Delete stays with the
 * owner, as everywhere in the app. */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Box } from '../LeverTree';
import { can, type Access } from '../../lib/access';
import type { TreeNodeRow } from '../../db';

const node: TreeNodeRow = {
  id: 'n1', projectId: 'p1', parentId: 'root', text: 'The machine runs without stopping us',
  rag: 'a', sort: 0, createdAt: 1, updatedAt: 1, bind: { line: '2B', categories: ['Plant'] },
};
const noop = () => {};

function draw(level: Access, extra: Record<string, unknown> = {}) {
  return renderToStaticMarkup(createElement(Box, {
    t: { node, depth: 2, kids: [] }, can: can(level),
    folded: false, onFold: noop, moving: null, onPickUp: noop, onPutHere: noop,
    onChange: noop, onAddBelow: noop, onAddRight: noop, onDelete: noop, onPaste: noop,
    onDropText: noop, onMove: noop,
    drag: { id: null, start: noop, over: null, setOver: noop, drop: noop },
    ...extra,
  }));
}

describe('a lever tree box, by who is looking', () => {
  it('shows a client the whole box and gives them nothing that writes', () => {
    const html = draw('client');
    expect(html).toContain('The machine runs without stopping us');
    expect(html).toContain('At risk');
    expect(html).toContain('filled from the board');
    expect(html).not.toContain('<textarea');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('<button');
    expect(html).toContain('draggable="false"');
  });

  it('shows a client which level an empty box is, as words, not a field', () => {
    const html = renderToStaticMarkup(createElement(Box, {
      t: { node: { ...node, text: '  ', bind: undefined }, depth: 1, kids: [] }, can: can('client'),
      folded: false, onFold: noop, moving: null, onPickUp: noop, onPutHere: noop,
      onChange: noop, onAddBelow: noop, onAddRight: noop, onDelete: noop, onPaste: noop,
      onDropText: noop, onMove: noop,
      drag: { id: null, start: noop, over: null, setOver: noop, drop: noop },
    }));
    expect(html).toContain('What needs to be true');
    expect(html).not.toContain('<textarea');
  });

  it('never offers a client a place to put a box being moved', () => {
    expect(draw('client', { moving: 'other' })).not.toContain('Put it here');
    expect(draw('team', { moving: 'other' })).toContain('Put it here');
  });

  it('lets the team work the box, with no Delete', () => {
    const html = draw('team');
    expect(html).toContain('<textarea');
    expect(html).toContain('aria-label="Status"');
    expect(html).toContain('aria-label="Add another below"');
    expect(html).toContain('aria-label="Move up"');
    expect(html).not.toContain('aria-label="Delete"');
  });

  it('gives the owner Delete as well', () => {
    expect(draw('owner')).toContain('aria-label="Delete"');
  });

  it('still shows a client the number a box follows, without the way to let it go', () => {
    const bound = { measure: { id: 'm', name: 'Packs per minute', unit: 'ppm', direction: 'up', sort: 0 }, figure: '54 vs 60 ppm', words: 'Behind target' };
    const html = draw('client', { numbers: { choices: [], bound, pick: noop } });
    expect(html).toContain('54 vs 60 ppm');
    expect(html).toContain('Behind target');
    expect(html).not.toContain('unbind');
  });
});
