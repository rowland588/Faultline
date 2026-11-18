import type {ToolStudy} from '../lib/study';
import type {Workspace} from '../types';
import {lunaSavedWork} from '../lib/workLocation';
import {LineUseList} from '../line/LineUseList';

/** Links to original subjects; no copies of their conversation or produced records. */
export function LunaSavedWork({studies,places,workspaceIds}:{studies:ToolStudy[];places:Workspace[];workspaceIds:string[]}) {
  const ids=new Set(workspaceIds),uses=lunaSavedWork(studies,places).filter(r=>r.workspaceId&&ids.has(r.workspaceId));
  return uses.length?<section aria-label="Luna subjects in this location" data-luna-saved-work><h3>Luna conversations</h3><LineUseList uses={uses}/></section>:null;
}
