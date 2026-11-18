import './locationPicker.css';
import { useEffect, useMemo, useState } from 'react';
import {getWorkspace,onDataChange} from '../db';
import type {Workspace} from '../types';
import { Sheet } from './Sheet';
import { useLineRecords } from '../lib/useLineRecords';
import { useClientScope } from '../lib/activeClient';
import { areaKey, areaTitle, type AreaId } from '../lib/areas';
import { departmentsOf } from '../lib/departments';
import { areaOfPlace, ensureAreaPlace } from '../lib/areaPlace';
import { workLocation } from '../lib/workLocation';

/** Existing areas and lines over the same records; opening the picker reads the choices. */
export function LocationPicker({open,onClose,onPick,allowAreas=true,allowUnfiled=true}:{open:boolean;onClose:()=>void;allowAreas?:boolean;allowUnfiled?:boolean;onPick:(workspaceId:string|undefined)=>Promise<void>}) {
  return open?<LocationChoices onClose={onClose} onPick={onPick} allowAreas={allowAreas} allowUnfiled={allowUnfiled}/>:null;
}
function LocationChoices({onClose,onPick,allowAreas,allowUnfiled}:{onClose:()=>void;allowAreas:boolean;allowUnfiled:boolean;onPick:(workspaceId:string|undefined)=>Promise<void>}) {
  const rec=useLineRecords(),cs=useClientScope();
  const [query,setQuery]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const areas=useMemo(()=>{
    const found=new Map<string,AreaId>();
    for(const w of rec.all){const a=areaOfPlace(w);if(!w.archived && a)found.set(areaKey(a),a);}
    for(const d of departmentsOf(rec.studies)){const a=d.area;found.set(areaKey(a),a);}
    return [...found.values()].filter(a=>!cs.filtering || a.client===cs.client).sort((a,b)=>areaTitle(a).localeCompare(areaTitle(b)));
  },[rec.all,rec.studies,cs]);
  const matches=(s:string)=>s.toLowerCase().includes(query.trim().toLowerCase());
  const choose=async(get:()=>Promise<string|undefined>)=>{
    if(busy)return;setBusy(true);setError('');
    try{await onPick(await get());onClose();}catch(e){setError(e instanceof Error?e.message:'The location could not be saved.');setBusy(false);}
  };
  return <Sheet open onClose={onClose} title={allowAreas?'Choose location':'Choose line'}>
    <label className="field"><span className="field-label">Find an area or line</span><input className="text-input" type="search" value={query} onChange={e=>setQuery(e.target.value)} aria-label="Find an area or line"/></label>
    {error && <p role="alert" className="sub is-r">{error}</p>}
    {busy && <p role="status" className="sub">Applying location…</p>}
    {allowUnfiled&&<p><button type="button" className="btn btn-ghost" disabled={busy} onClick={()=>void choose(async()=>undefined)}>Keep in Unfiled work</button></p>}
    {rec.loading?<p role="status">Reading locations…</p>:<>
      {allowAreas&&<>
      <h3>Areas</h3>
      <ul className="line-use-rows">{areas.filter(a=>matches([a.client,areaTitle(a)].filter(Boolean).join(' · '))).map(a=><li key={areaKey(a)}><button type="button" className="line-use-open location-choice" disabled={busy} data-place-choice="area" data-area-choice={areaKey(a)} onClick={()=>void choose(async()=>(await ensureAreaPlace(a)).id)}><span className="line-use-kind">Area</span><b>{areaTitle(a)}</b>{a.client&&<span className="line-use-meta">{a.client}</span>}<span className="line-use-go" aria-hidden>›</span></button></li>)}</ul>
      {!areas.length && <p className="sub">No areas yet. Register an area in Factory setup, then place this work here.</p>}
      </>}
      {allowAreas&&<h3>Lines</h3>}
      <ul className="line-use-rows">{rec.lines.filter(w=>workLocation(w).kind==='line' && !w.archived && cs.line(w.id) && matches([w.clientName,w.siteName,w.areaName,w.name].filter(Boolean).join(' · '))).map(w=><li key={w.id}><button type="button" className="line-use-open location-choice" disabled={busy} data-place-choice="line" data-workspace={w.id} onClick={()=>void choose(async()=>w.id)}><span className="line-use-kind">Line</span><b>{w.name}</b><span className="line-use-meta">{[w.clientName,w.siteName,w.areaName].filter(Boolean).join(' · ')}</span><span className="line-use-go" aria-hidden>›</span></button></li>)}</ul>
      <p className="sub">{allowAreas?'You can change this later.':'Choose the source line for this analysis.'}</p>
    </>}
  </Sheet>;
}

export function LocationControl({workspaceId,may,onPick,unfiledText='Saved in Unfiled work'}:{workspaceId?:string;may:boolean;unfiledText?:string;onPick:(workspaceId:string|undefined)=>Promise<void>}) {
  const [loaded,setLoaded]=useState<{id?:string;w?:Workspace;ready:boolean}>({id:workspaceId,ready:!workspaceId});
  useEffect(()=>{let live=true,epoch=0;const load=()=>{const n=++epoch;void (workspaceId?getWorkspace(workspaceId):Promise.resolve(undefined)).then(w=>{if(live&&n===epoch)setLoaded({id:workspaceId,w,ready:true});});};load();const off=onDataChange(load);return()=>{live=false;off();};},[workspaceId]);
  const [open,setOpen]=useState(false);
  const ready=loaded.ready&&loaded.id===workspaceId,w=ready?loaded.w:undefined,place=workLocation(w);
  return <div className="ie-place" data-record-location>
    <p className="part-belongs">{!ready?'Reading location…':<a className="cw-link" href={`#${place.href}`}>{workspaceId&&!w?'Previous location unavailable':place.kind==='unfiled'?unfiledText:`${place.kind==='area'?'Area':'Line'} · ${place.label}`}</a>}{may && <> · <button type="button" className="linkish" onClick={()=>setOpen(true)}>{w?'Change location':'Set location'}</button></>}</p>
    <LocationPicker open={open} onClose={()=>setOpen(false)} onPick={onPick}/>
  </div>;
}
