import { createContext, useEffect, useState } from 'react';
import { getDB, onDataChange } from '../db';
import { methodByKey, methodOfProject } from '../lib/methods';
import { placementId, type EvidenceKind } from '../lib/methodPlacement';
import type { Project } from '../types';

interface RecordReturn { projectId: string; to: string; label: string; short: string }
export const RecordReturnContext = createContext<RecordReturn | undefined>(undefined);

/** Saved placement, read by record id. The route used to open the study cannot
 * assign another project's phase or line to it. */
export function useRecordReturn(project: Project | undefined, kind: EvidenceKind | undefined, id?: string, line?: string, lineName?: string): RecordReturn | undefined {
  const method = project && methodByKey(methodOfProject(project));
  const key = project && method && kind && id ? placementId(project.id, method.key, kind, id) : undefined;
  const [placement, setPlacement] = useState<{ key: string; phase?: string }>();
  useEffect(() => {
    if (!key) return;
    let active = true;
    let sequence = 0;
    const read = async () => {
      const current = ++sequence;
      const db = await getDB();
      const note = await db.get('test_items', key);
      if (active && sequence === current) setPlacement({ key, phase: !note?.deletedAt ? note?.what : undefined });
    };
    void read();
    const off = onDataChange(() => void read());
    return () => { active = false; off(); };
  }, [key]);
  if (!kind || !id || !project || project.deletedAt || (key && placement?.key !== key)) return undefined;
  const phase = key && method?.sections.find(section => section.name === placement?.phase)?.name;
  const root = '/project/' + encodeURIComponent(project.id);
  const q = new URLSearchParams();
  if (phase) q.set('phase', phase);
  if (line) q.set('line', line);
  const page = phase ? (project.programKey === 'line-recovery' && method?.key === 'dmaic' ? '/recovery' : '/method') : '';
  return {
    projectId: project.id,
    to: root + page + (q.size ? '?' + q : ''),
    label: phase ? `Back to ${phase} in ${project.name}${lineName ? ' · ' + lineName : ''}` : 'Back to ' + project.name,
    short: phase ? [phase, lineName].filter(Boolean).join(' · ') : project.name,
  };
}
