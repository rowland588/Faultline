/* PROJECT METRICS — data entry for quarterly targets and weekly actuals.
 * Simple forms to input PPM targets and measurements for each line. */
import { useEffect, useState } from 'react';
import { nav } from '../state/useRoute';
import { getProject, getProjectTargets, addProjectTarget, updateProjectTarget, getWorkspace, addProjectActual, getProjectActualsByWorkspace } from '../db';
import { uid, now } from '../lib/ids';
import type { Project, ProjectLineTarget, ProjectLineActual, Workspace } from '../types';

export function ProjectMetricsScreen({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [targets, setTargets] = useState<Record<string, ProjectLineTarget>>({});
  const [actualInput, setActualInput] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const p = await getProject(projectId);
      if (!p) {
        setLoading(false);
        return;
      }
      setProject(p);

      // Load workspaces
      const wss: Workspace[] = [];
      for (const wsId of p.workspaceIds) {
        const ws = await getWorkspace(wsId);
        if (ws) wss.push(ws);
      }
      setWorkspaces(wss);

      // Load existing targets
      const tgts = await getProjectTargets(projectId);
      const tgtMap: Record<string, ProjectLineTarget> = {};
      for (const t of tgts) {
        tgtMap[t.workspaceId] = t;
      }
      setTargets(tgtMap);
      setLoading(false);
    };
    load();
  }, [projectId]);

  const handleTargetChange = (wsId: string, field: string, value: string) => {
    const numVal = parseFloat(value) || 0;
    const current = targets[wsId];
    if (current) {
      setTargets({
        ...targets,
        [wsId]: { ...current, [field]: numVal }
      });
    }
  };

  const handleSaveTargets = async (wsId: string) => {
    const t = targets[wsId];
    if (!t) return;
    if (t.id === '') {
      // New target
      await addProjectTarget({
        ...t,
        id: uid(),
        createdAt: now(),
        updatedAt: now()
      });
    } else {
      await updateProjectTarget(t);
    }
    // Reload
    const tgts = await getProjectTargets(projectId);
    const tgtMap: Record<string, ProjectLineTarget> = {};
    for (const target of tgts) {
      tgtMap[target.workspaceId] = target;
    }
    setTargets(tgtMap);
  };

  const handleAddActual = async (wsId: string) => {
    const ppm = parseFloat(actualInput[wsId] || '0');
    if (ppm === 0) return;

    await addProjectActual({
      id: uid(),
      projectId,
      workspaceId: wsId,
      date: now(),
      actualPpm: ppm,
      createdAt: now(),
      updatedAt: now()
    });

    setActualInput({ ...actualInput, [wsId]: '' });
  };

  if (loading) return <div className="screen-container"><p>Loading...</p></div>;
  if (!project) return <div className="screen-container"><p>Project not found.</p></div>;

  return (
    <div className="screen-container project-metrics">
      <h1>Project Metrics: {project.name}</h1>

      {workspaces.map(ws => {
        const tgt = targets[ws.id] || {
          id: '',
          projectId,
          workspaceId: ws.id,
          q1Target: 0,
          q2Target: 0,
          q3Target: 0,
          q4Target: 0,
          startDate: now(),
          createdAt: 0,
          updatedAt: 0
        };

        return (
          <section key={ws.id} className="metrics-section">
            <h2>{ws.name}</h2>

            {/* Quarterly Targets */}
            <div className="subsection">
              <h3>Quarterly Targets (PPM)</h3>
              <div className="form-row">
                <label>
                  Q1:
                  <input
                    type="number"
                    value={tgt.q1Target}
                    onChange={(e) => handleTargetChange(ws.id, 'q1Target', e.target.value)}
                  />
                </label>
                <label>
                  Q2:
                  <input
                    type="number"
                    value={tgt.q2Target}
                    onChange={(e) => handleTargetChange(ws.id, 'q2Target', e.target.value)}
                  />
                </label>
                <label>
                  Q3:
                  <input
                    type="number"
                    value={tgt.q3Target}
                    onChange={(e) => handleTargetChange(ws.id, 'q3Target', e.target.value)}
                  />
                </label>
                <label>
                  Q4:
                  <input
                    type="number"
                    value={tgt.q4Target}
                    onChange={(e) => handleTargetChange(ws.id, 'q4Target', e.target.value)}
                  />
                </label>
                <button onClick={() => handleSaveTargets(ws.id)}>Save Targets</button>
              </div>
            </div>

            {/* Weekly Actual Input */}
            <div className="subsection">
              <h3>Add Weekly Actual</h3>
              <div className="form-row">
                <label>
                  PPM:
                  <input
                    type="number"
                    step="0.1"
                    value={actualInput[ws.id] || ''}
                    onChange={(e) => setActualInput({ ...actualInput, [ws.id]: e.target.value })}
                    placeholder="e.g., 45.5"
                  />
                </label>
                <button onClick={() => handleAddActual(ws.id)}>Record Actual</button>
              </div>
            </div>
          </section>
        );
      })}

      <div className="metrics-footer">
        <button onClick={() => nav({ page: 'projectDashboard', projectId })}>Back to Dashboard</button>
      </div>
    </div>
  );
}
