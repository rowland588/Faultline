import { describe, expect, it } from 'vitest';
import { ASK_SOURCE_ONCE, conversationalDoc, FORMAT_ASK, FORMAT_CHIPS_DRAFT, FORMAT_CHIPS_UPLOAD, formatTitle, formatWanted, lastAttachedSource } from '../conversationalDocs';
import { writingRequest } from '../knowledgeDocuments';
import { helloSaid } from '../hello';
import { fastChatKind } from '../../tools/colleague/colleagueAssist';

describe('conversationalDoc', () => {
  it('turns the last chat upload into an SOP, work instruction, training or slides', () => {
    expect(conversationalDoc('the document I just uploaded — turn it into an SOP')).toEqual({ kind: 'from-upload', format: 'sop' });
    expect(conversationalDoc('Turn this into a work instruction')).toEqual({ kind: 'from-upload', format: 'instruction' });
    expect(conversationalDoc('Make the last upload into a training pack')).toEqual({ kind: 'from-upload', format: 'training' });
    expect(conversationalDoc('convert that pdf into a presentation')).toEqual({ kind: 'from-upload', format: 'presentation', export: 'slides' });
  });

  it('chips after an upload or a draft are the same intents', () => {
    expect(conversationalDoc('Make this an SOP')).toEqual({ kind: 'from-upload', format: 'sop' });
    expect(conversationalDoc('Work instruction')).toEqual({ kind: 'from-upload', format: 'instruction' });
    expect(conversationalDoc('Training')).toEqual({ kind: 'from-upload', format: 'training' });
    expect(conversationalDoc('Slides')).toEqual({ kind: 'follow-up', format: 'presentation', export: 'slides' });
    expect(conversationalDoc('HTML')).toEqual({ kind: 'follow-up', export: 'html' });
    expect(conversationalDoc('and slides')).toEqual({ kind: 'follow-up', format: 'presentation', export: 'slides' });
  });

  it('asks once when they did not say SOP vs work instruction', () => {
    expect(conversationalDoc('turn this into a document')).toEqual({ kind: 'offer' });
    expect(conversationalDoc('the document I just uploaded — turn it into that')).toEqual({ kind: 'offer' });
    expect(FORMAT_ASK).toMatch(/SOP or a work instruction/);
    expect(FORMAT_CHIPS_UPLOAD).toEqual(['Make this an SOP', 'Work instruction', 'Training']);
    expect(FORMAT_CHIPS_DRAFT).toEqual(['Make this an SOP', 'Slides', 'HTML']);
  });

  it('leaves make a report / put that in a report to conversation acts', () => {
    expect(conversationalDoc('put that in a report')).toBeUndefined();
    expect(conversationalDoc('make a report')).toBeUndefined();
    expect(conversationalDoc('write that up as a report')).toBeUndefined();
  });

  it('leaves a graph HTML dashboard to the dashboard path', () => {
    expect(conversationalDoc('Turn that graph into an HTML dashboard')).toBeUndefined();
    expect(conversationalDoc('Turn that document into html')).toEqual({ kind: 'follow-up', export: 'html' });
  });

  it('leaves make-it-more-visual to the illustrated-document path', () => {
    expect(conversationalDoc('Make it more visual')).toBeUndefined();
    expect(conversationalDoc('turn this into a document')).toEqual({ kind: 'offer' });
  });

  it('leaves a training document for X to the library or the gateway', () => {
    expect(conversationalDoc('Make me a training document for 5S')).toBeUndefined();
    expect(writingRequest('Make me a training document for 5S')?.subject).toMatch(/5S/i);
    expect(conversationalDoc('Make me a training document for lockout tagout')).toBeUndefined();
    expect(writingRequest('Make me a training document for lockout tagout')?.subject).toMatch(/lockout tagout/i);
  });

  it('hello and fast chat do not swallow these asks', () => {
    const hour = { hour: 10, name: 'Rowland' };
    expect(helloSaid('Make me a training document for lockout tagout', hour)).toBeNull();
    expect(helloSaid('the document I just uploaded — turn it into an SOP', hour)).toBeNull();
    expect(helloSaid('Make this an SOP', hour)).toBeNull();
    expect(fastChatKind('Make me a training document for lockout tagout')).toBeNull();
    expect(fastChatKind('the document I just uploaded — turn it into an SOP')).toBeNull();
    expect(fastChatKind('Make this an SOP')).toBeNull();
    expect(fastChatKind('Hello Luna')).toBe('hello');
  });

  it('binds the last attached chat file, never invents a site', () => {
    const src = lastAttachedSource([
      { name: 'factory_source', status: 'done', refs: [{ kind: 'study', id: 'up1', label: 'Reel change.pdf — factory source', href: '' }], at: 10 },
      { name: 'factory_source', status: 'done', refs: [{ kind: 'study', id: 'up2', label: 'Older.pdf — factory source', href: '' }], at: 5 },
    ]);
    expect(src).toEqual({ id: 'up1', name: 'Reel change.pdf' });
    expect(lastAttachedSource([])).toBeUndefined();
    expect(ASK_SOURCE_ONCE).toMatch(/will not invent the factory/);
    expect(formatTitle('sop', 'Reel change.pdf')).toBe('Reel change — SOP');
    expect(formatWanted({ kind: 'from-upload', format: 'instruction' })).toBe('instruction');
    expect(formatWanted({ kind: 'offer' })).toBeUndefined();
    expect(formatWanted({ kind: 'follow-up', export: 'slides' })).toBe('presentation');
  });
});
