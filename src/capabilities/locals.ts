/* THE LOCAL CAPABILITIES — no confirmation: they change only the conversation or this device.
 *   set_focus, park_focus, record_observation — the conversation's threads (a `studies` row, tool 'talk', facts.colleague; its
 *     facts.threads), written with db patchStudy so a turn landing at the same moment is kept;
 *   start_timer — a timer on this device (localStorage TIMERS_KEY, the window told by TIMERS_EVENT; the AI screen draws it);
 *   open_page — an address the screen opens, only one of the app's own. */
import { getStudy, patchStudy } from '../db';
import type { ToolStudy } from '../lib/study';
import { uid } from '../lib/ids';
import { checkObject, ID } from './check';
import { anyone } from './access';
import { HOW_SAID, TIMERS_EVENT, TIMERS_KEY, type CapCtx, type CapRef, type CapResult, type Capability, type ColleagueThread, type DeviceTimer, type HowKnown, type ThreadScope } from './types';

const threadsOf = (s: Pick<ToolStudy, 'facts'>): ColleagueThread[] => {
  const t = (s.facts as { threads?: unknown }).threads;
  return Array.isArray(t) ? t as ColleagueThread[] : [];
};

/** The conversation this call is part of, or why there is none. */
async function conversation(ctx: CapCtx): Promise<{ ok: true; s: ToolStudy } | { ok: false; why: string }> {
  if (!ctx.conversationId) return { ok: false, why: 'This needs a conversation to keep it in, and there is none open.' };
  const s = await getStudy(ctx.conversationId);
  if (!s || s.tool !== 'talk' || !(s.facts as { colleague?: boolean }).colleague) return { ok: false, why: 'The conversation is not on this device any more.' };
  return { ok: true, s };
}

/** The threads written back, worked out from the stored row so nothing written meanwhile is lost. */
const writeThreads = (id: string, change: (cur: ColleagueThread[]) => ColleagueThread[]) =>
  patchStudy(id, cur => ({ facts: { ...cur.facts, threads: change(threadsOf(cur)) } as ToolStudy['facts'] }));

const scopeRefs = (scope: ThreadScope): CapRef[] => [
  ...(scope.lineId ? [{ kind: 'line' as const, id: scope.lineId, label: 'The line', href: `/lines/${scope.lineId}` }] : []),
  ...(scope.projectId ? [{ kind: 'project' as const, id: scope.projectId, label: 'The project', href: `/project/${scope.projectId}` }] : []),
  ...(scope.problemId ? [{ kind: 'problem' as const, id: scope.problemId, label: 'The problem', href: `/snags?open=${encodeURIComponent(scope.problemId)}` }] : []),
  ...(scope.storyId ? [{ kind: 'story' as const, id: scope.storyId, label: 'The story', href: '/story' }] : []),
];

const sameScope = (a: ThreadScope, b: ThreadScope): boolean => {
  const keys = (['lineId', 'projectId', 'problemId', 'storyId'] as const).filter(k => a[k] || b[k]);
  return keys.length > 0 && keys.every(k => a[k] === b[k]);
};

/* ── set_focus ── */
export const setFocus: Capability = {
  name: 'set_focus', title: 'Talk about this now', kind: 'local',
  validate: raw => checkObject(raw, {
    title: { kind: 'string', label: 'the thread’s title', required: true, max: 120 },
    scope: { kind: 'object', label: 'what it is about', fields: { lineId: ID('the line'), projectId: ID('the project'), problemId: ID('the problem'), storyId: ID('the story') } },
  }),
  allowed: anyone,
  async run(ctx, input: { title: string; scope?: ThreadScope }): Promise<CapResult> {
    const c = await conversation(ctx);
    if (!c.ok) return c;
    const scope = input.scope ?? {};
    let made: ColleagueThread | undefined, parked: string | undefined, again = false;
    await writeThreads(c.s.id, cur => {
      const open = cur.filter(t => t.status !== 'closed');
      const hit = open.find(t => sameScope(t.scope, scope)) ?? open.find(t => t.title.trim().toLowerCase() === input.title.toLowerCase());
      parked = cur.find(t => t.status === 'current' && t.id !== hit?.id)?.title;
      again = !!hit;
      made = hit ? { ...hit, status: 'current', at: ctx.now } : { id: uid(), title: input.title, status: 'current', scope, notes: [], refs: scopeRefs(scope), at: ctx.now };
      const rest = cur.filter(t => t.id !== made?.id).map(t => (t.status === 'current' ? { ...t, status: 'parked' as const, at: ctx.now } : t));
      return [...rest, made];
    });
    const t = made as ColleagueThread | undefined;
    if (!t) return { ok: false, why: 'The thread could not be kept.' };
    return { ok: true, says: `${again ? 'Back on' : 'Now on'} “${t.title}”.${parked ? ` “${parked}” is parked.` : ''}`, data: { threadId: t.id }, refs: t.refs };
  },
};

