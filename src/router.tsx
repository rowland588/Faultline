/* The whole route table. Home lives outside any workspace; everything else is
 * wrapped in the WorkspaceProvider so its data is scoped to that one workspace.
 *
 * The front door is invite-only and there is no way around it: signed out means
 * the Landing (sign in / create account, and only invited emails can register).
 * Once signed in the session is cached locally, so the app still works offline. */
import { useRoute } from './state/useRoute';
import { usePersistRoute } from './state/useResume';
import { WorkspaceProvider } from './state/WorkspaceProvider';
import { WorkspaceHome } from './screens/WorkspaceHome';
import { ResumeRedirect } from './screens/ResumeRedirect';
import { AppShell } from './screens/AppShell';
import { Landing } from './screens/Landing';
import { GuideScreen } from './screens/GuideScreen';
import { ServiceUnavailable } from './screens/ServiceUnavailable';
import { BootSplash } from './ui/Logo';
import { cloudConfigured } from './cloud/client';
import { useSession } from './cloud/session';

export function Router() {
  const route = useRoute();
  usePersistRoute(route.wsId);

  const { session, loading } = useSession();

  // A build with no backend can't offer accounts. Say so — never fall through to
  // an unauthenticated app, and never ask the user to supply credentials.
  if (!cloudConfigured) return <ServiceUnavailable />;

  // The "how it works" tour is public — an invitee reads it BEFORE signing up.
  if (route.name === 'guide') return <GuideScreen />;

  // Hold the branded splash while the session resolves, so a returning signed-in
  // visitor never flashes the app or the landing on the way in.
  if (loading) return <BootSplash />;
  // Not signed in → the front door. No bypass.
  if (!session) return <Landing />;

  if (route.name === 'home' || !route.wsId) return <WorkspaceHome />;

  return (
    <WorkspaceProvider wsId={route.wsId}>
      {route.name === 'resume' ? <ResumeRedirect /> : <AppShell route={route} />}
    </WorkspaceProvider>
  );
}
