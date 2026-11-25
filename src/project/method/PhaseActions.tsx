import { useState } from 'react';
import { useLunaAnswers } from '../../colleague/lunaAnswers';
import { isLunaDraft } from '../../colleague/LunaMark';
import type { ActionSource } from '../../lib/actionSources';
import { fieldsOf } from '../../lib/methodSheet';
import type { ProjectMethod } from '../../lib/methods';
import { ActionsFromSource, CreateAction } from '../../ui/ActionFollowUp';

type Props = { projectId: string; method: ProjectMethod; section: string; answers: Record<string, string>; canEdit: boolean; sourceField?: string | null };

export function PhaseActions(props: Props) {
  const [open, setOpen] = useState(props.sourceField != null);
  return <details open={open} onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>Actions from this phase</summary>
    {open && <PhaseWork {...props} />}
  </details>;
}

function PhaseWork({ projectId, method, section, answers, canEdit, sourceField }: Props) {
  const [choice, setChoice] = useState<string | undefined>(sourceField ?? undefined);
  const fields = fieldsOf(method.key, section).filter(f => answers[f.id]?.trim() && !(method.key === 'a3' && f.id === 'counter'));
  const marks = useLunaAnswers(projectId, fields);
  const selected = fields.find(f => f.id === (choice ?? fields[0]?.id));
  const excerpt = selected ? answers[selected.id].trim() : '';
  const query = new URLSearchParams({ phase: section, finding: selected?.id ?? '' });
  const source: ActionSource = {
    kind: 'method', id: projectId, part: `${method.key}:${section}`,
    href: `/project/${encodeURIComponent(projectId)}/method?${query}`,
    label: [method.name, section, selected?.label].filter(Boolean).join(' · '),
    how: selected && isLunaDraft(marks.get(selected.id), excerpt) ? 'ai' : 'record',
    ...(excerpt ? { excerpt: excerpt.slice(0, 1200) } : {}),
  };
  return <>
    {canEdit && fields.length > 0 && <label className="field"><span className="field-label">Finding to act on</span>
      <select className="text-input" value={selected?.id ?? ''} onChange={e => setChoice(e.target.value)}>
        {fields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        <option value="">Phase as a whole</option>
      </select>
    </label>}
    {excerpt && <blockquote>{excerpt}</blockquote>}
    <CreateAction sources={[source]} context={{ projectId }} canEdit={canEdit} evidence={false} />
    <ActionsFromSource source={source} />
  </>;
}
