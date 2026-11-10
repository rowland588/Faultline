/* THE CASE FILE, SHARED BY BOTH WAYS OF WORKING (10 November, docs/LUNA-WORKSPACE.md W4 — Rowland: "I should be able to see the
 * investigation taking shape as we talk … evidence collected, outstanding questions and progress"; "Manual Mode must remain fully
 * functional").
 *
 * A case is the subject Luna and the person are working on — a conversation's thread (its aim, its task, what was decided and assumed,
 * the questions still to answer and those answered, the notes each saying how it is known, what is being built, the records touched).
 * No new record: read from the conversations themselves. On a project's pages (or a line's, for a case on the line with no project) a
 * bar says the newest case about it in a line; opened, the whole file — read-only, the same words Luna's panel shows — and Continue with
 * Luna. A project or line nobody has worked with Luna shows nothing: its pages exactly as ever. */
import { useCallback, useEffect, useState } from 'react';
import { listAllStudies, onDataChange } from '../db';
import type { ToolStudy } from '../lib/study';
import type { Scope } from '../lib/scope';
import { conversationTitle, factsOfConversation, HOW_WORD, isConversation, type Thread } from './conversation';
import { draftSaid } from '../capabilities/drafts';
import { openLunaOn } from './lunaPanel';
import { Icon } from '../ui/Icon';

export interface Case { conversationId: string; conversation: string; thread: Thread; at: number; others: number }

/** The newest case about a project (its threads on it) or a line (threads on it with no project) — and how many others there are. */
export function caseFor(scope: Pick<Scope, 'kind'> & { projectId?: string; wsId?: string }, convs: readonly ToolStudy[]): Case | undefined {
  const all: Case[] = [];
  for (const s of convs) {
    if (s.deletedAt || !isConversation(s)) continue;
    const f = factsOfConversation(s);
    for (const t of f.threads ?? []) {
      if (t.status === 'closed') continue;
      const on = scope.kind === 'project' ? t.scope.projectId === scope.projectId : scope.kind === 'line' ? t.scope.lineId === scope.wsId && !t.scope.projectId : false;
      const worked = t.notes.length + (t.points ?? []).length + t.refs.length > 0 || !!t.objective || !!t.task;
      if (on && worked) all.push({ conversationId: s.id, conversation: conversationTitle(f, s.name), thread: t, at: Math.max(t.at ?? 0, s.updatedAt), others: 0 });
    }
  }
  all.sort((a, b) => b.at - a.at);
  return all[0] ? { ...all[0], others: all.length - 1 } : undefined;
}

/** The case in one line: its aim or title, then the questions open, what is waiting on the person, the notes, what is being built. */
export function caseLine(c: Case, drafts: number): string {
  const t = c.thread;
  const open = (t.points ?? []).filter(p => p.kind === 'question' && !p.answered).length;
  const bits = [
    open ? `${open} question${open === 1 ? '' : 's'} open` : '',
    t.awaiting ? 'a step waiting on you' : '',
    t.notes.length ? `${t.notes.length} known` : '',
    drafts ? `${drafts} being built` : '',
    t.task ? `task: ${t.task.goal}` : '',
  ].filter(Boolean);
  return `${t.objective || t.title}${bits.length ? ` — ${bits.join(' · ')}` : ''}`;
}

export function CaseBar({ scope }: { scope: Scope }) {
  const [convs, setConvs] = useState<ToolStudy[]>([]);
  const [open, setOpen] = useState(false);
  const load = useCallback(async () => setConvs((await listAllStudies()).filter(isConversation)), []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const c = scope.kind === 'project' || scope.kind === 'line' ? caseFor(scope as never, convs) : undefined;
  if (!c) return null;
  const conv = convs.find(s => s.id === c.conversationId);
  const drafts = (conv ? factsOfConversation(conv).drafts ?? [] : []).filter(d => d.status !== 'made' && (scope.kind !== 'project' || d.scope.projectId === (scope as { projectId: string }).projectId));
  const t = c.thread;
  return (
    <section className={'case-bar' + (open ? ' is-open' : '')} aria-label="The case" data-case={c.conversationId}>
      <button type="button" className="case-bar-h" aria-expanded={open} onClick={() => setOpen(o => !o)} data-case-toggle>
        <span className="case-bar-k"><Icon name="spark" size={12} />Case</span>
        <span className="case-bar-t">{caseLine(c, drafts.length)}</span>
        <span className="case-bar-more">{open ? 'Close' : 'Open the case file'}</span>
      </button>
      {open && (
        <div className="case-file" data-case-file>
          <p className="sub">From the conversation “{c.conversation}”{c.others ? ` · and ${c.others} other case${c.others === 1 ? '' : 's'} here` : ''}. What Luna and you have built up — each note saying how it is known.</p>
          {t.objective && <p className="case-row"><b>Aim</b><span>{t.objective}</span></p>}
          {t.task && <p className="case-row"><b>Task</b><span>{t.task.goal} — {t.task.steps.join(' → ')}</span></p>}
          {t.awaiting && <p className="case-row is-wait"><b>Over to you</b><span>{t.awaiting.handover}</span></p>}
          {(t.points ?? []).length > 0 && (
            <ul className="case-list" data-case-points>
              {(t.points ?? []).map(p => <li key={p.id}><b>{p.kind === 'decision' ? 'Decided' : p.kind === 'assumption' ? 'Assumed' : p.answered ? 'Answered' : 'To answer'}</b><span>{p.text}{p.answered ? ` — ${p.answered}` : ''}</span></li>)}
            </ul>
          )}
          {t.notes.length > 0 && (
            <ul className="case-list" data-case-notes>
              {t.notes.map(n => <li key={n.id}><b>{HOW_WORD[n.how]}</b><span>{n.text}</span></li>)}
            </ul>
          )}
          {drafts.length > 0 && (
            <ul className="case-list" data-case-drafts>
              {drafts.map(d => <li key={d.id}><b>Being built</b><span>{draftSaid(d).slice(0, 220)}</span></li>)}
            </ul>
          )}
          {t.refs.filter(r => r.kind !== 'page').length > 0 && (
            <p className="case-row"><b>Records</b><span>{t.refs.filter(r => r.kind !== 'page').slice(-8).map(r => r.label).join(' · ')}</span></p>
          )}
          <button type="button" className="btn btn-primary" data-case-continue onClick={() => openLunaOn(c.conversationId)}><Icon name="spark" size="1.05em" />Continue with Luna</button>
        </div>
      )}
    </section>
  );
}
