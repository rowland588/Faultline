/* Shown only if a build ships without its backend configured. That is a deploy
 * fault, not something a user can or should fix, so this states it plainly and
 * asks for nothing. (An earlier version put a credentials form here — wrong: a
 * product never asks its users for backend keys.)
 *
 * The admin-only detail line names exactly which of the two env vars the build
 * saw at compile time (never their values) — "URL only" vs "both missing" points
 * at a completely different fix (a typo'd name vs. wrong Vercel Environment
 * scope), so guessing from "it's broken" alone wastes a round trip every time. */
import { LogoMark } from '../ui/Logo';

export function ServiceUnavailable() {
  const hasUrl = !!(import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const hasKey = !!(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  const detail = !hasUrl && !hasKey
    ? 'Both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY were missing when this build ran.'
    : !hasUrl
    ? 'VITE_SUPABASE_URL was missing when this build ran (VITE_SUPABASE_ANON_KEY was present).'
    : 'VITE_SUPABASE_ANON_KEY was missing when this build ran (VITE_SUPABASE_URL was present).';

  return (
    <div className="landing">
      <div className="landing-inner landing-inner-solo">
        <section className="landing-hero">
          <div className="landing-brand">
            <LogoMark size={40} />
            <span className="landing-name">Faultline</span>
          </div>
          <h1 className="landing-h1">Temporarily unavailable</h1>
          <p className="landing-lede">
            Sign-in is offline for this release while a configuration issue is sorted out.
            Nothing has been lost — please try again shortly.
          </p>
          <p className="sub" style={{ marginTop: 18 }}>If you administer this app: {detail}</p>
          <p className="sub" style={{ marginTop: 6 }}>
            Check they're set for the <b>Production</b> environment in the host's project settings,
            then redeploy with the build cache off. The build log also prints this check.
          </p>
        </section>
      </div>
    </div>
  );
}
