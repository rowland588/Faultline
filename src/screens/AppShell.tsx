/* The line-study screens, inside the one frame (ui/Frame). The rail draws
 * Capture · Analyse · Evidence · Meeting under the line the study belongs to,
 * so this no longer carries a spine or a row of tabs of its own — the two
 * things that made stepping from a project into its line study feel like
 * entering a different app. What stays here is the walk's deep trail: inside
 * a filmed line a segment and a frame sit below "Evidence", and the rail
 * does not go that deep.
 *
 * ONE WAY TO GET AROUND. The line study used to have its own: a bar fixed to
 * the bottom with four tabs and a "More" menu holding seven more screens. The
 * line study is a tool under a line (CLAUDE.md), and now it moves like one:
 * the Log is Capture's own list, Present is the Meeting's second act, the trend
 * is a fold on Analyse, Settings and People are one sheet opened where they
 * are wanted. Old links to all of them land where they went. */
import { useEffect } from 'react';
import type { Route } from '../state/useRoute';
import { nav, navReplace, withQuery } from '../state/useRoute';
import { StudySetupSheet } from '../ui/StudySetupSheet';
import { useDeepCrumbs } from '../lib/useTrail';
import { useWorkspace } from '../state/WorkspaceProvider';
import { CaptureScreen } from './CaptureScreen';
import { AnalyseScreen } from './AnalyseScreen';
import { MeetingScreen } from './MeetingScreen';
import { SnagsScreen } from '../snag/SnagsScreen';
import { LineScreen } from '../snag/LineScreen';
import { SegmentScreen } from '../snag/SegmentScreen';
import { AssetScreen } from '../snag/AssetScreen';
import { SnagListScreen } from '../snag/SnagListScreen';
import { WalkthroughScreen } from '../snag/WalkthroughScreen';
import { ReportScreen } from './ReportScreen';
import { AssetHistoryScreen } from '../snag/AssetHistoryScreen';
import { CaseScreen } from './CaseScreen';
import { LineStandardsScreen } from './LineStandardsScreen';

/** The page's name, for the study's screens that have no heading of their
 *  own — the spine used to be the only thing that said which one you were
 *  on. Analyse and Evidence carry their own; the walk's screens sit under
 *  its deep trail. */
const PAGE_NAME: Record<string, string> = { capture: 'Capture', line: 'Machines', case: 'The case' };

/** A saved link to a screen that folded into another lands on the other. */
function Go({ to }: { to: string }) {
  useEffect(() => { navReplace(to); }, [to]);
  return null;
}

export function AppShell({ route }: { route: Route }) {
  const screen = route.name;
  const deep = useDeepCrumbs(route);
  const { workspace } = useWorkspace();
  const ws = route.wsId as string;
  const setup = route.query.get('setup') === '1';

  if (screen === 'log') return <Go to={`/w/${ws}/capture`} />;
  if (screen === 'present') return <Go to={`/w/${ws}/meeting`} />;
  if (screen === 'trend') return <Go to={`/w/${ws}/analyse?trend=1`} />;
  if (screen === 'settings' || screen === 'people') return <Go to={`/w/${ws}/capture?setup=1`} />;

  // The meeting, the snag walkthrough and the printable report fill the
  // frame's main area; they wear the same top bar and rail as every screen.
  if (screen === 'meeting') return <MeetingScreen />;
  if (screen === 'walk') return <WalkthroughScreen wsId={ws} />;
  if (screen === 'report') return <ReportScreen />;
  /* The line's own tools — its maps and balances, a job optional
     (LINE_TOOLS.sql). Their own page, in the frame like the meeting. */
  if (screen === 'lineStandards') return <LineStandardsScreen wsId={ws} standardId={route.id} />;

  /* One .wrap for the study's screens — the screens below carry none of
     their own. */
  return (
    <div className="wrap app">
      {/* THE WALK'S DEEP TRAIL — the segment you are in and the frame marked
          in it, each a tap back up. Below "Evidence" in the rail, which is as
          deep as the rail goes. Only drawn inside a walk. */}
      {deep.length > 0 && (
        <nav className="nv-deep" aria-label="Where you are in the walk">
          <button type="button" className="nv-deep-c" onClick={() => nav(`/w/${ws}/snags?manage`)}>Walks</button>
          {deep.map((c, i) => (
            <span key={i} className="nv-deep-w">
              <span className="nv-deep-sep" aria-hidden>›</span>
              {c.to
                ? <button type="button" className="nv-deep-c" onClick={() => nav(c.to as string)}>{c.label}</button>
                : <span className="nv-deep-c is-here" aria-current="page">{c.label}</span>}
            </span>
          ))}
        </nav>
      )}
      {/* THE PAGE'S NAME, and the study it is in as its one line — the rail
          has the job and the line; on a phone this is where the line study
          is named. */}
      {PAGE_NAME[screen] && (
        <header className="pace-head">
          <div className="pace-head-main">
            <h1 className="pace-title">{PAGE_NAME[screen]}</h1>
            <p className="cw-handover"><span className="sub">{workspace.name}</span></p>
          </div>
        </header>
      )}
      {/* A div, not a second <main>: the frame's is the page's one main. */}
      <div className="app-main">
        {screen === 'capture' && <CaptureScreen />}
        {screen === 'analyse' && <AnalyseScreen route={route} />}
        {screen === 'snags' && <SnagsScreen />}
        {screen === 'line' && <LineScreen wsId={ws} />}
        {screen === 'segment' && <SegmentScreen wsId={ws} segmentId={route.id as string} />}
        {screen === 'asset' && <AssetScreen wsId={ws} assetId={route.id as string} />}
        {screen === 'snaglist' && <SnagListScreen />}
        {screen === 'history' && <AssetHistoryScreen wsId={ws} assetId={route.id as string} />}
        {screen === 'case' && <CaseScreen caseId={route.id as string} />}
      </div>
      {setup && <StudySetupSheet onClose={() => withQuery('setup', null, true)} />}
    </div>
  );
}
