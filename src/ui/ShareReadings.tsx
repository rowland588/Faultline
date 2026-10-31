/* USE THESE READINGS IN… — Capability, Control chart and Analysis start from one another's readings (knowledge/specs/
 * FC-094-shared-readings.md; docs/TOOLS-WORLDS.md W1 — Rowland, 31 October: "shared readings yes ... option A"). One sheet,
 * reached from More ▾ on the study (ui/StudyActs StudyBand), reading lib/sharedReadings: the other tools, each with what it
 * will do and what it will ask first; a name; Start makes the new study with the readings copied and opens it. The origin is
 * said on the copy (CopiedFrom, under Where it sits) and on its paper. */
import { useEffect, useState } from 'react';
import { getStudy, putStudy } from '../db';
import { machineOntoLine } from '../lib/lines';
import { now } from '../lib/ids';
import { SHARE_WORDS, copiedSays, shareInto, shareName, shareOffer, type ShareTarget } from '../lib/sharedReadings';
import { studyHref } from '../lib/studyLinks';
import type { ToolStudy } from '../lib/study';
import { nav } from '../state/useRoute';
import { Sheet } from './Sheet';

/** What the target will ask first, when the readings do not bring it: a capability study needs a limit. */
const asksFirst = (s: ToolStudy, t: ShareTarget): string | undefined => {
  if (t !== 'capability') return undefined;
  const r = s.agreed?.readings, c = s.agreed?.chart, a = s.agreed?.analysis;
  const has = (r?.kind === 'limits' && (r.lower !== undefined || r.upper !== undefined)) || c?.lower !== undefined || c?.upper !== undefined || a?.shape?.lower !== undefined || a?.shape?.upper !== undefined;
  return has ? undefined : 'You will be asked for the limits — none is guessed.';
};

export function ShareReadings({ s, onClose, initial }: { s: ToolStudy; onClose: () => void; initial?: ShareTarget }) {
  const offer = shareOffer(s);
  const [target, setTarget] = useState<ShareTarget | null>(initial && offer?.targets.includes(initial) ? initial : offer?.targets[0] ?? null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (target) setName(shareName(s, target)); }, [target, s]);
  if (!offer || !offer.targets.length) return null;
  const go = async () => {
    if (!target || busy || !name.trim()) return;
    const made = shareInto(s, target, { name, at: now() });
    if (!made) return;
    setBusy(true);
    try {
      await putStudy(made);
      if (made.workspaceId && made.machine) await machineOntoLine(made.workspaceId, made.machine);
      onClose();
      nav(studyHref(made));
    } finally { setBusy(false); }
  };
  return (
    <Sheet open onClose={onClose} title="Start from these readings">
      <div className="sr-sheet" data-sheet="share-readings">
        <p className="sub">{offer.values.length} readings, in the order they were taken, are copied into a new study — struck ones are left behind, and this study is not changed. The copy’s readings are its own from then on.</p>
        <div className="sr-opts" role="radiogroup" aria-label="Start which tool">
          {offer.targets.map(t => (
            <button key={t} type="button" role="radio" aria-checked={target === t} data-target={t} className={'sr-opt' + (target === t ? ' on' : '')} onClick={() => setTarget(t)}>
              <b>{SHARE_WORDS[t].action}</b>
              <span>{SHARE_WORDS[t].does}</span>
              {asksFirst(s, t) && <span className="sr-asks">{asksFirst(s, t)}</span>}
            </button>
          ))}
        </div>
        <label className="sr-name"><span className="field-label">Its name</span>
          <input className="text-input" value={name} maxLength={120} aria-label="Name the new study" onChange={e => setName(e.target.value)} /></label>
        <div className="sr-act">
          <button type="button" className="btn btn-primary" disabled={!target || busy || !name.trim()} onClick={() => void go()}>{target ? SHARE_WORDS[target].action : 'Start'}</button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Sheet>
  );
}

/** Under Where it sits on a copy: where its readings came from, and that the source has moved on, if it has. */
export function CopiedFrom({ s }: { s: ToolStudy }) {
  const c = s.facts.copiedFrom;
  const [source, setSource] = useState<ToolStudy | null | undefined>(undefined);
  useEffect(() => {
    if (!c) return;
    let live = true;
    void getStudy(c.id).then(x => { if (live) setSource(x && !x.deletedAt ? x : null); });
    return () => { live = false; };
  }, [c]);
  const says = copiedSays(c, source);
  if (!c || !says) return null;
  return (
    <p className="sub sr-from" data-copied-from>
      {says.head}{source ? <> · <button type="button" className="linkish" onClick={() => nav(studyHref(source))}>Open it</button></> : null}
      {says.moved ? <> — {says.moved}</> : null}
    </p>
  );
}
