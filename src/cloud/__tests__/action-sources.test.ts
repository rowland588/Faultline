import {describe,expect,it} from 'vitest';
import {mergeRows} from '../sync';
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