/* ── park_focus ── */
export const parkFocus: Capability = {
  name: 'park_focus', title: 'Park this', kind: 'local',
  validate: raw => checkObject(raw, {}),
  allowed: anyone,
  async run(ctx): Promise<CapResult> {
    const c = await conversation(ctx);
    if (!c.ok) return c;
    const cur = threadsOf(c.s).find(t => t.status === 'current');
    if (!cur) return { ok: false, why: 'Nothing is current to park.' };
    await writeThreads(c.s.id, list => list.map(t => (t.id === cur.id ? { ...t, status: 'parked' as const, at: ctx.now } : t)));
    return { ok: true, says: `“${cur.title}” is parked — come back to it when you like.`, refs: [] };
  },
};

/* ── record_observation ── */
export const recordObservation: Capability = {
  name: 'record_observation', title: 'Note it', kind: 'local',
  validate: raw => checkObject(raw, {
    text: { kind: 'string', label: 'what to note', required: true, max: 1000 },
    how: { kind: 'enum', label: 'how it is known (only a person says verified)', values: HOW_SAID, required: true },
    threadId: ID('the thread'),
  }),
  allowed: anyone,
  async run(ctx, input: { text: string; how: Exclude<HowKnown, 'verified'>; threadId?: string }): Promise<CapResult> {
    const c = await conversation(ctx);
    if (!c.ok) return c;
    const list = threadsOf(c.s);
    const target = input.threadId ? list.find(t => t.id === input.threadId) : list.find(t => t.status === 'current');
    if (!target) return { ok: false, why: input.threadId ? 'There is no thread with that id in this conversation.' : 'No thread is current — set the focus first.' };
    const note = { id: uid(), text: input.text, how: input.how, at: ctx.now };
    await writeThreads(c.s.id, cur => cur.map(t => (t.id === target.id ? { ...t, notes: [...t.notes, note] } : t)));
    return { ok: true, says: `Noted on “${target.title}” (${input.how}).`, data: { noteId: note.id, threadId: target.id }, refs: [] };
  },
};

/* ── start_timer ── */
export function readTimers(): DeviceTimer[] {
  try { const v = JSON.parse(localStorage.getItem(TIMERS_KEY) ?? '[]') as unknown; return Array.isArray(v) ? v as DeviceTimer[] : []; } catch { return []; }
}
export const startTimer: Capability = {
  name: 'start_timer', title: 'Start a timer', kind: 'local',
  validate: raw => checkObject(raw, { minutes: { kind: 'int', label: 'the minutes', min: 1, max: 240, required: true }, label: { kind: 'string', label: 'what it is for', required: true, max: 120 } }),
  allowed: anyone,
  async run(ctx, input: { minutes: number; label: string }): Promise<CapResult> {
    const t: DeviceTimer = { id: uid(), label: input.label, endsAt: ctx.now + input.minutes * 60_000 };
    try {
      /* the finished ones go as a new one is kept */
      localStorage.setItem(TIMERS_KEY, JSON.stringify([...readTimers().filter(x => x.endsAt > ctx.now), t]));
    } catch { return { ok: false, why: 'This device would not keep the timer (a private window?).' }; }
    try { window.dispatchEvent(new Event(TIMERS_EVENT)); } catch { /* no window: kept all the same */ }
    const at = new Date(t.endsAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return { ok: true, says: `A ${input.minutes}-minute timer for “${input.label}” — it goes at ${at}.`, data: t, refs: [] };
  },
};

/* ── open_page ── */
export const openPage: Capability = {
  name: 'open_page', title: 'Open a page', kind: 'local',
  validate: raw => {
    const c = checkObject(raw, { href: { kind: 'string', label: 'the page', required: true, max: 300 } });
    if (!c.ok) return c;
    const href = String(c.input.href).replace(/^#/, '');
    return href.startsWith('/') && !href.startsWith('//') ? { ok: true, input: { href } } : { ok: false, why: 'Only a page of the app can be opened — an address starting “/”.' };
  },
  allowed: anyone,
  async run(_ctx, input: { href: string }): Promise<CapResult> {
    return { ok: true, says: `Opening ${input.href}.`, refs: [{ kind: 'page', id: input.href, label: input.href, href: input.href }] };
  },
};
