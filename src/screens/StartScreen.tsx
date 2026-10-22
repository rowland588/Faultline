/* THE FRONT DOOR — where Faultline starts (docs/DIRECTION.md, 20 October):
 * the question first, then what is under way (every project, said in one line
 * by the same reading the control room uses — lib/portfolio), the three kinds
 * of change to start a project on (lib/planModel), the tools to use on a line
 * on their own, and Your factory.
 *
 * (From 18 October it led with a box to say a need in words, a design studio
 * and a library of methods — the method builder; parked, then deleted on 20
 * October: docs/DIRECTION.md.)
 *
 * LINE TALK (20 October, docs/LINE-TALK.md slice 2) just under the question:
 * Rowland — "I open Faultline, talk or type, upload a picture when useful,
 * ask questions, and ask for a report." Start one, or carry on the latest.
 *
 * WHICH RECORD: none of its own — projects, the factory and the talks are read.
 * WHERE IT SHOWS: home — #/ (and #/start, its first address) — under the one
 * rail off a project (ui/Frame, HomeNav: Home first). The control room, the
 * view of every project and line at once, is #/room. */
import { useEffect, useMemo, useState } from 'react';
import { nav } from '../state/useRoute';
import { listAllStudies, onDataChange } from '../db';
import type { ToolStudy } from '../lib/study';
import { Icon } from '../ui/Icon';
import { useProjects } from '../lib/useProjects';
import { useJobInputs } from '../lib/useJobInputs';
import { useLineWork } from '../lib/useLineWork';
import { useFactoryLines } from '../lib/useFactoryLines';
import { portfolio } from '../lib/portfolio';
import { todayISO } from '../lib/weeks';
import { MODELS, startHref } from '../lib/planModel';
import { toolPlaces } from '../ui/rail';
import { BuildStamp } from '../ui/BuildStamp';
import { InstallPanel } from '../ui/InstallPanel';
import { CloudPanel } from '../cloud/CloudPanel';

/** What each tool is for, in a line. */
const TOOL_SAYS: Record<string, string> = {
  '/standards': 'Who does what where on the line, drawn as the line looks',
  '/linebalance': 'People’s work timed against takt',
  '/balances': 'What each station can make, which one limits the line, and what a pack costs in labour',
  '/capability': 'A measurement against one limit or two, or pass or fail: Ppk and how sure, the checks before it, and what a pass proves',
  '/value-stream': 'The line’s steps, waits and value, walked',
  '/smed': 'A changeover timed element by element, internal and external',
  '/sampling': 'What people are doing at random moments, with margins',
  '/losses': 'Where a shift’s time went at the bottleneck’s speed, in packs and pounds',
  '/reliability': 'A machine watched running, a tap for each stop: MTBF and the failure rate, with their bounds',
  '/video': 'Film the line: the work at each station read from the footage, reviewed, worked out as a line balance',
  '/talk': 'Talk or type on the line — your words come up as you speak — add photos, ask questions and ask for reports',
};

