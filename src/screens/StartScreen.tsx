/* THE FRONT DOOR — Faultline as the new product starts: say what you need
 * (Rowland, 18 October: "a conversational starting point where users
 * describe the manufacturing outcome or system they need ... reuse existing
 * code only where it serves that vision"; docs/BLUEPRINT.md §3, the new
 * product's places).
 *
 * One question first, and the box to answer it — the words go straight into
 * the studio (screens/DesignScreen, ?say=), which proposes a method from the
 * app's own tools and checks, or offers the library's closest when the
 * assistant is off. Beneath it, in the order a person needs them: what is
 * under way (every project, whatever it runs on, said in one line by the
 * same reading the control room uses — lib/portfolio), the library to start
 * from (Faultline's methods, the person's own, and the established three
 * — stage gate, 6M, lever tree — lib/flow/established), and the specialist tools
 * to use on their own (the tool registry — lib/flow/components — with the
 * line standard and the video study).
 *
 * WHICH RECORD: none of its own — projects, methods and the factory are read.
 * WHERE IT SHOWS: home — #/ (and #/start, its first address) — under the one
 * rail off a project (ui/Frame, HomeNav: Home first). The control room, the
 * view of every project and line at once, is #/room. */
import { useMemo, useState } from 'react';
import { nav } from '../state/useRoute';
import { useCanStartProjects } from '../cloud/access';
import { useProjects } from '../lib/useProjects';
import { useJobInputs } from '../lib/useJobInputs';
import { useLineWork } from '../lib/useLineWork';
import { useFactoryLines } from '../lib/useFactoryLines';
import { portfolio } from '../lib/portfolio';
import { todayISO } from '../lib/weeks';
import { LIBRARY } from '../lib/flow/library';
import { ESTABLISHED, establishedHref } from '../lib/flow/established';
import { COMPONENTS } from '../lib/flow/components';
import { useMethods } from '../lib/flow/useFlow';
import { familiesOf } from './MethodsScreen';
import { toolPlaces } from '../ui/rail';
import { BuildStamp } from '../ui/BuildStamp';
import { InstallPanel } from '../ui/InstallPanel';
import { CloudPanel } from '../cloud/CloudPanel';
import { useBuilderShown } from '../lib/parked';
import { ParkedSwitch } from '../ui/ParkedSwitch';

const EXAMPLES = [
  'We are fitting a new case packer on Line 4 and need it proved before production takes it',
  'Changeovers on the bagger take 45 minutes and we need them under 15',
  'Line 2 keeps missing its packs a shift — find the cause and prove the fix',
  'I have filmed the packing line and want to see how evenly the work is spread',
];

/** What each tool is for, in a line — the registry's own words where it has them. */
const TOOL_SAYS: Record<string, string> = {
  '/standards': 'Who does what where on the line, drawn as the line looks',
  '/video': 'Film the line: the work at each station read from the footage, reviewed, worked out as a line balance',
  ...Object.fromEntries(COMPONENTS.map(c => [c.listPath, c.gives])),
};

