/* The front door. Shown before the app when cloud sync is configured and no one
 * is signed in — a calm hero plus an inline sign-in / create-account card. The
 * app stays offline-first, so there's always a quiet "use on this device" way in
 * that skips the account entirely. Once you sign in (or choose local), you land
 * in the app and don't see this again. */
import { useState } from 'react';
import { LogoMark } from '../ui/Logo';
import { nav } from '../state/useRoute';
import { signIn, signUp } from '../cloud/session';

const POINTS = [
  ['Find it — both ways', 'Time the losses with a stopwatch; film the line and pin the faults on the footage. Two lenses, one workspace.'],
  ['Price it in pounds', 'Every lost minute meets your crew cost. The Pareto ranks the pain in £/week — the language the board decides in.'],
  ['Fix it, and prove it held', 'Actions with owners and due dates, a weekly meeting that runs itself, and evidence when the fix worked — not a hope, a receipt.'],
  ['Offline on the floor, shared everywhere', 'Works with no signal, then backs up and syncs to every device and teammate you invite.'],
] as const;

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
            <span className="landing-name">Faultline</span>
          </div>
          <h1 className="landing-h1 landing-tag">
            <span className="lt-line">OEE systems have numbers and no eyes.</span>
            <span className="lt-line">Audit apps have eyes and no numbers.</span>
            <span className="lt-punch">Faultline has both.</span>
          </h1>
          <p className="landing-lede">
            The stopwatch and the camera on the same line: losses timed and priced
            in £, faults pinned on video — one loop that finds the problem, fixes
            it, and proves the fix held. Built for food manufacturing and ops teams.
          </p>
          <div className="landing-worlds" aria-hidden>
            <div className="lw-card">
              <span className="lw-ic">▤</span>
              <b>The stopwatch</b>
              <span className="sub">Pareto · £/week · proof by re-measure</span>
            </div>
            <span className="lw-plus">+</span>
            <div className="lw-card">
              <span className="lw-ic">▣</span>
              <b>The camera</b>
              <span className="sub">Video walks · pinned faults · proof by re-look</span>
            </div>
          </div>
          <ul className="landing-points">
            {POINTS.map(([t, d]) => (
              <li key={t}>
                <span className="landing-point-dot" aria-hidden />
                <span><b>{t}</b><span className="sub">{d}</span></span>
              </li>
            ))}
          </ul>
          <button className="landing-guide-link" onClick={() => nav('/guide')}>
            See how it works — real screens, two minutes ›
          </button>
        </section>

        <section className="landing-auth card">
          <div className="landing-auth-head">
            <h2 className="landing-auth-title">{mode === 'in' ? 'Sign in' : 'Create your account'}</h2>
            <p className="sub">{mode === 'in' ? 'Back up your work and sync it across devices.' : 'Register with the email your admin invited — you set your own password.'}</p>
          </div>

          <label className="field-label">Email</label>
          <input
            className="text-input" type="email" inputMode="email"
            autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
            value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void submit(); }}
          />
          <label className="field-label" style={{ marginTop: 10 }}>Password</label>
          <input
            className="text-input" type="password"
            autoComplete="new-password" /* stops the browser pre-filling a saved password on this shared-safe form */
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
            {mode === 'in' ? 'Been invited? Create your account' : 'Already have an account? Sign in'}
          </button>
        </section>
      </div>

      {/* THE demo — the one film, everywhere (owner decision, Aug 2026): the
          whole app used start to finish, recorded straight from the product,
          narrated as it goes. Click to play; nothing autoplays at a visitor. */}
      <section className="landing-demo">
        <h2 className="landing-demo-h">Watch the demo</h2>
        <p className="sub landing-demo-sub">
          The whole app, start to finish, in two minutes: a loss logged with the £ counting live,
          the board it lands on, the drill into the worst machine and back out, a case with its
          running study, a proven £-saving with its receipt, the filmed walk, and the meeting
          that runs itself. Real screens, real clicks, explained as it goes.
        </p>
        <video controls preload="none" playsInline poster="/demo/poster.png">
          <source src="/demo/tutorial.webm" type="video/webm" />
          Your browser can't play this clip — the guide link above tells the same story.
        </video>
      </section>
    </div>
  );
}
