/* The public "how it works" tour — reachable signed OUT (it's the page an
 * invitee reads before creating their account) and from inside the app. Every
 * picture is the real product, screenshotted from a seeded workspace, so what
 * a customer sees here is exactly what they get. Images live in /guide and are
 * deliberately NOT precached — this page is for first visits, not offline. */
import { nav } from '../state/useRoute';
import { LogoMark } from '../ui/Logo';

const STEPS: Array<{ n: string; title: string; body: string; img: string; wide?: boolean }> = [
  {
    n: '1', img: 'capture',
    title: 'Walk the line. Log what you see.',
    body: 'Tap the asset, tap what you saw, put a time to it — stopwatch it live, type it, or just log that it happened. Photo or video evidence attaches in one tap. It works with no signal; everything syncs itself later.',
  },
  {
    n: '2', img: 'asset',
    title: 'Film the walk. Pin the faults.',
    body: "Film the line on your phone, freeze any frame into a named machine, and drop a red dot exactly where the problem is. Every snag gets an owner, a status, and an age — so it can't quietly rot in a notebook.",
  },
  {
    n: '3', img: 'pareto',
    title: 'See where the line is bleeding — in hours and pounds.',
    body: 'Every log lands on a live Pareto: the vital few problems ranked by lost time and what they cost. Tap any bar to drill into the machine, the shift, the kind of stop. Present it full-screen straight from the floor.',
  },
  {
    n: '4', img: 'trend',
    title: 'Prove it\'s getting better.',
    body: 'Lost hours per week, falling — with a green flag on the week each fix landed. And the honest list underneath: which losses are responding, and which are flat and need a different idea. This is the chart your boardroom sees.',
  },
  {
    n: '5', img: 'history',
    title: 'The same machine, then vs now.',
    body: 'Walk the line again next month and Faultline lines the walks up: the same machine side by side across time, snags visibly closed, new ones visibly appearing, and the one that\'s been open 200 days impossible to ignore.',
  },
  {
    n: '6', img: 'report', wide: true,
    title: 'The week on one page.',
    body: 'One tap turns it all into a clean page — lost time, cost, who closed what, what needs a push — ready to print or save as a PDF for Monday\'s meeting. No manual reporting, ever.',
  },
];

const EXPECT: Array<[string, string]> = [
  ['Invite-only', 'No public sign-up. Your admin invites you by email; you set your own password.'],
  ['Your workspace, your team', 'Every workspace is its own room. Whoever opens it chooses who\'s in it — add a colleague by email in Settings and they get the whole history, not just what happens next.'],
  ['Works offline', 'Capture with no signal on the floor. It saves on the device and syncs itself when you\'re back in coverage.'],
  ['Syncs by itself', 'No sync buttons. Log on the phone, and it\'s on the laptop seconds later.'],
  ['Phone footage just works', 'Videos are converted on the way in so they play on every device — laptops included.'],
  ['Install it like an app', 'Add it to your home screen from the browser — it opens full-screen and works like a native app.'],
  ['The trend takes two weeks', 'Honest charts need history. Capture for a couple of weeks and "Is it getting better?" starts telling the truth.'],
];

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

        {STEPS.map(s => (
          <section key={s.n} className={'guide-step' + (s.wide ? ' wide' : '')}>
            <div className="guide-copy">
              <span className="guide-n">{s.n}</span>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
            </div>
            <div className={'guide-shot' + (s.wide ? ' wide' : '')}>
              <img src={`/guide/${s.img}.png`} alt={s.title} loading="lazy" />
            </div>
          </section>
        ))}

        <section className="guide-expect">
          <h2>What to expect</h2>
          <div className="guide-expect-grid">
            {EXPECT.map(([t, d]) => (
              <div key={t} className="guide-expect-item">
                <b>{t}</b>
                <span>{d}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="guide-cta">
          <h2>Been invited?</h2>
          <p className="sub">Your email address is your key — create your account and you're on the line in a minute.</p>
          <button className="btn btn-primary btn-lg" onClick={() => nav('/')}>Sign in / create your account</button>
        </section>
      </div>
    </div>
  );
}
