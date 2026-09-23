/* THE TRIAL CARD, ON SCREEN — read it, then decide whether to send it.
 *
 * Rowland: "on the trial card it gives you the direct opportunity just to send
 * it, but I can't view it... if I go to client report, I get to actually view
 * it, and that looks a lot better. So I suppose I just want the same."
 *
 * He was describing a real fault, not a preference. deliverPdf offers the share
 * sheet FIRST on any device that has one, which is right for a report somebody
 * has already read and wrong for one they have not: on a phone, pressing the
 * button put a send dialog in front of him for a document he had never laid
 * eyes on. The client report does not do that, because the client report is a
 * SCREEN with a Print button — you read the thing, then you send it.
 *
 * So this is that same arrangement for the trial card, and deliberately not a
 * PDF embedded in a box: an <iframe> of a PDF is unreliable on iOS Safari in
 * ways this environment cannot test, and shipping a preview that might be blank
 * on the one device he uses on the floor would be worse than what it replaced.
 *
 * SCREEN AND PDF ARE THE SAME READING. Both take trialCard() — the four parts
 * of the loop, numbered the same way in the same order — so the two cannot
 * disagree about what is on the card. What differs is only how it is set: the
 * page reflows for a phone, the A4 does not.
 */
import { useEffect, useState } from 'react';
import { useProject } from '../lib/useProjects';
import { useTesting } from '../lib/useTesting';
import { trialCard, verdictLine, type CardFinding, type CardNext, type TrialCard } from '../lib/trialCard';
import { WORDS } from '../lib/testing';
import { deliverPdf, isStaleBuildError, loadPdfLib, reloadOntoNewBuild } from '../lib/savePdf';
import { todayISO } from '../lib/standing';
import { nav } from '../state/useRoute';
import { Crumbs } from '../ui/Crumbs';
import { AccountMenu } from '../ui/AccountMenu';

const nice = (iso?: string): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

/** A numbered block, the same four the A4 carries and in the same order. */
function Block({ n, title, sub, children }: {
  n: string; title: string; sub?: string; children: React.ReactNode;
}) {
  return (
    <section className="tc-block">
      <div className="tc-block-h">
        <span className="tc-n">{n}</span>
        <h2 className="tc-title">{title}</h2>
        {sub && <span className="sub">{sub}</span>}
      </div>
      {children}
    </section>
  );
}

/** A labelled piece of prose. An empty one says so rather than printing a
 *  blank, because a blank reads as a bug and "nothing agreed in advance" is a
 *  fact about the trial. */
function Field({ label, text, empty = '—' }: { label: string; text?: string; empty?: string }) {
  const body = (text ?? '').trim();
  return (
    <div className="tc-f">
      <span className="tc-f-l">{label}</span>
      <p className={'tc-f-t' + (body ? '' : ' is-none')}>{body || empty}</p>
    </div>
  );
}