const plural = (n: number, one: string, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;

export function StartScreen() {
  const { projects } = useProjects();
  const lines = useFactoryLines();
  const inputs = useJobInputs(projects);
  const lineWork = useLineWork();
  const today = todayISO();
  /* every project said by the reading the control room draws from — one answer, never two */
  const pf = useMemo(() => (inputs && lineWork ? portfolio(inputs.gate, today, inputs.paced, lineWork) : null), [inputs, lineWork, today]);
  const tools = toolPlaces('');
  /* the latest Line Talk, to carry on */
  const [latest, setLatest] = useState<ToolStudy | null>(null);
  useEffect(() => {
    const load = () => void listAllStudies().then(all => setLatest(all.filter(x => x.tool === 'talk' && !x.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null));
    load();
    return onDataChange(load);
  }, []);

  return (
    <div className="wrap fd">
      <section className="fd-ask fd-plain" aria-label="What you need">
        <h1>What do you need to get done?</h1>
        <p className="pl-says">Start a project to drive a change through to its actions and proof, or use a tool on a line to measure it — every finding in money, from your factory’s own figures.</p>
      </section>

      <section className="fd-sec fd-talk" aria-label="Line Talk">
        <div className="fd-sec-h"><h2 className="ln-h">Line Talk</h2></div>
        <p className="sub">Talk or type on the line, add a photo when it helps, ask questions and ask for a report — answered from what you say and what Faultline holds about the line.</p>
        <div className="fd-talk-a">
          <button type="button" className="btn btn-primary fd-talk-start" onClick={() => nav('/talk')}><Icon name="mic" size="1.1em" />Start a Line Talk</button>
          {latest && <button type="button" className="btn fd-talk-on" onClick={() => nav(`/talk/${latest.id}`)}>Carry on: {latest.name}</button>}
        </div>
      </section>

      <section className="fd-sec" aria-label="Under way">
        <div className="fd-sec-h">
          <h2 className="ln-h">Under way</h2>
          {projects.length > 0 && <button type="button" className="cw-link" onClick={() => nav('/room')}>The control room — every project at once ›</button>}
        </div>
        {!pf ? <p className="sub">Reading…</p> : pf.jobs.length === 0 ? (
          <p className="sub">Nothing under way yet — start a project below.</p>
        ) : (
          <ul className="lt-rows fd-jobs">
            {pf.jobs.map(j => (
              <li key={j.id} className="lt-li" data-project={j.id}>
                <button type="button" className="lt-row" onClick={() => nav(`/project/${j.id}`)}>
                  <b className="lt-what">{j.name}</b>
                  <span className={`lt-says ie-tone is-${j.late > 0 ? 'r' : j.problems ? 'a' : 'n'}`}>{j.late > 0 ? `${j.late} late` : j.outstanding ? `${j.outstanding} to do` : 'Nothing outstanding'}</span>
                  <span className="lt-where">{j.methodLabel} · {j.sentence}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="fd-sec" aria-label="Start a project">
        <div className="fd-sec-h"><h2 className="ln-h">Start a project</h2></div>
        <ul className="fw-lib fd-lib">
          {MODELS.map(m => (
            <li key={m.id} className="fw-card" data-start={`e:${m.id}`}>
              <button type="button" className="fw-card-b" onClick={() => nav(startHref(m.id))}>
                <span className="fw-card-h"><b className="fw-card-t">{m.label}</b></span>
                <span className="fw-card-p">{m.situation} — {m.blurb.charAt(0).toLowerCase()}{m.blurb.slice(1)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="fd-sec" aria-label="Specialist tools">
        <div className="fd-sec-h"><h2 className="ln-h">Use a tool on its own</h2></div>
        <p className="sub">On a line, from its own figures — and what it finds can be taken into a project.</p>
        <ul className="fd-tools">
          {tools.map(t => (
            <li key={t.key} data-tool={t.key}>
              <button type="button" className="fd-tool" onClick={() => t.to && nav(t.to)}>
                <b>{t.label}</b>
                {t.to && TOOL_SAYS[t.to] && <span className="sub">{TOOL_SAYS[t.to]}</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="fd-sec fd-factory" aria-label="Your factory">
        <div className="fd-sec-h">
          <h2 className="ln-h">Your factory</h2>
          <button type="button" className="cw-link" onClick={() => nav('/factory')}>{lines.length ? 'Open it ›' : 'Set it up ›'}</button>
        </div>
        <p className="sub">{lines.length ? `${plural(lines.length, 'line')} — ${lines.slice(0, 4).map(l => l.name).join(', ')}${lines.length > 4 ? '…' : ''}. Projects and tools take their lines from here.` : 'Your lines and their machines, set up once — every project and tool takes its lines from here.'}</p>
      </section>
      {/* What the control room's foot carried while it was home — installing,
          signing in, and backup trouble said in words (a row the cloud refused,
          a file too big for it) — carried here now that this is home; each
          says nothing while all is well (cloud/CloudPanel, ui/InstallPanel) */}
      <InstallPanel />
      <CloudPanel />
      <BuildStamp />
    </div>
  );
}
