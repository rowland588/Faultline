/* The in-workspace frame: title bar on top, the active screen in the middle,
 * the three modes fixed at the bottom. Present takes the whole screen. */
import type { Route } from '../state/useRoute';
import { TopBar } from '../ui/TopBar';
import { TabBar } from '../ui/TabBar';
import { CaptureScreen } from './CaptureScreen';
import { AnalyseScreen } from './AnalyseScreen';
import { PresentScreen } from './PresentScreen';
import { LogScreen } from './LogScreen';
import { WorkspaceSettings } from './WorkspaceSettings';

export function AppShell({ route }: { route: Route }) {
  const screen = route.name;

  // Present is a calm, chrome-free full-bleed surface.
  if (screen === 'present') return <PresentScreen route={route} />;

  return (
    <div className="app">
      <TopBar />
      <main className="app-main">
        {screen === 'capture' && <CaptureScreen />}
        {screen === 'analyse' && <AnalyseScreen route={route} />}
        {screen === 'log' && <LogScreen />}
        {screen === 'settings' && <WorkspaceSettings />}
      </main>
      <TabBar active={screen} wsId={route.wsId!} />
    </div>
  );
}
