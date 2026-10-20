/* WHAT LINE TALK'S ASSISTANT IS TOLD — the line and the job, read by the
 * line's own page and the control room's own rules (docs/LINE-TALK.md, What
 * it knows; lib/talkContext lays it out).
 *
 * The same reads the line's page makes (screens/ProductionLineScreen): its
 * problems through lib/lineWork, its machines and programs through
 * lib/lineRecords, each tool's latest finding and its stops through the
 * page's own toolSaysOf and stopsOf, the jobs' verdicts through
 * lib/useJobInputs and lib/portfolio. Nothing is worked out here that the
 * line's page does not already say. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getWorkspace, listAllSnags, listObservations, listSnagAssets, listStandardsForLine, listStudiesForLine, onDataChange, projectsOnWorkspace } from '../db';
import { lineFacts } from '../lib/lines';
import { lineProblems } from '../lib/lineWork';
import { lineKit } from '../lib/lineRecords';
import { useLineRecords } from '../lib/useLineRecords';
import { useProjects } from '../lib/useProjects';
import { useJobInputs } from '../lib/useJobInputs';
import { portfolio } from '../lib/portfolio';
import { methodOf } from '../lib/planModel';
import { STATE_WORD, isProved, standingOf, stateOf } from '../lib/programs';
import { niceDay, todayISO } from '../lib/weeks';
import { contextSaid, talkContext, type TalkContextIn } from '../lib/talkContext';
import type { Standard } from '../lib/standard';
import type { ToolStudy } from '../lib/study';
import type { Observation, Workspace } from '../types';
import type { Snag, SnagAsset } from '../snag/types';
import { TOOLS, stopsOf, toolSaysOf } from './ProductionLineScreen';

export interface TalkContextRead { text: string; said: string; input: TalkContextIn }

export function useTalkContext(s: ToolStudy): TalkContextRead | null {
  const wsId = s.workspaceId ?? '';
  const [line, setLine] = useState<Workspace | null | undefined>(undefined);
  const [snags, setSnags] = useState<Snag[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [studies, setStudies] = useState<ToolStudy[]>([]);
  const [obs, setObs] = useState<Observation[]>([]);
  const [walkAssets, setWalkAssets] = useState<SnagAsset[]>([]);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const load = useCallback(async () => {
    if (!wsId) { setLine(null); return; }
    const [w, every, std, ss, on, o, wa] = await Promise.all([getWorkspace(wsId), listAllSnags(), listStandardsForLine(wsId), listStudiesForLine(wsId), projectsOnWorkspace(wsId), listObservations(wsId), listSnagAssets(wsId)]);
    setLine(w ?? null);
    setSnags(every.filter(x => x.workspaceId === wsId && !x.deletedAt && !x.archivedAt && x.status !== 'closed'));
    setStandards(std); setStudies(ss.filter(x => !x.deletedAt)); setJobIds(on); setObs(o); setWalkAssets(wa);
  }, [wsId]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  const { projects } = useProjects();
  const rec = useLineRecords();
  const today = todayISO();
  const jobs = useMemo(() => projects.filter(p => !p.deletedAt && (jobIds.includes(p.id) || p.id === s.projectId)), [projects, jobIds, s.projectId]);
  const inputs = useJobInputs(jobs);
  const views = useMemo(() => (inputs ? new Map(portfolio(inputs.gate, today, inputs.paced).jobs.map(v => [v.id, v])) : null), [inputs, today]);

  return useMemo(() => {
    if (line === undefined) return null;
    const verdict = (id: string) => { const o = views?.get(id)?.onTarget; return o ? `${o.word}${o.brief || o.reason ? ` — ${o.brief ?? o.reason}` : ''}` : undefined; };
    const jobOf = (id: string) => { const p = projects.find(x => x.id === id); return p ? { name: p.name, method: methodOf(p).label, ...(verdict(p.id) ? { verdict: verdict(p.id) } : {}) } : undefined; };
    const input: TalkContextIn = { problems: [], programs: [], tools: [], jobs: [] };
    if (line) {
      const facts = lineFacts(line);
      const kit = lineKit(line, rec.machines, rec.programs, rec.jobLines, today);
      const probs = lineProblems(snags, { id: line.id, name: line.name }, { jobName: id => projects.find(p => p.id === id)?.name, assetName: x => walkAssets.find(a => a.id === x.assetId)?.name });
      const stops = stopsOf(obs);
      input.line = { name: line.name, ...(line.lineType ? { type: line.lineType } : {}), ...(facts.shifts ? { shifts: facts.shifts } : {}), ...(facts.crew ? { crew: facts.crew } : {}), ...(facts.cost ? { cost: facts.cost } : {}) };
      input.machines = kit.flow;
      input.problems = probs.rows;
      input.programs = kit.programs.filter(p => !isProved(p)).map(p => ({
        what: `${p.what}${p.runs ? ` (runs ${p.runs})` : ''}`,
        machine: kit.machines.find(m => m.record?.id === p.assetId)?.name ?? 'the line itself',
        word: STATE_WORD[stateOf(p)], ...(p.testOn ? { test: niceDay(p.testOn) } : {}), late: standingOf(p, today) === 'overdue',
        ...(p.projectId ? { job: projects.find(j => j.id === p.projectId)?.name ?? 'a job' } : {}),
      }));
      /* each tool's latest, as the line's page says it — not Line Talk itself */
      input.tools = TOOLS.filter(t => t.study !== 'talk').flatMap(t => { const said = toolSaysOf(t, { standards, studies, obs, line, wsId }); return said.says ? [{ label: t.label, says: said.says }] : []; });
      if (stops.says) input.stops = stops.says;
      input.jobs = jobs.filter(j => jobIds.includes(j.id)).flatMap(j => { const v = jobOf(j.id); return v ? [v] : []; });
    }
    if (s.projectId) { const j = jobOf(s.projectId); if (j) input.job = j; }
    return { text: talkContext(input), said: contextSaid(input), input };
  }, [line, rec, today, snags, projects, walkAssets, obs, standards, studies, wsId, jobs, jobIds, views, s.projectId]);
}
