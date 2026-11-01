/* THE KAIZEN EVENT'S BOARD (docs/METHODS.md §16) — the week as day columns, each with what was seen, what was changed and the
 * measure at the day's close, then the 30-day check. Reads and writes the method's answers (props), from lib/kaizenEvent — the module
 * the Kaizen event report is made from, so the board and the paper cannot part. The project's own tools fall in where they answer:
 * what the baseline tools, the changes' tools and the check's chart already say in THIS project, read only, with a button to open or
 * start one — never required; a box is answered in words either way. A client reads and writes nothing. */
import { useEffect, useMemo, useState } from 'react';
import { listStandards, listStudies, onDataChange } from '../../../db';
import { inProject } from '../../../lib/inProject';
import { nav } from '../../../state/useRoute';
import { todayISO } from '../../../lib/weeks';
import { usesOf } from '../../../screens/ProjectToolsScreen';
import { useProjectLooking } from '../../../tools/gemba/useLooking';
import { projectSays } from '../../../tools/gemba/looking';
import type { ToolStudy } from '../../../lib/study';
import type { Standard } from '../../../tools/linestandard/standard';
import { checkOf, dayFields, dayWords, daysOf, eventSays, MOST_DAYS, verdictTone, VERDICTS, type Verdict } from '../../../lib/kaizenEvent';
import { howTool, openable } from '../methodTools';
import type { ShapeProps } from './index';
import './kaizen-event.css';

/** A box that keeps its words when the person leaves it. */
function Box({ id, label, value, canEdit, save, line }: { id: string; label: string; value: string; canEdit: boolean; save: ShapeProps['save']; line?: boolean }) {
  return (
    <label className="kz-f">
      <span className="kz-q">{label}</span>
      {canEdit
        ? (line
          ? <input className="text-input kz-in" defaultValue={value} key={value} aria-label={label} onBlur={e => save(id, e.target.value.trim())} />
          : <textarea className="text-input kz-in" rows={3} defaultValue={value} key={value} aria-label={label} onBlur={e => save(id, e.target.value.trim())} />)
        : <span className="kz-ro">{value || 'Not written yet.'}</span>}
    </label>
  );
}

