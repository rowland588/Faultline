/* MY TEMPLATES ON SCREEN (11 November, docs/CONSULTANT-WORKSPACE.md C5; lib/templates) — the consultant's own starting points:
 *
 *   SaveTemplateSheet   More ▾ › Save as my template on a document, a check log or a custom sheet: a name, a note, and what to keep
 *   FromMyTemplates     the New sheet's "Start from" — your templates of that kind first, the built-in start still there
 *   useTemplates        every template on this device, kept current
 *
 * A template is never a customer's record: on no line, in no project, left out of every list (db/studies listAllStudies). */
import { useCallback, useEffect, useState } from 'react';
import { listTemplates, onDataChange } from '../db';
import type { ToolStudy } from '../lib/study';
import { keepChoices, saveAsTemplate, templateKindOf, templateSays, type TemplateKeep } from '../lib/templates';
import { nav } from '../state/useRoute';
import { Sheet } from './Sheet';

/** Every template on this device, newest first — null until read. */
export function useTemplates(): ToolStudy[] | null {
  const [list, setList] = useState<ToolStudy[] | null>(null);
  const load = useCallback(async () => setList(await listTemplates()), []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  return list;
}

/** SAVE AS MY TEMPLATE — a name (the record's, by default), a short note, and what to keep. Nothing of the record changes. */
export function SaveTemplateSheet({ s, onClose }: { s: ToolStudy; onClose: () => void }) {
  const kind = templateKindOf(s);
  const [name, setName] = useState(s.name || '');
  const [note, setNote] = useState('');
  const [keep, setKeep] = useState<TemplateKeep>('structure');
  const [busy, setBusy] = useState(false);
  const [why, setWhy] = useState('');
  const [saved, setSaved] = useState<ToolStudy | null>(null);
  if (!kind) return null;
  const save = async () => {
    if (busy) return;
    setBusy(true); setWhy('');
    try {
      const r = await saveAsTemplate(s, { name, note, keep });
      if (r.ok) setSaved(r.t); else setWhy(r.why);
    } finally { setBusy(false); }
  };
  return (
    <Sheet open onClose={onClose} title="Save as my template">
      {saved ? (
        <div className="tpl-saved" data-template-saved={saved.id}>
          <p role="status"><b>Saved as your template “{saved.name}”.</b> It is yours — on no line and in no customer’s records — and offered when you start one at any customer.</p>
          <p className="sub">{templateSays(saved)}</p>
          <div className="tpl-acts">
            <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
            <button type="button" className="btn" onClick={() => { onClose(); nav('/templates'); }}>My templates</button>
          </div>
        </div>
      ) : (
        <form className="lt-new tpl-save" data-sheet="save-template" onSubmit={e => { e.preventDefault(); void save(); }}>
          <p className="sub">Your own starting point, kept apart from every customer — offered whenever you start a {kind === 'log' ? 'check log of this kind' : kind === 'sheet' ? 'custom sheet' : 'document of this kind'}, at any customer.</p>
          <label className="field"><span className="field-label">Its name</span>
            <input className="text-input" value={name} maxLength={120} autoFocus aria-label="The template’s name" onChange={e => setName(e.target.value)} placeholder="e.g. My site assessment" />
          </label>
          <label className="field"><span className="field-label">A note <i className="sub">optional — when you use it</i></span>
            <input className="text-input" value={note} maxLength={240} aria-label="A note on the template" onChange={e => setNote(e.target.value)} placeholder="e.g. First visit to a packing site" />
          </label>
          <fieldset className="tpl-keep"><legend className="field-label">What to keep</legend>
            {keepChoices(kind).map(c => (
              <label key={c.keep} className={'tpl-keep-o' + (keep === c.keep ? ' is-on' : '')}>
                <input type="radio" name="tpl-keep" value={c.keep} checked={keep === c.keep} onChange={() => setKeep(c.keep)} aria-label={c.label} />
                <span><b>{c.label}</b><span className="sub">{c.says}</span></span>
              </label>
            ))}
          </fieldset>
          {why && <p className="tpl-why ie-tone is-a" role="alert">{why}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>Save as my template</button>
        </form>
      )}
    </Sheet>
  );
}

/** START FROM — the New sheet's choice: the built-in start (when there is one) and each of your templates of this kind. '' = built-in. */
export function FromMyTemplates({ templates, value, onChange, builtIn }: { templates: ToolStudy[]; value: string; onChange: (id: string) => void; builtIn?: string }) {
  if (!templates.length) return null;
  return (
    <fieldset className="tpl-from" data-from-templates><legend className="field-label">Start from</legend>
      <div className="chip-row" role="group" aria-label="Start from">
        {templates.map(t => (
          <button key={t.id} type="button" className={'chip' + (value === t.id ? ' on' : '')} aria-pressed={value === t.id} data-template-pick={t.name} onClick={() => onChange(t.id)}>{t.name}</button>
        ))}
        {builtIn && <button type="button" className={'chip' + (value === '' ? ' on' : '')} aria-pressed={value === ''} data-template-pick="" onClick={() => onChange('')}>{builtIn}</button>}
      </div>
      {value && (() => { const t = templates.find(x => x.id === value); return t ? <p className="sub tpl-from-says">From my templates — {templateSays(t)}{t.facts.template?.note ? ` · ${t.facts.template.note}` : ''}</p> : null; })()}
    </fieldset>
  );
}
