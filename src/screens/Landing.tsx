/* The front door. Shown before the app when cloud sync is configured and no one
 * is signed in. Once you sign in you land in the app and don't see this again.
 *
 * STRIPPED BACK. Rowland: "a brand new landing page — strip it all back to a
 * very simplified futuristic page, the Faultline name across the page with a
 * pulse signature pulsing, then a login." It had grown into a sales page: a
 * tagline about improvement plans, four numbered points, a demo film and the
 * whole guide inline — all of it standing between the people who use it every
 * day and the sign-in. The guide is still whole at /guide, one tap from here.
 *
 * LIGHT, NOT DARK. The first cut was black with the name in outline capitals.
 * Rowland: "brighten it up ... the writing looks kind of robotic. I want
 * elegance and futuristic — white backgrounds and blues, shimmers." So: white
 * under a slow blue mist, the name in a fine geometric face with a sheen that
 * passes through it, the pulse drawn in blue, and the sign-in on frosted glass.
 * Words in ordinary case — capitals spaced out read as a machine talking.
 *
 * UNDER THE NAME, WHAT IT IS (31 October — Rowland: "the app has changed, we
 * need it to represent what it is"; then, correcting the first cut which said
 * "project management": "operational improvement system, not a project
 * management system ... the real product is the complete improvement lifecycle:
 * identifying opportunities, diagnosing problems, applying methodologies,
 * organising delivery and verifying results"). The brand, settled the same day: the product *Faultline*, the
 * descriptor *The Operational Improvement System*, the parent *Opex Elevate*, at faultline.opexelevate.co.uk. So: the descriptor and the sentence, the eight
 * methods a project can run (read from lib/methods, never retyped here) as the
 * *apply a methodology* step, and the five stages of the lifecycle in order.
 * Projects are one of the five, not the page's subject. The sign-in stays one
 * glance from the name: beside the five on a desk, first on a phone.
 *
 * MODERN AND MINIMAL (7 November — Rowland: "a new landing page something really modern but minimalistic"). The mist,
 * the sheen and the glinting button are gone: white with a faint dot field fading from the top right, the mark and the
 * name, the house's blue for what you press, Inter, the trace drawn once under the name and then still. What it says is
 * unchanged — the descriptor, the sentence, the eight methods, the five stages, the sign-in, Opex Elevate.
 *
 * The pulse is the mark's own trace (ui/Logo) drawn across the page: a flat
 * line, a tremor, the fault. It, the sheen and the mist all hold still for
 * anybody who has asked for less motion.
 */
import { PRODUCT } from '../lib/product';
import { useState } from 'react';
import { nav } from '../state/useRoute';
import { signIn, signUp } from '../cloud/session';
import { LogoMark } from '../ui/Logo';

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
      const said = e instanceof Error ? e.message : '';
      /* The browser's own words for no signal — "Failed to fetch", "Load
         failed" — mean nothing to somebody at a door; say what happened. */
      setErr(/failed to fetch|load failed|networkerror|network request failed/i.test(said)
        ? `${PRODUCT.name} could not be reached — check the signal and try again.`
        : said || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="door">
      <header className="door-top">
        <LogoMark size={28} id="door" />
        <a className="door-how" href="/how-it-works.html">How it works</a>
      </header>

      <main className="door-main">
        <section className="door-hero">
          <h1 className="door-name">{PRODUCT.mark}</h1>
          <p className="door-line">{PRODUCT.line}</p>
          <p className="door-lede">Understand what’s happening on your lines. Find the next improvement.</p>
        </section>

        <form className="door-card" onSubmit={e => { e.preventDefault(); void submit(); }}>
          <h2 className="door-card-h">{mode === 'in' ? 'Welcome back' : 'Create your account'}</h2>
          <label className="door-f">
            <span>Email</span>
            <input type="email" inputMode="email"
              autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
              value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label className="door-f">
            <span>Password</span>
            <input type="password"
              autoComplete="new-password" /* stops the browser pre-filling a saved password on this shared-safe form */
              value={pw} onChange={e => setPw(e.target.value)} />
          </label>

          {err && <p className="door-msg is-err" role="alert">{err}</p>}
          {ok && <p className="door-msg is-ok" role="status">{ok}</p>}

          <button type="submit" className="door-go" disabled={busy || !email.trim() || !pw}>
            {busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}
          </button>

          <button type="button" className="door-link"
            onClick={() => { setMode(m => (m === 'in' ? 'up' : 'in')); setErr(''); setOk(''); }}>
            {mode === 'in' ? 'Been invited? Create your account' : 'Already have an account? Sign in'}
          </button>
        </form>

      </main>

      <footer className="door-foot">
        <p className="door-parent">An <b>Opex Elevate</b> product</p>
      </footer>
    </div>
  );
}
