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
import { ProgramsDoor } from './screens/ProgramsPage';
import { TestsScreen } from './screens/TestsScreen';
import { FixesScreen } from './screens/FixesScreen';
import { ActionsScreen, EveryActionScreen } from './screens/ActionsScreen';
import { JourneyScreen } from './project/journey/JourneyScreen';
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
const StandardScreen = lazy(() => import('./tools/linestandard/StandardScreen').then(m => ({ default: m.StandardScreen })));
const NotesScreen = lazy(() => import('./screens/NotesScreen').then(m => ({ default: m.NotesScreen })));
const ClientReportScreen = lazy(() => import('./screens/ClientReportScreen').then(m => ({ default: m.ClientReportScreen })));
const PaceExecReport = lazy(() => import('./screens/PaceExecReport').then(m => ({ default: m.PaceExecReport })));
const QuickSnagsScreen = lazy(() => import('./snag/QuickSnagsScreen').then(m => ({ default: m.QuickSnagsScreen })));
const ProductionLineScreen = lazy(() => import('./screens/ProductionLineScreen').then(m => ({ default: m.ProductionLineScreen })));
const LineReportScreen = lazy(() => import('./line/report/LineReportScreen').then(m => ({ default: m.LineReportScreen })));
const FactoryScreen = lazy(() => import('./screens/FactoryScreen').then(m => ({ default: m.FactoryScreen })));
const LineProgramsScreen = lazy(() => import('./screens/LineProgramsScreen').then(m => ({ default: m.LineProgramsScreen })));
const LineToolsScreen = lazy(() => import('./screens/LineToolsScreen').then(m => ({ default: m.LineToolsScreen })));
const StudiesScreen = lazy(() => import('./screens/StudiesScreen').then(m => ({ default: m.StudiesScreen })));
const StudyScreen = lazy(() => import('./tools/capability/StudyScreen').then(m => ({ default: m.StudyScreen })));
const MapScreen = lazy(() => import('./tools/valuestream/MapScreen').then(m => ({ default: m.MapScreen })));
const ChangeoverScreen = lazy(() => import('./tools/changeover/ChangeoverScreen').then(m => ({ default: m.ChangeoverScreen })));
const ReliabilityScreen = lazy(() => import('./tools/reliability/ReliabilityScreen').then(m => ({ default: m.ReliabilityScreen })));
/* the directory reads the whole catalogue — on its own, so it never weighs on the rest */
const ToolsScreen = lazy(() => import('./screens/ToolsScreen').then(m => ({ default: m.ToolsScreen })));
const ProjectToolsScreen = lazy(() => import('./screens/ProjectToolsScreen').then(m => ({ default: m.ProjectToolsScreen })));
const PartsScreen = lazy(() => import('./screens/PartsScreen').then(m => ({ default: m.PartsScreen })));
const SamplingScreen = lazy(() => import('./tools/sampling/SamplingScreen').then(m => ({ default: m.SamplingScreen })));
const LossesScreen = lazy(() => import('./tools/losses/LossesScreen').then(m => ({ default: m.LossesScreen })));
const ShareScreen = lazy(() => import('./screens/ShareScreen').then(m => ({ default: m.ShareScreen })));
const VideosScreen = lazy(() => import('./tools/video/VideoScreen').then(m => ({ default: m.VideosScreen })));
const VideoStudyScreen = lazy(() => import('./tools/video/VideoScreen').then(m => ({ default: m.VideoStudyScreen })));
const TalksScreen = lazy(() => import('./tools/talk/TalkScreen').then(m => ({ default: m.TalksScreen })));
const TalkScreen = lazy(() => import('./tools/talk/TalkScreen').then(m => ({ default: m.TalkScreen })));
const VideoCheckScreen = lazy(() => import('./tools/video/VideoCheckScreen').then(m => ({ default: m.VideoCheckScreen })));
import { RequireModel } from './ui/RequireModel';
import { RecordDrawerHost } from './ui/RecordDrawer';
import { Frame } from './ui/Frame';
import { BootSplash } from './ui/Logo';
import { cloudConfigured } from './cloud/client';
import { useSession } from './cloud/session';
import { AutoConvert } from './snag/AutoConvert';
import type { Route } from './state/useRoute';
import { MachineScreen } from './screens/MachineScreen';

