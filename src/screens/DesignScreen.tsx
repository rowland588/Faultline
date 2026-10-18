/* DESIGN A METHOD — say what you need, see what Faultline proposes, shape it
 * in conversation, keep it (the vision slice, docs/PLATFORM-STATUS.md).
 *
 * Rowland, 18 October: "The user describes what they want. Faultline helps
 * design it, builds the approved methodology from reusable application
 * capabilities, executes it, and lets the user save and reuse it. The
 * library is a foundation for creation, not a ceiling on it."
 *
 * One page, two halves. On the left the conversation: what the person
 * needs, in their words; what Faultline proposed or changed, a line a
 * change, what it took for granted, what it would ask (each answerable in
 * a tap). On the right the method as it now stands, drawn as its own page
 * draws it, with what the validator says. Every turn after the first
 * changes the method as it stands — the same names keep their keys
 * (lib/flow/change keepKeys) — so a person shapes it rather than starting
 * again. Beside the box, the library: Faultline's methods and the person's
 * own, closest to what they said first, any of them a starting point to
 * adapt. Nothing is kept until they keep it — a draft, marked by where it
 * came from — and nothing runs until it is approved.
 *
 * Three ways in, one page: from nothing (#/design), from a library entry or
 * a method of one's own to make a new method from (?template=, ?from=), or a
 * method's next version (?version=) — kept into its open draft if it has
 * one, so there is only ever one next version.
 *
 * AI OFF: the assistant is optional. With it off the page says so, the
 * library still finds what is closest to the person's words, and Write it
 * by hand opens the editor — nothing on this page needs it to be useful.
 *
 * WHICH RECORD: the Method (lib/flow/records); the conversation itself is a
 * per-device draft (sessionStorage), the kept method's history says how it
 * began. WHERE IT SHOWS: the control room's band, Methods, a method's page
 * (Change it with the assistant, Adapt it), the new-project screen. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { nav, useRoute } from '../state/useRoute';
import { useCanStartProjects } from '../cloud/access';
import { allSteps, type FlowDefinition } from '../lib/flow/definition';
import { validateDefinition } from '../lib/flow/validate';
import { proposeChange, proposeMethod } from '../lib/flow/assist';
import { approveMethod, createMethod, draftNewVersion, saveDraft } from '../lib/flow/operations';
import { useMethods, useOpContext } from '../lib/flow/useFlow';
import { LIBRARY, closest, libraryEntry } from '../lib/flow/library';
import { blankDefinition } from '../lib/flow/templates';
import type { Change } from '../lib/flow/change';
import { familiesOf } from './MethodsScreen';
import { MethodPreview } from '../ui/flow/MethodPreview';
import { Words } from '../ui/flow/MethodParts';

interface Start { kind: 'library' | 'method'; id: string; name: string }
interface Turn {
  who: 'person' | 'assistant' | 'app';
  text: string;
  changes?: Change[];
  assumptions?: string[];
  questions?: string[];
  /** Starting points offered with this turn — closest to what was said. */
  offers?: Start[];
}
interface Draft { def: FlowDefinition | null; turns: Turn[]; start?: Start; assisted: boolean }

