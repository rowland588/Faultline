import { describe, it, expect } from 'vitest';
import { pageKey, previousPage, step, type NavEntry } from '../navHistory';
const e=(hash:string,position:number):NavEntry=>({hash,position});
describe('page Back preserves browser positions',()=>{
  it('starts with the current page',()=>expect(step([],e('#/room',0))).toEqual([e('#/room',0)]));
  it('adds forward pages and replaces the same browser position',()=>{
    const t=step([e('#/room',0)],e('#/tools',1));
    expect(step(t,e('#/tools?view=saved',1))).toEqual([e('#/room',0),e('#/tools?view=saved',1)]);
  });
  it('trims several visited entries after a native jump back',()=>{
    expect(step([e('#/room',0),e('#/tools',1),e('#/tools?view=saved',2),e('#/capability/a',3)],e('#/tools?view=saved',2))).toEqual([e('#/room',0),e('#/tools',1),e('#/tools?view=saved',2)]);
  });
  it('a new branch discards the abandoned forward entries',()=>{
    expect(step([e('#/room',0),e('#/tools',1),e('#/capability/a',2)],e('#/lines/l',1))).toEqual([e('#/room',0),e('#/lines/l',1)]);
  });
  it('keeps repeated visits to a page at their actual positions',()=>{
    expect(step([e('#/room',0),e('#/tools',1)],e('#/room',2))).toHaveLength(3);
  });
  it('skips list filters, selected records and panel positions in one move',()=>{
    const t=[e('#/room',0),e('#/snags',1),e('#/snags?only=late',2),e('#/snags?only=late&open=issue',3)];
    expect(previousPage(t,'#/snags?only=late&open=issue',5)).toEqual(e('#/room',0));
  });
  it('returns to the precise prior page including its saved-work selection',()=>{
    const t=[e('#/room',0),e('#/tools',1),e('#/tools?view=saved',2),e('#/capability/a',3)];
    expect(previousPage(t,'#/capability/a?inspect=readings',4)).toEqual(e('#/tools?view=saved',2));
  });
  it('does not offer page Back for filters alone on a fresh deep link',()=>{
    expect(previousPage([e('#/tools',0),e('#/tools?view=saved',1)],'#/tools?view=saved',1)).toBeUndefined();
  });
  it('keeps different records, places and explicit page tabs distinct',()=>{
    for(const [a,b] of [['#/capability/a','#/capability/b'],['#/programs?line=a','#/programs?line=b'],['#/area?site=x&area=a','#/area?site=x&area=b'],['#/lines/a?view=tools','#/lines/a?view=machines']])expect(pageKey(a)).not.toBe(pageKey(b));
    expect(pageKey('#/lines/a')).toBe(pageKey('#/lines/a?view=overview'));
    expect(pageKey('#/w/a/analyse?measure=minutes&path=asset:Filler')).toBe(pageKey('#/w/a/analyse'));
  });
  it('retains sixty entries and their true browser positions',()=>{
    let t:NavEntry[]=[];for(let i=0;i<80;i++)t=step(t,e(`#/p${i}`,i));
    expect(t).toHaveLength(60);expect(t[0].position).toBe(20);expect(t[59].position).toBe(79);
  });
});
