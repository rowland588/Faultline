/* The line-study frame: the breadcrumb on top, the same row of tabs the
 * project screens have — Capture · Analyse · Evidence · Meeting — and the
 * active screen under it. The meeting, the walkthrough and the printable
 * report take the whole screen.
 *
 * ONE WAY TO GET AROUND. The line study used to have its own: a bar fixed to
 * the bottom with four tabs and a "More" menu holding seven more screens. The
 * line study is a tool under a line (CLAUDE.md), and now it moves like one:
 * the Log is Capture's own list, Present is the Meeting's second act, the trend
 * is a fold on Analyse, Settings and People are one sheet opened where they
 * are wanted. Old links to all of them land where they went. */
import { useEffect } from 'react';
import type { Route } from '../state/useRoute';
import { navReplace, withQuery } from '../state/useRoute';
import { Crumbs } from '../ui/Crumbs';
import { Peers, studyPeers } from '../ui/Peers';
import { StudySetupSheet } from '../ui/StudySetupSheet';
import { useWsChain, useDeepCrumbs, wsTrail } from '../lib/useTrail';
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

/** A saved link to a screen that folded into another lands on the other. */
function Go({ to }: { to: string }) {
  useEffect(() => { navReplace(to); }, [to]);
  return null;
}

export function AppShell({ route }: { route: Route }) {
  const screen = route.name;
  const { workspace } = useWorkspace();
  const chain = useWsChain(route.wsId);
  const deep = useDeepCrumbs(route);
  const ws = route.wsId as string;
  const setup = route.query.get('setup') === '1';

  if (screen === 'log') return <Go to={`/w/${ws}/capture`} />;
  if (screen === 'present') return <Go to={`/w/${ws}/meeting`} />;
  if (screen === 'trend') return <Go to={`/w/${ws}/analyse?trend=1`} />;
  if (screen === 'settings' || screen === 'people') return <Go to={`/w/${ws}/capture?setup=1`} />;

  // The meeting, the snag walkthrough and the printable report are calm,
  // chrome-free full-bleed surfaces.
  if (screen === 'meeting') return <MeetingScreen />;
  if (screen === 'walk') return <WalkthroughScreen wsId={ws} route={route} />;
  if (screen === 'report') return <ReportScreen />;

  return (
    <div className="app">
      <Crumbs trail={wsTrail(route, chain, workspace.name, deep)} />
      <div className="wrap app-peers"><Peers peers={studyPeers(ws, screen)} /></div>
      <main className="app-main">
        {screen === 'capture' && <CaptureScreen />}
        {screen === 'analyse' && <AnalyseScreen route={route} />}
        {screen === 'snags' && <SnagsScreen />}
        {screen === 'line' && <LineScreen wsId={ws} />}
        {screen === 'segment' && <SegmentScreen wsId={ws} segmentId={route.id as string} />}
        {screen === 'asset' && <AssetScreen wsId={ws} assetId={route.id as string} />}
        {screen === 'snaglist' && <SnagListScreen />}
        {screen === 'history' && <AssetHistoryScreen wsId={ws} assetId={route.id as string} />}
        {screen === 'case' && <CaseScreen caseId={route.id as string} />}
      </main>
      {setup && <StudySetupSheet onClose={() => withQuery('setup', null, true)} />}
    </div>
  );
}
