/* DESCRIBE A CONNECTION (23 November, docs/LUNA-ABILITIES.md P1) — what Luna may do with a file in the register, from code truth. */
import { getStudy } from '../db';
import { machineDocOf } from '../lib/manual/store';
import { sourceOf, type SourceKind } from '../lib/data/sources';
import { connectionBlurb, connectionKindOf, connectionProfile, type ConnectionKind } from '../lib/data/connectionAbilities';
import { allSources, notInHandSaid, standingNow } from './data';
import { checkObject, ID } from './check';
import { anyone } from './access';
import type { CapResult, Capability } from './types';

const KINDS: readonly ConnectionKind[] = ['workbook', 'table', 'document', 'manual'];

function profileSaid(p: ReturnType<typeof connectionProfile>): string {
  const can = p.can.map(a => a.label).join(' · ');
  const not = p.cannot.length ? ` She cannot: ${p.cannot.join('; ')}.` : '';
  return `With a ${p.kind === 'manual' ? 'manual on a machine' : p.kind}, Luna can: ${can}.${not}`;
}

export const describeConnection: Capability = {
  name: 'describe_connection', title: 'What Luna can do with this file', kind: 'read',
  validate: raw => {
    const c = checkObject(raw ?? {}, {
      sourceId: ID('the file in the register'),
      kind: { kind: 'enum', label: 'what kind of connection', values: KINDS },
    });
    if (!c.ok) return c;
    if (!c.input.sourceId && !c.input.kind) return { ok: false, why: 'Say which file (sourceId), or what kind it is (workbook, table, document, manual).' };
    return c;
  },
  allowed: anyone,
  async run(_ctx, input: { sourceId?: string; kind?: ConnectionKind }): Promise<CapResult> {
    let kind: ConnectionKind;
    let name: string | undefined;
    if (input.sourceId) {
      const study = await getStudy(input.sourceId);
      const src = study ? sourceOf(study) : (await allSources()).find(s => s.id === input.sourceId);
      if (!src) return { ok: false, why: `There is no file “${input.sourceId}” in the register — list_sources finds what is connected.` };
      const st = await standingNow(src);
      if (!st.in) return { ok: false, why: notInHandSaid(src, st as Extract<typeof st, { in: false }>) };
      const manual = study ? !!machineDocOf(study) : false;
      kind = connectionKindOf({ kind: src.facts.kind as SourceKind, manual });
      name = src.facts.name;
    } else {
      kind = input.kind as ConnectionKind;
    }
    const p = connectionProfile(kind);
    const says = name ? `“${name}” — ${profileSaid(p)}` : profileSaid(p);
    return {
      ok: true,
      says,
      refs: [],
      data: { kind: p.kind, name, can: p.can, cannot: [...p.cannot], blurb: connectionBlurb(p.kind) },
    };
  },
};

export const CONNECTION: readonly Capability[] = [describeConnection];