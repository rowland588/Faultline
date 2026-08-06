/* The whole route table. Home lives outside any workspace; everything else is
 * wrapped in the WorkspaceProvider so its data is scoped to that one workspace.
 *
 * Two gates before the app:
 *  1. NOT CONFIGURED → the Setup screen. The app never silently drops into
 *     local-only mode; a missing backend is stated, with a way to fix it there.
 *  2. CONFIGURED BUT SIGNED OUT → the Landing (sign in / create account).
 *     Invite-only: there is no anonymous way past it. Once signed in the session
 *     is cached locally, so the app still works offline afterwards. */
import { useState } from 'react';
import { useRoute } from './state/useRoute';
import { usePersistRoute } from './state/useResume';
import { WorkspaceProvider } from './state/WorkspaceProvider';
import { WorkspaceHome } from './screens/WorkspaceHome';
import { ResumeRedirect } from './screens/ResumeRedirect';
import { AppShell } from './screens/AppShell';
import { Landing } from './screens/Landing';
import { CloudSetup } from './screens/CloudSetup';
import { BootSplash } from './ui/Logo';
import { cloudConfigured } from './cloud/client';
import { useSession } from './cloud/session';

const LOCAL_ONLY_KEY = 'faultline.localOnly';

export function Router() {
  const route = useRoute();
  usePersistRoute(route.wsId);

  const { session, loading } = useSession();
  const [localOnly, setLocalOnly] = useState(() => localStorage.getItem(LOCAL_ONLY_KEY) === '1');

  // No backend configured → say so and offer to connect (or deliberately opt out).
  if (!cloudConfigured && !localOnly) {
    return <CloudSetup onUseLocal={() => { localStorage.setItem(LOCAL_ONLY_KEY, '1'); setLocalOnly(true); }} />;
  }

  // Hold the branded splash while the session resolves, so a returning signed-in
  // visitor never flashes the app or the landing on the way in.
  if (cloudConfigured && loading) return <BootSplash />;
  // Not signed in → the front door. No bypass.
  if (cloudConfigured && !session) return <Landing />;

  if (route.name === 'home' || !route.wsId) return <WorkspaceHome />;

  return (
    <WorkspaceProvider wsId={route.wsId}>
      {route.name === 'resume' ? <ResumeRedirect /> : <AppShell route={route} />}
    </WorkspaceProvider>
  );
}
