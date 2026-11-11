/* MY TEMPLATES, FOR LUNA (11 November, docs/CONSULTANT-WORKSPACE.md C5; lib/templates) — so "use my site assessment checklist here"
 * works through the same functions My templates and the New sheets use:
 *
 *   list_templates       read   the consultant's own templates: name, what it is of, what it keeps, the note — never a customer's record
 *   start_from_template  write  a card: a new document, check log or custom sheet started from one, on the line (and project) given —
 *                               an ordinary record of that line's customer; the template unchanged
 *
 * A template is a starting point for a record of a kind the app already has; it is never a new method or tool (docs/DIRECTION.md). */
import { getStudy, listTemplates } from '../db';
import { getWorkspace } from '../db/workspaces';
import { getProject } from '../db/projects';
import { isTemplate, KIND_WORDS, startFromTemplate, templateSays } from '../lib/templates';
import { studyHref } from '../lib/studyLinks';
import { checkObject, ID } from './check';
import { anyone, mayEdit } from './access';
import { lineRef, notFound, plural, projectRef } from './util';
import type { CapCtx, CapRef, CapResult, Capability } from './types';

const said = (t: { name: string; facts: { template?: { kind: 'doc' | 'log' | 'sheet' } } } & Parameters<typeof templateSays>[0]) =>
  `“${t.name}” (${t.facts.template ? KIND_WORDS[t.facts.template.kind] : 'Template'} · ${templateSays(t)})`;

/* ── list_templates ── */
export const listTemplatesCap: Capability = {
  name: 'list_templates', title: 'My templates', kind: 'read',
  validate: raw => checkObject(raw ?? {}, { kind: { kind: 'enum', values: ['doc', 'log', 'sheet'], label: 'the kind of template' } }),
  allowed: anyone,
  async run(_ctx, input: { kind?: 'doc' | 'log' | 'sheet' }): Promise<CapResult> {
    const all = (await listTemplates()).filter(t => !input.kind || t.facts.template?.kind === input.kind);
    const page: CapRef = { kind: 'page', id: 'templates', label: 'My templates', href: '/templates' };
    if (!all.length) return { ok: true, says: input.kind ? `The person has no ${KIND_WORDS[input.kind].toLowerCase()} templates of their own.` : 'The person has no templates of their own yet — they save one from a document, a check log or a custom sheet (More ▾ › Save as my template).', data: { templates: [] }, refs: [page] };
    return {
      ok: true,
      says: `${plural(all.length, 'template')} of the person's own (theirs at any customer, never a customer's record): ${all.map(t => `${said(t)}${t.facts.template?.note ? ` — ${t.facts.template.note}` : ''} [template ${t.id}]`).join('; ')}. start_from_template starts one on a line; a check log needs a line.`,
      data: { templates: all.map(t => ({ id: t.id, name: t.name, kind: t.facts.template?.kind, of: t.facts.template?.of, keep: t.facts.template?.keep, note: t.facts.template?.note, says: templateSays(t) })) },
      refs: [page],
    };
  },
};

/* ── start_from_template ── */
interface StartIn { templateId: string; lineId?: string; projectId?: string; name?: string }
async function where(input: StartIn): Promise<{ ok: true; line?: Awaited<ReturnType<typeof getWorkspace>>; project?: Awaited<ReturnType<typeof getProject>> } | { ok: false; why: string }> {
  const line = input.lineId ? await getWorkspace(input.lineId) : undefined;
  if (input.lineId && (!line || line.archived)) return notFound('line');
  const project = input.projectId ? await getProject(input.projectId) : undefined;
  if (input.projectId && !project) return notFound('project');
  return { ok: true, line, project };
}

export const startFromTemplateCap: Capability = {
  name: 'start_from_template', title: 'Start from my template', kind: 'write',
  validate: raw => checkObject(raw, {
    templateId: ID('the template', true),
    lineId: ID('the line'), projectId: ID('the project'),
    name: { kind: 'string', label: 'the new record’s name', max: 120 },
  }),
  allowed: (ctx: CapCtx, input: StartIn) => mayEdit(ctx, input.projectId),
  async preview(_ctx, input: StartIn): Promise<string> {
    const t = await getStudy(input.templateId);
    if (!t || !isTemplate(t)) return 'That template is not on this device.';
    const w = await where(input);
    const line = w.ok ? w.line : undefined, project = w.ok ? w.project : undefined;
    const at = line ? `on ${line.name}${line.clientName ? ` (${line.clientName})` : ''}` : 'on no line yet';
    return `Start “${(input.name ?? '').trim() || t.name}” from your template ${said(t)} ${at}${project ? `, in ${project.name}` : ''} — a new record of ${line?.clientName ? `${line.clientName}’s` : 'its own'}, its ${t.facts.template?.kind === 'log' ? 'checks' : 'structure'} carried; the template itself is unchanged.`;
  },
  async run(_ctx, input: StartIn): Promise<CapResult> {
    const t = await getStudy(input.templateId);
    if (!t || !isTemplate(t)) return { ok: false, why: 'That is not one of the person’s templates — list_templates names them.' };
    const w = await where(input);
    if (!w.ok) return w;
    const r = await startFromTemplate(t.id, { ...(input.name ? { name: input.name } : {}), ...(w.line ? { workspaceId: w.line.id } : {}), ...(w.project ? { projectId: w.project.id } : {}) });
    if (!r.ok) return { ok: false, why: r.why };
    const href = studyHref(r.s);
    const ref: CapRef = { kind: 'study', id: r.s.id, label: r.s.name, href };
    return {
      ok: true,
      says: `Started “${r.s.name}” from the template “${t.name}”${w.line ? ` on ${w.line.name}` : ' on no line'}${w.project ? ` in ${w.project.name}` : ''} — an ordinary ${t.facts.template ? KIND_WORDS[t.facts.template.kind].toLowerCase() : 'record'} now, the template unchanged.`,
      data: { id: r.s.id, href }, refs: [ref, ...(w.line ? [lineRef(w.line)] : []), ...(w.project ? [projectRef(w.project)] : [])], show: ref,
    };
  },
};

export const TEMPLATES: readonly Capability[] = [listTemplatesCap, startFromTemplateCap];
