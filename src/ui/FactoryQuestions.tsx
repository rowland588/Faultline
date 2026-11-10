/* THE FACTORY'S FOUR QUESTIONS (docs/LOOK.md §1, look E — Rowland, 6 November: "understand what's going wrong,
 * what needs doing, who's responsible and whether the improvement has actually worked"): four cards across the
 * top, each a door, and under them the answers — the problems by what they cost, the actions with who and by
 * when, the fixes proved by their own before → after. Every figure is lib/factoryQuestions'; the rows are the
 * register's, Actions' and the lines' own. */
import { openProblem } from '../snag/ProblemPanel';
import type { ReactNode } from 'react';
import { nav } from '../state/useRoute';
import { Icon, type IconName } from './Icon';
import type { FourQuestions, Question, WrongRow } from '../lib/factoryQuestions';
import type { ProjectAction } from '../lib/projectActions';
import { openAction } from '../screens/ActionsScreen';
import { fmtGBP } from '../lib/cost';
import { niceDay } from '../lib/weeks';

const ICON: Record<Question['key'], IconName> = { wrong: 'warning', doing: 'check', who: 'people', worked: 'trophy' };
const PRIORITY = { critical: 'Critical', high: 'High', low: 'Low' } as const;
const TONE = { critical: 'r', high: 'a', low: 'g' } as const;

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');