const plural = (n: number, one: string, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;

export function StartScreen() {
  const { projects } = useProjects();
  const may = useCanStartProjects();
  const methods = useMethods();
  const lines = useFactoryLines();
  const inputs = useJobInputs(projects);
  const lineWork = useLineWork();
  const today = todayISO();
  /* every project said by the reading the control room draws from — one answer, never two */
  const pf = useMemo(() => (inputs && lineWork ? portfolio(inputs.gate, today, inputs.paced, lineWork) : null), [inputs, lineWork, today]);
  const [text, setText] = useState('');
  const words = text.trim();
  const go = () => { if (words.length >= 12) nav(`/design?say=${encodeURIComponent(words)}`); };

  const yours = useMemo(() => familiesOf(methods ?? []).filter(f => f.shown.status === 'active').map(f => f.shown), [methods]);
  const tools = toolPlaces('');
  /* PARKED, 20 October (docs/DIRECTION.md): with the builder off the screens
     the front door leads with the three kinds of change, then the tools */
  const builder = useBuilderShown();

  return (
    <div className="wrap fd">
      {!builder && (
        <section className="fd-ask fd-plain" aria-label="What you need">
          <h1>What do you need to get done?</h1>
          <p className="pl-says">Start a project to drive a change through to its actions and proof, or use a tool on a line to measure it — every finding in money, from your factory’s own figures.</p>
        </section>
      )}
      {builder && <section className="fd-ask" aria-label="What you need">
        <h1>What do you need to get done?</h1>
        <p className="pl-says">Describe the outcome or the system you need, in your own words — new equipment to prove, a line to make better, a changeover to cut, a trial to run. Faultline builds the method from its own tools and checks; you shape it, approve it and run it.</p>
        {may ? (
          <form className="fd-box" onSubmit={e => { e.preventDefault(); go(); }}>
            <textarea className="text-input fd-in" rows={4} maxLength={4000} value={text} aria-label="What you need, in your words"
              placeholder="e.g. We are fitting a new case packer on Line 4 and need it proved before production takes it"
              onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); go(); } }} />
            <div className="fd-acts">
              <button type="submit" className="btn btn-primary" disabled={words.length < 12}>Start</button>
              <span className="sub">{words.length && words.length < 12 ? 'A little more — what, where, and what it has to reach.' : 'The assistant proposes; nothing is kept until you keep it.'}</span>
            </div>
            <div className="chip-row fd-eg" aria-label="For example">
              {EXAMPLES.map(x => <button key={x} type="button" className="chip" onClick={() => setText(x)}>{x}</button>)}
            </div>
          </form>
        ) : <p className="sub">You can read what is here. Only someone invited to the app starts a project.</p>}
      </section>}

      <section className="fd-sec" aria-label="Under way">
        <div className="fd-sec-h">
          <h2 className="ln-h">Under way</h2>
          {projects.length > 0 && <button type="button" className="cw-link" onClick={() => nav('/room')}>The control room — every project at once ›</button>}
        </div>
        {!pf ? <p className="sub">Reading…</p> : pf.jobs.length === 0 ? (
          <p className="sub">{builder ? 'Nothing under way yet — say what you need above, or start from the library.' : 'Nothing under way yet — start a project below.'}</p>
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

      <section className="fd-sec" aria-label={builder ? 'Start from the library' : 'Start a project'}>
        <div className="fd-sec-h">
          <h2 className="ln-h">{builder ? 'Start from the library' : 'Start a project'}</h2>
          {builder && <button type="button" className="cw-link" onClick={() => nav('/methods')}>Every method ›</button>}
        </div>
        <ul className="fw-lib fd-lib">
          {[...(builder ? yours.map(m => ({ key: `m:${m.id}`, name: m.definition.name, purpose: m.definition.purpose, chip: 'Yours', to: `/methods/${m.id}` })) : []),
            ...(builder ? LIBRARY.map(e => ({ key: `l:${e.id}`, name: e.name, purpose: e.purpose, chip: 'From Faultline', to: `/design?template=${e.id}` })) : []),
            ...ESTABLISHED.map(e => ({ key: `e:${e.id}`, name: e.name, purpose: e.purpose, chip: builder ? 'Its own screens' : '', to: establishedHref(e.id) }))].map(x => (
            <li key={x.key} className="fw-card" data-start={x.key}>
              <button type="button" className="fw-card-b" onClick={() => nav(x.to)}>
                <span className="fw-card-h"><b className="fw-card-t">{x.name}</b>{x.chip && <span className="fw-chip">{x.chip}</span>}</span>
                <span className="fw-card-p">{x.purpose}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="fd-sec" aria-label="Specialist tools">
        <div className="fd-sec-h"><h2 className="ln-h">Use a tool on its own</h2></div>
        <p className="sub">{builder ? 'Each is also a step a method can use — what it finds comes into the project.' : 'On a line, from its own figures — and what it finds can be taken into a project.'}</p>
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
      <ParkedSwitch />
      <BuildStamp />
    </div>
  );
}
