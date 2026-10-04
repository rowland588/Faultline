/* The screens' side of supabase/ACCESS_LEVELS.sql: what THIS person may do on
 * a project (lib/access), and whether they may start projects of their own.
 *
 * Both are read from the cloud and remembered on the device, so a job opened
 * with no signal shows the same buttons it did with signal. Until anything is
 * known the answer is the most that person had last time, or — the first time
 * ever — the owner's for a project made here, and the team's otherwise: the
 * database refuses anything more, and a screen that briefly showed less would
 * hide the owner's own controls from him. */
import { useEffect, useState } from 'react';
import { supabase } from './client';
import { useSession } from './session';
import { useProfile } from './admin';
import { accessOf, can, type Access, type Can } from '../lib/access';
import { useProject } from '../lib/useProjects';

const KEY = 'faultline.access.';
const read = (k: string): string | null => { try { return localStorage.getItem(KEY + k); } catch { return null; } };
const write = (k: string, v: string): void => { try { localStorage.setItem(KEY + k, v); } catch { /* fine */ } };

/** What I may do on this project. */
export function useAccess(projectId: string): Can {
  const { session } = useSession();
  const { profile } = useProfile();
  const { project } = useProject(projectId);
  const email = (session?.user.email ?? '').toLowerCase();
  const [mine, setMine] = useState<{ access?: string } | null>(() => {
    const v = read(`${projectId}.${email}`);
    return v ? { access: v } : null;
  });

  useEffect(() => {
    if (!supabase || !session || !email) return;
    // The remembered answer, now the address is known (the first render had none).
    const known = read(`${projectId}.${email}`);
    if (known) setMine({ access: known });
    let alive = true;
    void supabase.from('project_members').select('access').eq('project_id', projectId).eq('email', email).maybeSingle()
      .then(({ data, error }) => {
        if (!alive || error) return;   // no signal, or a cloud without the column: keep what we had
        const access = (data as { access?: string } | null)?.access ?? 'team';
        write(`${projectId}.${email}`, access);
        setMine({ access });
      });
    return () => { alive = false; };
  }, [projectId, session, email]);

  /* For trying a screen as a team member or a client in development:
     localStorage['faultline.access.force'] = 'team' | 'client'. */
  const forced = import.meta.env.DEV ? read('force') : null;
  const level: Access = accessOf({
    signedIn: !!supabase && !!session, myId: session?.user.id, myEmail: email,
    isSuper: !!profile?.is_super, ownerId: project?.ownerId, mine,
  });
  return can(forced === 'team' || forced === 'client' || forced === 'owner' ? forced : level);
}

/** May I start projects of my own? No only for somebody let in by a project invite. */
export function useCanStartProjects(): boolean {
  const { session } = useSession();
  const email = (session?.user.email ?? '').toLowerCase();
  const [ok, setOk] = useState<boolean>(() => read(`start.${email}`) !== 'no');
  useEffect(() => {
    if (!supabase || !session) { setOk(true); return; }
    /* What was known last time, now the address is known — the first render
       came before the session, with no address to look up, so with no signal
       a project-only person was offered New project (found by the Home agent). */
    setOk(read(`start.${email}`) !== 'no');
    let alive = true;
    void supabase.rpc('can_start_projects').then(({ data, error }) => {
      if (!alive || error) return;   // a cloud without the function: everyone may, as before
      const v = data !== false;
      write(`start.${email}`, v ? 'yes' : 'no');
      setOk(v);
    });
    return () => { alive = false; };
  }, [session, email]);
  return ok;
}
