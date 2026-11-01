/* THE REGISTER TOOLS — which tool a study is, where it opens, and that the router, the rail and the shared links all answer to it. */
import { describe, expect, it } from 'vitest';
import { REGISTER_KEYS, STUDY_KEY, isRegisterKey, isRegisterStudy, registerHref, registerKeyOf } from '../kinds';
import { parseRoute } from '../../../state/useRoute';
import { hereOf } from '../../../ui/rail';
import { studyHref, toolListHref, studyTitle } from '../../../lib/studyLinks';
import type { ToolStudy } from '../../../lib/study';

const study = (tool: ToolStudy['tool'], agreed: ToolStudy['agreed']): ToolStudy => ({ id: 'abc', tool, name: 'x', workspaceId: 'ws1', agreed, facts: {}, uses: [], startedAt: 0, createdAt: 0, updatedAt: 0 });

describe('which register tool a study is', () => {
  it('is read from its own agreed record, on the tool key the database already allows', () => {
    expect(registerKeyOf(study('ledger', { holds: { since: 0 } }))).toBe('holds');
    expect(STUDY_KEY.holds).toBe('ledger');
    expect(STUDY_KEY['fault-tree']).toBe('doc');
  });
  it('is none of them for any other study, nor for a ledger or doc study that is not one', () => {
    expect(registerKeyOf(study('capability', {}))).toBeUndefined();
    expect(registerKeyOf(study('ledger', {}))).toBeUndefined();
    expect(isRegisterStudy(study('doc', {}))).toBe(false);
    expect(isRegisterKey('holds')).toBe(true);
    expect(isRegisterKey('scored')).toBe(false);
  });
});

describe.each(REGISTER_KEYS.map(k => [k] as const))('%s', key => {
  it('opens at an address the router answers: the list, and one record', () => {
    expect(parseRoute(`#${registerHref(key)}`)).toMatchObject({ name: 'studies', view: key });
    expect(parseRoute(`#${registerHref(key, 'abc')}`)).toMatchObject({ name: 'study', view: key, id: 'abc' });
  });
  it('lights its own place in the rail', () => {
    expect(hereOf(parseRoute(`#${registerHref(key)}`))).toBe(key);
    expect(hereOf(parseRoute(`#${registerHref(key, 'abc')}`))).toBe(key);
  });
});

describe('the shared links', () => {
  const h = study('ledger', { holds: { since: 0 } });
  it('a study opens at its tool, and its list is on its line', () => {
    expect(studyHref(h)).toBe('/holds/abc');
    expect(toolListHref(h)).toBe('/holds?line=ws1');
  });
  it('a study is titled by its tool', () => { expect(studyTitle(h)).toBe('Product on hold — x'); });
});
