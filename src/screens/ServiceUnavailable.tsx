/* Shown only if a build ships without its backend configured. That is a deploy
 * fault, not something a user can or should fix, so this states it plainly and
 * asks for nothing. (The old version put a credentials form here — wrong: a
 * product never asks its users for backend keys.) */
import { LogoMark } from '../ui/Logo';

export function ServiceUnavailable() {
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
          <p className="sub" style={{ marginTop: 18 }}>
            If you administer this app: the build is missing its Supabase URL and anon key.
          </p>
        </section>
      </div>
    </div>
  );
}
