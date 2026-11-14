/* THE STORY — the client's continuous journey, the page opened in front of them (8 November, docs/STORY.md §3; lib/clientStory).
 *
 * Rowland, 8 November: "the story so far is a continuous journey … I run an update and it pulls it all into a beautiful report."
 * One story a client (the client the lines name — the one picked on the Factory page when there are two): its brief, the four figures
 * as they stand today, what has changed since the last chapter, and the chapters, newest first. RUN AN UPDATE drafts the next chapter
 * — the snapshot frozen, the words assembled from the modules' own sentences (the assistant's draft, S3) — for the consultant to edit
 * and APPROVE; approving keeps it and makes its report (lib/report/storyPaper), kept under Saved copies. A figure in the words that the
 * snapshot does not hold is marked "check this" beside it; nothing is printed unmarked. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listAllStandards, listAllStudies, listWorkspaces, onDataChange, putStudy } from '../db';
import type { Workspace } from '../types';
import type { AgreedStory, StoryChapter, ToolStudy } from '../lib/study';
import type { Standard } from '../tools/linestandard/standard';
import { useProjects } from '../lib/useProjects';
import { productionLines } from '../lib/lines';
import { clientShown, storyOfClient } from '../lib/storyPick';
import { useClientScope, type Placed } from '../lib/activeClient';
import { useFactoryRead } from '../lib/useFactoryRead';
import { assembledNarrative, briefLine, dayWord, dayWordYear, draftChapter, linesOfClient, sinceOf, sinceSentence, snapshotOf, storySays, storyTiles, unsureIn } from '../lib/clientStory';
import { uid } from '../lib/ids';
import { PageHeader } from '../ui/parts';
import { LeanTiles } from '../ui/Lean';
import { DraftArea, DraftText } from '../ui/Draft';
import { useSaveOnArrival } from '../lib/useSaveOnArrival';
import { fmtGBP } from '../lib/cost';
import { nav } from '../state/useRoute';
import { askStory, storyAskOf } from '../tools/story/storyAsk';
import { askRecordsOf } from '../lib/storyAskRecords';
import { withAsks } from '../lib/storyAsks';
import { AsksPanel, BriefPanel } from './StoryBrief';
import { CloudPanel } from '../cloud/CloudPanel';
import { openStartVisit } from '../ui/StartVisit';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** HOME IS THE STORY (S5): `present` draws the same page full screen with no frame — the meeting itself — from #/?present=1. */
export function StoryScreen({ present = false }: { present?: boolean } = {}) {
  const { projects } = useProjects();
  const [all, setAll] = useState<Workspace[] | null>(null);
  const [studies, setStudies] = useState<ToolStudy[] | null>(null);
  const [standards, setStandards] = useState<Standard[]>([]);
  const load = useCallback(async () => { const [ws, st, std] = await Promise.all([listWorkspaces(), listAllStudies(), listAllStandards()]); setAll(ws); setStudies(st.filter(s => !s.deletedAt)); setStandards(std); }, []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const prodLines = useMemo(() => productionLines(all ?? []), [all]);
  /* THE ACTIVE CLIENT (lib/activeClient, C1) — followed live; the story is that client's, its projects and its lines' problems only */
  const cs = useClientScope();
  const client = clientShown(prodLines, cs.ready ? cs.clients : undefined);
  const lines = useMemo(() => linesOfClient(prodLines, client), [prodLines, client]);
  const ofClient = useMemo(() => projects.filter(p => cs.projectOf(p.id, client)), [projects, cs, client]);
  const keep = useCallback((r: Placed) => cs.recordOf(r, client), [cs, client]);
  const read = useFactoryRead(ofClient, lines, keep);
  const story = useMemo(() => storyOfClient(studies ?? [], client), [studies, client]);
  const chapters = useMemo(() => (story?.facts.chapters ?? []).filter(c => c.approvedAt).sort((a, b) => a.at - b.at), [story]);
  const last = chapters[chapters.length - 1];
  const snapshot = useMemo(() => (read ? snapshotOf({ at: Date.now(), lines, wrong: read.wrong, actions: read.actions, proved: read.proved, studies: read.studies, today: read.today }) : null), [read, lines]);
  const since = useMemo(() => (snapshot ? sinceOf(snapshot, last?.snapshot) : null), [snapshot, last]);
  /* THE RECORDS THE BRIEF'S ASKS ARE MATCHED AGAINST (S8) — the same readers, every tool record on the client's lines */
  const askRecords = useMemo(() => (read && snapshot ? askRecordsOf({ lines, snapshot, actions: read.actions, snags: read.snags, studies: read.studies, standards }) : null), [read, snapshot, lines, standards]);
  const [draft, setDraft] = useState<StoryChapter | null>(null);
  const [brief, setBrief] = useState('');
  /* A BRIEF UPLOADED BEFORE THE STORY STARTS (9 November — Rowland: "there is not ability to upload a brief in the story page"):
     the file starts the story and goes straight to the brief's own reader (StoryBrief BriefPanel), read and shown to approve */
  const [firstFile, setFirstFile] = useState<File | null>(null);
  const startFile = useRef<HTMLInputElement>(null);
  const [said, setSaid] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  /* the assistant's draft (S3): asked after the assembled one is shown; its words replace the paragraphs when it answers, unless
     the consultant has already typed; what went wrong is said in a line and the assembled words stand */
  const [asking, setAsking] = useState<string>('');
  const [touched, setTouched] = useState(false);

  const save = async (s: ToolStudy) => { await putStudy({ ...s, updatedAt: Date.now() }); };
  const saveStory = async (next: AgreedStory) => { if (story) await save({ ...story, agreed: { ...story.agreed, story: next } }); };
  /* NO BRIEF IS NEVER A STOPPER (S6): the story starts with one or without */
  const start = async () => {
    const t = Date.now();
    await putStudy({ id: uid(), tool: 'story', name: `${client || 'The factory'} — the story`, agreed: { story: { client, brief: brief.trim(), startedAt: t } }, facts: { chapters: [] }, uses: [], startedAt: t, createdAt: t, updatedAt: t });
    setBrief('');
  };
  const run = () => {
    if (!story?.agreed?.story || !snapshot) return;
    /* the brief's asks and what answered each, frozen on the chapter (S9); a story with no asks drafts as before */
    const d = draftChapter(uid(), story.agreed.story, chapters, askRecords ? withAsks(snapshot, story.agreed.story, askRecords) : snapshot);
    setDraft(d); setTouched(false); setAsking('Asking the assistant for a draft — the records’ words stand meanwhile…');
    void askStory(storyAskOf(story.agreed.story, chapters, d)).then(r => {
      if (!r.ok) { setAsking(r.why); return; }
      setAsking('');
      setDraft(cur => (cur && cur.id === d.id && !touchedRef.current ? { ...cur, headline: r.answer.headline, narrative: r.answer.narrative, by: 'assistant' } : cur));
    });
  };
  const touchedRef = { current: touched };
  touchedRef.current = touched;
  const approve = async () => {
    if (!story || !draft) return;
    const done = { ...draft, approvedAt: Date.now(), narrative: draft.narrative.map(p => p.trim()).filter(Boolean) };
    await save({ ...story, facts: { ...story.facts, chapters: [...(story.facts.chapters ?? []).filter(c => c.id !== done.id), done] } });
    setDraft(null); setOpen(done.id);
    setSaid(`Chapter ${chapters.length + 1} approved — ${dayWordYear(done.at)}.`);
    await paperFor(done, [...chapters, done]);
  };
  const paperFor = async (c: StoryChapter, all: readonly StoryChapter[]) => {
    if (!story?.agreed?.story) return;
    const { makeStoryPaper } = await import('../lib/report/storyPaper');
    const { deliverPdf } = await import('../lib/savePdf');
    const doc = await makeStoryPaper({ story: story.agreed.story, chapters: all, chapter: c, printed: dayWordYear(Date.now()) });
    await deliverPdf(doc, `Story — ${story.agreed.story.client || 'the factory'} — ${dayWord(c.at).replace(/ /g, '-')}.pdf`);
  };
  /* THE SLIDES (S4): the same chapter as a 16:9 deck, kept under Saved copies and handed over */
  const deckFor = async (c: StoryChapter, all: readonly StoryChapter[]) => {
    if (!story?.agreed?.story) return;
    const { makeStoryDeck } = await import('../lib/report/storyDeck');
    const { deliverBlob } = await import('../lib/savePdf');
    const { keepPdf } = await import('../lib/keptPdfs');
    const blob = await makeStoryDeck({ story: story.agreed.story, chapters: all, chapter: c });
    const name = `Story — ${story.agreed.story.client || 'the factory'} — ${dayWord(c.at).replace(/ /g, '-')}.pptx`;
    await keepPdf(blob, name);
    await deliverBlob(blob, name, { keep: false });
  };
  useSaveOnArrival(!!last, () => { if (last) void paperFor(last, chapters); });
  /* PRESENT: Escape leaves the meeting and goes back to the page in its frame */
  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') nav('/'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [present]);

  if (all === null || studies === null) return <div className="wrap st"><p className="sub">Reading the story…</p></div>;
  const ag = story?.agreed?.story;

  if (present) {
    return (
      <div className="st-present" data-story-present>
        <button type="button" className="btn btn-ghost st-present-exit" onClick={() => nav('/')} aria-label="Exit the presentation (Escape)">× Exit</button>
        <header className="st-present-head">
          <p className="st-present-client">{client || 'The factory'}</p>
          <p className="st-present-brief">{ag ? (briefLine(ag.brief) || 'No brief yet — the story works on the records alone.') : client ? `${client}’s story has not started yet.` : 'The story has not started yet.'}</p>
          {ag && <p className="st-present-says">{storySays(ag, chapters)}</p>}
        </header>
        {ag && snapshot && (
          <div className="st-present-figs" role="list" aria-label="The four figures">
            {storyTiles(snapshot).map(t => (
              <div key={t.k} className="st-present-fig" role="listitem" data-tone={t.tone ?? 'n'}>
                <span className="st-present-k">{t.k}</span>
                <b className="st-present-v" data-words={/^[£\d—]/.test(t.v) ? undefined : ''}>{t.v}</b>
                {t.of && <span className="st-present-of">{t.of}</span>}
              </div>
            ))}
          </div>
        )}
        {ag && (last ? (
          <section className="st-present-ch" aria-label="The latest chapter" data-chapter={chapters.length}>
            <p className="st-present-n">Chapter {chapters.length} · {dayWordYear(last.at)}</p>
            <h1 className="st-present-h">{last.headline}</h1>
            <div className="st-present-body">{last.narrative.map((p, i) => <p key={i}>{p}</p>)}</div>
          </section>
        ) : <p className="st-present-none">No chapter yet — Run an update writes the first.</p>)}
      </div>
    );
  }

  return (
    <div className="wrap st" data-story={story?.id ?? ''}>
      {/* THE CLIENT UPDATE, AND ONLY THAT (14 November — one front page; Rowland: "story. I'm unsure of the relevance of story", then
          "Yes, do it that way. Keep it clean."): the welcome and the four doors that stood here (10 November) were the way in while
          this page was the app's front page; the front page is the board now, and the menu holds those four doors — so they went */}
      <PageHeader eyebrow="THE STORY" title={client || 'The story'}
        says={ag ? <span>{briefLine(ag.brief) || 'No brief yet.'} <span className="sub">· {storySays(ag, chapters)}</span></span> : client ? `${client}’s story has not started yet.` : 'Name the client on the lines (Set up the lines) and the story is theirs.'}
        primary={ag && !ag.closedAt ? { label: 'Run an update', run, disabled: !snapshot || !!draft } : undefined}
        papers={last ? [{ label: 'Story report — the latest chapter', for: 'for the client: the story so far, this update, every finding in money, what is being done and what is proved', make: () => paperFor(last, chapters) }, { label: 'Story slides — the latest chapter', for: 'the same chapter as a 16:9 deck to open in PowerPoint and present: the cover, the four figures, this update, where the money is, what we have found, what is being done, what is proved, next', make: () => deckFor(last, chapters) }] : []}
        more={ag ? [
          /* START A VISIT (C3, docs/CONSULTANT-WORKSPACE.md) — a day at this customer, kept on its story */
          { label: 'Start a visit', hint: `a day at ${client || 'the customer'} — what you capture is read onto it`, run: () => openStartVisit(client || undefined) },
          ag.closedAt ? { label: 'Reopen the engagement', run: () => story && void save({ ...story, agreed: { story: { ...ag, closedAt: undefined } } }) } : { label: 'Close the engagement', run: () => story && void save({ ...story, agreed: { story: { ...ag, closedAt: Date.now() } } }) },
          /* PRESENT (S5): the same page full screen, no frame — the meeting itself */
          { label: 'Present', hint: 'full screen, the figures large — for the room', run: () => nav('/?present=1') },
          { label: 'Lines and set up', run: () => nav('/room') },
        ] : [{ label: 'Start a visit', hint: 'a day at a customer — no line needed to start', run: () => openStartVisit(client || undefined) }]} />
      {said && <p className="sub st-said" role="status">{said}</p>}

      {!ag ? (
        <section className="ep-panel st-start" aria-label="Start the story">
          <h2 className="ln-h">Start the story{client ? ` of ${client}` : ''}</h2>
          <p className="sub">The brief, in the client’s words — what you were asked to find out. Every update from here continues from it. No brief yet? Start without one — it can be written or uploaded later, and the story works on the records alone.</p>
          <textarea className="text-input st-brief" rows={2} value={brief} onChange={e => setBrief(e.target.value)} placeholder="e.g. Why are we losing output in the packing hall?" aria-label="The brief" maxLength={300} />
          <div className="st-acts">
            <button type="button" className="btn btn-primary" onClick={() => void start()}>{brief.trim() ? 'Start the story' : 'Start the story with no brief'}</button>
            <button type="button" className="btn" onClick={() => startFile.current?.click()} data-story-start-upload>Upload a brief</button>
            <input ref={startFile} type="file" hidden accept=".pdf,.docx,.txt,.md,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*" data-story-start-file-input
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { setFirstFile(f); void start(); } }} />
            <span className="sub stb-hint">A PDF, a Word file, a text file or a photo — read in the app, a photo by the assistant only when you ask.</span>
          </div>
          {/* HOME IS THE STORY (S5): a factory with no story yet still has its lines one tap away */}
          <p className="sub st-lines-link"><button type="button" className="linkish" onClick={() => nav('/room')}>See the lines ›</button></p>
        </section>
      ) : (
        <>
          {snapshot && <LeanTiles tiles={storyTiles(snapshot)} className="ie-strip st-tiles" />}
          {since && !draft && <p className="st-since" data-story-since>{sinceSentence(since)}{!ag.closedAt ? ' Run an update to write the next chapter.' : ''}</p>}

          {/* THE BRIEF AND ITS ASKS (S6–S8) — written or uploaded, split into what the client asked, each with its evidence by the rules */}
          {!draft && <BriefPanel ag={ag} save={saveStory} canEdit={!ag.closedAt} firstFile={firstFile} onFirstFile={() => setFirstFile(null)} />}
          {!draft && <AsksPanel ag={ag} save={saveStory} records={askRecords} canEdit={!ag.closedAt} />}

          {/* THE DRAFT — the next chapter, his to edit before he approves it */}
          {draft && (
            <section className="ep-panel st-draft" aria-label="The next chapter" data-story-draft>
              <p className="pp-eyebrow">Chapter {chapters.length + 1} · {dayWordYear(draft.at)} · drafted from the records{draft.by === 'assistant' ? ' by the assistant' : ''} — yours to edit</p>
              {asking && <p className="sub st-asking" data-story-asking role="status">{asking}</p>}
              <DraftText value={draft.headline} className="text-input st-headline" max={160} ariaLabel="The chapter’s headline" onSave={v => { setTouched(true); setDraft(d => (d ? { ...d, headline: v.trim() || d.headline } : d)); }} />
              <ol className="st-paras">
                {draft.narrative.map((p, i) => (
                  <li key={i}>
                    <DraftArea value={p} rows={3} className="text-input" ariaLabel={`Paragraph ${i + 1}`} onSave={v => { setTouched(true); setDraft(d => (d ? { ...d, narrative: d.narrative.map((x, k) => (k === i ? v : x)) } : d)); }} />
                    <button type="button" className="linkish st-para-x" aria-label={`Take paragraph ${i + 1} out`} onClick={() => setDraft(d => (d ? { ...d, narrative: d.narrative.filter((_, k) => k !== i) } : d))}>Take out</button>
                  </li>
                ))}
              </ol>
              <div className="st-acts">
                <button type="button" className="btn btn-sm" onClick={() => setDraft(d => (d ? { ...d, narrative: [...d.narrative, ''] } : d))}>Add a paragraph</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setTouched(true); setAsking(''); setDraft(d => (d && ag ? { ...d, narrative: assembledNarrative(ag.brief, d.snapshot, d.since), by: 'assembled' } : d)); }}>Back to the records’ words</button>
              </div>
              {(() => { const u = unsureIn(draft.narrative, draft.snapshot); return u.length ? <p className="st-unsure" data-story-unsure>Check this: {u.join(', ')} — not among the figures the tools recorded.</p> : null; })()}
              <Snapshot c={draft} />
              <div className="st-acts st-approve">
                <button type="button" className="btn btn-primary" onClick={() => void approve()}>Approve and make the report</button>
                <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>Discard</button>
              </div>
            </section>
          )}

          {/* THE CHAPTERS, newest first */}
          <section className="st-chapters" aria-label="The chapters">
            <h2 className="ln-h">The chapters <span className="act-col-n">{chapters.length}</span></h2>
            {chapters.length === 0 && <p className="sub">No chapter yet — Run an update writes the first from what is recorded on {client || 'the'} lines.</p>}
            <ol className="st-list">
              {[...chapters].reverse().map((c, k) => {
                const n = chapters.length - k;
                const isOpen = open === c.id || (open === null && k === 0);
                return (
                  <li key={c.id} className={'ep-panel st-ch' + (isOpen ? ' is-open' : '')} data-chapter={n}>
                    <button type="button" className="st-ch-h" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? '' : c.id)}>
                      <span className="st-ch-n">Chapter {n}</span>
                      <b className="st-ch-t">{c.headline}</b>
                      <span className="sub st-ch-d">{dayWordYear(c.at)}{c.since.from ? ` · since ${dayWord(c.since.from)}` : ''}</span>
                    </button>
                    {isOpen && (
                      <div className="st-ch-body">
                        {c.narrative.map((p, i) => <p key={i}>{p}</p>)}
                        <Snapshot c={c} folded />
                        <div className="st-acts"><button type="button" className="btn btn-sm" onClick={() => void paperFor(c, chapters)}>Report for this chapter</button><button type="button" className="btn btn-sm" data-story-slides onClick={() => void deckFor(c, chapters)}>Slides for this chapter</button></div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        </>
      )}
      {/* THE CLOUD, AS ON THE LINES TAB: home is the Story (S5), so a row the cloud refused, a file too big for it or work
          not backed up yet is said here too — never only one tab away */}
      <CloudPanel />
    </div>
  );
}

/** THE SNAPSHOT DRAWN — what the chapter froze: the findings with their money, what is being done, what is proved. */
function Snapshot({ c, folded }: { c: StoryChapter; folded?: boolean }) {
  const s = c.snapshot;
  const [show, setShow] = useState(!folded);
  if (!show) return <button type="button" className="linkish st-snap-b" onClick={() => setShow(true)}>What this chapter rests on — {plural(s.findings.length, 'finding')}, {plural(s.actions.length, 'action')}, {plural(s.provedFixes.length, 'fix', 'fixes')} proved ›</button>;
  return (
    <>
    {s.asks?.length ? (
      <div className="stb-snap-asks" data-story-snapshot-asks>
        <h3>What the client asked</h3>
        <ol>
          {s.asks.map((a, k) => (
            <li key={a.id}><b>Ask {k + 1} — {a.text}</b> <span className="sub">· {a.says}</span>
              {a.missing.length > 0 && <span className="sub stb-snap-missing"> Still to show: {a.missing.join(' ')}</span>}
            </li>
          ))}
        </ol>
      </div>
    ) : null}
    <div className="st-snap" data-story-snapshot>
      <div className="st-snap-col">
        <h3>What we have found <span className="sub">{s.found.costDay != null ? `${fmtGBP(s.found.costDay)} a day` : ''}</span></h3>
        {s.findings.length === 0 ? <p className="sub">Nothing open.</p> : (
          <ul className="st-findings">
            {s.findings.map(f => <li key={f.id} className={f.late || f.priority === 'critical' ? 'is-r' : ''}><b>{f.what}</b><span className="sub"> · {f.line}{f.machine ? ` · ${f.machine}` : ''}</span><span className="st-money">{f.poundsDay != null ? `${fmtGBP(f.poundsDay)} a day` : 'not priced'}</span></li>)}
          </ul>
        )}
      </div>
      <div className="st-snap-col">
        <h3>What is being done <span className="sub">{s.fixing.late ? `${s.fixing.late} late` : ''}</span></h3>
        {s.actions.length === 0 ? <p className="sub">Nothing owed yet.</p> : (
          <ul className="st-actions">
            {s.actions.map((a, i) => <li key={i} className={a.late ? 'is-r' : ''}>{a.what}<span className="sub"> · {a.who || 'nobody yet'}{a.due ? ` · ${a.late ? 'was due' : 'due'} ${dayWord(Date.parse(a.due))}` : ''}</span></li>)}
          </ul>
        )}
        <h3>What is proved</h3>
        {s.provedFixes.length === 0 ? <p className="sub">No fix proved yet.</p> : <ul className="st-proved">{s.provedFixes.map(p => <li key={p.id} className="is-g"><b>{p.what}</b><span className="sub"> · {p.line} · {p.proof}</span></li>)}</ul>}
      </div>
    </div>
    </>
  );
}
