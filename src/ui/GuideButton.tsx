/* HOW IT WORKS, ON EVERY TOOL'S PAGE (Rowland, 1 November: "all tools must have user guidance .. what's each step means").
 *
 * The frame knows which tool a page belongs to (ui/Frame), so one control in the context bar opens that tool's guide —
 * its steps, what each means, what to do there, what you get — over whatever page is showing, a tool's list or one of its
 * records, without a word of it being typed on any screen. A tool with no guide shows no button (the guides test holds
 * every available tool to one); a mode's steps sit folded under the tool's. */
import { useState } from 'react';
import { ENTRIES, entryById } from '../catalogue';
import { modeGuides, ownGuide, stepCount } from '../catalogue/guide';
import { Sheet } from './Sheet';
import { GuideFold, GuideSteps } from './StepGuide';

export function GuideButton({ toolId }: { toolId: string }) {
  const [open, setOpen] = useState(false);
  const own = ownGuide(toolId);
  const modes = modeGuides(toolId, ENTRIES);
  if (!own && modes.length === 0) return null;
  const name = entryById(toolId)?.name ?? 'This tool';
  return (
    <>
      <button type="button" className="nv-jump nv-guide" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} aria-label={`How ${name} works — what each step means`}>
        <span className="nv-guide-q" aria-hidden>?</span><span className="nv-guide-l">How it works</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`How ${name} works`}>
        <div className="nv-guide-body">
          {own ? <GuideSteps guide={own} label={name} /> : <p className="sub">Choose the kind you are using.</p>}
          {modes.map(m => <GuideFold key={m.id} summary={`${m.name} — ${stepCount(m.guide)}`}><GuideSteps guide={m.guide} label={m.name} /></GuideFold>)}
        </div>
      </Sheet>
    </>
  );
}
