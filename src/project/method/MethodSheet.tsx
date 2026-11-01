/* THE METHOD'S OWN QUESTIONS, ANSWERED IN THE PROJECT (docs/METHODS.md §16; lib/methodSheet). One section's fields as boxes:
 * the question, what a good answer holds, the box; kept when the person leaves the box (a note scoped method:<method>:<field>),
 * so it is the project's and every device's. Where a tool answers the question it is offered beside it — "Use a tool" — and the
 * box is answered in words whether or not one was used. A client reads the answers and writes nothing. */
import { useEffect, useState } from 'react';
import { listTestItems, onDataChange, putTestItem } from '../../db';
import type { TestItem } from '../../lib/testing';
import { answerScope, fieldsOf, sectionState } from '../../lib/methodSheet';
import type { MethodKey } from '../../lib/methods';
import { howTool, openable, toolStateWord } from './methodTools';
import { uid } from '../../lib/ids';
import { offerUndo } from '../../ui/Undo';

export function useAnswers(projectId: string, method: MethodKey): { answers: Record<string, string>; items: Map<string, TestItem> } {
  const [items, setItems] = useState<Map<string, TestItem>>(new Map());
  useEffect(() => {
    let live = true;
    const load = () => void listTestItems(projectId).then(rows => {
      if (!live) return;
      const m = new Map<string, TestItem>();
      for (const i of rows) if (i.kind === 'note' && !i.deletedAt && i.testId.startsWith(`method:${method}:`)) m.set(i.testId, i);
      setItems(m);
    });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId, method]);
  const answers: Record<string, string> = {};
  for (const [scope, i] of items) answers[scope.split(':').slice(2).join(':')] = i.what;
  return { answers, items };
}

export function MethodSheet({ projectId, method, section, answers, items, canEdit, onTool }: {
  projectId: string; method: MethodKey; section: string; answers: Record<string, string>; items: Map<string, TestItem>; canEdit: boolean;
  onTool: (id: string) => void;
}) {
  const fields = fieldsOf(method, section);
  if (!fields.length) return null;
  const st = sectionState(method, section, answers);
  const save = (field: string, what: string) => {
    const scope = answerScope(method, field);
    const had = items.get(scope);
    if ((had?.what ?? '') === what) return;
    const t = Date.now();
    const next: TestItem = had ? { ...had, what, updatedAt: t } : { id: uid(), projectId, testId: scope, kind: 'note', what, sort: t, createdAt: t, updatedAt: t };
    void putTestItem(next);
    offerUndo(`Saved — ${fields.find(x => x.id === field)?.label ?? field}`, async () => { await putTestItem(had ?? { ...next, deletedAt: Date.now() }); });
  };
  return (
    <div className="msheet" aria-label={`${section} — what the method asks`}>
      <p className="msheet-state" role="status"><b>{st.word}</b> · {st.written} of {st.fields} written</p>
      {fields.map(fl => {
        const value = answers[fl.id] ?? '';
        const tools = (fl.tools ?? []).map(id => ({ id, h: howTool(id) })).filter(x => x.h.how !== 'unknown' && x.h.how !== 'notyet');
        return (
          <label key={fl.id} className="msheet-f">
            <span className="msheet-q">{fl.label}</span>
            <span className="msheet-hint">{fl.hint}</span>
            {canEdit
              ? (fl.line
                ? <input className="text-input msheet-in" defaultValue={value} key={value} aria-label={fl.label} onBlur={e => save(fl.id, e.target.value.trim())} />
                : <textarea className="text-input msheet-in" rows={3} defaultValue={value} key={value} aria-label={fl.label} onBlur={e => save(fl.id, e.target.value.trim())} />)
              : <span className="msheet-ro">{value || 'Not written yet.'}</span>}
            {tools.length > 0 && (
              <span className="msheet-tools">
                <span className="sub">A tool that answers it:</span>
                {tools.map(({ id, h }) => {
                  const o = openable(h);
                  return o
                    ? <button key={id} type="button" className="chip msheet-tool" onClick={() => onTool(id)} aria-label={`Use ${h.how === 'unknown' ? id : h.entry.name} for ${fl.label}`}>{h.how === 'unknown' ? id : h.entry.name}<span className="sub"> — {toolStateWord(h)}</span></button>
                    : null;
                })}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
