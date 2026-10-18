/* DESIGN A METHOD — say what you need, see what Faultline proposes, shape it
 * in conversation, keep it (the vision slice, docs/PLATFORM-STATUS.md).
 *
 * Rowland, 18 October: "The user describes what they want. Faultline helps
 * design it, builds the approved methodology from reusable application
 * capabilities, executes it, and lets the user save and reuse it. The
 * library is a foundation for creation, not a ceiling on it."
 *
 * One page, two halves. On the left the conversation: what the person
 * needs, in their words; what Faultline asks before it designs (at most
 * four questions, each with answers to tap — lib/flow/clarifyCore; none
 * when the words say enough, skipped in a tap); what it proposed or changed, a line a
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
import { clarifyNeed, proposeChange, proposeMethod } from '../lib/flow/assist';
import { withAnswers, type ClarifyQuestion } from '../lib/flow/clarifyCore';
import { approveMethod, createMethod, draftNewVersion, saveDraft } from '../lib/flow/operations';
import { useMethods, useOpContext } from '../lib/flow/useFlow';
import { LIBRARY, closest, libraryEntry } from '../lib/flow/library';
import { ESTABLISHED, establishedHref } from '../lib/flow/established';
import { useFactoryLines } from '../lib/useFactoryLines';
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
  /** The questions asked before designing (lib/flow/clarifyCore). */
  asked?: ClarifyQuestion[];
}
/** Questions asked and not yet answered: the need, and the answers so far. */
interface Asking { need: string; questions: ClarifyQuestion[]; answers: string[] }
interface Draft {
  def: FlowDefinition | null; turns: Turn[]; start?: Start; assisted: boolean;
  /** A next version's conversation: when the method it began from was last
   *  saved — a draft kept on this device is set aside if the method moved since. */
  baseAt?: number;
  /** The line it is for (?line=, from New job on a line) — carried to the
   *  project it starts. */
  lineId?: string;
  asking?: Asking;
}

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

  /* WORDS FROM THE FRONT DOOR (screens/StartScreen, ?say=): a new conversation
     that begins with them — never added to one this device kept before */
  const said0 = mode === 'new' && !q.get('template') && !q.get('from') ? (q.get('say') ?? '').trim() : '';
  const line0 = q.get('line') ?? '';
  const [draft, setDraft] = useState<Draft>(() => {
    const d = (said0 ? null : readDraft(store)) ?? { def: null, turns: [], assisted: false };
    return line0 ? { ...d, lineId: line0 } : d;
  });
  const lines = useFactoryLines();
  const onLine = draft.lineId ? lines.find(l => l.id === draft.lineId) : undefined;
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
    if (!methods) return;
    /* a conversation kept on this device about a method that has changed since is not the method as it stands */
    if (!seeded.current && draft.def && versionOf && draft.baseAt !== (openDraft ?? versionOf).updatedAt) {
      seeded.current = false;
      setDraft({ def: null, turns: [], assisted: false });
      return;
    }
    if (seeded.current || draft.def) return;
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
        def: structuredClone(from.definition), assisted: false, baseAt: from.updatedAt,
        turns: [{ who: 'app', text: openDraft
          ? `This is version ${openDraft.version} of “${versionOf.definition.name}”, already a draft — what you change here goes into it. Say what should change.`
          : `This is “${versionOf.definition.name}” as it stands, version ${versionOf.version}. Say what should change; it becomes version ${versionOf.version + 1}, a draft. Projects on version ${versionOf.version} stay on it until they are moved.` }],
      });
    }
  }, [methods, draft.def]); // eslint-disable-line react-hooks/exhaustive-deps -- seeded once, when the methods are first read

  const say = (t: Turn) => setDraft(d => ({ ...d, turns: [...d.turns, t] }));
  function begin(start: Start, d: FlowDefinition) {
    setTouched(new Set());
    setDraft(x => ({
      def: d, start, assisted: x.assisted, ...(x.lineId ? { lineId: x.lineId } : {}),
      turns: [...x.turns, { who: 'app', text: `${start.kind === 'library' ? 'Faultline’s' : 'Your'} “${start.name}”, to adapt — say what is different about your line, the machine, the product or the customer, and it is changed to suit. ${start.kind === 'method' ? 'The method it came from is not changed.' : ''}`.trim() }],
    }));
  }

  /* what is closest to what the person said first — the library offered beside the box */
  const yours = families.filter(f => f.shown.status !== 'retired').map(f => ({ kind: 'method' as const, id: f.shown.id, name: f.shown.definition.name, purpose: f.shown.definition.purpose, words: [] as string[] }));
  const lib = LIBRARY.map(e => ({ kind: 'library' as const, id: e.id, name: e.name, purpose: e.purpose, words: e.words, uses: e.uses }));
  const said = text.trim() || turns.find(t => t.who === 'person')?.text || '';
  const near = said ? closest(said, [...lib, ...yours], 4) : [];
  /* and Faultline's established methods, closest first — each runs on screens of its own, started from New job */
  const est = said ? closest(said, ESTABLISHED, 1)[0] : undefined;

  const startFrom = (s: Start) => {
    if (s.kind === 'library') { const e = libraryEntry(s.id); if (e) begin(s, e.build()); return; }
    const m = methods?.find(x => x.id === s.id);
    if (m) begin(s, { ...structuredClone(m.definition), name: `${m.definition.name} (adapted)` });
  };

  /** A method proposed from the need (with any answers in it). */
  const design = async (description: string, need: string) => {
    const got = await proposeMethod(description);
    if (got.ok) {
      setTouched(new Set(got.def.stages.map(s => s.key)));
      setDraft(d => ({ ...d, def: got.def, assisted: true, turns: [...d.turns, { who: 'assistant', text: `Here is a proposal: ${proposalSaid(got.def)} Read it on the right, and say what should change.`, assumptions: got.assumptions, questions: got.questions }] }));
    } else {
      const offers = closest(need, [...lib, ...yours], 3).map(x => ({ kind: x.kind, id: x.id, name: x.name }));
      say({ who: 'app', text: got.off ? `${got.why} ${offers.length ? 'Closest to what you said, to start from and adapt:' : 'Start from the library below, or write it by hand.'}` : got.why, ...(got.off && offers.length ? { offers } : {}) });
    }
  };

  /* QUESTIONS BEFORE A DESIGN: answered (or skipped), the need goes on to be
     designed with the answers in it, in the person's own words */
  const asking = draft.asking;
  const setAnswer = (i: number, v: string) => setDraft(d => (d.asking ? { ...d, asking: { ...d.asking, answers: d.asking.answers.map((x, j) => (j === i ? v : x)) } } : d));
  const answerAndDesign = async (skip: boolean) => {
    if (!asking || busy) return;
    const said = asking.questions.map((qq, i) => ({ qq, a: asking.answers[i]?.trim() ?? '' })).filter(x => x.a);
    const description = skip ? asking.need : withAnswers(asking.need, asking.questions, asking.answers);
    setErr(null);
    setDraft(d => ({ ...d, asking: undefined, turns: [...d.turns, { who: 'person', text: skip || !said.length ? 'Design it from what I said.' : said.map(x => `${x.qq.ask} — ${x.a}`).join(' · ') }] }));
    setBusy(true);
    try { await design(description, asking.need); } finally { setBusy(false); }
  };

  const send = async (given?: string) => {
    const words = (given ?? text).trim();
    if (!words || busy) return;
    setErr(null);
    say({ who: 'person', text: words });
    setText('');
    setBusy(true);
    try {
      if (!def) {
        /* read first: what the words leave open is asked; off, unreachable or
           unreadable, it is designed from the words as they are */
        const c = await clarifyNeed(words);
        if (c.ok && c.questions.length) {
          setDraft(d => ({
            ...d, asking: { need: words, questions: c.questions, answers: c.questions.map(() => '') },
            turns: [...d.turns, { who: 'assistant', text: `${c.understood ? `${c.understood.replace(/[.\s]*$/, '.')} ` : ''}Before it is designed, ${plural(c.questions.length, 'question')} — tap an answer or write your own, or skip them.`, asked: c.questions }],
          }));
          return;
        }
        await design(words, words);
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

  /* sent once, as if typed here; the address then drops the words, so going
     back to it opens this conversation, not a second one */
  const sentSay = useRef(false);
  useEffect(() => {
    if (!said0 || sentSay.current || !methods || !may) return;
    sentSay.current = true;
    void send(said0).then(() => { try { history.replaceState(history.state, '', '#/design'); } catch { /* the address stays */ } });
  }, [said0, methods, may]); // eslint-disable-line react-hooks/exhaustive-deps -- once, when the methods are read

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
      /* kept, not approved: its own page says what stops it — never kept twice from here */
      if (!a.ok) { writeDraft(store, null); nav(`/methods/${kept.value.id}`); return; }
    }
    writeDraft(store, null);
    nav(`/methods/${kept.value.id}${approve && mode === 'new' ? `?start=1${draft.lineId ? `&line=${encodeURIComponent(draft.lineId)}` : ''}` : ''}`);
  };
  const byHand = async () => {
    if (def) { await keep(false); return; }
    const r = await createMethod(ctx, { definition: blankDefinition(said ? said.split(/[.,;\n]/)[0].slice(0, 60) : 'New method'), origin: 'hand', ...(said ? { changeNote: `From: “${said.slice(0, 120)}”` } : {}) });
    if (r.ok) { writeDraft(store, null); nav(`/methods/${r.value.id}`); } else setErr(r.why);
  };
  const again = () => { setDraft({ def: null, turns: [], assisted: false, ...(draft.lineId ? { lineId: draft.lineId } : {}) }); setTouched(new Set()); setErr(null); writeDraft(store, null); };
  const lastAsked = turns.reduce((k, t, i) => (t.asked ? i : k), -1);

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
          {mode === 'new' && onLine && <p className="sub fw-online" data-line={onLine.id}>On <b>{onLine.name}</b> — the project it starts is on this line.</p>}
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
                  {t.asked && t.asked.length > 0 && (asking && i === lastAsked
                    ? (
                      <div className="fw-asking" aria-label="Questions before it is designed">
                        {asking.questions.map((qq, j) => {
                          const a = asking.answers[j] ?? '';
                          return (
                            <fieldset key={j} className="fw-q" data-q={j}>
                              <legend className="fw-q-ask">{qq.ask}</legend>
                              {qq.why && <span className="sub fw-q-why">{qq.why}</span>}
                              {qq.options.length > 0 && (
                                <div className="fw-q-opts" role="radiogroup" aria-label={qq.ask}>
                                  {qq.options.map(o => <button key={o} type="button" role="radio" aria-checked={a === o} className={'fw-chip fw-chip-b' + (a === o ? ' on' : '')} disabled={busy || !may} onClick={() => setAnswer(j, a === o ? '' : o)}>{o}</button>)}
                                </div>
                              )}
                              <input className="text-input fw-in" aria-label={`Your own answer: ${qq.ask}`} placeholder="Or your own answer" disabled={busy || !may}
                                value={qq.options.includes(a) ? '' : a} onChange={e => setAnswer(j, e.target.value)} />
                            </fieldset>
                          );
                        })}
                        {may && (
                          <div className="fw-acts">
                            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void answerAndDesign(false)}>Design it with these answers</button>
                            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void answerAndDesign(true)}>Skip the questions — design it now</button>
                          </div>
                        )}
                      </div>
                    )
                    : <ul className="fw-list fw-asked">{t.asked.map((qq, j) => <li key={j}>{qq.ask}</li>)}</ul>)}
                  {t.offers && t.offers.length > 0 && (
                    <div className="fw-offers">{t.offers.map(o => <button key={o.id} type="button" className="btn btn-sm" onClick={() => startFrom(o)}>Start from “{o.name}”</button>)}</div>
                  )}
                </li>
              ))}
              {busy && <li className="fw-turn is-assistant" role="status"><span className="fw-turn-who">Faultline — the assistant</span><p>Thinking it through… this can take up to a minute.</p></li>}
            </ol>
          )}
          {may && !asking && (
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
              {/* FAULTLINE'S ESTABLISHED METHODS — not adapted here: each runs on
                  screens of its own, started from New job (lib/flow/established) */}
              <p className="fw-est" data-established={est?.id ?? ''}>
                {est
                  ? <>Or run it as a <b>{est.name}</b> job — {est.screens}. <button type="button" className="btn btn-sm" onClick={() => nav(establishedHref(est.id, draft.lineId))}>Start a {est.name} job ›</button></>
                  : <>Or one of Faultline’s established methods, each with screens of its own: {ESTABLISHED.map((e, i) => <span key={e.id}>{i ? ' · ' : ''}<a href={`#${establishedHref(e.id, draft.lineId)}`}>{e.name}</a></span>)}</>}
              </p>
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
            {/* the work said is what one of Faultline's established methods
                runs on screens of its own — said beside the proposal too,
                so the choice is made knowing it (lib/flow/established) */}
            {mode === 'new' && may && est && (
              <p className="fw-est fw-est-alt" data-established={est.id}>
                Or run it as a <b>{est.name}</b> job instead — {est.screens}.
                <button type="button" className="btn btn-sm" onClick={() => nav(establishedHref(est.id, draft.lineId))}>Start a {est.name} job ›</button>
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
