/* A CHECK LOG — its page, THE ROUND first (knowledge/specs/FC-236-check-logs.md §7–§8).
 *
 * One page for every kind of log: the lean page's band with the verdict, the tiles (each of the plan and since the 7
 * days before), what it says, then three views — the Round (what wants doing now, one big tap each, then what is
 * done and what is done when something happens), the History and trend, and The checks as agreed — then the action
 * plan (the problems raised) and the closing line. Which log it is, with its checks' starter list, its standard and
 * its words, is its definition (./defs); everything else is the same code. The paper reads the same figures
 * (lib/studiesPdf). A client reads and writes nothing (can.edit); the checks are agreed by the owner (can.agree). */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStudy, onDataChange, patchStudy } from '../../db';
import { TargetNumber } from '../../ui/TargetNumber';
import { useAccess } from '../../cloud/access';
import { useSession } from '../../cloud/session';
import { displayName } from '../../cloud/team';
import { can as canAt } from '../../lib/access';
import { bandPage } from '../../lib/lean';
import { plural } from '../../lib/format';
import { nav } from '../../state/useRoute';
import type { ToolStudy } from '../../lib/study';
import { LeanActions, LeanClosing, LeanInsights, LeanTiles } from '../../ui/Lean';
import { StudyBand } from '../../ui/StudyActs';
import { WhereItSits } from '../../ui/StudyPlace';
import { ViewTabs } from '../../ui/parts';
import { useFactoryLines } from '../../lib/useFactoryLines';
import { defOf } from './registry';
import { logFigures } from './figures';
import { logActions, logClosing, logInsights, logSays, logTiles } from './says';
import { RoundCard, type RoundProps } from './RoundParts';
import { HistoryPanel } from './HistoryPanel';
import { ChecksPanel } from './ChecksEditor';
import { useLogCtx, useNow, useSnags } from './useLogData';
import { logHref } from './registry';

const OWNER = canAt('owner');

