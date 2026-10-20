/* THE PARKED SWITCH — at the foot of the front door, a line that says what
 * was parked on 20 October and why, and shows or hides it on this device
 * (lib/parked; docs/DIRECTION.md). Quiet: it is not part of the work. */
import { showBuilder, useBuilderShown } from '../lib/parked';

export function ParkedSwitch() {
  const shown = useBuilderShown();
  return (
    <p className="sub fd-parked" data-parked={shown ? 'shown' : 'parked'}>
      {shown
        ? 'Showing what was parked on 20 October — the method builder and the assistant. '
        : 'Parked on 20 October: the method builder and the assistant — Faultline runs on its tools and its three kinds of project. '}
      <button type="button" className="cw-link" onClick={() => showBuilder(!shown)}>{shown ? 'Park them again' : 'Show them on this device'}</button>
    </p>
  );
}

/** A parked page reached by its address — what it was, why it is parked, and
 *  the way on: the three kinds of project, or the switch. */
export function ParkedPage({ title }: { title: string }) {
  return (
    <div className="wrap fw fd-parked-page" data-parked-page={title}>
      <h1>{title}</h1>
      <p className="pl-says">Parked on 20 October, with the rest of the method builder and the assistant: Faultline runs on its tools and its three kinds of project — the stage gate, the 6M and the lever tree. A project already running on a method still opens as before.</p>
      <p className="fw-acts">
        <a className="btn btn-primary" href="#/projects?new=1">Start a project</a>
        <a className="btn" href="#/">Home</a>
      </p>
      <ParkedSwitch />
    </div>
  );
}
