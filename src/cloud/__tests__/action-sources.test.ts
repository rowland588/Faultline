import {describe,expect,it} from 'vitest';
import {hydrateActionMetadata,mergeRows} from '../sync';
import {actionSourcesToTags,type ActionSource} from '../../lib/actionSources';
const one:ActionSource={kind:'conversation',id:'conversation-1',part:'reply-1',href:'/ai?c=conversation-1',label:'Original observation',how:'ai',excerpt:'A suggestion, not verified.'};
const two={...one,part:'reply-2',label:'Later observation'};
describe('source references added on two devices',()=>{
 it('keeps distinct replies from the same conversation instead of merging their shared record id',()=>{
  const got=mergeRows({sources:[]},{sources:[one]},{sources:[two]},true);
  expect(got.row.sources).toEqual([two,one]);expect(got.lost).toEqual([]);
 });
 it('retains both added source tags beside the winning observation list',()=>{
  const a=actionSourcesToTags([one]),b=actionSourcesToTags([two]);
  const got=mergeRows({linked_obs_ids:[]},{linked_obs_ids:['stop-1',...a]},{linked_obs_ids:['stop-2',...b]},false);
  expect(got.row.linked_obs_ids).toEqual(['stop-2',...b,...a]);
 });
 it('respects an explicit removal while retaining a different newly added source',()=>{
  const got=mergeRows({sources:[one]},{sources:[]},{sources:[one,two]},false);
  expect(got.row.sources).toEqual([two]);
 });
});

describe('upgrading a cache that did not understand action metadata',()=>{
 it('hydrates independent placement/owner/sources before equal-clock echo checks without losing an unsent task edit',()=>{
   const local={id:'task',what:'My revised wording',who:'Sam',updatedAt:40,sources:[]};
   const raw={id:'task',what:'Previous wording',who:'Sam',why:'Finding',state:'todo',where:'Wrapper',when:'',standalone:true,workspace_id:'line-A',client_name:'A',owner_id:'owner-A',sources:[one],created_at:1,updated_at:40};
   expect(hydrateActionMetadata('pace_todos',local,raw)).toMatchObject({what:'My revised wording',who:'Sam',updatedAt:40,standalone:true,workspaceId:'line-A',clientName:'A',ownerId:'owner-A',sources:[one]});
 });
 it('retains deliberately cleared placement on an already understood action',()=>{
   const local={id:'task',standalone:true,workspaceId:undefined,clientName:undefined,ownerId:'owner',sources:[]};
   expect(hydrateActionMetadata('pace_todos',local,{standalone:true,workspace_id:'old-place',sources:[one]})).toBe(local);
 });
 it('fills a previously unread test source without changing its outcome',()=>{
   expect(hydrateActionMetadata('tests',{id:'test',result:'failed',updatedAt:10},{id:'test',sources:[one]})).toMatchObject({result:'failed',updatedAt:10,sources:[one]});
 });
});
