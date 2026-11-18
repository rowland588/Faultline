/* A LINE'S REPORTS TAB (16 November, docs/NAV.md — Rowland: "I couldn't then get onto the correct reports and the correct page … multiple
 * doors … Customers like simple reports that they can simply look at something and understand … I want this fixed").
 *
 * A place has two reports and only two:
 *   One-page summary  headline findings, actions and recorded outcomes
 *   Line report  the full package — every record on the line, every problem and its card, every program and test, every machine,
 *               each tool's own paper, behind a cover (lib linePackage; untick what should not go on its own page)
 * and below them the papers already made for the line, kept in the app (lib/keptPdfs). No other door on the line leads to a line report. */
import { useEffect, useState } from 'react';
import { listStudiesForLine, onDataChange } from '../../db';
import type { KeptPdf } from '../../lib/keptPdfs';
import { nav } from '../../state/useRoute';
import { SavedCopiesList, useKeptHere } from '../../ui/SavedCopies';

export function LineReports({ wsId, disabled, summary }: { wsId: string; disabled: boolean; summary: () => Promise<void> }) {
  const catalogued=useKeptHere();
  const [talkCopies,setTalkCopies]=useState<{wsId:string;items:KeptPdf[]}>({wsId,items:[]});
  useEffect(()=>{
    let live=true,epoch=0;
    const load=()=>{const request=++epoch;void listStudiesForLine(wsId).then(studies=>{
      if(!live || request!==epoch)return;
      setTalkCopies({wsId,items:studies.filter(s=>!s.deletedAt && s.tool==='talk').flatMap(s=>(s.facts.turns ?? []).flatMap(t=>(t.pdfs ?? []).map(p=>({id:p.id,key:p.key,name:p.name,at:p.at,updatedAt:p.at,size:0,page:`#/talk/${s.id}`,ids:[wsId,s.id],workspaceId:wsId,kind:'other',audience:'internal' as const}))))});
    }).catch(()=>undefined);};
    load();const off=onDataChange(load);return()=>{live=false;off();};
  },[wsId]);
  const keys=new Set(catalogued.flatMap(p=>[p.key,...p.ids]));
  const kept=[...catalogued,...(talkCopies.wsId===wsId ? talkCopies.items.filter(p=>!keys.has(p.key) && !keys.has(p.id)) : [])].sort((a,b)=>b.at-a.at);
  const [making, setMaking] = useState(false);
  const makeSummary = async () => { setMaking(true); try { await summary(); } finally { setMaking(false); } };
  const full = `/lines/${encodeURIComponent(wsId)}/report?full=1`;
  return (
    <section className="pl-sec lrs" aria-label="Reports on this line" data-line-reports>
      <ul className="lrs-l">
        <li className="lrs-i" data-line-report="summary">
          <div className="lrs-t">
            <b>One-page summary</b>
            <span className="sub">One page for the customer — headline findings, actions and recorded outcomes.</span>
          </div>
          <span className="lrs-a">
            <button type="button" className="btn btn-primary" disabled={disabled || making} onClick={() => void makeSummary()}>{making ? 'Making…' : 'Download PDF'}</button>
          </span>
        </li>
        <li className="lrs-i" data-line-report="everything">
          <div className="lrs-t">
            <b>Line report</b>
            <span className="sub">Choose the findings, actions, programs, machines, tool results and Line Talk documents to include.</span>
          </div>
          <span className="lrs-a">
            <button type="button" className="btn btn-primary" onClick={() => nav(full)}>Choose contents</button>
          </span>
        </li>
      </ul>
      <section className="lrs-saved" aria-label="Saved reports on this line">
        <h2>Saved reports</h2>
        <SavedCopiesList items={kept} />
      </section>
    </section>
  );
}
