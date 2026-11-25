import { describe, expect, it } from 'vitest';
import { navigationIntent, projectMatches } from '../voiceNavigation';
import type { CapRef } from '../../capabilities/types';

describe('voice navigation', () => {
  it('recognises a spoken route and a direct project name', () => {
    expect(navigationIntent('Luna, open Projects, go to Cellox improvement, open it.')).toEqual({ kind: 'project', name: 'Cellox improvement' });
    expect(navigationIntent('Open project named Packing week')).toEqual({ kind: 'project', name: 'Packing week' });
    expect(navigationIntent('Open projects')).toEqual({ kind: 'section', label: 'Projects', href: '/projects' });
    expect(navigationIntent('Go to Actions')).toEqual({ kind: 'section', label: 'Actions', href: '/actions' });
    expect(navigationIntent('Go to Packing week, open it', true)).toEqual({ kind: 'project', name: 'Packing week' });
    expect(navigationIntent('Go to Packing week, open it')).toBeNull();
    expect(navigationIntent('Show me the projects on Line 2')).toBeNull();
  });

  it('honours section names while already on Projects and allows a project with the same name', () => {
    for (const [name, href] of Object.entries({ Factory: '/room', Lines: '/room', Projects: '/projects', Tools: '/tools', Actions: '/actions', Problems: '/snags' })) {
      expect(navigationIntent('Open ' + name, true)).toEqual({ kind: 'section', label: name, href });
    }
    expect(navigationIntent('Open project named Actions', true)).toEqual({ kind: 'project', name: 'Actions' });
  });

  it('only selects a project from scoped search results, and preserves ambiguity', () => {
    const refs = [
      { kind: 'line', id: 'l', label: 'Packing', href: '/lines/l' },
      { kind: 'project', id: 'p1', label: 'Packing week', href: '/project/p1' },
      { kind: 'project', id: 'p2', label: 'Packing recovery', href: '/project/p2' },
    ] as CapRef[];
    expect(projectMatches('Packing week', refs).map(r => r.id)).toEqual(['p1']);
    expect(projectMatches('Packing', refs).map(r => r.id)).toEqual(['p1', 'p2']);
    expect(projectMatches('No such project', refs)).toEqual([]);
  });
});
