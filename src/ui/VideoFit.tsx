/* HOW TO FILM IT, and IS THIS FOOTAGE FIT FOR THE STUDY? — the plan before
 * the phone is set up (lib/video/capture) and the assessment of footage
 * against the study it is for (lib/video/assess), drawn the same on the New
 * sheet and on the study's page (docs/VIDEO-DESIGN.md, D5–D6). The checks
 * that are fine fold into one line; one to watch is amber, one that makes the
 * footage unfit red — each with what was found and what it means, in words. Then,
 * measure by measure, how each would be known from this footage: measured,
 * worked out, only interpreted, or not from footage — and why. */
import type { CapturePlan } from '../lib/video/capture';
import type { Assessment, CheckStatus } from '../lib/video/assess';

const STATUS_WORD: Record<CheckStatus, string> = { ok: 'Fine', caution: 'Watch', fail: 'Not fit', unknown: 'Not known yet' };
const STATUS_TONE: Record<CheckStatus, 'g' | 'a' | 'r' | 'n'> = { ok: 'g', caution: 'a', fail: 'r', unknown: 'n' };
const VERDICT_TONE: Record<Assessment['verdict'], 'g' | 'a' | 'r' | 'n'> = { suitable: 'g', limits: 'a', unsuitable: 'r', 'not-yet': 'n' };

export function FitView({ a }: { a: Assessment }) {
  const open = a.checks.filter(c => c.status !== 'ok'), fine = a.checks.filter(c => c.status === 'ok');
  const row = (c: Assessment['checks'][number]) => (
    <li key={c.id} className={`vfit-check is-${STATUS_TONE[c.status]}`} data-check={c.id} data-status={c.status}>
      <span className="vfit-what">{c.what}</span>
      <span><b>{STATUS_WORD[c.status]}</b> — {c.found}. <span className="sub">{c.means}</span></span>
    </li>
  );
  return (
    <div className="vfit" data-verdict={a.verdict} data-scope={a.scope}>
      <p className={`vfit-head is-${VERDICT_TONE[a.verdict]}`} data-fit-headline>{a.headline}</p>
      {/* only what is not fine stands out; what is fine is one line, opened for the detail */}
      {open.length > 0 && <ul className="vfit-checks" aria-label="What was checked">{open.map(row)}</ul>}
      {fine.length > 0 && (
        <details className="vfit-fine">
          <summary><b>Fine:</b> {fine.map(c => c.what.charAt(0).toLowerCase() + c.what.slice(1)).join(' · ')}</summary>
          <ul className="vfit-checks">{fine.map(row)}</ul>
        </details>
      )}
      <h3>What this footage can tell you</h3>
      <ul className="vfit-claims" aria-label="What this footage can tell you">
        {a.verdicts.map(v => (
          <li key={v.what} data-claim={v.claim}>
            <span className={`vfit-claim is-${v.claim}`}>{v.word}</span>
            <span>{v.what}. <span className="sub">{v.why}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FilmPlan({ p, open }: { p: CapturePlan; open?: boolean }) {
  return (
    <details className="vfit-plan" open={open} data-plan={p.kind}>
      <summary><b>How to film it</b> — {p.view.name.toLowerCase()}{p.length.sec ? `, ${p.length.sec >= 90 ? `${Math.round(p.length.sec / 60)} minutes` : `${p.length.sec} seconds`} or more` : ''} · <span className="sub">{p.readiness}</span></summary>
      <p className="sub">{p.question} {p.today}</p>
      <dl className="vfit-dl">
        <div><dt>Where the phone goes</dt><dd><b>{p.view.name}</b>: {p.view.place} — {p.view.why}.{p.alsoFine.length ? ` Also fine: ${p.alsoFine.join(', ').toLowerCase()}.` : ''}{p.never.length ? <><br /><span className="sub">Not for this: {p.never.join('; ')}.</span></> : null}</dd></div>
        <div><dt>In the picture</dt><dd><ul>{p.framing.map(x => <li key={x}>{x}</li>)}</ul></dd></div>
        <div><dt>How long</dt><dd>{p.length.says}{p.tooLong ? <><br /><span className="ie-tone is-a">{p.tooLong}</span></> : null}</dd></div>
        <div><dt>The phone</dt><dd><ul>{[...p.settings, ...p.still, ...p.light].map(x => <li key={x}>{x}</li>)}</ul></dd></div>
        <div><dt>The people</dt><dd><ul>{p.people.map(x => <li key={x}>{x}</li>)}</ul></dd></div>
        <div><dt>What it will tell you</dt><dd><ul>{p.measures.map(m => <li key={m.what} data-claim={m.claim}><span className={`vfit-claim is-${m.claim}`}>{m.word}</span> {m.what}{m.note ? <span className="sub"> — {m.note}</span> : null}</li>)}</ul></dd></div>
        {p.cannot.length > 0 && <div><dt>Not from this footage</dt><dd><ul>{p.cannot.map(x => <li key={x}>{x}</li>)}</ul></dd></div>}
        {p.meanwhile && <div><dt>Meanwhile</dt><dd><b>{p.meanwhile.tool}</b> — {p.meanwhile.why}.</dd></div>}
      </dl>
    </details>
  );
}
