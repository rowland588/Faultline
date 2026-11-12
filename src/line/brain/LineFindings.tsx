/* WHAT LUNAR HAS FOUND ON THIS LINE, AND WHETHER THE FIXES WORKED (12 November, docs/LUNAR-BRAIN.md B1, docs/LUNAR-KNOWLEDGE.md §8).
 * The homework the app has done on the line's own stop records before anybody asked (lib/brain), each finding in its own words with how
 * sure it is, what it cannot say and its money — and, from LUNAR's knowledge (lib/knowledge): where it stands (evidence over opinion),
 * what it said before when it has changed, what people have said about it, Agree · Disagree… (a person's review, kept attributed, never
 * as proof) and Investigate (a problem raised with the finding linked, so its fix's outcome comes back to it). Under them, Did the fixes
 * work? — every fix on the line checked by code. Inside the Overview's More about this line; a viewer sees it and is offered nothing that
 * writes. */
import { useEffect, useState } from 'react';
import { listAllAssets, listWorkspaces, onDataChange } from '../../db';
import { acrossLines, type Across } from '../../lib/knowledge/factory';
import { useSession } from '../../cloud/session';
import { displayName } from '../../cloud/team';
import { homeworkForLine, lineBrain, lineBrainNow, BRAIN_STATE_WORD, type LineBrain } from '../../lib/brain/homework';
import type { Finding } from '../../lib/brain/engine';
import { claimOf } from '../../lib/knowledge/findings';
import { outcomesOn } from '../../lib/knowledge/fixes';
import { addEntries, listKnowledge } from '../../lib/knowledge/ledger';
import { mayAddKnowledge } from '../../lib/knowledge/may';
import { currentOf, responseSaid, standingOf, versionsOf, type Entry } from '../../lib/knowledge/model';
import { personEntryId, VERDICT_WORD, type Outcome } from '../../lib/knowledge/outcomes';
import { openQuickSnag } from '../../snag/QuickSnag';
import { myOrgRole } from '../../org/orgRole';
import { roleName } from '../../org/organisation';
import type { Workspace } from '../../types';

export const SURE_WORD: Record<Finding['sure'], string> = { measured: 'Measured', significant: 'Unlikely to be chance', suggestive: 'Could be chance', thin: 'Too few records' };
const day = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const GOOD = new Set(['improved', 'held']);
const BAD = new Set(['worse', 'came-back', 'no-clear-change']);

interface Read { brain: LineBrain; ledger: Entry[]; outcomes: Outcome[]; across: Across[] }

