/* The front door. Shown before the app when cloud sync is configured and no one
 * is signed in — a calm hero plus an inline sign-in / create-account card. The
 * app stays offline-first, so there's always a quiet "use on this device" way in
 * that skips the account entirely. Once you sign in (or choose local), you land
 * in the app and don't see this again. */
import { useState } from 'react';
import { LogoMark } from '../ui/Logo';
import { signIn, signUp } from '../cloud/session';

const POINTS = [
  ['Walk the line', 'Log every stop with a tap. Time, count, cost — one clean row per observation.'],
  ['See the loss', 'It turns into a Pareto and a pound figure the moment you stop walking.'],
  ['Yours, everywhere', 'Works offline on the floor, then backs up and syncs to every device you sign in on.'],
] as const;

export function Landing({ onEnterLocal }: { onEnterLocal: () => void }) {
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
      if (mode === 'in') await signIn(email, pw); // session change unmounts the landing
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
    <div className="landing">
      <div className="landing-inner">
        <section className="landing-hero">
          <div className="landing-brand">
            <LogoMark size={40} />
            <span className="landing-name">Finder</span>
          </div>
          <h1 className="landing-h1">Find the loss. Put a pound on it.</h1>
          <p className="landing-lede">
            A field-first way to walk a line, time every stop, and turn wasted minutes
            into a Pareto and a cost — built for in-house CI and ops teams.
          </p>
          <ul className="landing-points">
            {POINTS.map(([t, d]) => (
              <li key={t}>
                <span className="landing-point-dot" aria-hidden />
                <span><b>{t}</b><span className="sub">{d}</span></span>
              </li>
            ))}
          </ul>
        </section>

        <section className="landing-auth card">
          <div className="landing-auth-head">
            <h2 className="landing-auth-title">{mode === 'in' ? 'Sign in' : 'Create your account'}</h2>
            <p className="sub">{mode === 'in' ? 'Back up your work and sync it across devices.' : 'Free to start. Your data stays on your device too.'}</p>
          </div>

          <label className="field-label">Email</label>
          <input
            className="text-input" type="email" autoComplete="email" inputMode="email"
            value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void submit(); }}
          />
          <label className="field-label" style={{ marginTop: 10 }}>Password</label>
          <input
            className="text-input" type="password"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void submit(); }}
          />

          {err && <p className="sub landing-msg" style={{ color: 'var(--danger)' }}>{err}</p>}
          {ok && <p className="sub landing-msg" style={{ color: 'var(--ok)' }}>{ok}</p>}

          <button className="btn btn-primary btn-lg landing-submit" disabled={busy || !email.trim() || !pw} onClick={submit}>
            {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
          </button>

          <button
            className="landing-toggle"
            onClick={() => { setMode(m => (m === 'in' ? 'up' : 'in')); setErr(''); setOk(''); }}
          >
            {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>

          <div className="landing-or"><span>or</span></div>
          <button className="landing-local" onClick={onEnterLocal}>
            Continue on this device →
            <span className="sub">No account. Everything stays local; you can sign in later.</span>
          </button>
        </section>
      </div>
    </div>
  );
}
