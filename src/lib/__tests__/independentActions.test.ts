import {describe,expect,it} from 'vitest';
import {inProject,DEFAULT_PROJECT_ID} from '../../db/projects';
import {independentActions} from '../projectActions';
import type {PaceTodoRow} from '../../db/rows';
const base:PaceTodoRow={id:'action-1',standalone:true,what:'Set film tension',why:'Film breaks',where:'Wrapper',who:'Sam',when:'',due:'2026-11-18',state:'todo',workspaceId:'line-7',clientName:'Acme',createdAt:1,updatedAt:1};
describe('independent action scope',()=>{
 it('keeps new independent work out of the legacy default project without moving old records',()=>{
  expect(inProject(DEFAULT_PROJECT_ID)(base)).toBe(false);
  expect(inProject(DEFAULT_PROJECT_ID)({id:'legacy'} as {projectId?:string})).toBe(true);
  expect(inProject('project-7')({...base,projectId:'project-7'})).toBe(true);
 });
 it('names the actual line, task and reason with owner/date, and calculates lateness from the agreed day',()=>{
  const [a]=independentActions([base],'2026-11-19',()=> 'Line 7');
  expect(a).toMatchObject({todoId:'action-1',what:'Set film tension',why:'Film breaks',where:'Line 7 · Wrapper',who:'Sam',due:'2026-11-18',late:true,workspaceId:'line-7'});
 });
 it('keeps closed work available when requested, without putting it back in the open list',()=>{
  const done={...base,state:'done' as const,doneOn:'2026-11-19'};
  expect(independentActions([done],'2026-11-20')).toEqual([]);
  expect(independentActions([done],'2026-11-20',()=>undefined,true)[0].late).toBe(false);
 });
});
