/* MY TEMPLATES (11 November, docs/CONSULTANT-WORKSPACE.md C5 — Rowland: "my assessment frameworks … checklists and reusable templates
 * should be available when I start working with a completely new business … not tied to Branston simply because that was the first
 * factory configured").
 *
 * One calm page: what this is, then one list — each template its name, what it is of and keeps, its note, when it was saved — and,
 * on each, Start one from it (the kind's own New sheet, the template chosen, the active customer's line by default), Change (its name
 * and note) and Take off (with Undo). Saved from a document, a check log or a custom sheet's More ▾ › Save as my template. Reached
 * from the Tools page's My templates fold and the account menu. It reads only the templates (db listTemplates) — no customer's record. */
import { useState } from 'react';
import type { ToolStudy } from '../lib/study';
import { editTemplate, KIND_WORDS, removeTemplate, templateSays } from '../lib/templates';
import { logHref } from '../tools/checks/registry';
import { niceDay, isoDay } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { PageHeader } from '../ui/parts';
import { offerUndo } from '../ui/Undo';
import { useTemplates } from '../ui/MyTemplates';
import { useClientScope } from '../lib/activeClient';

/** Where a template starts a new record: its kind's New sheet, the template picked. */
export const startHref = (t: ToolStudy): string => {
  const q = `?add=1&template=${encodeURIComponent(t.id)}`;
  return t.tool === 'log' ? `${logHref(t.agreed?.log?.key ?? '')}${q}` : `/doc/${encodeURIComponent(t.agreed?.doc?.def ?? '')}${q}`;
};

export function MyTemplatesScreen() {
  const list = useTemplates();
  const cs = useClientScope();
  const at = cs.client ? ` — started at ${cs.client}, the customer you are in` : '';
  return (
    <div className="wrap qsl tpl-page" data-page="templates">
      <PageHeader eyebrow="YOURS · AT ANY CUSTOMER" title="My templates"
        says={<span className="sub" data-templates-says>{list === null ? 'Reading your templates…'
          : list.length ? `${list.length} template${list.length === 1 ? '' : 's'} of your own — documents, check lists and custom sheets on no line and in no customer’s records, ready to start one from${at}.`
            : 'None yet. On a document, a check log or a custom sheet, More ▾ › Save as my template keeps it here — yours, ready at any customer.'}</span>} />
      {list && list.length > 0 && (
        <ul className="lt-rows tpl-rows" aria-label="My templates">
          {list.map(t => <TemplateRow key={t.id} t={t} />)}
        </ul>
      )}
    </div>
  );
}

function TemplateRow({ t }: { t: ToolStudy }) {
  const [changing, setChanging] = useState(false);
  const m = t.facts.template;
  if (!m) return null;
  if (changing) return <li className="lt-li is-naming" data-template={t.name}><ChangeTemplate t={t} onDone={() => setChanging(false)} /></li>;
  const takeOff = async () => {
    const undo = await removeTemplate(t.id);
    offerUndo(`Took “${t.name}” off your templates`, undo);
  };
  return (
    <li className="lt-li tpl-row" data-template={t.name} data-template-kind={m.kind}>
      <button type="button" className="lt-row" onClick={() => nav(startHref(t))} aria-label={`Start one from ${t.name}`}>
        <b className="lt-what">{t.name}</b>
        <span className="lt-says" data-template-says>{KIND_WORDS[m.kind]} · {templateSays(t)}</span>
        <span className="lt-where">{m.note ? <span data-template-note>{m.note} · </span> : null}saved {niceDay(isoDay(m.savedAt))}</span>
      </button>
      <span className="lt-acts tpl-acts">
        <button type="button" className="btn btn-sm btn-primary" data-template-start onClick={() => nav(startHref(t))}>Start one from it</button>
        <button type="button" className="cw-link" data-template-change onClick={() => setChanging(true)} aria-label={`Change ${t.name}`}>Change</button>
        <button type="button" className="cw-link sp-rm" data-template-off onClick={() => void takeOff()} aria-label={`Take ${t.name} off`}>Take off</button>
      </span>
    </li>
  );
}

/** Its name and its note, changed where it sits. */
function ChangeTemplate({ t, onDone }: { t: ToolStudy; onDone: () => void }) {
  const [name, setName] = useState(t.name);
  const [note, setNote] = useState(t.facts.template?.note ?? '');
  const [why, setWhy] = useState('');
  const save = async () => {
    const r = await editTemplate(t.id, { name, note });
    if (r.ok) onDone(); else setWhy(r.why);
  };
  return (
    <form className="lt-name tpl-change" onSubmit={e => { e.preventDefault(); void save(); }} onKeyDown={e => { if (e.key === 'Escape') onDone(); }}>
      <input className="text-input" autoFocus value={name} maxLength={120} aria-label="The template’s name" onChange={e => setName(e.target.value)} />
      <input className="text-input" value={note} maxLength={240} aria-label="A note on the template" placeholder="A note — when you use it" onChange={e => setNote(e.target.value)} />
      {why && <span className="ie-tone is-a" role="alert">{why}</span>}
      <button type="submit" className="btn btn-primary btn-sm" disabled={!name.trim()}>Save</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button>
    </form>
  );
}
