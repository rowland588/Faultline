import { describe, expect, it } from 'vitest';
import { allFilesSelected, authorBrief, hasSourceContent, pickAuthorSources, scopedOutput, selectedRead, selectPhotoTurns } from '../documentGrounding';
import { trainingDraftGap, libraryDocument, writingRequest } from '../knowledgeDocuments';
import type { ColleagueTurn } from '../conversation';
const call = (name: string,input: unknown) => ({id:'fixture',name,input});

describe('material for a workplace-specific guide', () => {
  it('distinguishes a subject from its intended readers and an illustration', () => {
    expect(authorBrief('Write a guide on this workbench',[]).site?.subject).toBe('workbench');
    expect(authorBrief('Make a guide for our shift leaders on changeover',[]).site).toBeUndefined();
    expect(authorBrief('Create a training guide on our machine. I do not have a photo of it.',[]).note).toBeUndefined();
    expect(authorBrief('Create a guide based on MissingLayout.pdf',[]).site).toBeTruthy();
  });
  it('selects the named photo and excludes an unrelated captioned photograph', () => {
    const photo = {kind:'photo',id:'a',at:1,text:'Boiler inspection',media:{blobKey:'example'}} as ColleagueTurn;
    const labels = new Map([['a','P1']]);
    expect(selectPhotoTurns([photo],'this workbench','workbench',labels)).toEqual([]);
    expect(selectPhotoTurns([photo],'the boiler in P1','boiler',labels)).toEqual([photo]);
  });
  it('requires selected content and keeps a different source or prior report out', () => {
    const file = {id:'granted',name:'Packing procedure.pdf',kind:'manual' as const};
    expect(pickAuthorSources('Use Wrong.pdf',[file])).toEqual([]);
    expect(allFilesSelected('Use “Packing procedure.pdf” and Wrong.pdf',[file])).toBe(false);
    expect(allFilesSelected('Use “Packing procedure.PDF”',[file])).toBe(true);
    expect(selectedRead(call('find_in_document',{documentId:'foreign'}),[file])).toBeFalsy();
    expect(selectedRead(call('find_in_document',{documentId:'granted'}),[file])).toEqual(file);
    expect(hasSourceContent('find_in_document',{ok:true,says:'No hits',refs:[],data:{passages:[]}})).toBe(false);
    expect(hasSourceContent('find_in_document',{ok:true,says:'Page 2',refs:[],data:{passages:[{text:'Check the label'}]}})).toBe(true);
    expect(scopedOutput(call('build_report',{reportId:'foreign',sections:[]}),new Set())).toBe(false);
    expect(scopedOutput(call('build_report',{sections:[{kind:'chart',chartId:'foreign'}]}),new Set())).toBe(false);
  });
  it('rejects a tip offered as a whole course and keeps another method at operational depth', () => {
    expect(trainingDraftGap('Build a SMED training guide',[{kind:'text',heading:'Clean up',text:'Clean the bench.'}])).toBeTruthy();
    const req = writingRequest('Build a SMED training guide');
    expect(req).toBeTruthy();
    const doc = req && libraryDocument(req);
    const words = doc?.sections.map(s=>s.text).join(' ');
    expect(words).toContain('last accepted pack');
    expect(words).toContain('When to choose a different approach');
    expect(words).toContain('who will follow up');
  });
});
