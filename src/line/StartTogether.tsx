/* START TOGETHER — the tools ticked on a line's Tools page, started on that line in one go
 * (Rowland, 25 October: "go to a line, click tools, tick multiple tools and then these tools are
 * available ... and a merged report"). One row a tool: what it is of, and the machine; Start makes
 * each one the line's, so the line's report holds them. Nothing is agreed here — each tool asks
 * what is agreed when it is opened, as it does from its own list. */
import { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { TOOL_WORDS } from '../screens/StudiesScreen';
import { startStudyOn } from '../lib/startStudy';
import type { StudyTool } from '../lib/study';

export function StartTogether({ open, onClose, line, lineName, tools, onDone }: {
  open: boolean; onClose: () => void; line: string; lineName: string;
  /** The ticked tools that can be started this way: their study kind and the name the line calls them. */
  tools: { tool: StudyTool; label: string }[];
  onDone: (said: string) => void;
}) {
  const [what, setWhat] = useState<Record<string, string>>({});
  const [machine, setMachine] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const ready = tools.length > 0 && tools.every(t => (what[t.tool] ?? '').trim()) && !busy;
  const make = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      for (const t of tools) await startStudyOn(t.tool, line, what[t.tool] ?? '', machine[t.tool] ?? '');
      onDone(`Started on ${lineName}: ${tools.map(t => t.label).join(', ')}. Open each from its row.`);
      setWhat({}); setMachine({}); onClose();
    } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={`Start together on ${lineName}`}>
      <form className="lt-new st-together" onSubmit={e => { e.preventDefault(); void make(); }}>
        {tools.map(t => {
          const w = TOOL_WORDS[t.tool];
          return (
            <fieldset key={t.tool} className="st-t">
              <legend>{t.label}</legend>
              <label className="field"><span className="field-label">What is it of?</span>
                <input className="text-input" value={what[t.tool] ?? ''} maxLength={120} placeholder={w?.placeholder} aria-label={`${t.label} — what is it of`} onChange={e => setWhat({ ...what, [t.tool]: e.target.value })} />
              </label>
              <label className="field"><span className="field-label">{w?.second.label ?? 'On which machine?'} <i className="sub">optional</i></span>
                <input className="text-input" value={machine[t.tool] ?? ''} maxLength={80} placeholder={w?.second.placeholder} aria-label={`${t.label} — which machine`} onChange={e => setMachine({ ...machine, [t.tool]: e.target.value })} />
              </label>
            </fieldset>
          );
        })}
        <button type="submit" className="btn btn-primary" disabled={!ready}>Start {tools.length === 1 ? 'it' : `these ${tools.length}`}</button>
      </form>
    </Sheet>
  );
}
