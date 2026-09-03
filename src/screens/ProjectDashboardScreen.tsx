/* PROJECT DASHBOARD — the branded A3 presentation of improvement initiative across multiple lines.
 * Shows quarterly targets, weekly actuals, line charts, and related actions/snags per line. */
import { useEffect, useState } from 'react';
import { nav } from '../state/useRoute';
import { getProject, getProjectTargets, getProjectActuals, getWorkspace } from '../db';
import type { Project, ProjectLineTarget, ProjectLineActual, Workspace } from '../types';

interface LineMetrics {
  workspace: Workspace;
  targets?: ProjectLineTarget;
  actuals: ProjectLineActual[];
}

export function ProjectDashboardScreen({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [lines, setLines] = useState<LineMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const p = await getProject(projectId);
      if (!p) {
        setLoading(false);
        return;
      }
      setProject(p);

      // Load targets and actuals for this project
      const tgts = await getProjectTargets(projectId);
      const acts = await getProjectActuals(projectId);

      // Load workspace details for each line
      const lineData: LineMetrics[] = [];
      for (const wsId of p.workspaceIds) {
        const ws = await getWorkspace(wsId);
        if (ws) {
          const lineTarget = tgts.find(t => t.workspaceId === wsId);
          const lineActuals = acts.filter(a => a.workspaceId === wsId).sort((a, b) => a.date - b.date);
          lineData.push({ workspace: ws, targets: lineTarget, actuals: lineActuals });
        }
      }
      setLines(lineData);
      setLoading(false);
    };
    load();
  }, [projectId]);

  if (loading) return <div className="screen-container"><p>Loading project...</p></div>;
  if (!project) return <div className="screen-container"><p>Project not found.</p></div>;

  return (
    <div className="screen-container project-dashboard">
      {/* Header */}
      <div className="dashboard-header" style={{ borderColor: project.color }}>
        <h1>{project.name}</h1>
        {project.description && <p className="sub">{project.description}</p>}
      </div>

      {/* Metrics Input Section */}
      <section className="dashboard-section">
        <h2>Quarterly Targets &amp; Weekly Actuals</h2>
        <div className="metrics-controls">
          <button onClick={() => nav({ page: 'projectMetrics', projectId })}>
            + Add/Update Metrics
          </button>
        </div>
      </section>

      {/* Lines */}
      {lines.map(line => (
        <section key={line.workspace.id} className="dashboard-line">
          <div className="line-header">
            <h3>{line.workspace.name}</h3>
          </div>

          {/* Targets Display */}
          {line.targets && (
            <div className="targets-row">
              <div className="metric-box">
                <span className="label">Q1</span>
                <span className="value">{line.targets.q1Target} ppm</span>
              </div>
              <div className="metric-box">
                <span className="label">Q2</span>
                <span className="value">{line.targets.q2Target} ppm</span>
              </div>
              <div className="metric-box">
                <span className="label">Q3</span>
                <span className="value">{line.targets.q3Target} ppm</span>
              </div>
              <div className="metric-box">
                <span className="label">Q4</span>
                <span className="value">{line.targets.q4Target} ppm</span>
              </div>
            </div>
          )}

          {/* Actuals Table */}
          {line.actuals.length > 0 && (
            <div className="actuals-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Actual PPM</th>
                    <th>vs Q1</th>
                    <th>vs Q2</th>
                    <th>vs Q3</th>
                    <th>vs Q4</th>
                  </tr>
                </thead>
                <tbody>
                  {line.actuals.slice(-12).map(actual => (
                    <tr key={actual.id}>
                      <td>{new Date(actual.date).toLocaleDateString()}</td>
                      <td className="number">{actual.actualPpm}</td>
                      <td className="number">{line.targets ? (actual.actualPpm - line.targets.q1Target).toFixed(1) : '-'}</td>
                      <td className="number">{line.targets ? (actual.actualPpm - line.targets.q2Target).toFixed(1) : '-'}</td>
                      <td className="number">{line.targets ? (actual.actualPpm - line.targets.q3Target).toFixed(1) : '-'}</td>
                      <td className="number">{line.targets ? (actual.actualPpm - line.targets.q4Target).toFixed(1) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {line.actuals.length === 0 && (
            <div className="empty-state">
              <p>No actuals recorded yet for {line.workspace.name}</p>
            </div>
          )}
        </section>
      ))}

      {/* Navigation */}
      <div className="dashboard-footer">
        <button onClick={() => nav({ page: 'home' })}>Back to Home</button>
      </div>
    </div>
  );
}