export function LineFindings({ line }: { line: Workspace }) {
  const [read, setRead] = useState<Read | null>(null);
  const may = mayAddKnowledge();
  useEffect(() => {
    let live = true, t: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      void (async () => {
        const now = Date.now();
        if (may) await homeworkForLine(line, now);
        const brain = may ? await lineBrain(line) : await lineBrainNow(line, now);
        const outcomes = await outcomesOn(line, now, { write: may });
        /* the customer's other lines' homework too (each skips when nothing changed), so what recurs across them is known */
        const lines = await listWorkspaces();
        if (may) for (const w of lines) if (w.id !== line.id && !w.archived && (w.clientName ?? '').trim().toLowerCase() === (line.clientName ?? '').trim().toLowerCase()) await homeworkForLine(w, now);
        const [ledger, all, assets] = await Promise.all([listKnowledge(line.id), listKnowledge(), listAllAssets()]);
        const kindOf = (lineId: string, m: string) => assets.find(a => a.workspaceId === lineId && a.name.trim().toLowerCase() === m.trim().toLowerCase())?.kind || undefined;
        const across = acrossLines(lines.filter(w => !w.archived), all, kindOf, line.id).filter(a => a.lines.some(x => x.lineId === line.id));
        if (live) setRead({ brain, ledger, outcomes, across });
      })().catch(() => { /* the homework waits for the next change */ });
    };
    run();
    const off = onDataChange(() => { clearTimeout(t); t = setTimeout(run, 1500); });
    return () => { live = false; clearTimeout(t); off(); };
  }, [line, may]);
  if (!read) return null;
  const { brain, ledger, outcomes, across } = read;
  return (
    <section className="pl-sec lf" aria-label="What LUNAR has found" data-line-findings data-brain-state={brain.state}>
      <div className="pl-sec-h">
        <h2>What LUNAR has found</h2>
        <span className="sub" data-brain-state-word>{BRAIN_STATE_WORD[brain.state]}{brain.at ? ` · worked ${new Date(brain.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}</span>
      </div>
      {brain.findings.length === 0
        ? <p className="sub" data-brain-empty>Nothing timed on this line to work from yet — time its stops and LUNAR works out where the time goes.</p>
        : <ul className="lf-list">{brain.findings.map((f, i) => <FindingRow key={`${f.kind}-${i}`} f={f} line={line} ledger={ledger} may={may} />)}</ul>}
      {across.length > 0 && (
        <div className="lf-fixes" data-across>
          <h3>Across this customer’s lines</h3>
          <ul className="lf-list">{across.map((a, i) => <li key={i} className="lf-row" data-across-kind={a.kind}><p className="lf-how">{a.says}</p></li>)}</ul>
        </div>
      )}
      <div className="lf-fixes" data-fix-outcomes>
        <h3>Did the fixes work?</h3>
        {outcomes.length === 0
          ? <p className="sub" data-fixes-empty>Nothing on this line has been closed, done or proved yet — when a problem is closed, LUNAR checks its stops before and after.</p>
          : <ul className="lf-list">{outcomes.map(o => <OutcomeRow key={o.fix.id} o={o} ledger={ledger} />)}</ul>}
      </div>
    </section>
  );
}

function FindingRow({ f, line, ledger, may }: { f: Finding; line: Workspace; ledger: readonly Entry[]; may: boolean }) {
  const claim = claimOf(f).claim;
  const cur = currentOf(ledger, claim);
  const st = cur ? standingOf(cur, ledger) : undefined;
  const before = versionsOf(ledger, claim).slice(0, -1);
  const [earlier, setEarlier] = useState(false);
  const [answer, setAnswer] = useState<'supports' | 'contradicts' | null>(null);
  const investigate = () => openQuickSnag(undefined, {
    said: `What LUNAR found on ${line.name}`, workspaceId: line.id,
    ...(cur ? { finding: cur.id } : {}), ...(f.machine ? { machine: f.machine } : {}), ...(f.reason ? { reason: f.reason } : {}), words: f.says,
  });
  return (
    <li className="lf-row" data-finding={f.kind} {...(cur ? { 'data-claim': cur.id } : {})}>
      <p className="lf-says">{f.says}</p>
      <p className="lf-how"><span className="lf-sure" data-sure={f.sure}>{SURE_WORD[f.sure]}</span> · {f.n} stop{f.n === 1 ? '' : 's'} · {f.method}</p>
      {f.money && <p className="lf-money">{f.money.words}</p>}
      <p className="lf-limits sub">Cannot say: {f.limits.join(' ')}</p>
      {st && <p className="lf-standing" data-standing={st.state}>{st.word}{st.responses.length ? ` — ${st.responses.slice(0, 3).map(responseSaid).join('; ')}` : ''}</p>}
      {(before.length > 0 || may) && (
        <div className="lf-acts">
          {before.length > 0 && <button type="button" className="btn btn-ghost btn-sm" data-lf-earlier aria-expanded={earlier} onClick={() => setEarlier(v => !v)}>Earlier · {before.length}</button>}
          {may && cur && <>
            <button type="button" className="btn btn-ghost btn-sm" data-lf-agree onClick={() => setAnswer('supports')}>Agree</button>
            <button type="button" className="btn btn-ghost btn-sm" data-lf-disagree onClick={() => setAnswer('contradicts')}>Disagree…</button>
            <button type="button" className="btn btn-sm" data-lf-investigate onClick={investigate}>Investigate</button>
          </>}
        </div>
      )}
      {earlier && (
        <ul className="lf-earlier" data-lf-versions>
          {before.map(v => <li key={v.id}>{day(v.at)} — {v.says} <span className="sub">(superseded — kept as it was)</span></li>)}
        </ul>
      )}
      {answer && cur && <Answer about={cur} line={line} stance={answer} onDone={() => setAnswer(null)} />}
    </li>
  );
}

/** A person's answer to a finding: their words, whether they saw it or believe it, their role — kept attributed, never as proof. */
function Answer({ about, line, stance, onDone }: { about: Entry; line: Workspace; stance: 'supports' | 'contradicts'; onDone: () => void }) {
  const { session } = useSession();
  const me = displayName(session?.user.email ?? undefined) || 'A person';
  const org = myOrgRole();
  const [words, setWords] = useState('');
  const [known, setKnown] = useState<'observed' | 'reported'>('observed');
  const [role, setRole] = useState(org ? roleName(org) : '');
  const need = stance === 'contradicts' && !words.trim();
  const save = async () => {
    const t = Date.now();
    await addEntries([{
      id: personEntryId(me, t, about.id), workspaceId: line.id, ...(line.clientName ? { client: line.clientName } : {}),
      kind: 'review', known, subject: about.subject, about: about.id, stance, says: words.trim(), body: {}, by: me, ...(role.trim() ? { role: role.trim() } : {}),
      source: 'person', at: t, updatedAt: t,
    }]);
    onDone();
  };
  return (
    <div className="lf-answer" data-lf-answer={stance}>
      <label className="cw-f"><span>{stance === 'contradicts' ? 'WHAT YOU THINK IT IS INSTEAD' : 'ANYTHING TO ADD'}</span>
        <textarea rows={2} value={words} maxLength={1000} aria-label={stance === 'contradicts' ? 'What you think it is instead' : 'Anything to add'} onChange={e => setWords(e.target.value)} /></label>
      <div className="chip-row" role="group" aria-label="How you know">
        <button type="button" className={'chip' + (known === 'observed' ? ' is-on' : '')} aria-pressed={known === 'observed'} data-lf-known="observed" onClick={() => setKnown('observed')}>I saw it</button>
        <button type="button" className={'chip' + (known === 'reported' ? ' is-on' : '')} aria-pressed={known === 'reported'} data-lf-known="reported" onClick={() => setKnown('reported')}>I believe it, or was told</button>
      </div>
      <label className="cw-f"><span>YOUR ROLE</span><input value={role} maxLength={60} placeholder="Engineer, shift manager…" aria-label="Your role" onChange={e => setRole(e.target.value)} /></label>
      <p className="sub">Kept as what you said, with your name — beside the finding, never as proof, and never changed afterwards.</p>
      <div className="lf-acts">
        <button type="button" className="btn btn-primary btn-sm" data-lf-keep disabled={need} onClick={() => void save()}>Keep it</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button>
        {need && <span className="sub">Say what you think it is.</span>}
      </div>
    </div>
  );
}

function OutcomeRow({ o, ledger }: { o: Outcome; ledger: readonly Entry[] }) {
  const before = versionsOf(ledger, `outcome:${o.subject}`).slice(0, -1).map(v => VERDICT_WORD[(v.body as { verdict: keyof typeof VERDICT_WORD }).verdict]).filter(Boolean);
  const tone = GOOD.has(o.verdict) ? 'g' : BAD.has(o.verdict) ? 'r' : 'n';
  return (
    <li className="lf-row" data-fix={o.fix.id} data-verdict={o.verdict}>
      <p className="lf-says"><span className={`lf-verdict is-${tone}`}>{VERDICT_WORD[o.verdict]}</span> {o.fix.title}</p>
      <p className="lf-how">{o.says}</p>
      {before.length > 0 && <p className="sub" data-fix-earlier>Said before: {before.join(' → ')}</p>}
    </li>
  );
}
