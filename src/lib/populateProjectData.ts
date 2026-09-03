/* Utility to populate Project Pace PPM data for testing/demo.
 * Run this from browser console: await window.__populateProjectData() */
import { getDB } from '../db';
import { uid, now } from './ids';
import type { Project, ProjectLineTarget, ProjectLineActual, Workspace } from '../types';

const PROJECT_NAME = 'Project Pace';
const START_DATE = new Date('2026-08-01').getTime(); // August 1, 2026
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// PPM data: Line -> [week1, week2, ..., week6]
const PPM_DATA: Record<string, { name: string; target: Partial<ProjectLineTarget>; actuals: number[] }> = {
  'Line 2A': {
    name: 'Line 2A',
    target: { q1Target: 44, q2Target: 50, q3Target: 52, q4Target: 55 },
    actuals: [42, 41, 35, 47, 44, 46],
  },
  'Line 2B': {
    name: 'Line 2B',
    target: { q1Target: 44, q2Target: 50, q3Target: 52, q4Target: 55 },
    actuals: [28, 30, 29, 0, 28, 34], // 0 means skip this week
  },
  'Line 7': {
    name: 'Line 7',
    target: { q1Target: 39, q2Target: 42, q3Target: 44, q4Target: 46 },
    actuals: [37, 44, 37, 35, 35, 38],
  },
  'Line 10': {
    name: 'Line 10',
    target: { q1Target: 48, q2Target: 51, q3Target: 53, q4Target: 55 },
    actuals: [56, 59, 52, 57, 54, 52],
  },
};

interface WorkspaceMatch {
  workspace: Workspace;
  lineKey: string;
}

async function findWorkspaceByName(name: string): Promise<Workspace | undefined> {
  const db = await getDB();
  const all = await db.getAll('workspaces');
  return all.find(w => w.name.includes(name) || w.name === name);
}

export async function populateProjectData(): Promise<string> {
  console.log('🚀 Starting Project Pace data population...');
  const db = await getDB();
  const t = now();

  // Step 1: Find or create workspaces for each line
  console.log('📍 Matching lines to workspaces...');
  const lineWorkspaces: WorkspaceMatch[] = [];

  for (const lineKey of Object.keys(PPM_DATA)) {
    let workspace = await findWorkspaceByName(lineKey);
    if (workspace) {
      lineWorkspaces.push({ workspace, lineKey });
      console.log(`  ✓ Found workspace: ${workspace.name}`);
    } else {
      console.warn(`  ⚠ Workspace not found for ${lineKey} — it must be created first`);
    }
  }

  if (lineWorkspaces.length === 0) {
    throw new Error('No matching workspaces found. Create workspaces for Line 2A, Line 2B, Line 7, Line 10 first.');
  }

  // Step 2: Create or find the project
  console.log(`📊 Setting up ${PROJECT_NAME}...`);
  let project: Project | undefined;
  const all = await db.getAll('projects');
  project = all.find(p => p.name === PROJECT_NAME && !p.deletedAt);

  if (!project) {
    project = {
      id: uid(),
      name: PROJECT_NAME,
      description: 'Multi-line improvement initiative with quarterly targets and weekly PPM tracking',
      color: '#2B87D4',
      workspaceIds: lineWorkspaces.map(m => m.workspace.id),
      createdAt: t,
      updatedAt: t,
    };
    await db.put('projects', project);
    console.log(`  ✓ Created project: ${project.id}`);
  } else {
    // Update workspaceIds if needed
    const wsIds = new Set(project.workspaceIds);
    let updated = false;
    for (const { workspace } of lineWorkspaces) {
      if (!wsIds.has(workspace.id)) {
        wsIds.add(workspace.id);
        updated = true;
      }
    }
    if (updated) {
      project.workspaceIds = Array.from(wsIds);
      project.updatedAt = t;
      await db.put('projects', project);
      console.log(`  ✓ Updated project workspaces`);
    } else {
      console.log(`  ✓ Project already exists`);
    }
  }

  // Step 3: Create quarterly targets for each line
  console.log('🎯 Creating quarterly targets...');
  for (const { workspace, lineKey } of lineWorkspaces) {
    const lineData = PPM_DATA[lineKey];
    const existingTargets = await db.getAllFromIndex('project_targets', 'by_project', project.id);
    const hasTarget = existingTargets.some(t => t.workspaceId === workspace.id && !t.deletedAt);

    if (!hasTarget) {
      const target: ProjectLineTarget = {
        id: uid(),
        projectId: project.id,
        workspaceId: workspace.id,
        q1Target: lineData.target.q1Target!,
        q2Target: lineData.target.q2Target!,
        q3Target: lineData.target.q3Target!,
        q4Target: lineData.target.q4Target!,
        startDate: START_DATE,
        createdAt: t,
        updatedAt: t,
      };
      await db.put('project_targets', target);
      console.log(`  ✓ Created targets for ${lineKey}: Q1=${target.q1Target}, Q2=${target.q2Target}, Q3=${target.q3Target}, Q4=${target.q4Target}`);
    } else {
      console.log(`  ✓ Targets already exist for ${lineKey}`);
    }
  }

  // Step 4: Populate actual PPM measurements (6 weeks of data)
  console.log('📈 Populating actual PPM data...');
  for (const { workspace, lineKey } of lineWorkspaces) {
    const lineData = PPM_DATA[lineKey];
    const existingActuals = await db.getAllFromIndex('project_actuals', 'by_workspace', workspace.id);
    const hasActuals = existingActuals.some(a => a.projectId === project.id && !a.deletedAt);

    if (!hasActuals) {
      for (let week = 0; week < lineData.actuals.length; week++) {
        const ppm = lineData.actuals[week];
        if (ppm === 0) continue; // Skip missing weeks

        const date = START_DATE + (week * WEEK_MS);
        const actual: ProjectLineActual = {
          id: uid(),
          projectId: project.id,
          workspaceId: workspace.id,
          date,
          actualPpm: ppm,
          createdAt: t,
          updatedAt: t,
        };
        await db.put('project_actuals', actual);
      }
      console.log(`  ✓ Added ${lineData.actuals.filter(a => a > 0).length} weeks of data for ${lineKey}`);
    } else {
      console.log(`  ✓ Data already exists for ${lineKey}`);
    }
  }

  console.log(`✅ Project Pace populated! View at /#/projects or /#/project/${project.id}`);
  return project.id;
}

// Export for browser console access
declare global {
  interface Window {
    __populateProjectData?: typeof populateProjectData;
  }
}
if (typeof window !== 'undefined') {
  window.__populateProjectData = populateProjectData;
}
