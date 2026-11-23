/* Luna can… — when a file attaches in AI Mode (docs/LUNA-ABILITIES.md P1); presentation only, from connectionAbilities. */
import { connectionBlurb, type ConnectionKind } from '../lib/data/connectionAbilities';

export function ConnectionAbilities({ kind }: { kind: ConnectionKind }) {
  const lines = connectionBlurb(kind);
  if (!lines.length) return null;
  return (
    <div className="ai-abilities" data-connection-abilities role="note">
      <b>Luna can…</b>
      <ul className="ai-abilities-l">
        {lines.map(l => <li key={l}>{l}</li>)}
      </ul>
    </div>
  );
}