/** What the project's own record of a tool says, with a button to open it or start one. Read only. */
function ToolSays({ projectId, ids, got, canEdit, onTool, lookingSays }: {
  projectId: string; ids: readonly string[]; got: { studies: ToolStudy[]; standards: Standard[] } | null; canEdit: boolean; onTool: (id: string) => void; lookingSays?: string;
}) {
  return (
    <ul className="kz-tools" aria-label="What the project’s tools already say">
      {ids.map(id => {
        const t = openable(howTool(id));
        if (!t) return null;
        const u = got ? usesOf(t, got.studies, got.standards) : undefined;
        const gemba = id === 'FC-199' ? lookingSays : undefined;
        const says = gemba ?? (u?.n ? `${u.n} in this project — latest: ${u.latest ?? 'unnamed'}.` : u ? 'None used in this project yet.' : 'Reading…');
        return (
          <li key={id} className="kz-tool">
            <span className="kz-tool-n"><b>{t.label}</b> <span className="sub">{says}</span></span>
            <span className="kz-tool-b">
              {(u?.n ?? 0) > 0 && <button type="button" className="btn btn-sm btn-ghost" onClick={() => nav(inProject(t.to, projectId))}>Open {t.label}</button>}
              {canEdit && t.key !== 'talk' && <button type="button" className="btn btn-sm" aria-label={`Start ${t.label} for this event`} onClick={() => onTool(id)}>Start</button>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Board({ projectId, answers, canEdit, save, onTool }: ShapeProps) {
  const today = todayISO();
  const [added, setAdded] = useState(0);
  const [got, setGot] = useState<{ studies: ToolStudy[]; standards: Standard[] } | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => void Promise.all([listStudies(projectId), listStandards(projectId)]).then(([studies, standards]) => { if (live) setGot({ studies, standards }); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId]);
  const looking = useProjectLooking(projectId);
  const lookingSays = looking?.length ? projectSays(looking) : undefined;
  const days = useMemo(() => daysOf(answers, added), [answers, added]);
  const check = checkOf(answers, today);
  const toolIds = (ids: string[]) => ids;

  return (
    <section className="part-sec kz" aria-label="The week, day by day">
      <div className="pace-sec-head">
        <h2 className="kz-title">The week, day by day</h2>
        <p className="kz-sub" role="status">{eventSays(answers, today)}</p>
      </div>
      <div className="kz-start">
        <label className="kz-f kz-startf">
          <span className="kz-q">First day of the event</span>
          {canEdit
            ? <input type="date" className="text-input kz-in" defaultValue={answers['start'] ?? ''} key={answers['start'] ?? ''} aria-label="First day of the event" onBlur={e => save('start', e.target.value)} />
            : <span className="kz-ro">{answers['start'] ? dayWords(answers['start'], true) : 'Not written yet.'}</span>}
        </label>
        <div className="kz-startt">
          <span className="kz-q">The baseline, from the tools used here</span>
          <ToolSays projectId={projectId} ids={toolIds(['FC-001', 'FC-019', 'FC-051'])} got={got} canEdit={canEdit} onTool={onTool} />
        </div>
      </div>

      <div className="kz-days" role="list">
        {days.map(d => {
          const k = dayFields(d.n);
          return (
            <article key={d.n} className="kz-day" role="listitem" aria-label={`Day ${d.n}`}>
              <header className="kz-dayh">
                <h3 className="kz-dayt">Day {d.n}{d.iso ? <span className="sub"> · {dayWords(d.iso, true)}</span> : null}</h3>
                <span className={`kz-word kz-word-${d.word === 'Written' ? 'g' : d.word === 'Under way' ? 'w' : 'n'}`}>{d.word}</span>
              </header>
              <p className="kz-hint">Usually: {d.hint}</p>
              <Box id={k.see} label={`Day ${d.n} — what we saw`} value={d.see} canEdit={canEdit} save={save} />
              <Box id={k.change} label={`Day ${d.n} — what we changed`} value={d.change} canEdit={canEdit} save={save} />
              <Box id={k.measure} label={`Day ${d.n} — the measure at the close`} value={d.measure} canEdit={canEdit} save={save} line />
            </article>
          );
        })}
      </div>
      {canEdit && days.length < MOST_DAYS && (
        <p className="kz-add"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdded(days.length + 1 - 5)}>Add a day</button></p>
      )}
      <ToolSays projectId={projectId} ids={toolIds(['FC-068', 'FC-105'])} got={got} canEdit={canEdit} onTool={onTool} />
      <div className="kz-tools-eyes"><ToolSays projectId={projectId} ids={toolIds(['FC-199'])} got={got} canEdit={canEdit} onTool={onTool} {...(lookingSays ? { lookingSays } : {})} /></div>

      <div className="kz-check" role="group" aria-label="The 30-day check">
        <div className="kz-checkh">
          <h3 className="kz-dayt">The 30-day check</h3>
          <span className={`kz-word kz-word-${check.verdict ? verdictTone(check.verdict) : check.tone}`}>{check.verdict ?? (check.tone === 'r' ? 'Overdue' : 'Not recorded')}</span>
        </div>
        <p className="kz-says" role="status">{check.says}</p>
        <div className="kz-checkg">
          <label className="kz-f">
            <span className="kz-q">The day of the check</span>
            {canEdit
              ? <input type="date" className="text-input kz-in" defaultValue={check.date ?? ''} key={check.date ?? ''} aria-label="The day of the 30-day check" onBlur={e => save('check-date', e.target.value)} />
              : <span className="kz-ro">{check.date ? dayWords(check.date, true) : 'Not booked.'}</span>}
          </label>
          {canEdit && check.suggested && !check.date && (
            <button type="button" className="btn btn-sm" onClick={() => save('check-date', check.suggested as string)}>Book it for {dayWords(check.suggested, true)}</button>
          )}
        </div>
        <div className="kz-verdict" role="radiogroup" aria-label="Is the gain holding at 30 days">
          {VERDICTS.map(v => (
            <button key={v} type="button" role="radio" aria-checked={check.verdict === v} disabled={!canEdit}
              className={`chip kz-v kz-v-${verdictTone(v as Verdict)}${check.verdict === v ? ' on' : ''}`}
              onClick={() => save('check-verdict', check.verdict === v ? '' : v)}>{v}</button>
          ))}
        </div>
        <p className="kz-open"><b>Open actions:</b> {check.open || 'not written yet — under Sustain below.'}</p>
        <p className="kz-open"><b>The measure at 30 days:</b> {check.holding || 'not written yet — under Sustain below.'}</p>
        <ToolSays projectId={projectId} ids={toolIds(['FC-194', 'FC-086'])} got={got} canEdit={canEdit} onTool={onTool} />
      </div>
    </section>
  );
}

export const KAIZEN_EVENT_SHAPE = { Board } as const;
