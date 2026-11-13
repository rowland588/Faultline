/* HOW AI MODE IS USED — what it cost, what the colleague did, and what could be code instead (8 November, AI Mode phase 5b;
 * docs/AI-MODE.md §8–9; src/colleague/usage, src/colleague/learning).
 *
 * Rowland, 8 November: "when we ask to do something in the app, we learn what was done and we actually want to replicate it
 * with code as much as possible — this keeps AI costs lower and the app becomes more intelligent over time"; and "nothing
 * should automatically become production code … recording conversations is not the same as training a model."
 *
 * WHICH RECORDS: the person's own assist_usage rows (supabase/ASSIST_USAGE.sql) and ai_actions rows (supabase/AI_ACTIONS.sql),
 * read through the API where row-level security gives a person their own and nothing else; and the AI Mode conversations on
 * this device (studies of tool `talk`, facts.colleague). Nothing here writes. WHERE IT SHOWS: #/ai/usage, reached from AI
 * Mode's More ▾ (How AI Mode is used) and from the AI toolbox on Tools. Signed out or offline the page says so in a line and
 * reads what the device holds. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAllStudies, onDataChange } from '../db';
import { supabase } from '../cloud/client';
import { useSession } from '../cloud/session';
import { useFactoryLines } from '../lib/useFactoryLines';
import { useProjects } from '../lib/useProjects';
import { nav } from '../state/useRoute';
import { PageHeader } from '../ui/parts';
import { capabilityByName } from '../capabilities/registry';
import { calcByKey } from '../tools/calc/registry';
import { factsOfConversation, isConversation } from '../colleague/conversation';
import { findCandidates, readActions, requestsOnDevice, type ActionRow, type Candidate, type ConversationRead } from '../colleague/learning';
import { moneyOf, perRequest, readUsage, todayAgainst, type UsageRow } from '../colleague/usage';

const DAYS = 30;
const DAY = 86_400_000;
/** A pound rate only when one is set on the build — never guessed (src/colleague/usage moneyOf). */
const RATE = Number((import.meta.env as Record<string, string | undefined>).VITE_USD_TO_GBP ?? '') || null;
const NOT_SIGNED_IN = 'Not signed in — what AI Mode cost and what the colleague did are kept in the cloud and read when you sign in. What this device holds is below.';
const OFFLINE = 'No signal — what AI Mode cost and what the colleague did are read from the cloud when the signal comes back. What this device holds is below.';
const pct = (x: number) => `${Math.round(x * 100)}%`;
const tok = (k: number) => (k >= 10_000 ? `${Math.round(k / 1000)}k` : k.toLocaleString('en-GB'));
const dayShort = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const when = (ms: number) => new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

type Cloud = { state: 'loading' } | { state: 'none'; why: string } | { state: 'ok'; usage: UsageRow[]; actions: ActionRow[]; usageWhy?: string; actionsWhy?: string };

