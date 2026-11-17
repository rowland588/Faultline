import { describe, expect, it } from 'vitest';
import { actionSourcesOfTags, actionSourcesToTags, actionsFrom, actionText, withActionSources, type ActionSource } from '../actionSources';
import { MAPS } from '../../cloud/mappers';
import type { Snag } from '../../snag/types';
const source: ActionSource = { kind: 'conversation', id: 'conversation-7', part: 'reply-3', href: '/ai?c=conversation-7', label: 'Luna — line 7', how: 'ai', excerpt: 'Possible cause: film tension. Check it on the line — not proven.' };
const row = (id: string, extra: Partial<Snag> = {}): Snag => ({ id, workspaceId: 'line-7', problem: 'Film breaks', proposedSolution: 'Check film tension', status: 'open', raisedAt: 1, updatedAt: 1, ...extra });
describe('action sources', () => {
  it('retains an exact source/reply and its evidence standing across transport, including punctuation and Unicode', () => {
    expect(actionSourcesOfTags(actionSourcesToTags([source]))).toEqual({ sources: [source] });
  });
  it('round-trips a saved action through the real cloud mapper without mixing source tags into observation IDs', () => {
    const s = row('a', { sources: [source], linkedObsIds: ['timed-stop-1'], owner: 'Sam' });
    const cloud = MAPS.snags.toRow(s, 'owner-id');
    const back = MAPS.snags.fromRow(cloud) as unknown as Snag;
    expect(back.sources).toEqual([source]);
    expect(back.linkedObsIds).toEqual(['timed-stop-1']);
    expect(back.owner).toBe('Sam');
    expect(back.proposedSolution).toBe('Check film tension');
    // An older client retains unknown tagged links in its observation list when editing another field.
    const legacy = { ...s, sources: undefined, linkedObsIds: cloud.linked_obs_ids as string[], owner: 'Jo' };
    const again = MAPS.snags.fromRow(MAPS.snags.toRow(legacy, 'owner-id')) as unknown as Snag;
    expect(again.sources).toEqual([source]);
    expect(again.owner).toBe('Jo');
  });
  it('deduplicates the same reference while keeping separate replies and saved uses', () => {
    const next = { ...source, part: 'reply-4' };
    expect(withActionSources([source], [source, next])).toEqual([source, next]);
  });
  it('rejects malformed tags and external/executable destinations', () => {
    expect(actionSourcesOfTags(['source:%broken', 'observation-1', 'source:' + encodeURIComponent(JSON.stringify({ ...source, href: 'javascript:alert(1)' }))])).toEqual({});
    expect(withActionSources([], [{ ...source, href: '//elsewhere.test' }])).toEqual([]);
  });
  it('keeps multiple independently owned actions and closed history; excludes removed work', () => {
    const origin = { ...source, kind: 'problem' as const, id: 'problem-1', href: '/snags?open=problem-1' };
    const a = row('a', { owner: 'Sam', sources: [origin] });
    const b = row('b', { owner: 'Jo', status: 'closed', sources: [origin] });
    expect(actionsFrom([a, b, row('gone', { sources: [origin], deletedAt: 2 }), row('other')], 'problem', 'problem-1')).toEqual([a, b]);
    expect(a.status).toBe('open');
  });
  it('uses the agreed action wording, preserving the original finding and falling back for unplanned problems', () => {
    const s = row('a');
    expect(actionText(s)).toBe('Check film tension');
    expect(s.problem).toBe('Film breaks');
    expect(actionText(row('b', { proposedSolution: '' }))).toBe('Film breaks');
  });
});

describe('project action sources',()=>{
  it('round-trips independently scoped actions without putting them on the legacy default project',()=>{
    const a={id:'independent-1',ownerId:'original-owner',standalone:true,workspaceId:'line-7',clientName:'Acme',what:'Set film tension',why:'Film breaks',who:'Sam',where:'Wrapper',when:'',state:'todo' as const,sources:[source],createdAt:1,updatedAt:2};
    const cloud=MAPS.pace_todos.toRow(a,'different-editor');
    expect(cloud.project_id).toBeNull();expect(cloud.owner_id).toBe('original-owner');
    expect(MAPS.pace_todos.fromRow(cloud)).toMatchObject(a);
  });
});
