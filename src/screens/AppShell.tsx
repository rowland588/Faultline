/* The in-workspace frame: title bar on top, the active screen in the middle,
 * the mode tabs fixed at the bottom. Present and the snag walkthrough take the
 * whole screen. */
import type { Route } from '../state/useRoute';
import { TopBar } from '../ui/TopBar';
import { TabBar } from '../ui/TabBar';
import { CaptureScreen } from './CaptureScreen';
import { AnalyseScreen } from './AnalyseScreen';
import { PresentScreen } from './PresentScreen';
import { LogScreen } from './LogScreen';
import { WorkspaceSettings } from './WorkspaceSettings';
import { SnagsScreen } from '../snag/SnagsScreen';
import { SegmentScreen } from '../snag/SegmentScreen';
import { AssetScreen } from '../snag/AssetScreen';
import { SnagListScreen } from '../snag/SnagListScreen';
import { WalkthroughScreen } from '../snag/WalkthroughScreen';

export function AppShell({ route }: { route: Route }) {
  const screen = route.name;

  // Present and the snag walkthrough are calm, chrome-free full-bleed surfaces.
  if (screen === 'present') return <PresentScreen route={route} />;
  if (screen === 'walk') return <WalkthroughScreen wsId={route.wsId!} />;

  return (
    <div className="app">
      <TopBar />
      <main className="app-main">
        {screen === 'capture' && <CaptureScreen />}
        {screen === 'analyse' && <AnalyseScreen route={route} />}
        {screen === 'log' && <LogScreen />}
        {screen === 'settings' && <WorkspaceSettings />}
        {screen === 'snags' && <SnagsScreen />}
        {screen === 'segment' && <SegmentScreen wsId={route.wsId!} segmentId={route.id!} />}
        {screen === 'asset' && <AssetScreen wsId={route.wsId!} assetId={route.id!} />}
        {screen === 'snaglist' && <SnagListScreen />}
      </main>
      <TabBar active={screen} wsId={route.wsId!} />
    </div>
  );
}
