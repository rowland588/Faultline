/* WHAT HAS BEEN TRIED ON THIS MACHINE (12 November, docs/LUNAR-KNOWLEDGE.md §5, §8): the machine's history read where each thing lives —
 * what Faultline found (every version), the problems on it and their journeys, each fix and whether it worked, what people said (with how it
 * is known), the studies of it — in time order, under one summary. A fold on the machine's page, shut until opened. Reads only. */
import { useEffect, useState } from 'react';
import { listAllSnags, listAllStudies, onDataChange } from '../../db';
import { outcomesOn } from '../../lib/knowledge/fixes';
import { historyOf, type History } from '../../lib/knowledge/history';
import { listKnowledge } from '../../lib/knowledge/ledger';
import { mayAddKnowledge } from '../../lib/knowledge/may';
import type { ToolStudy } from '../../lib/study';
import { Fold } from '../../ui/Fold';
import type { Workspace } from '../../types';

const day = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function MachineHistory({ line, machine }: { line: Workspace; machine: string }) {
  const [h, setH] = useState<History | null>(null);
  useEffect(() => {
    let live = true, t: ReturnType<typeof setTimeout> | undefined;
    const run = () => void Promise.all([listKnowledge(line.id), listAllSnags(), outcomesOn(line, Date.now(), { write: mayAddKnowledge() }), listAllStudies()]).then(([ledger, snags, outcomes, studies]) => {
      if (!live) return;
      setH(historyOf(line.name, { machine }, { ledger, snags: snags.filter(s => s.workspaceId === line.id), outcomes, studies: (studies as ToolStudy[]).filter(s => s.workspaceId === line.id) }));
    }).catch(() => { /* drawn on the next change */ });
    run();
    const off = onDataChange(() => { clearTimeout(t); t = setTimeout(run, 800); });
    return () => { live = false; clearTimeout(t); off(); };
  }, [line, machine]);
  if (!h) return null;
  return (
    <Fold id="lmc-history" start={false} title="What has been tried" says={h.summary}>
      <section className="pl-sec lmc-history" aria-label="What has been tried" data-machine-history>
        <p data-history-summary>{h.summary}</p>
        {h.events.length === 0
          ? <p className="sub">Nothing found, tried or said about it yet.</p>
          : (
            <ol className="lf-list" data-history-events>
              {h.events.map((e, i) => (
                <li key={`${e.kind}-${e.at}-${i}`} className="lf-row" data-history-kind={e.kind}>
                  <p className="lf-how"><b>{day(e.at)}</b> · {e.says} <span className="sub">({e.known})</span></p>
                </li>
              ))}
            </ol>
          )}
      </section>
    </Fold>
  );
}