function Found({ rows }: { rows: CardFinding[] }) {
  if (rows.length === 0) return <p className="sub tc-empty">Nothing was written down on this trial.</p>;
  return (
    <ol className="tc-list">
      {rows.map((f, i) => (
        <li key={i} className="tc-row">
          <span className="tc-row-n">{i + 1}</span>
          <div className="tc-row-b">
            <p className="tc-row-t">{f.what}</p>
            <p className="tc-row-m sub">
              <span className={'tc-tag is-' + f.decision.replace(/\s+/g, '-')}>{f.decision}</span>
              {f.owner && <span>{f.owner}</span>}
              {f.photos > 0 && <span>{f.photos} photo{f.photos === 1 ? '' : 's'}</span>}
            </p>
            {f.action && <p className="tc-row-a">→ {f.action}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Next({ rows }: { rows: CardNext[] }) {
  if (rows.length === 0) return <p className="sub tc-empty">Nothing has been agreed out of this trial yet.</p>;
  return (
    <ol className="tc-list">
      {rows.map((n, i) => (
        <li key={i} className={'tc-row' + (n.done ? ' is-done' : '')}>
          <span className="tc-row-n">{n.done ? '✓' : i + 1}</span>
          <div className="tc-row-b">
            <p className="tc-row-t">{n.what}</p>
            <p className="tc-row-m sub">
              {n.owner ? <span>{n.owner}</span> : <span className="is-none">nobody named</span>}
              {n.due ? <span>by {nice(n.due)}</span> : <span className="is-none">no date</span>}
              {n.fromFinding && <span>out of an observation</span>}
              {n.becameTest && <span>became the next trial</span>}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function TrialCardScreen({ projectId, testId }: { projectId: string; testId: string }) {
  const { project, loading } = useProject(projectId);
  const tt = useTesting(projectId);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);

  /* The 350KB of jsPDF is fetched when this screen OPENS, not when the button
     is pressed — the same rule savePdf.ts sets out, and the reason the button
     below is never the thing that goes and waits on a factory wifi. */
  useEffect(() => { void loadPdfLib().catch(() => { /* the button reports it */ }); }, []);

  if (loading || tt.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) return <div className="wrap pace"><p className="sub">That project isn’t here any more.</p></div>;

  const test = tt.tests.find(t => t.id === testId);
  if (!test) {
    return (
      <div className="wrap pace">
        <p className="sub">That record isn’t here any more.</p>
        <button className="btn btn-primary" onClick={() => nav(`/project/${projectId}/testing`)}>Back to testing</button>
      </div>
    );
  }

  const c: TrialCard = trialCard(test, tt.tests, tt.items, tt.assets);
  const words = WORDS[c.kind];
  const when = c.ranOn ?? c.plannedFor;

  const send = async () => {
    if (busy) return;
    setBusy(true); setErr(null); setSaid(null);
    try {
      const { jsPDF } = await loadPdfLib();
      const { drawTrialCard } = await import('../lib/trialCardPdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      drawTrialCard(pdf, c, { project: project.name, lead: project.lead, builtAt: Date.now() });
      const slug = `${project.name} ${c.title}`.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'Trial';
      const how = await deliverPdf(pdf, `${slug}-${when ?? todayISO()}.pdf`);
      setSaid(how === 'shared' ? 'Sent.' : how === 'downloaded' ? 'Downloaded.' : 'Opened in a new tab.');
    } catch (e) {
      console.error('Trial card failed', e);
      setErr(isStaleBuildError(e)
        ? 'This tab is still running an older version of the app, so the part that draws the PDF could not load.'
        : (e instanceof Error ? e.message : 'The trial card could not be built.'));
    } finally { setBusy(false); }
  };

  return (
    <div className="wrap pace cm-screen tc-screen">
      <AccountMenu />
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        c.kind === 'fix'
          ? { label: 'Fixes', to: `/project/${projectId}/fixes` }
          : { label: 'Testing', to: `/project/${projectId}/testing` },
        { label: c.title, to: `/project/${projectId}/testing/${encodeURIComponent(testId)}` },
        { label: `${words.one} card` },
      ]} />

      {/* EYEBROW IS THE CONTEXT, H1 IS THE SCREEN — the convention Testing,
          Materials and Programs already keep, and not a style point: the card
          first carried the trial's own title as its h1, which made it the
          second screen in the app with that exact heading. scripts/navmap.mjs
          called it, and it was right — two screens with one name is how you
          lose track of which one you are on. */}
      <header className="cm-head">
        <div>
          <p className="cm-eyebrow">{project.name} · {words.one.toLowerCase()}</p>
          <h1>{words.one} card</h1>
          <p className="tc-which">{c.title}</p>
          <p className="cw-handover">
            <b>{c.outcomeWord}</b>
            {when && <span className="sub">{nice(when)}</span>}
            <span className="sub">{c.machine}</span>
            {c.withWhom && <span className="sub">with {c.withWhom}</span>}
          </p>
        </div>
      </header>

      {/* THE SEND IS AT THE TOP AND THE BOTTOM. At the top because somebody who
          already knows this card wants it gone in one tap; at the bottom
          because somebody reading it down arrives there having read it. */}
      <div className="tc-send">
        <button className="btn btn-primary" onClick={() => void send()} disabled={busy}>
          {busy ? 'Building…' : 'Send as a PDF'}
        </button>
        <span className="sub">A4, landscape — everything below, on a page.</span>
        {said && <span className="tc-ok">{said}</span>}
      </div>
      {err && (
        <p className="sub tw-err">
          {err}{' '}
          {isStaleBuildError(err) && (
            <button className="cw-link" onClick={() => void reloadOntoNewBuild()}>Reload</button>
          )}
        </p>
      )}

      <div className="tc-two">
        <Block n="1" title={words.plan}>
          <Field label={words.expectation} text={c.passesIf}
            empty={c.kind === 'fix' ? 'The problem was not written down' : 'Nothing agreed in advance'} />
          {c.kind === 'test' && <Field label="Product we planned to run" text={c.plannedProduct} />}
          <Field label="Booked for" text={c.plannedFor ? nice(c.plannedFor) : ''} empty="No day set" />
        </Block>

        <Block n="2" title={words.day}>
          <Field label={words.happened} text={verdictLine(c)} empty="Nothing written down yet" />
          {c.kind === 'test' && <Field label="Product we ran" text={c.product} />}
          <Field label="Ran on" text={c.ranOn ? nice(c.ranOn) : ''} empty="Not run yet" />
        </Block>
      </div>

      <Block n="3" title="What we found on the day"
        sub={c.found.written === 0 ? undefined
          : `${c.found.written} written · ${c.found.actioned} actioned · ${c.found.undecided} to decide`}>
        <Found rows={c.findings} />
      </Block>

      <Block n="4" title="What we do next"
        sub={c.next.length === 0 ? undefined
          : `${c.openNext} of ${c.next.length} still open`}>
        <Next rows={c.next} />
      </Block>

      {/* WHERE THIS SITS — the loop, read both ways. The same block the A4
          carries, and the reason a trial card is not an isolated page. */}
      {(c.follows || c.ledTo.length > 0) && (
        <section className="tc-loop">
          <span className="tc-f-l">Where this sits</span>
          <p className="tc-loop-t">
            {c.follows && <>Follows <b>{c.follows}</b>. </>}
            {c.ledTo.length > 0
              ? <>Led to {c.ledTo.map((t, i) => <b key={i}>{t}{i < c.ledTo.length - 1 ? ', ' : ''}</b>)}.</>
              : <span className="sub">Nothing has been planned out of it yet.</span>}
          </p>
        </section>
      )}

      {/* NO SECOND WAY BACK. A "Back to the trial" button sat here at first and
          scripts/navmap.mjs failed it: the spine's up-target already goes
          there, and two back controls on one screen is the exact thing —
          "you lose track of where you just need to go back to" — that the
          spine work went and removed. Nothing is lost; it is one control
          instead of two. */}
      <div className="tc-send is-foot">
        <button className="btn btn-primary" onClick={() => void send()} disabled={busy}>
          {busy ? 'Building…' : 'Send as a PDF'}
        </button>
      </div>
    </div>
  );
}
