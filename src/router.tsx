/* The whole route table. Home lives outside any workspace; everything else is
 * wrapped in the WorkspaceProvider so its data is scoped to that one workspace.
 *
 * Invite-only: when cloud sync is configured, the app is gated behind sign-in —
 * there is NO anonymous/local way in. An invited account is the only door. (Once
 * signed in the session is cached locally, so the app still works offline after.) */
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

export function Router() {
  const route = useRoute();
  usePersistRoute(route.wsId);

  const { session, loading } = useSession();

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
