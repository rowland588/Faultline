/* The whole route table. Home lives outside any workspace; everything else is
 * wrapped in the WorkspaceProvider so its data is scoped to that one workspace. */
import { useRoute } from './state/useRoute';
import { usePersistRoute } from './state/useResume';
import { WorkspaceProvider } from './state/WorkspaceProvider';
import { WorkspaceHome } from './screens/WorkspaceHome';
import { ResumeRedirect } from './screens/ResumeRedirect';
import { AppShell } from './screens/AppShell';

export function Router() {
  const route = useRoute();
  usePersistRoute(route.wsId);

  if (route.name === 'home' || !route.wsId) return <WorkspaceHome />;

  return (
    <WorkspaceProvider wsId={route.wsId}>
      {route.name === 'resume' ? <ResumeRedirect /> : <AppShell route={route} />}
    </WorkspaceProvider>
  );
}
