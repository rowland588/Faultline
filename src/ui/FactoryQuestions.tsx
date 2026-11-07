/* THE FACTORY'S FOUR QUESTIONS (docs/LOOK.md §1, look E — Rowland, 6 November: "understand what's going wrong,
 * what needs doing, who's responsible and whether the improvement has actually worked"): four cards across the
 * top, each a door, and under them the answers — the problems by what they cost, the actions with who and by
 * when, the fixes proved by their own before → after. Every figure is lib/factoryQuestions'; the rows are the
 * register's, Actions' and the lines' own. */
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
            <button type="button" className="fq-row" onClick={() => nav(`/snags?open=${encodeURIComponent(r.id)}`)}>
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
      {q.worked.proved.slice(0, 5).map(f => (
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

/** THE WORKING AREA (docs/ENTERPRISE-UX.md X1, 7 November — Rowland: "factory page — terrible layout when showing the lines"):
 *  at a desk the lines and the projects are the main column and the answers — what's going wrong, what needs doing, did it
 *  work — a rail beside them; on a phone one column in the order the questions are asked (styles: .fq-grid). */
export function QuestionPanels({ q, lines, projects }: { q: FourQuestions | null; lines: ReactNode; projects?: ReactNode }) {
  return (
    <div className="fq-grid">
      <div className="fq-main">
        <div className="fq-lines">{lines}</div>
        {projects && <div className="fq-projects">{projects}</div>}
      </div>
      <aside className="fq-side" aria-label="The answers">
        <Panel id="fq-wrong" title="What’s going wrong — by what it costs" all={{ label: 'All problems', to: '/snags' }}>
          {q ? <WrongRows rows={q.wrong.top} open={q.wrong.open} priced={q.wrong.priced} /> : <p className="fq-none">Reading…</p>}
        </Panel>
        <Panel id="fq-doing" title="What needs doing — who, by when" all={{ label: 'All actions', to: '/actions' }}>
          {q ? <DoingRows rows={q.doing.top} /> : <p className="fq-none">Reading…</p>}
          {q && q.who.people.length > 0 && (
            <p className="fq-foot" id="fq-who">{q.who.people.slice(0, 4).map(p => `${p.name} ${p.open}${p.late ? ` (${p.late} late)` : ''}`).join(' · ')}{q.who.nobody ? ` · nobody yet ${q.who.nobody}` : ''}</p>
          )}
        </Panel>
        <Panel id="fq-worked" title="Did it work — before → after, on the same number">
          {q ? <WorkedRows q={q} /> : <p className="fq-none">Reading…</p>}
        </Panel>
      </aside>
    </div>
  );
}
