/* The whole route table. Home lives outside any workspace; everything else is
 * wrapped in the WorkspaceProvider so its data is scoped to that one workspace.
 * When cloud sync is configured, an unauthenticated visitor meets the Landing
 * first — unless they've chosen to work locally on this device. */
import { useState } from 'react';
import { useRoute } from './state/useRoute';
import { usePersistRoute } from './state/useResume';
import { WorkspaceProvider } from './state/WorkspaceProvider';
import { WorkspaceHome } from './screens/WorkspaceHome';
import { ResumeRedirect } from './screens/ResumeRedirect';
import { AppShell } from './screens/AppShell';
import { Landing } from './screens/Landing';
import { BootSplash } from './ui/Logo';
import { cloudConfigured } from './cloud/client';
import { useSession } from './cloud/session';

const LOCAL_KEY = 'finder.enteredLocal';

export function Router() {
  const route = useRoute();
  usePersistRoute(route.wsId);

  const { session, loading } = useSession();
  const [enteredLocal, setEnteredLocal] = useState(() => localStorage.getItem(LOCAL_KEY) === '1');

  // Hold the branded splash while the session resolves, so a returning signed-in
  // visitor never flashes the app or the landing on the way in.
  if (cloudConfigured && loading) return <BootSplash />;

  // Front door: cloud on, nobody signed in, and they haven't opted to stay local.
  if (cloudConfigured && !session && !enteredLocal) {
    return <Landing onEnterLocal={() => { localStorage.setItem(LOCAL_KEY, '1'); setEnteredLocal(true); }} />;
  }

  if (route.name === 'home' || !route.wsId) return <WorkspaceHome />;

  return (
    <WorkspaceProvider wsId={route.wsId}>
      {route.name === 'resume' ? <ResumeRedirect /> : <AppShell route={route} />}
    </WorkspaceProvider>
  );
}
