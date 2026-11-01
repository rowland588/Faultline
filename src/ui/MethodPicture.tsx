/* A METHOD'S PICTURE (docs/METHODS.md §15 — Rowland, 1 November 2026: "Projects .. just like tools I want pictures so user
 * can see"). The real project page of the method, taken from the real app by scripts/method-pictures.mjs and kept at
 * public/methods/<key>.png (960 x 600, with public/methods/manifest.json saying what each shows) — the same picture shape as
 * a tool's (ui/ToolCard ToolPicture), drawn with the same frame, so the cards of the two never look like cousins.
 * A method whose picture is not there yet draws its name on a quiet tile, so the card is never broken. */
import { useState } from 'react';
import type { ProjectMethod } from '../lib/methods';

export function MethodPicture({ method, big }: { method: Pick<ProjectMethod, 'key' | 'name'>; big?: boolean }) {
  const [missing, setMissing] = useState(false);
  return (
    <span className={'tc-pic mp-pic' + (big ? ' is-big' : '')} data-method={method.key}>
      {missing
        ? <span className="tc-pic-none" aria-hidden>{method.name}</span>
        : <img src={`/methods/${method.key}.png`} alt="" loading="lazy" decoding="async" onError={() => setMissing(true)} />}
    </span>
  );
}
