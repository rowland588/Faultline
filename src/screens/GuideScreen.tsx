/* The public "how it works" page — reachable signed OUT (it's the page an
 * invitee reads before creating their account, and the link a consultant
 * shares on its own). The story itself lives in GuideContent, shared with
 * the landing page — one source of truth, two doors. */
import { nav } from '../state/useRoute';
import { LogoMark } from '../ui/Logo';
import { GuideChapters, GuideExpect } from './GuideContent';

export function GuideScreen() {
  return (
    <div className="guide">
      <div className="guide-inner">
        <header className="guide-head">
          <button className="btn btn-ghost" onClick={() => nav('/')}>‹ Back</button>
        </header>

        <div className="guide-brand"><LogoMark size={40} /><span>Faultline</span></div>
        <h1 className="guide-h1">How it works</h1>
        <p className="guide-lede">
          Walk your line with a phone. Faultline turns what you see into evidence,
          a cost, a tracked snag list — and proof it's getting better. Every picture
          below is the real app.
        </p>

        <GuideChapters />
        <GuideExpect />

        <section className="guide-cta">
          <h2>Been invited?</h2>
          <p className="sub">Your email address is your key — create your account and you're on the line in a minute.</p>
          <button className="btn btn-primary btn-lg" onClick={() => nav('/')}>Sign in / create your account</button>
        </section>
      </div>
    </div>
  );
}
