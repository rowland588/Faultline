/* A SCOPE'S PAGES, AS TABS ACROSS THE TOP (docs/STRUCTURE.md; Frame).
 *
 * Rowland, 25 October, on a phone: "Programs mobile ui difficult to see all tabs." A project has more tabs
 * than a phone is wide, the strip scrolls sideways with its scrollbar hidden, and nothing said there was
 * more — the fourth tab was cut mid-word and the rest were not there to be found. So: the page you are on
 * is brought into view when you arrive, and an edge fades on each side that has more tabs past it. */
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { RailLine } from './rail';

export function ScopeTabs({ label, tabs, go }: { label: string; tabs: RailLine[]; go: (l: RailLine) => void }) {
  const nav = useRef<HTMLElement>(null);
  const [edge, setEdge] = useState({ l: false, r: false });
  const read = useCallback(() => {
    const el = nav.current;
    if (!el) return;
    const l = el.scrollLeft > 4, r = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdge(e => (e.l === l && e.r === r ? e : { l, r }));
  }, []);
  const onKey = tabs.map(t => `${t.key}${t.on ? '*' : ''}`).join(',');
  useLayoutEffect(() => {
    const el = nav.current;
    if (!el) return;
    /* the page you are on, in view — centred when the strip scrolls */
    const on = el.querySelector<HTMLElement>('.nv-tab.is-on');
    if (on && el.scrollWidth > el.clientWidth) el.scrollLeft = Math.max(0, on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2);
    read();
    const ro = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(read);
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [onKey, read]);
  return (
    <nav ref={nav} className={'nv-tabs' + (edge.l ? ' has-l' : '') + (edge.r ? ' has-r' : '')} aria-label={label} onScroll={read}>
      {tabs.map(l => (
        <button key={l.key} type="button" className={'nv-tab' + (l.on ? ' is-on' : '')} onClick={() => go(l)} aria-current={l.on ? 'page' : undefined}>
          <span className="nv-tab-l">{l.label}</span>{!!l.n && <span className="nv-tab-n"><span className="nv-tab-total">{l.n}</span>{!!l.late && <i><span className="nv-tab-dot"> · </span>{l.late} late</i>}{!!l.failed && <i><span className="nv-tab-dot"> · </span>{l.failed} failed</i>}</span>}
        </button>
      ))}
    </nav>
  );
}
