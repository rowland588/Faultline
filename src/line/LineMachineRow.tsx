import { useState } from 'react';
import type { Workspace } from '../types';
import type { LineMachine } from '../lib/lineRecords';
import type { Program } from '../lib/programs';
import { isProved } from '../lib/programs';
import { getWorkspace, listObservations, patchWorkspaceRecord, renameLineMachine, removeLineMachine, setMachineFacts } from '../db';
import { MoreMenu } from '../ui/parts';
import { MachinePicture } from '../ui/MachinePicture';
import { offerUndo } from '../ui/Undo';

export function MachineRow({ line, m, machineOrder, may, programs, job }: { machineOrder: string[]; line: Workspace; m: LineMachine; may: boolean; programs: Program[]; job?: string }) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState(m.name);
  const onList = (line.assets ?? []).some(a => a.trim() === m.name);
  const orderedMachines = machineOrder;
  const clash = orderedMachines.find(a => a.trim() !== m.name && a.trim().toLowerCase() === name.trim().toLowerCase());
  const rename = async () => {
    const to = name.trim();
    if (!to || clash) return;
    if (to !== m.name) {
      const current = await getWorkspace(line.id); if (!current) return; const assets = current.assets.some(a => a.trim() === m.name) ? current.assets.map(a => a.trim() === m.name ? to : a) : [...current.assets, to]; await patchWorkspaceRecord(line.id, { assets });
      await renameLineMachine(line.id, m.name, to);
    }
    setNaming(false);
  };
  const takeOff = async () => {
    const stops = (await listObservations(line.id)).filter(o => o.asset === m.name).length;
    const p = programs.length;
    if (!window.confirm([`Take “${m.name}” off ${line.name}?`,
      [stops ? `Its ${stops === 1 ? 'stop keeps' : `${stops} stops keep`} its name.` : '', p ? `Its ${p === 1 ? 'program stays' : `${p} programs stay`} on the line, on no machine.` : '', m.record?.oem ? 'Who made it is kept, and comes back with it.' : ''].filter(Boolean).join(' '),
      'Undo puts it back where it stood.'].filter(Boolean).join('\n\n'))) return;
    const undo=await removeLineMachine(line.id,m.name);
    offerUndo(`Took “${m.name}” off ${line.name}`,undo);
  };
  if (naming) return (
    <li className="pl-machine is-naming" data-machine={m.name}>
      <form className="lt-name" onSubmit={e => { e.preventDefault(); void rename(); }}>
        <input className="text-input" autoFocus value={name} maxLength={48} aria-label={`The machine's name — ${m.name}`} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { setName(m.name); setNaming(false); } }} />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!name.trim() || !!clash}>Save</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setName(m.name); setNaming(false); }}>Cancel</button>
        {clash && <span className="sub lt-clash">{clash} is already on this line — pick another name.</span>}
      </form>
    </li>
  );
  return (
    <li className="pl-machine" data-machine={m.name}>
      {/* ITS OWN PAGE — everything ever done to it, every project's (slice 4, line/LineMachineScreen) */}
      <a className="pl-machine-name" href={`#/lines/${encodeURIComponent(line.id)}/machine/${encodeURIComponent(m.name)}`} aria-label={`${m.name} — its page`}><b>{m.name}</b> ›</a>
      {may
        ? <input className="text-input pl-oem" defaultValue={m.record?.oem ?? ''} key={m.record?.oem ?? ''} maxLength={80} placeholder="Who made it" aria-label={`Who made the ${m.name}`}
            onBlur={e => { const v = e.target.value.trim(); if (v !== (m.record?.oem ?? '')) void setMachineFacts(line.id, m.name, { oem: v }); }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
        : m.record?.oem ? <span className="sub pl-oem-said">{m.record.oem}</span> : null}
      {/* ITS PICTURE, here as on its page (Rowland, 3 November: "you can have it in both places") */}
      <MachinePicture wsId={line.id} name={m.name} record={m.record} compact previewOnly />
      <span className="sub pl-machine-on">{[programs.length ? `${programs.length} program${programs.length === 1 ? '' : 's'}, ${programs.filter(isProved).length} proved` : 'no programs', job ? `brought in by ${job}` : ''].filter(Boolean).join(' · ')}</span>
      {may && <label className="pl-machine-position"><span className="sub">Position</span><select className="text-input" aria-label={`Position of ${m.name}`} value={orderedMachines.findIndex(a => a.trim() === m.name)} onChange={e => { const position = Number(e.target.value); void (async () => { const current = await getWorkspace(line.id); if (!current) return; const items = [...new Set([...orderedMachines, ...current.assets.filter(a => a.trim().toLowerCase() !== 'whole line')])].filter(a => a.trim() !== m.name); items.splice(Math.min(position, items.length), 0, m.name); const placeholders = current.assets.filter(a => a.trim().toLowerCase() === 'whole line'); const assets = [...placeholders, ...items]; await patchWorkspaceRecord(line.id, { assets }); })(); }}>{orderedMachines.map((_, i) => <option key={i} value={i}>{i + 1}</option>)}</select></label>}
      {may && (
        <span className="lt-acts pl-machine-acts" role="group" aria-label={`Actions for ${m.name}`}>
          <MoreMenu label="Edit machine" items={[{ label: 'Rename', run: () => { setName(m.name); setNaming(true); } }, ...(onList && !m.record?.projectId ? [{ label: 'Remove from line', danger: true, run: () => void takeOff() }] : [])]} />
        </span>
      )}
    </li>
  );
}
