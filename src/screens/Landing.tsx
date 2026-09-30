/* The front door. Shown before the app when cloud sync is configured and no one
 * is signed in. Once you sign in you land in the app and don't see this again.
 *
 * STRIPPED BACK. Rowland: "a brand new landing page — strip it all back to a
 * very simplified futuristic page, the Faultline name across the page with a
 * pulse signature pulsing, then a login." It had grown into a sales page: a
 * tagline about improvement plans, four numbered points, a demo film and the
 * whole guide inline — written for the tracker the product used to be, and
 * all of it standing between the people who use it every day and the sign-in.
 * The people who reach this page are invited; they need the door, not the
 * pitch. The guide is still whole at /guide, one tap from here, for anybody
 * who wants the story.
 *
 * The pulse is the mark's own trace (ui/Logo) drawn across the page: a flat
 * line, a tremor, the fault. It beats slowly, and holds still for anybody who
 * has asked for less motion.
 */
import { useState } from 'react';
import { nav } from '../state/useRoute';
import { signIn, signUp } from '../cloud/session';

/* Flat, a small tremor, the fault, and flat again — across the full width. */
const TRACE = 'M0 80 H360 L374 72 L388 88 L400 80 H430 L458 14 L490 150 L514 50 L532 96 L546 80 H1000';

export function Landing() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const submit = async () => {
    if (busy || !email.trim() || !pw) return;
    setErr(''); setOk(''); setBusy(true);
    try {
      if (mode === 'in') { await signIn(email, pw); nav('/'); } // land on YOUR work, never inside a stale route
      else {
        const { needsConfirm } = await signUp(email, pw);
        if (needsConfirm) setOk('Account created — check your email to confirm, then sign in.');
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fl-door">
      <div className="fl-stage">
        <svg className="fl-pulse" viewBox="0 0 1000 160" preserveAspectRatio="none" aria-hidden>
          <path className="fl-trace" d={TRACE} />
          <path className="fl-beat" d={TRACE} pathLength={1000} />
        </svg>
        <h1 className="fl-name">FAULTLINE</h1>
      </div>
      <p className="fl-sub">Commissioning, proved.</p>

      <form className="fl-auth" onSubmit={e => { e.preventDefault(); void submit(); }}>
        <label className="fl-f">
          <span>Email</span>
          <input type="email" inputMode="email"
            autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
            value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label className="fl-f">
          <span>Password</span>
          <input type="password"
            autoComplete="new-password" /* stops the browser pre-filling a saved password on this shared-safe form */
            value={pw} onChange={e => setPw(e.target.value)} />
        </label>

        {err && <p className="fl-msg is-err" role="alert">{err}</p>}
        {ok && <p className="fl-msg is-ok" role="status">{ok}</p>}

        <button type="submit" className="fl-go" disabled={busy || !email.trim() || !pw}>
          {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
        </button>

        <button type="button" className="fl-link"
          onClick={() => { setMode(m => (m === 'in' ? 'up' : 'in')); setErr(''); setOk(''); }}>
          {mode === 'in' ? 'Been invited? Create your account' : 'Already have an account? Sign in'}
        </button>
      </form>

      <button type="button" className="fl-link fl-guide" onClick={() => nav('/guide')}>How it works ›</button>
    </div>
  );
}
