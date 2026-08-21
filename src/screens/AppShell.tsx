/* The in-workspace frame: title bar on top, the active screen in the middle,
 * the mode tabs fixed at the bottom. Present and the snag walkthrough take the
 * whole screen. */
import type { Route } from '../state/useRoute';
import { TopBar } from '../ui/TopBar';
import { TabBar } from '../ui/TabBar';
import { CaptureScreen } from './CaptureScreen';
import { AnalyseScreen } from './AnalyseScreen';
import { PresentScreen } from './PresentScreen';
import { MeetingScreen } from './MeetingScreen';
import { LogScreen } from './LogScreen';
import { WorkspaceSettings } from './WorkspaceSettings';
import { PeopleScreen } from './PeopleScreen';
import { SnagsScreen } from '../snag/SnagsScreen';
import { LineScreen } from '../snag/LineScreen';
import { SegmentScreen } from '../snag/SegmentScreen';
import { AssetScreen } from '../snag/AssetScreen';
import { SnagListScreen } from '../snag/SnagListScreen';
import { WalkthroughScreen } from '../snag/WalkthroughScreen';
import { TrendScreen } from './TrendScreen';
import { ReportScreen } from './ReportScreen';
import { AssetHistoryScreen } from '../snag/AssetHistoryScreen';
import { CaseScreen } from './CaseScreen';

export function AppShell({ route }: { route: Route }) {
  const screen = route.name;

  // The meeting, Present, the snag walkthrough and the printable report are
  // calm, chrome-free full-bleed surfaces.
  if (screen === 'meeting') return <MeetingScreen />;
  if (screen === 'present') return <PresentScreen route={route} />;
  if (screen === 'walk') return <WalkthroughScreen wsId={route.wsId!} />;
  if (screen === 'report') return <ReportScreen />;

  return (
    <div className="app">
      <TopBar />
      <main className="app-main">
        {screen === 'capture' && <CaptureScreen />}
        {screen === 'analyse' && <AnalyseScreen route={route} />}
        {screen === 'log' && <LogScreen />}
        {screen === 'settings' && <WorkspaceSettings />}
        {screen === 'people' && <PeopleScreen />}
        {screen === 'snags' && <SnagsScreen />}
        {screen === 'line' && <LineScreen wsId={route.wsId!} />}
        {screen === 'segment' && <SegmentScreen wsId={route.wsId!} segmentId={route.id!} />}
        {screen === 'asset' && <AssetScreen wsId={route.wsId!} assetId={route.id!} />}
        {screen === 'snaglist' && <SnagListScreen />}
        {screen === 'trend' && <TrendScreen />}
        {screen === 'history' && <AssetHistoryScreen wsId={route.wsId!} assetId={route.id!} />}
        {screen === 'case' && <CaseScreen caseId={route.id!} />}
      </main>
      <TabBar active={screen} wsId={route.wsId!} />
    </div>
  );
}