export function LogScreen({ id }: { id: string }) {
  const [s, setS] = useState<ToolStudy | null | undefined>(undefined);
  const load = useCallback(async () => setS((await getStudy(id)) ?? null), [id]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const jobCan = useAccess(s?.projectId ?? '');
  const can = s?.projectId ? jobCan : OWNER;
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;
  if (s === undefined) return <div className="wrap ie lg"><p className="sub">Opening…</p></div>;
  if (s === null || s.tool !== 'log' || !s.agreed?.log) return (
    <div className="wrap ie lg">
      <h1>This check log isn’t on this device</h1>
      <p className="sub">It may have been deleted, or not synced here yet.</p>
      <button type="button" className="btn" onClick={() => nav('/logs')}>Every check log</button>
    </div>
  );
  const def = defOf(s.agreed.log.key);
  if (!def) return (
    <div className="wrap ie lg">
      <h1>{s.name}</h1>
      <p className="sub">This log is of a kind this version of Faultline does not have (“{s.agreed.log.key}”). Its checks and results are kept as they are; update the app to read it.</p>
      <button type="button" className="btn" onClick={() => nav('/logs')}>Every check log</button>
    </div>
  );
  return <Log s={s} def={def} can={can} me={me} />;
}

type Tab = 'round' | 'history' | 'checks';

function Log({ s, def, can, me }: { s: ToolStudy; def: NonNullable<ReturnType<typeof defOf>>; can: ReturnType<typeof canAt>; me?: string }) {
  const now = useNow(20_000, s.updatedAt);
  const ctx = useLogCtx(s.workspaceId);
  const snags = useSnags();
  const lines = useFactoryLines(s.workspaceId);
  const line = lines.find(l => l.id === s.workspaceId);
  const [tab, setTab] = useState<Tab>(() => { const t = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('tab'); return t === 'history' || t === 'checks' ? t : 'round'; });
  const f = useMemo(() => logFigures({ s, def, now, ctx, snags }), [s, def, now, ctx, snags]);
  if (!f) return null;
  const said = logSays(f, s, def);
  const closed = !!s.closedAt;
  const p: RoundProps = { s, def, can: closed ? { ...can, edit: false } : can, ...(me ? { me } : {}), ctx, now };
  const page = bandPage(def.title.toUpperCase(), s, said.verdict, said.tone, [['Line', line?.name ?? 'No line'], ['Read over', 'the last 7 days']]);
  const plan = logActions(f, s, snags);
  const nowCards = f.round.now, later = f.round.later, events = f.round.events;
  const cards = (rows: typeof nowCards) => <ul className="lg-round">{rows.map(st => <RoundCard key={st.check.id} s={s} st={st} p={p} />)}</ul>;
  return (
    <div className="wrap ie lg" data-log={def.key}>
      <StudyBand page={page} s={s} what={def.title} canEdit={can.edit && !closed} canRemove={can.remove} />
      <div className="ln-under">
        <p className="sub ie-where">{s.machine ? <><b>{s.machine}</b> · </> : null}{def.fc}{' · '}<button type="button" className="linkish" onClick={() => nav(logHref(def.key))}>Every {def.title.toLowerCase()} log</button></p>
        <WhereItSits s={s} can={can} />
        {/* A COUNT, NOT THE CLOCK — what a program's criterion judges this log by (lib/programCriteria; tools/checks/inARow) */}
        <TargetNumber label="Results in a row, every check, that must pass" value={s.agreed?.log?.inARow} integer min={1} max={50} editable={can.agree && !closed}
          hint={s.agreed?.log?.inARow ? undefined : 'Set it and a program can be judged by this log — the latest results of every check, none failing.'}
          onSet={n => void patchStudy(s.id, cur => { const lg = cur.agreed?.log; if (!lg) return {}; const { inARow: _x, ...rest } = lg; void _x; return { agreed: { ...cur.agreed, log: n !== undefined ? { ...rest, inARow: n } : rest } }; })} />
      </div>
      <LeanTiles tiles={logTiles(f, def)} className="ie-strip lg-tiles" />
      <div className="ie-says"><p className={'ie-say is-' + said.tone} data-says>{said.text}</p></div>
      <LeanInsights insights={logInsights(f)} className="lg-ins" />
      <ViewTabs label="Views of this log" value={tab} onChange={k => setTab(k as Tab)} views={[
        { key: 'round', label: 'Round', count: nowCards.length }, { key: 'history', label: 'History' }, { key: 'checks', label: 'The checks' },
      ]} />
      {tab === 'round' && (
        <div className="lg-roundp" data-tab="round">
          {log0(s).length === 0 && <p className="sub" data-none-checks>Nothing is on the list to check yet — see The checks.</p>}
          {log0(s).length > 0 && (
            <section aria-label="Due now" className="lg-sec">
              <h2 className="lg-h2">Due now <span className="sub">{nowCards.length ? plural(nowCards.length, 'check') : ''}</span></h2>
              {nowCards.length ? cards(nowCards) : <p className="sub lg-none" data-nothing-due>Nothing is due now{later.length ? ` — the next is ${later[0].check.name}, ${later[0].words.replace(/^Done [^—]*— /, '').toLowerCase()}` : ''}.</p>}
            </section>
          )}
          {later.length > 0 && <section aria-label="Done" className="lg-sec"><h2 className="lg-h2">Done <span className="sub">{plural(later.length, 'check')}</span></h2>{cards(later)}</section>}
          {events.length > 0 && <section aria-label="When it happens" className="lg-sec"><h2 className="lg-h2">When it happens <span className="sub">{plural(events.length, 'check')}</span></h2>{cards(events)}</section>}
          {!can.edit && <p className="sub">You can read this log; its checks are done by its team.</p>}
        </div>
      )}
      {tab === 'history' && <HistoryPanel s={s} def={def} f={f} can={{ ...can, edit: can.edit && !closed }} />}
      {tab === 'checks' && <ChecksPanel s={s} def={def} can={{ ...can, agree: can.agree && !closed }} />}
      <section className="ln-panel lg-plan"><h2 className="ln-h">Action plan</h2>
        <LeanActions actions={plan} empty="No problem has been raised from this log." onOpen={undefined} />
      </section>
      <LeanClosing closing={logClosing(f, s)} />
    </div>
  );
}

const log0 = (s: ToolStudy) => s.agreed?.log?.checks.filter(c => !c.removed) ?? [];
