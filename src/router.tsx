/* The whole route table. Home lives outside any workspace; everything else is
 * wrapped in the WorkspaceProvider so its data is scoped to that one workspace.
 *
 * The front door is invite-only and there is no way around it: signed out means
 * the Landing (sign in / create account, and only invited emails can register).
 * Once signed in the session is cached locally, so the app still works offline. */
import { lazy, Suspense, useEffect } from 'react';
import { useRoute, navReplace } from './state/useRoute';
import { usePersistRoute } from './state/useResume';
import { WorkspaceProvider } from './state/WorkspaceProvider';
import { WorkspaceHome } from './screens/WorkspaceHome';
import { ResumeRedirect } from './screens/ResumeRedirect';
import { ProjectDashboardScreen } from './screens/ProjectDashboardScreen';
import { ProjectsScreen } from './screens/ProjectsScreen';
import { ProjectSetupScreen } from './screens/ProjectSetupScreen';
import { ProjectLineScreen } from './screens/ProjectLineScreen';
import { MaterialsScreen } from './screens/MaterialsScreen';
import { ProgramsDoor } from './screens/ProgramsScreen';
import { TestsScreen } from './screens/TestsScreen';
import { FixesScreen } from './screens/FixesScreen';
import { InstallScreen } from './screens/InstallScreen';
import { DayScreen } from './screens/DayScreen';
import { PlanScreen } from './screens/PlanScreen';
import { TestScreen } from './screens/TestScreen';
/* Eager: the 6M job's front page and every line page lead with the fishbone,
   so it is on the start-up path of that method already. */
import { FishboneScreen } from './screens/FishboneScreen';
import { ServiceUnavailable } from './screens/ServiceUnavailable';
/* OFF THE START-UP PATH, so not in the first download. One chunk held every
   screen — the 1,500-line client report, the lever tree, the whole line-walk
   tree, the guide and the landing — a megabyte before the dashboard could
   paint, re-fetched on every deploy. The commissioning screens stay eager;
   these load the first time they are opened, behind the same splash. */
const AppShell = lazy(() => import('./screens/AppShell').then(m => ({ default: m.AppShell })));
const Landing = lazy(() => import('./screens/Landing').then(m => ({ default: m.Landing })));
const LeverTree = lazy(() => import('./screens/LeverTree').then(m => ({ default: m.LeverTree })));
const BoardScreen = lazy(() => import('./screens/BoardScreen').then(m => ({ default: m.BoardScreen })));
const ParetoScreen = lazy(() => import('./screens/ParetoScreen').then(m => ({ default: m.ParetoScreen })));
const StandardScreen = lazy(() => import('./screens/StandardScreen').then(m => ({ default: m.StandardScreen })));
const NotesScreen = lazy(() => import('./screens/NotesScreen').then(m => ({ default: m.NotesScreen })));
const ClientReportScreen = lazy(() => import('./screens/ClientReportScreen').then(m => ({ default: m.ClientReportScreen })));
const PaceExecReport = lazy(() => import('./screens/PaceExecReport').then(m => ({ default: m.PaceExecReport })));
const ShareScreen = lazy(() => import('./screens/ShareScreen').then(m => ({ default: m.ShareScreen })));
import { RequireModel } from './ui/RequireModel';
import { RecordDrawerHost } from './ui/RecordDrawer';
import { Frame } from './ui/Frame';
import { BootSplash } from './ui/Logo';
import { cloudConfigured } from './cloud/client';
import { useSession } from './cloud/session';
import { AutoConvert } from './snag/AutoConvert';
import type { Route } from './state/useRoute';

function GoHome() {
  useEffect(() => { navReplace('/'); }, []);
  return null;
}

/** An old link onto a page that is now part of another — no 404, no trail. */
function GoTo({ to }: { to: string }) {
  useEffect(() => { navReplace(to); }, [to]);
  return null;
}

export function Router() {
  const route = useRoute();
  usePersistRoute(route.wsId);

  const { session, loading } = useSession();

  // A build with no backend can't offer accounts. Say so — never fall through to
  // an unauthenticated app, and never ask the user to supply credentials.
  if (!cloudConfigured) return <ServiceUnavailable />;

  /* A SHARE LINK opens for somebody with no account and never will have one:
     one picture or clip, before the session is even asked about. It must not
     wait on the session or show the sign-in door — it is not the app. */
  if (route.name === 'share') return <Suspense fallback={<BootSplash />}><ShareScreen token={route.id ?? ''} /></Suspense>;

  // The "how it works" tour is public — an invitee reads it BEFORE signing up.
  /* INVENTORY OUT. The guide described the first version; the portfolio was
     one number; a deck with no project chosen was a page saying "pick one".
     Home is the control room — their links land there. */
  if (route.name === 'guide' || route.name === 'portfolio') return <GoHome />;

  // Hold the branded splash while the session resolves, so a returning signed-in
  // visitor never flashes the app or the landing on the way in.
  if (loading) return <BootSplash />;
  // Not signed in → the front door. No bypass.
  if (!session) return <Suspense fallback={<BootSplash />}><Landing /></Suspense>;

  // Wrapped around every signed-in screen, not mounted on one: the phone that
  // filmed Line 7 should be fixing Line 7's footage whatever page you happen
  // to be on, and wandering off a screen must not abandon it mid-clip.
  /* ONE FRAME around every signed-in screen (ui/Frame): the top bar and the
     rail stay put while a screen's chunk loads under them, so moving between
     screens never redraws where you are. The share page and the front door
     are outside it — they are not the app. THE RECORD'S DRAWER sits beside
     every screen (ui/RecordDrawer): a step, a test or a fix opens over the
     page you are on when the route says so (?open=<id>), and closes back to it. */
  return (
    <>
      <AutoConvert />
      <Frame route={route}><Suspense fallback={<BootSplash />}>{app(route)}</Suspense></Frame>
      <RecordDrawerHost route={route} />
    </>
  );
}

