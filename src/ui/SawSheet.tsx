/* "I SAW…" — something seen on the line, put on a bone of the fishbone.
 *
 * Genchi genbutsu — go and see (docs/OPEX.md): an observation made on the
 * floor by a named person, on a day, is real evidence. It is graded OBSERVED,
 * signed with the name of whoever is signed in, and saved as a cause on the
 * problem it belongs to — the one open on the page, or the line's own gap
 * problem, which is opened for it when the line has none yet.
 *
 * WHICH RECORD: a Cause on a Case (cases.causes, merged by id). WHERE IT SHOWS:
 * as a mark on its bone, with its photo, on screen and in the client report's
 * fishbone — the same cause, one record. No new noun: an observation that
 * turns out to matter is confirmed and drilled like any other cause. */
import { useEffect, useState } from 'react';
import { Sheet } from './Sheet';
import { Evidence } from './EvidenceDoors';
import { EvidenceViewer } from './Evidence';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { SIXM, type Cause, type SixM } from '../lib/sixm';
import { PHASE_WORD, type ProblemView, type ProblemsApi } from '../lib/problems';
import { uid } from '../lib/ids';
import type { MediaRef } from '../types';
import type { PaceLineRow } from '../db';

/** The pick for "the line's gap" — a problem opened for it when there is none. */
const GAP = '__gap__';

export function SawSheet({ open, projectId, line, problems, api, problemId, bone, onClose, onSaved }: {
  open: boolean;
  projectId: string;
  /** The line it was seen on — what a new gap problem is opened against. */
  line?: PaceLineRow;
  /** The problems it could go on (this line's). */
  problems: ProblemView[];
  api: Pick<ProblemsApi, 'create' | 'saveCause'>;
  /** The problem open on the page, picked to start with. */
  problemId?: string;
  /** A bone picked to start with. */
  bone?: SixM;
  onClose: () => void;
  /** Saved — on this problem. */
  onSaved?: (problemId: string) => void;
}) {
  const { session } = useSession();
  const by = displayName(session?.user.email) || undefined;
  const openOnes = problems.filter(p => p.problem.status === 'open');
  const gapOne = openOnes.find(p => p.problem.source?.kind === 'gap');
  /* The page's problem is picked only when it can take a cause here — an open
     one. Opened on a closed problem's page, the box showed the first open
     problem while the save went to the closed one, which was not on the list. */
  const firstPick = () => (problemId && openOnes.some(p => p.problem.id === problemId) ? problemId : undefined)
    ?? gapOne?.problem.id ?? openOnes[0]?.problem.id ?? GAP;
  const [m, setM] = useState<SixM | null>(bone ?? null);
  const [text, setText] = useState('');
  const [media, setMedia] = useState<MediaRef[]>([]);
  const [target, setTarget] = useState<string>(firstPick);
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setTarget(firstPick()); },
    // only when it opens or the page's problem changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, problemId]);

  const save = async () => {
    if (!m || !text.trim() || busy) return;
    setBusy(true);
    try {
      let pid = target;
      if (pid === GAP) {
        const c = await api.create({
          title: line ? `${line.name} — the gap to target` : 'The gap to target',
          lineId: line?.id, source: { kind: 'gap' },
        });
        pid = c.id;
      }
      const cause: Cause = {
        id: uid(), m, text: text.trim(), grade: 'observed', status: 'suspected',
        source: { kind: 'observation', label: by ? `Seen by ${by}` : 'Seen on the line' },
        whys: [], by, at: Date.now(), media: media.length ? media : undefined,
      };
      await api.saveCause(pid, cause);
      setText(''); setMedia([]); setM(bone ?? null);
      onSaved?.(pid);
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="I saw…">
      <div className="saw" data-project={projectId}>
        <p className="sub">
          What you saw on {line ? <b>{line.name}</b> : 'the line'}, first-hand. It goes on the fishbone as
          <b> observed</b>{by ? <>, by <b>{by}</b></> : null}, today — evidence with a name and a day on it.
        </p>
        <div className="saw-bones" role="group" aria-label="Which bone">
          {SIXM.map(b => (
            <button key={b.key} type="button" className={'chip saw-bone' + (m === b.key ? ' on' : '')}
              aria-pressed={m === b.key} title={b.blurb} onClick={() => setM(b.key)}>{b.label}</button>
          ))}
        </div>
        {m && <p className="saw-blurb">{SIXM.find(b => b.key === m)?.label}: {SIXM.find(b => b.key === m)?.blurb}</p>}
        <label className="cw-f cw-f-wide"><span>WHAT YOU SAW</span>
          <textarea rows={3} value={text} maxLength={400}
            placeholder="e.g. Night shift runs with one operator on the infeed after 2am"
            onChange={e => setText(e.target.value)} /></label>
        <label className="cw-f cw-f-wide"><span>ON WHICH PROBLEM</span>
          <select value={target} onChange={e => setTarget(e.target.value)}>
            {openOnes.map(p => (
              <option key={p.problem.id} value={p.problem.id}>{p.problem.title} — {PHASE_WORD[p.phase]}</option>
            ))}
            {!gapOne && <option value={GAP}>{line ? `${line.name} — the gap to target (opened for it)` : 'The gap to target (opened for it)'}</option>}
          </select></label>
        <Evidence media={media} kind="found"
          onAdd={async refs => { setMedia(x => [...x, ...refs]); }}
          onView={setViewing} />
        <div className="ax-foot">
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!m || !text.trim() || busy} onClick={() => void save()}>
            Put it on the fishbone
          </button>
        </div>
      </div>
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)} />}
    </Sheet>
  );
}