const plural = (n: number, one: string, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;
const keyOfPage = (q: URLSearchParams) => `fl.design.${q.get('version') ? `v:${q.get('version')}` : q.get('from') ? `f:${q.get('from')}` : q.get('template') ? `t:${q.get('template')}` : 'new'}`;
const readDraft = (k: string): Draft | null => { try { const s = sessionStorage.getItem(k); return s ? JSON.parse(s) as Draft : null; } catch { return null; } };
const writeDraft = (k: string, d: Draft | null) => { try { if (d) sessionStorage.setItem(k, JSON.stringify(d)); else sessionStorage.removeItem(k); } catch { /* private mode */ } };

/** The stages a turn changed — marked on the method so the eye goes to them. */
function touchedBy(prev: FlowDefinition, next: FlowDefinition): Set<string> {
  const out = new Set<string>();
  for (const st of next.stages) {
    const was = prev.stages.find(p => p.key === st.key);
    if (!was || JSON.stringify(was) !== JSON.stringify(st)) out.add(st.key);
  }
  return out;
}

/** What a proposal is, in a line. */
function proposalSaid(def: FlowDefinition): string {
  const steps = allSteps(def);
  const tools = steps.filter(r => r.step.component).length;
  const ms = def.measures ?? [];
  return `“${def.name}” — ${plural(def.stages.length, 'stage')}, ${plural(steps.length, 'step')}${tools ? `, ${tools} done with the app’s tools` : ''}${ms.length ? `, measuring ${ms.map(m => m.name.toLowerCase()).join(' and ')} before and after` : ''}.`;
}

export function DesignScreen() {
  const route = useRoute();
  const q = route.query;
  const store = keyOfPage(q);
  const may = useCanStartProjects();
  const ctx = useOpContext(may ? 'owner' : 'client');
  const methods = useMethods();
  const families = useMemo(() => familiesOf(methods ?? []), [methods]);

  const versionOf = q.get('version') ? methods?.find(m => m.id === q.get('version')) : undefined;
  const openDraft = versionOf ? methods?.find(m => m.familyId === versionOf.familyId && m.status === 'draft' && m.id !== versionOf.id) : undefined;
  const mode: 'new' | 'version' = q.get('version') ? 'version' : 'new';

  const [draft, setDraft] = useState<Draft>(() => readDraft(store) ?? { def: null, turns: [], assisted: false });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const box = useRef<HTMLTextAreaElement>(null);
  const { def, turns } = draft;
  useEffect(() => { writeDraft(store, draft.def || draft.turns.length ? draft : null); }, [store, draft]);

  /* THE STARTING POINT, once the methods are read: a library entry, a method
     to make a new one from, or a method's next version */
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || draft.def || !methods) return;
    const t = q.get('template'), f = q.get('from'), v = q.get('version');
    if (t) {
      const e = libraryEntry(t);
      if (e) { seeded.current = true; begin({ kind: 'library', id: e.id, name: e.name }, e.build()); }
    } else if (f) {
      const m = methods.find(x => x.id === f);
      if (m) { seeded.current = true; begin({ kind: 'method', id: m.id, name: m.definition.name }, { ...structuredClone(m.definition), name: `${m.definition.name} (adapted)` }); }
    } else if (v && versionOf) {
      seeded.current = true;
      const from = openDraft ?? versionOf;
      setDraft({
        def: structuredClone(from.definition), assisted: false,
        turns: [{ who: 'app', text: openDraft
          ? `This is version ${openDraft.version} of “${versionOf.definition.name}”, already a draft — what you change here goes into it. Say what should change.`
          : `This is “${versionOf.definition.name}” as it stands, version ${versionOf.version}. Say what should change; it becomes version ${versionOf.version + 1}, a draft. Projects on version ${versionOf.version} stay on it until they are moved.` }],
      });
    }
  }, [methods]); // eslint-disable-line react-hooks/exhaustive-deps -- seeded once, when the methods are first read

  const say = (t: Turn) => setDraft(d => ({ ...d, turns: [...d.turns, t] }));
  function begin(start: Start, d: FlowDefinition) {
    setTouched(new Set());
    setDraft(x => ({
      def: d, start, assisted: x.assisted,
      turns: [...x.turns, { who: 'app', text: `${start.kind === 'library' ? 'Faultline’s' : 'Your'} “${start.name}”, to adapt — say what is different about your line, the machine, the product or the customer, and it is changed to suit. ${start.kind === 'method' ? 'The method it came from is not changed.' : ''}`.trim() }],
    }));
  }

  /* what is closest to what the person said first — the library offered beside the box */
  const yours = families.filter(f => f.shown.status !== 'retired').map(f => ({ kind: 'method' as const, id: f.shown.id, name: f.shown.definition.name, purpose: f.shown.definition.purpose, words: [] as string[] }));
  const lib = LIBRARY.map(e => ({ kind: 'library' as const, id: e.id, name: e.name, purpose: e.purpose, words: e.words, uses: e.uses }));
  const said = text.trim() || turns.find(t => t.who === 'person')?.text || '';
  const near = said ? closest(said, [...lib, ...yours], 4) : [];

  const startFrom = (s: Start) => {
    if (s.kind === 'library') { const e = libraryEntry(s.id); if (e) begin(s, e.build()); return; }
    const m = methods?.find(x => x.id === s.id);
    if (m) begin(s, { ...structuredClone(m.definition), name: `${m.definition.name} (adapted)` });
  };

  const send = async () => {
    const words = text.trim();
    if (!words || busy) return;
    setErr(null);
    say({ who: 'person', text: words });
    setText('');
    setBusy(true);
    try {
      if (!def) {
        const got = await proposeMethod(words);
        if (got.ok) {
          setTouched(new Set(got.def.stages.map(s => s.key)));
          setDraft(d => ({ ...d, def: got.def, assisted: true, turns: [...d.turns, { who: 'assistant', text: `Here is a proposal: ${proposalSaid(got.def)} Read it on the right, and say what should change.`, assumptions: got.assumptions, questions: got.questions }] }));
        } else {
          const offers = closest(words, [...lib, ...yours], 3).map(x => ({ kind: x.kind, id: x.id, name: x.name }));
          say({ who: 'app', text: got.off ? `${got.why} ${offers.length ? 'Closest to what you said, to start from and adapt:' : 'Start from the library below, or write it by hand.'}` : got.why, ...(got.off && offers.length ? { offers } : {}) });
        }
      } else {
        const prev = def;
        const got = await proposeChange(def, words);
        if (got.ok) {
          setTouched(touchedBy(prev, got.def));
          setDraft(d => ({
            ...d, def: got.def, assisted: true,
            turns: [...d.turns, { who: 'assistant', text: got.changes.length ? `Changed ${plural(got.changes.length, 'thing')}:` : 'Nothing in the method changed — say it another way, or change it by hand once it is kept.', changes: got.changes, assumptions: got.assumptions, questions: got.questions }],
          }));
        } else say({ who: 'app', text: got.off ? `${got.why} Keep it as it is and change it by hand — every part is written on the method’s own page.` : got.why });
      }
    } finally { setBusy(false); }
  };

  const checked = useMemo(() => (def ? validateDefinition(def) : null), [def]);
  const firstWords = turns.find(t => t.who === 'person')?.text.replace(/\s+/g, ' ');
  const note = [
    draft.start ? (draft.start.kind === 'library' ? `From Faultline’s library: “${draft.start.name}”` : `Adapted from “${draft.start.name}”`) : '',
    firstWords ? `${draft.assisted ? 'Designed with the assistant from' : 'From'}: “${firstWords.length > 120 ? `${firstWords.slice(0, 117)}…` : firstWords}”` : '',
  ].filter(Boolean).join(' · ');

  const keep = async (approve: boolean) => {
    if (!def) return;
    setErr(null);
    const c = { ...ctx, source: draft.assisted ? 'assistant' as const : 'person' as const };
    const kept = mode === 'version' && versionOf
      ? openDraft ? await saveDraft(c, openDraft.id, def, note || openDraft.changeNote) : await draftNewVersion(c, versionOf.id, def, note || undefined)
      : await createMethod(c, {
        definition: def, origin: draft.assisted ? 'assistant' : draft.start?.kind === 'library' ? 'library' : draft.start ? 'copy' : 'hand',
        ...(note ? { changeNote: note } : {}), ...(draft.start?.kind === 'method' ? { parentId: draft.start.id } : {}),
      });
    if (!kept.ok) { setErr(kept.why); return; }
    if (approve) {
      const a = await approveMethod(ctx, kept.value.id);
      if (!a.ok) { setErr(`${a.why} ${a.issues?.map(i => i.message).join(' ') ?? ''}`.trim()); return; }
    }
    writeDraft(store, null);
    nav(`/methods/${kept.value.id}${approve && mode === 'new' ? '?start=1' : ''}`);
  };
  const byHand = async () => {
    if (def) { await keep(false); return; }
    const r = await createMethod(ctx, { definition: blankDefinition(said ? said.split(/[.,;\n]/)[0].slice(0, 60) : 'New method'), origin: 'hand', ...(said ? { changeNote: `From: “${said.slice(0, 120)}”` } : {}) });
    if (r.ok) { writeDraft(store, null); nav(`/methods/${r.value.id}`); } else setErr(r.why);
  };
  const again = () => { setDraft({ def: null, turns: [], assisted: false }); setTouched(new Set()); setErr(null); writeDraft(store, null); };

  if (!methods) return <div className="wrap fw"><p className="sub">Opening…</p></div>;
  if (mode === 'version' && !versionOf) return <div className="wrap fw"><p className="sub">That method is not on this device.</p><button type="button" className="btn btn-primary" onClick={() => nav('/methods')}>Every method</button></div>;

  const placeholder = def ? 'What should change? e.g. “Our line runs two shifts — time a changeover on each”, “Quality signs the last stage, not the line lead”.'
    : 'e.g. “Changeovers on the Line 4 bagger take 45 minutes and we need them under 15”, or “We are fitting a new case packer and need it proved before production takes it”.';
  return (
    <div className="wrap fw fw-design">
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pl-eyebrow">{mode === 'version' ? 'A NEW VERSION' : 'DESIGN A METHOD'} · <a href="#/methods" className="pl-fac">Every method ›</a></p>
          <h1>{mode === 'version' && versionOf ? `Change “${versionOf.definition.name}”` : 'What do you need to achieve?'}</h1>
          <p className="pl-says">{mode === 'version' ? 'Say what should change; every change is said before anything is kept.' : 'Say it in your own words. Faultline proposes a method built from the app’s own tools and checks — you shape it, approve it, and run it.'}</p>
        </div>
      </header>
      {!may && <p className="sub">You can read methods. Only someone invited to the app designs them.</p>}

      <div className={'fw-studio' + (def ? ' has-def' : '')}>
        <section className="fw-talk" aria-label="The conversation">
          {turns.length > 0 && (
            <ol className="fw-turns">
              {turns.map((t, i) => (
                <li key={i} className={'fw-turn is-' + t.who}>
                  <span className="fw-turn-who">{t.who === 'person' ? 'You' : t.who === 'assistant' ? 'Faultline — the assistant' : 'Faultline'}</span>
                  <p>{t.text}</p>
                  {t.changes && t.changes.length > 0 && <ul className="fw-changes">{t.changes.map((c, j) => <li key={j} className={'fw-ch is-' + c.what}><b>{c.what}</b> {c.text}</li>)}</ul>}
                  {t.assumptions && t.assumptions.length > 0 && <div className="fw-f"><span className="field-label">What it took for granted</span><ul className="fw-list">{t.assumptions.map((a, j) => <li key={j}>{a}</li>)}</ul></div>}
                  {t.questions && t.questions.length > 0 && (
                    <div className="fw-f"><span className="field-label">What it would ask you</span>
                      <ul className="fw-list">{t.questions.map((qq, j) => (
                        <li key={j}><span>{qq}</span> <button type="button" className="fw-chip fw-chip-b" onClick={() => { setText(`${qq} — `); box.current?.focus(); }}>Answer</button></li>
                      ))}</ul>
                    </div>
                  )}
                  {t.offers && t.offers.length > 0 && (
                    <div className="fw-offers">{t.offers.map(o => <button key={o.id} type="button" className="btn btn-sm" onClick={() => startFrom(o)}>Start from “{o.name}”</button>)}</div>
                  )}
                </li>
              ))}
              {busy && <li className="fw-turn is-assistant" role="status"><span className="fw-turn-who">Faultline — the assistant</span><p>Thinking it through… this can take up to a minute.</p></li>}
            </ol>
          )}
          {may && (
            <form className="fw-ask-box" onSubmit={e => { e.preventDefault(); void send(); }}>
              <label className="fw-f"><span className="field-label">{def ? 'What should change' : 'What you need, in your words'}</span>
                <textarea ref={box} className="text-input fw-in" rows={def ? 3 : 5} value={text} maxLength={def ? 2000 : 4000} disabled={busy}
                  aria-label={def ? 'What should change' : 'What you need, in your words'} placeholder={placeholder}
                  onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(); } }} /></label>
              <div className="fw-acts">
                <button type="submit" className="btn btn-primary" disabled={busy || text.trim().length < (def ? 5 : 20)}>{busy ? 'Thinking it through…' : def ? 'Change it' : 'Design it'}</button>
                <button type="button" className="btn" disabled={busy} onClick={() => void byHand()}>{def ? 'Keep it and write it by hand' : 'Write it by hand'}</button>
                {(def || turns.length > 0) && mode === 'new' && <button type="button" className="btn btn-ghost" disabled={busy} onClick={again}>Start again</button>}
              </div>
            </form>
          )}

          {!def && may && (
            <section className="fw-start" aria-label="Start from the library">
              <h2 className="ln-h">{near.length ? 'Closest to what you said — start from one and adapt it' : 'Or start from the library and adapt it'}</h2>
              <ul className="fw-lib fw-lib-s">
                {(near.length ? near : lib).map(x => (
                  <li key={`${x.kind}:${x.id}`} className="fw-card" data-start={x.id}>
                    <div className="fw-card-b">
                      <span className="fw-card-h"><b className="fw-card-t">{x.name}</b><span className="fw-chip">{x.kind === 'library' ? 'From Faultline' : 'Yours'}</span></span>
                      <span className="fw-card-p">{x.purpose}</span>
                      {'uses' in x && x.uses.length > 0 && <span className="fw-card-m">Uses {x.uses.join(', ')}</span>}
                      <span className="fw-acts"><button type="button" className="btn btn-sm" onClick={() => startFrom({ kind: x.kind, id: x.id, name: x.name })}>Start from this</button></span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>

        {def && checked && (
          <section className="fw-proposed" aria-label="What Faultline proposes">
            {may && (
              <label className="fw-f fw-inline"><span className="field-label">Its name</span>
                <Words value={def.name} label="The method's name" onSave={v => { if (v) setDraft(d => (d.def ? { ...d, def: { ...d.def, name: v } } : d)); }} /></label>
            )}
            <MethodPreview def={checked.def ?? def} errors={checked.errors} warnings={checked.warnings} touched={touched} />
            {err && <p className="sub is-r" role="alert">{err}</p>}
            {may && (
              <div className="fw-acts fw-keep">
                {mode === 'version' && versionOf
                  ? <>
                    <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void keep(false)}>{openDraft ? `Keep it in version ${openDraft.version} (the draft)` : `Keep it as version ${versionOf.version + 1} (a draft)`}</button>
                    <button type="button" className="btn" disabled={busy || !checked.ok} onClick={() => void keep(true)}>Keep and approve it</button>
                  </>
                  : <>
                    <button type="button" className="btn btn-primary" disabled={busy || !checked.ok} onClick={() => void keep(true)}>Approve it and start a project</button>
                    <button type="button" className="btn" disabled={busy} onClick={() => void keep(false)}>Keep it as a draft</button>
                  </>}
                <span className="sub">{checked.ok ? 'Kept, it is in your library — yours to change, copy, adapt and version. Every project keeps the version it started on.' : 'It can be kept as a draft now and put right on its page; it is approved once it can run.'}</span>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