/** A PROJECT'S FRONT PAGE — the page of the method it runs (the method
 *  builder's own kind of project went with it on 20 October). */
function ProjectDoor({ projectId }: { projectId: string }) {
  return <ProjectDashboardScreen projectId={projectId} />;
}

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
  /* ?line= opens a list on one line — from the line's own page; keyed on it, so a second line starts afresh;
     ?project= inside a project (lib/inProject), keyed on it too */
  if (route.name === 'quickSnags') return <QuickSnagsScreen key={route.query.get('line') ?? ''} />;
  /* THE LINE REPORT — EVERYTHING ON THE LINE (23 October, lib/lineBundle) */
  if (route.name === 'lineReport' && route.wsId) return <LineReportScreen key={route.wsId} wsId={route.wsId} />;
  if (route.name === 'lineHome' && route.wsId) {
    const v = route.query.get('view');
    return <ProductionLineScreen key={route.wsId} wsId={route.wsId} view={v === 'tools' || v === 'projects' || v === 'setup' ? v : 'overview'} />;
  }
  if (route.name === 'factory') return <FactoryScreen />;
  if (route.name === 'allActions') return <EveryActionScreen />;
  if (route.name === 'tools') return <ToolsScreen />;
  if (route.name === 'projectTools' && route.id) return <ProjectToolsScreen key={route.id} projectId={route.id} />;
  /* the parts page is the builders' — in development only; elsewhere the address is the factory */
  if (route.name === 'parts' && import.meta.env.DEV) return <PartsScreen />;
  /* a video study (docs/VIDEO.md): every one, and one */
  if (route.name === 'videos') return <VideosScreen key={route.query.get('project') ?? ''} />;
  if (route.name === 'videoStudy' && route.id) return <VideoStudyScreen key={route.id} id={route.id} />;
  if (route.name === 'videoCheck') return <VideoCheckScreen />;
  /* Line Talk (docs/LINE-TALK.md): every talk (keyed on its line), and one */
  if (route.name === 'talks') return <TalksScreen key={`${route.query.get('line') ?? ''}:${route.query.get('project') ?? ''}`} />;
  if (route.name === 'talk' && route.id) return <TalkScreen key={route.id} id={route.id} />;
  /* ?line= opens it on one line — keyed on it, so a second line starts afresh */
  if (route.name === 'linePrograms') return <LineProgramsScreen key={route.query.get('line') ?? ''} />;
  if (route.name === 'lineTools') return <LineToolsScreen key={`${route.query.get('line') ?? ''}:${route.query.get('project') ?? ''}`} tool={route.view === 'balance' ? 'balance' : route.view === 'work' ? 'work' : 'map'} />;
  if (route.name === 'studies') return <StudiesScreen key={`${route.view ?? 'capability'}:${route.query.get('line') ?? ''}:${route.query.get('project') ?? ''}`} tool={route.view === 'map' ? 'map' : route.view === 'changeover' ? 'changeover' : route.view === 'sampling' ? 'sampling' : route.view === 'losses' ? 'losses' : route.view === 'reliability' ? 'reliability' : 'capability'} />;
  if (route.name === 'study' && route.id) {
    if (route.view === 'map') return <MapScreen key={route.id} id={route.id} />;
    if (route.view === 'changeover') return <ChangeoverScreen key={route.id} id={route.id} />;
    if (route.view === 'sampling') return <SamplingScreen key={route.id} id={route.id} />;
    if (route.view === 'losses') return <LossesScreen key={route.id} id={route.id} />;
    if (route.view === 'reliability') return <ReliabilityScreen key={route.id} id={route.id} />;
    return <StudyScreen key={route.id} id={route.id} />;
  }
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
  /* the project's actions, every method's (docs/PROJECTS.md, P3) */
  if (route.name === 'actions' && route.id) return <ActionsScreen projectId={route.id} />;
  /* the journey — any range of dates, day by day (docs/JOURNEY.md, J2) */
  if (route.name === 'journey' && route.id) return <JourneyScreen projectId={route.id} />;
  if (route.name === 'programs' && route.id) return <ProgramsDoor projectId={route.id} />;
  if (route.name === 'machine' && route.id && route.lineId) return gate(route.id, <MachineScreen key={route.lineId} projectId={route.id} assetId={route.lineId} />);
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
  if (route.name === 'projectDashboard') return <ProjectDoor key={route.id} projectId={route.id ?? ''} />;

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