/** The four cards, each a door to its answer. */
export function QuestionCards({ q }: { q: FourQuestions | null }) {
  const go = (c: Question) => {
    if (c.to.startsWith('#')) { document.getElementById(`fq-${c.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    nav(c.to);
  };
  return (
    <div className="fq-cards" aria-label="The four questions">
      {(q?.cards ?? WAITING).map(c => (
        <button key={c.key} type="button" className={`fq-card is-${c.tone}`} onClick={() => go(c)} aria-label={`${c.label} — ${c.value} ${c.of}, ${c.change}`}>
          <span className="fq-ic" aria-hidden><Icon name={ICON[c.key]} size={22} /></span>
          <span className="fq-card-body">
            <span className="fq-k">{c.label}</span>
            <span className="fq-v">{c.value} <span className="fq-of">{c.of}</span></span>
            <span className="fq-d">{c.change}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
const WAITING: Question[] = (['wrong', 'doing', 'who', 'worked'] as const).map(key => ({ key, label: { wrong: 'What’s going wrong', doing: 'What needs doing', who: 'Who’s responsible', worked: 'Did it work' }[key], value: '…', of: '', change: 'reading', tone: 'n' as const, to: '#' + key }));

function Panel({ id, title, all, children }: { id: string; title: string; all?: { label: string; to: string }; children: ReactNode }) {
  return (
    <section className="fq-panel ep-panel" id={id} aria-label={title}>
      <div className="fq-panel-head">
        <h2 className="fq-h2">{title}</h2>
        {all && <button type="button" className="fq-all" onClick={() => nav(all.to)}>{all.label} →</button>}
      </div>
      {children}
    </section>
  );
}

function WrongRows({ rows, open, priced }: { rows: WrongRow[]; open: number; priced: number }) {
  if (!rows.length) return <p className="fq-none">Nothing open on the register.</p>;
  return (
    <>
      <ul className="fq-rows">
        {rows.map(r => (
          <li key={r.id}>
            <button type="button" className="fq-row" onClick={() => openProblem(r.id)}>
              <span className={`fq-pill is-${r.late ? 'r' : TONE[r.priority]}`}>{r.late ? 'Late' : PRIORITY[r.priority]}</span>
              <span className="fq-row-main">
                <b>{r.what}</b>
                <span className="fq-row-sub">{r.line}{r.owner ? ` · ${r.owner}` : ' · nobody yet'}{r.cost && !r.pounds ? ` · ${r.cost.short}` : ''}</span>
              </span>
              <b className={`fq-money${r.pounds ? ' is-r' : ' is-n'}`}>{r.pounds ? `${fmtGBP(r.pounds)} a day` : 'not priced'}</b>
            </button>
          </li>
        ))}
      </ul>
      {priced < open && <p className="fq-foot">{open - priced} of {open} not priced — type the minutes a day on the problem and the wage, speed and margin on its line.</p>}
    </>
  );
}

/* THREE ROWS AN ANSWER (10 November — Rowland: "Too busy. Things need to be simplified"): each answer shows its first three, the
   rest one tap away under its All … link */
const ANSWER_ROWS = 3;

function DoingRows({ rows }: { rows: ProjectAction[] }) {
  if (!rows.length) return <p className="fq-none">Nothing owed.</p>;
  return (
    <ul className="fq-rows">
      {rows.map(a => (
        <li key={a.key}>
          <button type="button" className="fq-row" onClick={() => openAction(a)}>
            <span className={`fq-pill is-${a.late ? 'r' : a.soon ? 'a' : 'n'}`}>{a.late ? 'Late' : a.soon ? 'This week' : a.due ? niceDay(a.due) : 'No day'}</span>
            <span className="fq-row-main">
              <b>{a.what}</b>
              <span className="fq-row-sub">{[a.late && a.due ? `was due ${niceDay(a.due)}` : a.due ? `by ${niceDay(a.due)}` : 'no day agreed', a.where, a.project?.name].filter(Boolean).join(' · ')}</span>
            </span>
            <span className={`fq-who${a.who ? '' : ' is-a'}`}>{a.who ? <><i aria-hidden>{initials(a.who)}</i>{a.who}</> : 'nobody yet'}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function WorkedRows({ q }: { q: FourQuestions }) {
  if (!q.worked.proved.length) return <p className="fq-none">No fix proved yet — a countermeasure done, then the same number counted again, is what proves one.</p>;
  return (
    <ul className="fq-rows">
      {q.worked.proved.slice(0, ANSWER_ROWS).map(f => (
        <li key={f.id}>
          <button type="button" className="fq-row" onClick={() => nav(f.projectId ? `/project/${f.projectId}` : `/lines/${f.lineId}`)}>
            <span className="fq-pill is-g">Held</span>
            <span className="fq-row-main">
              <b>{f.what} — {f.machine}, {f.lineName}</b>
              <span className="fq-row-sub">{f.proof}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** THE WORKING AREA (docs/ENTERPRISE-UX.md X1, 7 November — Rowland, with Microsoft 365's home as the picture): the Lines as the
 *  quick-access list, the three answers side by side under them, the projects' board last; on a phone the answers come first. */
export function QuestionPanels({ q, lines, projects }: { q: FourQuestions | null; lines: ReactNode; projects?: ReactNode }) {
  return (
    <div className={'fq-grid' + (lines ? '' : ' is-nolines')}>
      {lines ? <div className="fq-lines">{lines}</div> : null}
      <div className="fq-answers" aria-label="The answers">
        <Panel id="fq-wrong" title="What’s going wrong" all={{ label: 'All problems', to: '/snags' }}>
          {q ? <WrongRows rows={q.wrong.top.slice(0, ANSWER_ROWS)} open={q.wrong.open} priced={q.wrong.priced} /> : <p className="fq-none">Reading…</p>}
        </Panel>
        <Panel id="fq-doing" title="What needs doing" all={{ label: 'All actions', to: '/actions' }}>
          {q ? <DoingRows rows={q.doing.top.slice(0, ANSWER_ROWS)} /> : <p className="fq-none">Reading…</p>}
          {q && q.who.people.length > 0 && (
            <p className="fq-foot" id="fq-who">{q.who.people.slice(0, 4).map(p => `${p.name} ${p.open}${p.late ? ` (${p.late} late)` : ''}`).join(' · ')}{q.who.nobody ? ` · nobody yet ${q.who.nobody}` : ''}</p>
          )}
        </Panel>
        <Panel id="fq-worked" title="Did it work — before → after">
          {q ? <WorkedRows q={q} /> : <p className="fq-none">Reading…</p>}
        </Panel>
      </div>
      {projects && <div className="fq-projects">{projects}</div>}
    </div>
  );
}

/** NEEDS YOU NOW — the three things to do first, as Microsoft 365's home shows what was recommended (docs/ENTERPRISE-UX.md X1): the dearest or
 *  most urgent problem, then the actions that are late, each a card that opens its record. Drawn from the same answers the lists below read. */
export function NeedsYou({ q }: { q: FourQuestions | null }) {
  if (!q) return null;
  type Rec = { key: string; kind: string; tone: 'r' | 'a' | 'n'; when: string; what: string; where: string; who: string; icon: 'warning' | 'check'; go: () => void };
  const recs: Rec[] = [];
  for (const r of q.wrong.top.slice(0, 1)) recs.push({ key: `p${r.id}`, kind: r.late ? 'Late problem' : `${PRIORITY[r.priority]} problem`, tone: r.late || r.priority === 'critical' ? 'r' : r.priority === 'high' ? 'a' : 'n',
    when: r.pounds ? `${fmtGBP(r.pounds)} a day` : 'not priced yet', what: r.what, where: r.line, who: r.owner ?? 'nobody yet', icon: 'warning', go: () => openProblem(r.id) });
  for (const a of q.doing.top) {
    if (recs.length >= 3) break;
    recs.push({ key: `a${a.key}`, kind: a.late ? 'Late action' : a.soon ? 'Due this week' : 'Action', tone: a.late ? 'r' : a.soon ? 'a' : 'n',
      when: a.late && a.due ? `was due ${niceDay(a.due)}` : a.due ? `by ${niceDay(a.due)}` : 'no day agreed', what: a.what, where: [a.where, a.project?.name].filter(Boolean).join(' · '), who: a.who ?? 'nobody yet', icon: 'check', go: () => openAction(a) });
  }
  if (!recs.length) return null;
  return (
    <section className="fq-recs" aria-label="Needs you now">
      <h2 className="fq-sec-h">Needs you now</h2>
      <ul className="fq-rec-list">
        {recs.map(r => (
          <li key={r.key}>
            <button type="button" className={`fq-rec is-${r.tone}`} onClick={r.go}>
              <span className="fq-rec-head">
                <span className="fq-rec-ic" aria-hidden><Icon name={r.icon} size={16} /></span>
                <span className="fq-rec-kind"><b>{r.kind}</b><small>{r.when}</small></span>
              </span>
              <span className="fq-rec-what">{r.what}</span>
              <span className="fq-rec-foot"><span className="fq-rec-where">{r.where || 'The factory'}</span><span className="fq-rec-who">{r.who}</span></span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
