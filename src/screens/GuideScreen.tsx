/* The public "how it works" tour — reachable signed OUT (it's the page an
 * invitee reads before creating their account) and from inside the app. Every
 * picture is the real product, screenshotted from a seeded workspace, so what
 * a customer sees here is exactly what they get. Images live in /guide and are
 * deliberately NOT precached — this page is for first visits, not offline. */
import { nav } from '../state/useRoute';
import { LogoMark } from '../ui/Logo';

interface Step { n: string; title: string; body: string; img: string; wide?: boolean }
/* The tour runs in the order you'd actually work: find the losses (Pareto),
 * pin the faults (snags), then prove it and print it (reports). */
const CHAPTERS: Array<{ part: string; label: string; lede: string; steps: Step[] }> = [
  {
    part: 'Part 1', label: 'The Pareto system',
    lede: 'Log what you see on the floor, and the losses rank themselves.',
    steps: [
      {
        n: '1', img: 'capture',
        title: 'Walk the line. Log what you see.',
        body: 'Tap the asset, tap what you saw, put a time to it — stopwatch it live, type it, or just log that it happened. Photo or video evidence attaches in one tap. It works with no signal; everything syncs itself later.',
      },
      {
        n: '2', img: 'pareto',
        title: 'See where the line is bleeding — in hours and pounds.',
        body: 'Every log lands on a live Pareto: the vital few problems ranked by lost time and what they cost in idle labour. The big bar on the left is where your week is going.',
      },
      {
        n: '3', img: 'drill',
        title: 'Tap a bar. Ask why.',
        body: 'Drill from the problem into the kind of problem, the machine it lives on, the shift it bites hardest. Three taps from "we lose time to changeovers" to "size changes on the filler, on lates". That\'s where the fix goes.',
      },
      {
        n: '4', img: 'present', wide: true,
        title: 'Present it. Boardroom standard, straight from the floor.',
        body: 'One tap turns the same live numbers into a full-screen stage — headline hours and cost, the ranked bars, the story so far. No export, no slide deck, no "let me get back to you".',
      },
    ],
  },
  {
    part: 'Part 2', label: 'The snag system',
    lede: 'Film the walk, and pin every fault to the exact spot on the machine.',
    steps: [
      {
        n: '5', img: 'asset',
        title: 'Film the walk. Pin the faults.',
        body: "Film the line on your phone, freeze any frame into a named machine, and drop a red dot exactly where the problem is. Every snag gets an owner, a status, and an age — so it can't quietly rot in a notebook.",
      },
      {
        n: '6', img: 'history',
        title: 'The same machine, then vs now.',
        body: 'Walk the line again next month and Faultline lines the walks up: the same machine side by side across time, snags visibly closed, new ones visibly appearing, and the one that\'s been open 200 days impossible to ignore.',
      },
    ],
  },
  {
    part: 'Part 3', label: 'The report system',
    lede: 'Proof it\'s working — without writing a single report.',
    steps: [
      {
        n: '7', img: 'trend',
        title: 'Prove it\'s getting better.',
        body: 'Lost hours per week, falling — with a green flag on the week each fix landed. And the honest list underneath: which losses are responding, and which are flat and need a different idea.',
      },
      {
        n: '8', img: 'report', wide: true,
        title: 'The week on one page.',
        body: 'One tap turns it all into a clean page — lost time, cost, who closed what, what needs a push — ready to print (A4 or A3) or save as a PDF for Monday\'s meeting. No manual reporting, ever.',
      },
    ],
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

        {CHAPTERS.map(ch => (
          <section key={ch.part} className="guide-chapter">
            <div className="guide-chapter-head">
              <span className="guide-chapter-part">{ch.part}</span>
              <h2 className="guide-chapter-title">{ch.label}</h2>
              <p className="guide-chapter-lede">{ch.lede}</p>
            </div>
            <div className="guide-steps">
              {ch.steps.map(s => (
                <div key={s.n} className={'guide-step' + (s.wide ? ' wide' : '')}>
                  <div className="guide-copy">
                    <span className="guide-n">{s.n}</span>
                    <h2>{s.title}</h2>
                    <p>{s.body}</p>
                  </div>
                  <div className={'guide-shot' + (s.wide ? ' wide' : '')}>
                    <img src={`/guide/${s.img}.png`} alt={s.title} loading="lazy" />
                  </div>
                </div>
              ))}
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