function app(route: Route) {

  // The portfolio/ledger reads across every workspace, so it lives beside
  // Home, outside any single WorkspaceProvider scope.

  // Projects span several lines each, so like the portfolio they live outside
  // any single WorkspaceProvider scope. The door opens on the LIST.
  //
  // A link saved when there was only one project (#/projects?view=next) used to
  // be sent straight into it. There is no "the" project any more, so the view
  // is dropped and the list is shown — a list is a fair answer to "which one?",
  // and a redirect into a project that may not exist is not.
  if (route.name === 'projects') return <ProjectsScreen />;
  /* THE PACED SURFACES, each behind the model it belongs to. Binding the id
     once keeps the assertion count where it was — the ratchet only ever comes
     down; see CLAUDE.md. */
  if (route.name === 'leverTree' && route.id) {
    const id = route.id;
    return <RequireModel projectId={id} model="tree"><LeverTree projectId={id} /></RequireModel>;
  }
  if (route.name === 'board' && route.id) {
    const id = route.id;
    // A lever tree job writes its actions here too — the tree fills from them.
    return <RequireModel projectId={id} model={['board', 'tree']}><BoardScreen projectId={id} /></RequireModel>;
  }
  if (route.name === 'pareto' && route.id) {
    const id = route.id;
    return (
      <RequireModel projectId={id} model={['board', 'tree']}>
        <ParetoScreen projectId={id} />
      </RequireModel>
    );
  }
  /* THE 6M JOURNEY — a running line's problems, each a fishbone. A 6M job's
     own; a lever tree or stage-gate job has none (docs/SIXM.md). */
  if (route.name === 'fishbone' && route.id) {
    const id = route.id;
    return <RequireModel projectId={id} model="board"><FishboneScreen projectId={id} /></RequireModel>;
  }
  /* THE STAGE-GATE SURFACES, behind their model like the paced ones above.
     Unguarded, a lever tree or 3P job's link with /install, /fixes, /testing,
     /handover, /day or /report on the end drew that job as a stage-gate one —
     gates, a commissioning list and a handover client report over a job that
     has none of them. Materials, programs (which sends a paced job to its
     materials), notes and the line standard belong to every method. */
  const gate = (id: string, screen: React.ReactNode) =>
    <RequireModel projectId={id} model="commissioning">{screen}</RequireModel>;
  if (route.name === 'fixes' && route.id) return gate(route.id, <FixesScreen projectId={route.id} />);
  if (route.name === 'install' && route.id) return gate(route.id, <InstallScreen projectId={route.id} />);
  if (route.name === 'gateSetup' && route.id) return gate(route.id, <InstallScreen projectId={route.id} gate="setup" />);
  if (route.name === 'handover' && route.id) return gate(route.id, <InstallScreen projectId={route.id} gate="handover" />);
  if (route.name === 'day' && route.id) return gate(route.id, <DayScreen projectId={route.id} />);
  if (route.name === 'plan' && route.id) return gate(route.id, <PlanScreen projectId={route.id} />);
  if (route.name === 'materials' && route.id) return <MaterialsScreen projectId={route.id} />;
  if (route.name === 'programs' && route.id) return <ProgramsDoor projectId={route.id} />;
  if (route.name === 'clientReport' && route.id) return gate(route.id, <ClientReportScreen projectId={route.id} />);
  if (route.name === 'notes' && route.id) return <NotesScreen projectId={route.id} />;
  if (route.name === 'standard' && route.id) return <StandardScreen projectId={route.id} standardId={route.lineId} />;
  /* Narrowed once rather than asserted three times: a test route without a
     project is not a screen, it is a bad link, and it falls through to the
     project list below. */
  /* THE CARD PAGE IS THE RECORD'S PAGE NOW (screens/TestScreen reads like
     the card, with the PDF at its foot) — an old /card link lands there. */
  if (route.name === 'trialCard' && route.id && route.lineId) {
    return <GoTo to={`/project/${route.id}/testing/${encodeURIComponent(route.lineId)}`} />;
  }
  if ((route.name === 'testing' || route.name === 'test') && route.id) {
    return gate(route.id, route.name === 'test' && route.lineId
      ? <TestScreen key={route.lineId} projectId={route.id} testId={route.lineId} />
      : <TestsScreen projectId={route.id} />);
  }
  if (route.name === 'projectSetup') return <ProjectSetupScreen projectId={route.id!} />;
  if (route.name === 'projectLine') return <ProjectLineScreen projectId={route.id!} lineId={route.lineId!} />;
  if (route.name === 'projectDashboard') return <ProjectDashboardScreen projectId={route.id!} />;

  // The client report — its own route so the print output carries no app
  // chrome, only the two A3 pages.
  if (route.name === 'paceReport') return route.query.get('project') ? <PaceExecReport /> : <GoHome />;

  return (
    route.name === 'home' || !route.wsId
      ? <WorkspaceHome />
      : (
        <WorkspaceProvider wsId={route.wsId}>
          {route.name === 'resume' ? <ResumeRedirect /> : <AppShell route={route} />}
        </WorkspaceProvider>
      )
  );
}
