/* PROJECTS LIST — browse and create improvement initiatives.
 * Shows all projects with their lines and status. Entry point for the project system. */
import { useEffect, useState } from 'react';
import { allProjects, listWorkspaces, addProject } from '../db';
import { nav } from '../state/useRoute';
import { uid, now } from '../lib/ids';
import type { Project, Workspace } from '../types';

export function ProjectsListScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const ps = await allProjects();
      setProjects(ps);
      const wss = await listWorkspaces();
      setWorkspaces(wss);
      setLoading(false);
    };
    load();
  }, []);

  const handleCreateProject = async () => {
    if (!newProjectName || selectedLines.length === 0) return;

    const project: Project = {
      id: uid(),
      name: newProjectName,
      description: `${selectedLines.length} production line${selectedLines.length > 1 ? 's' : ''}`,
      color: '#3b82f6', // blue
      workspaceIds: selectedLines,
      createdAt: now(),
      updatedAt: now()
    };

    await addProject(project);
    setProjects([...projects, project]);
    setNewProjectName('');
    setSelectedLines([]);
    setShowCreate(false);
  };

  const toggleLine = (wsId: string) => {
    if (selectedLines.includes(wsId)) {
      setSelectedLines(selectedLines.filter(id => id !== wsId));
    } else {
      setSelectedLines([...selectedLines, wsId]);
    }
  };

  if (loading) return <div className="screen-container"><p>Loading projects...</p></div>;

  return (
    <div className="screen-container projects-list">
      <h1>Improvement Projects</h1>

      {/* Existing Projects */}
      {projects.length > 0 ? (
        <div className="projects-grid">
          {projects.map(proj => (
            <div key={proj.id} className="project-card" style={{ borderLeftColor: proj.color }}>
              <h3>{proj.name}</h3>
              <p className="sub">{proj.description}</p>
              <p className="line-count">{proj.workspaceIds.length} line(s)</p>
              <button onClick={() => nav({ page: 'projectDashboard', projectId: proj.id })}>
                View Dashboard →
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No projects yet. Create one to get started.</p>
        </div>
      )}

      {/* Create Project Form */}
      {showCreate ? (
        <div className="create-project-form">
          <h2>New Project</h2>
          <label>
            Project name:
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g., Project Pace"
              autoFocus
            />
          </label>

          <fieldset>
            <legend>Select production lines:</legend>
            <div className="lines-grid">
              {workspaces.map(ws => (
                <label key={ws.id} className="line-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedLines.includes(ws.id)}
                    onChange={() => toggleLine(ws.id)}
                  />
                  {ws.name}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="form-buttons">
            <button onClick={handleCreateProject} disabled={!newProjectName || selectedLines.length === 0}>
              Create Project
            </button>
            <button onClick={() => setShowCreate(false)} className="secondary">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowCreate(true)} className="primary" style={{ marginTop: '2rem' }}>
          + Create New Project
        </button>
      )}

      <div className="projects-footer">
        <button onClick={() => nav({ page: 'home' })}>Back to Home</button>
      </div>
    </div>
  );
}
