/* The front door. Shown before the app when cloud sync is configured and no one
 * is signed in — a calm hero plus an inline sign-in / create-account card. The
 * app stays offline-first, so there's always a quiet "use on this device" way in
 * that skips the account entirely. Once you sign in (or choose local), you land
 * in the app and don't see this again. */
import { useState } from 'react';
import { LogoMark } from '../ui/Logo';
import { nav } from '../state/useRoute';
import { signIn, signUp } from '../cloud/session';
import { GuideChapters, GuideExpect } from './GuideContent';

/* The four steps, in the order a project actually runs. One door (the ops
 * buyer's); the ledger's marketing rules live in PRODUCT.md.
 *
 * These used to lead with the Pareto — see the loss, price it in pounds — which
 * described the measurement half and skipped the half people are bought by.
 * The plan, the work, the evidence and the proof is what the product IS now;
 * the Pareto is the tool you open when a line is behind and nobody knows why,
 * which is a sentence about a screen, not about the product. */
const POINTS = [
  ['The plan, on one page', 'The outcome, what has to be true for it, the conditions underneath, and the work below that. A lever tree you can put on a wall — and it prints into the report.'],
  ['The work, from where it already lives', 'Actions come off the tracker your team already fills in. Tap a box on the tree, tap the actions that belong under it. No retyping, no second list to keep.'],
  ['The line, filmed where it hurts', 'Walk it with a phone and pin the faults on the footage. The evidence outlives the video — delete the film and the marked frames stay.'],
  ['Proved against the weeks — or not', 'A win is checked against that line\'s own weekly rate: both means, both week counts, a significance test, frozen when you call it. The verdict is allowed to say not proven, or worse.'],
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
      if (mode === 'in') { await signIn(email, pw); nav('/'); } // land on YOUR workspaces, never inside a stale route
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
          {/* The identity's sweep, moving slowly behind the mark. It is the only
              decorative colour in the app and it earns its place here: a front
              door should look like something. Paused entirely for anybody who
              has asked for less motion. */}
          <div className="landing-aurora" aria-hidden>
            <span className="la-blob la-1" /><span className="la-blob la-2" /><span className="la-blob la-3" />
          </div>

          <div className="landing-brand">
            <LogoMark size={44} />
            <span className="landing-name">Faultline</span>
          </div>

          <h1 className="landing-h1 landing-tag">
            <span className="lt-line">Every improvement plan looks good on a slide.</span>
            <span className="lt-line">Every win sounds good in a meeting.</span>
            <span className="lt-punch">Faultline makes them prove it.</span>
          </h1>

          <p className="landing-lede">
            Run the whole initiative in one place — the plan, the owners, the filmed
            evidence and the weekly numbers — and let every result be checked against
            the weeks it claims to have changed.
          </p>

          <div className="landing-worlds" aria-hidden>
            <div className="lw-card">
              <span className="lw-ic">▤</span>
              <b>Run the project</b>
              <span className="sub">The lever tree · owners &amp; dates · the report you present</span>
            </div>
            <span className="lw-plus">+</span>
            <div className="lw-card">
              <span className="lw-ic">▣</span>
              <b>Prove it moved</b>
              <span className="sub">Filmed evidence · the weeks compared · a verdict that can say no</span>
            </div>
          </div>

          {/* Numbered, because they are a sequence — the order a week actually
              runs in, not four features that happen to be listed. */}
          <ol className="landing-points">
            {POINTS.map(([t, d], i) => (
              <li key={t}>
                <span className="lp-n" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                <span className="lp-main"><b>{t}</b><span className="sub">{d}</span></span>
              </li>
            ))}
          </ol>

          <p className="sub landing-trust">
            Offline-first on the phones you already own — works with no signal on
            the floor, then syncs to every teammate you invite. No sensors, no
            integrations, no IT project.
          </p>
          <button className="btn btn-lg landing-see-btn" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
            <b>See how it works</b>
            <span className="lsb-sub">real screens, two minutes ↓</span>
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
          {/* mp4 first: iPhones and iPads don't play VP8 webm */}
          <source src="/demo/tutorial.mp4" type="video/mp4" />
          <source src="/demo/tutorial.webm" type="video/webm" />
          Your browser can't play this clip — the screens below tell the same story.
        </video>
      </section>

      {/* The same story for scrollers (owner decision, Aug 2026): the guide's
          real-screen chapters render inline — nobody clicks links on a landing
          page, and plenty of visitors never press play. /guide stays alive as
          the standalone, shareable copy of exactly this content. */}
      <section className="landing-how" id="how-it-works">
        <h2 className="landing-demo-h">Or scroll it — the real screens</h2>
        <p className="sub landing-demo-sub">
          The same story, picture by picture. Every screen below is the live
          product, not a mock-up.
        </p>
        <GuideChapters />
        <GuideExpect />
        <button className="landing-guide-link" onClick={() => nav('/guide')}>
          Want this as its own page to share? Open the guide ›
        </button>
      </section>
    </div>
  );
}
