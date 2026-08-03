import { useBootResume } from './state/useResume';
import { Router } from './router';

export default function App() {
  const ready = useBootResume(); // may replace the hash to resume the last workspace
  if (!ready) return null; // one tick; avoids a Home flash before a resume
  return <Router />;
}