export function AiUsageScreen() {
  const { session, loading } = useSession();
  const lines = useFactoryLines();
  const { projects } = useProjects();
  const [now] = useState(() => Date.now());
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  useEffect(() => {
    const up = () => setOnline(true), down = () => setOnline(false);
    window.addEventListener('online', up); window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  /* THE CONVERSATIONS ON THIS DEVICE */
  const [convs, setConvs] = useState<ConversationRead[]>([]);
  const load = useCallback(async () => {
    const all = (await listAllStudies()).filter(isConversation);
    setConvs(all.map(s => { const f = factsOfConversation(s); return { id: s.id, turns: f.turns ?? [], actions: f.actions ?? [] }; }));
  }, []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  /* THE PERSON'S OWN ROWS IN THE CLOUD */
  const [cloud, setCloud] = useState<Cloud>({ state: 'loading' });
  const userId = session?.user.id;
  useEffect(() => {
    if (loading) return;
    if (!supabase || !userId) { setCloud({ state: 'none', why: NOT_SIGNED_IN }); return; }
    if (!online) { setCloud({ state: 'none', why: OFFLINE }); return; }
    let alive = true;
    const since = new Date(now - DAYS * DAY).toISOString();
    void Promise.all([
      supabase.from('assist_usage').select('at, task, model, input_tokens, output_tokens, cost_micros, ok').gte('at', since).order('at', { ascending: false }).limit(5000),
      supabase.from('ai_actions').select('at, conversation_id, call_id, capability, kind, input, status, says').gte('at', since).order('at', { ascending: false }).limit(5000),
    ]).then(([u, a]) => {
      if (!alive) return;
      setCloud({
        state: 'ok',
        usage: (u.data as UsageRow[] | null) ?? [], actions: (a.data as ActionRow[] | null) ?? [],
        ...(u.error ? { usageWhy: `What it cost could not be read (${u.error.message.slice(0, 120)}).` } : {}),
        ...(a.error ? { actionsWhy: `What the colleague did could not be read (${a.error.message.slice(0, 120)}).` } : {}),
      });
    }, (e: unknown) => { if (alive) setCloud({ state: 'none', why: `The cloud could not be reached (${e instanceof Error ? e.message.slice(0, 120) : 'no answer'}). What this device holds is below.` }); });
    return () => { alive = false; };
  }, [loading, userId, online, now]);

  const money = useMemo(() => moneyOf(RATE), []);
  const usageRows = useMemo(() => (cloud.state === 'ok' ? cloud.usage : []), [cloud]);
  const actionRows = useMemo(() => (cloud.state === 'ok' ? cloud.actions : []), [cloud]);
  const usage = useMemo(() => readUsage(usageRows, now, DAYS), [usageRows, now]);
  const today = useMemo(() => todayAgainst(usageRows, now, money.say), [usageRows, now, money]);
  const titleOf = useCallback((n: string) => capabilityByName(n)?.title, []);
  const acts = useMemo(() => readActions(actionRows, now, DAYS, titleOf), [actionRows, now, titleOf]);
  const requests = useMemo(() => requestsOnDevice(convs, now, DAYS), [convs, now]);
  const colleague = usage.byTask.find(t => t.task === 'colleague');
  const per = perRequest(colleague?.micros ?? 0, colleague?.calls ?? 0, requests);
  const candidates = useMemo(() => findCandidates(actionRows, convs, {
    now, days: DAYS, titleOf,
    lineName: id => lines.find(l => l.id === id)?.name,
    projectName: id => projects.find(p => p.id === id)?.name,
    calculatorName: k => calcByKey(k)?.title,
  }), [actionRows, convs, now, titleOf, lines, projects]);

  const says = cloud.state === 'ok'
    ? `${usage.calls} answer${usage.calls === 1 ? '' : 's'} in the last ${DAYS} days, ${money.say(usage.micros)} in all; ${candidates.length ? `${candidates.length} thing${candidates.length === 1 ? '' : 's'} asked often enough to be answered with no AI` : 'nothing asked often enough yet to be answered with no AI'}.`
    : candidates.length ? `${candidates.length} thing${candidates.length === 1 ? '' : 's'} asked often enough on this device to be answered with no AI.` : 'What AI Mode costs, what the colleague did, and what could be answered with no AI.';
  const maxCalls = Math.max(1, ...usage.byDay.map(d => d.calls));

  return (
    <div className="wrap aiu" data-ai-usage>
      <PageHeader eyebrow="AI MODE" title="How AI Mode is used" says={says} back={{ label: 'AI Mode', to: '/ai' }}
        more={[{ label: 'Back to AI Mode', run: () => nav('/ai') }, { label: 'Luna’s exam', hint: 'her answers marked against the records', run: () => nav('/ai/exam') }, { label: 'The AI toolbox', hint: 'every place Faultline uses AI', run: () => nav('/tools') }]} />

      {cloud.state === 'none' && <p className="aiu-line" role="status" data-aiu-none>{cloud.why}</p>}
      {cloud.state === 'loading' && <p className="aiu-line" role="status">Reading your record…</p>}

      {/* 1. WHAT IT COSTS */}
      <section className="aiu-sec" aria-label="What it costs" data-aiu-cost>
        <h2 className="ln-h">What it costs</h2>
        <p className="sub">{money.note}</p>
        {cloud.state === 'ok' && cloud.usageWhy && <p className="aiu-line">{cloud.usageWhy}</p>}
        {cloud.state === 'ok' && !cloud.usageWhy && (usage.calls ? <>
          <div className="aiu-tiles">
            <div className="aiu-tile"><b>{usage.calls}</b><span>answers in {DAYS} days{usage.failed ? ` · ${usage.failed} could not be read` : ''}</span></div>
            <div className="aiu-tile"><b>{money.say(usage.micros)}</b><span>in all</span></div>
            <div className="aiu-tile"><b>{money.say(usage.perCallMicros)}</b><span>an answer</span></div>
            <div className="aiu-tile"><b>{per.perRequestMicros !== undefined ? money.say(per.perRequestMicros) : '—'}</b><span>an AI Mode request{per.answersPerRequest ? ` · ${per.answersPerRequest} answers each` : ''}</span></div>
          </div>
          <p className="sub" data-aiu-per>{per.said}</p>
          <h3 className="aiu-h3">Today, against the allowance</h3>
          <ul className="aiu-list" data-aiu-today>
            {today.length ? today.map(a => <li key={a.words} className={a.spent ? 'is-spent' : a.near ? 'is-near' : ''}><b>{a.words}</b> — {a.said}</li>) : <li>Nothing used in the last 24 hours.</li>}
          </ul>
          <p className="sub">The allowance is counted over the last 24 hours; these are the gateway's defaults, and the server may be set otherwise.</p>
          <h3 className="aiu-h3">By task</h3>
          <table className="aiu-table" data-aiu-tasks>
            <thead><tr><th>Task</th><th>Answers</th><th>Cost</th><th>An answer</th><th>Tokens in · out</th></tr></thead>
            <tbody>{usage.byTask.map(t => (
              <tr key={t.task}><td>{t.words}</td><td>{t.calls}{t.failed ? ` (${t.failed} not read)` : ''}</td><td>{money.say(t.micros)}</td><td>{money.say(t.perCallMicros)}</td><td>{tok(t.tokensIn)} · {tok(t.tokensOut)}</td></tr>
            ))}</tbody>
          </table>
          <h3 className="aiu-h3">By day — answers</h3>
          <svg className="aiu-bars" viewBox={`0 0 ${DAYS * 10} 64`} preserveAspectRatio="none" role="img"
            aria-label={`Answers a day over the last ${DAYS} days, the most ${maxCalls} in a day`} data-aiu-days>
            {usage.byDay.map((d, i) => {
              const h = d.calls ? Math.max(2, (d.calls / maxCalls) * 60) : 0;
              return <rect key={d.day} x={i * 10 + 1} y={62 - h} width={8} height={h}><title>{`${dayShort(d.day)}: ${d.calls} answers · ${money.say(d.micros)} · ${tok(d.tokens)} tokens`}</title></rect>;
            })}
            <line x1="0" x2={DAYS * 10} y1="62.5" y2="62.5" />
          </svg>
          <p className="aiu-axis"><span>{dayShort(usage.byDay[0].day)}</span><span>today</span></p>
        </> : <p className="aiu-line">No answers in the last {DAYS} days.</p>)}
      </section>

      {/* 2. WHAT THE COLLEAGUE DID */}
      <section className="aiu-sec" aria-label="What the colleague did" data-aiu-did>
        <h2 className="ln-h">What the colleague did</h2>
        <p className="sub">Every step it asked for, every one the gateway refused, and what came of each — your own record.</p>
        {cloud.state === 'ok' && cloud.actionsWhy && <p className="aiu-line">{cloud.actionsWhy}</p>}
        {cloud.state === 'ok' && !cloud.actionsWhy && (acts.proposed || acts.refused ? <>
          <p className="aiu-line" data-aiu-counts>
            {acts.proposed} proposed · {acts.done} done · {acts.declined} declined · {acts.failed} failed · {acts.refused} refused by the gateway
            {acts.acceptedShare !== undefined ? ` — you accepted ${pct(acts.acceptedShare)} of the writes it asked for (${acts.writesAccepted} of ${acts.writesAnswered})` : ''}.
          </p>
          <table className="aiu-table" data-aiu-caps>
            <thead><tr><th>Capability</th><th>Kind</th><th>Proposed</th><th>Done</th><th>Declined</th><th>Failed</th><th>Refused</th></tr></thead>
            <tbody>{acts.byCapability.map(c => (
              <tr key={c.capability}><td>{c.title}</td><td>{c.kind}</td><td>{c.proposed}</td><td>{c.done}</td><td>{c.declined}</td><td>{c.failed}</td><td>{c.refused}</td></tr>
            ))}</tbody>
          </table>
          {acts.refusals.length > 0 && <>
            <h3 className="aiu-h3">Refused by the gateway</h3>
            <ul className="aiu-list" data-aiu-refused>
              {acts.refusals.slice(0, 20).map((r, i) => <li key={i}><b>{r.capability}</b> · {when(r.at)} — tried {r.tried}. {r.why}</li>)}
            </ul>
          </>}
        </> : <p className="aiu-line">Nothing asked of the colleague in the last {DAYS} days.</p>)}
      </section>

      {/* 3. CANDIDATES FOR CODE */}
      <section className="aiu-sec" aria-label="Candidates for code" data-aiu-candidates>
        <h2 className="ln-h">Candidates for code</h2>
        <p className="sub">What is asked again and again, and where in the app it could be answered with no AI. Proposals only — nothing here changes the app. A candidate becomes code only through the tool standard, its tests, the gate and Rowland's approval.</p>
        {candidates.length ? (
          <ul className="aiu-cands">{candidates.map(c => <CandidateCard key={c.id} c={c} />)}</ul>
        ) : <p className="aiu-line" data-aiu-no-candidates>Nothing yet — a pattern shows here once the same thing is asked three times in {DAYS} days.</p>}
      </section>
    </div>
  );
}

function CandidateCard({ c }: { c: Candidate }) {
  const [copied, setCopied] = useState<'' | 'yes' | 'no'>('');
  const copy = async () => {
    try { await navigator.clipboard.writeText(c.note); setCopied('yes'); } catch { setCopied('no'); }
  };
  return (
    <li className="aiu-cand" data-aiu-candidate={c.kind}>
      <p className="aiu-cand-s">{c.sentence}</p>
      <p className="aiu-cand-home">Where: {c.home.href ? <a href={`#${c.home.href}`}>{c.home.where}</a> : c.home.where} · {c.home.kind}</p>
      <details><summary>The evidence — {c.count} times</summary><ul>{c.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul></details>
      <div className="aiu-cand-acts">
        <button type="button" className="btn btn-sm" onClick={() => void copy()}>Copy as a note</button>
        {copied === 'yes' && <span role="status">Copied.</span>}
        {copied === 'no' && <textarea readOnly className="aiu-note" value={c.note} aria-label="The note, to copy" onFocus={e => e.currentTarget.select()} />}
      </div>
    </li>
  );
}
