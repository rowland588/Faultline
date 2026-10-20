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
