/* THE LEAN PAGE ON A SCREEN (docs/LEAN-PAGE.md) — the parts every tool's
 * page and every report share, drawn from one model (lib/lean) that its
 * paper (lib/report/lean) draws too: the band, the tiles, the trend, what it
 * means, the action plan and the closing line. The tool's own picture and
 * its table sit between them in panels (LeanPanel); what is typed stays on
 * the page below the eight.
 *
 * Colour as the house says (CLAUDE.md, visual management): the band is the
 * house navy; a tile wears colour only when its number is abnormal or met;
 * a change is green better, red worse, grey the same — always with its
 * number and the day it is against. */
import type { ReactNode } from 'react';
import { arrow, changeTone, type LeanAction, type LeanInsight, type LeanPage, type LeanTile, type LeanTone, type LeanTrend } from '../lib/lean';

/** THE BAND — what this is, its title (the tool's own name control when it
 *  has one), where, and the day, the shift and the rate on the right. */
export function LeanBand({ page, title, children }: { page: LeanPage; title?: ReactNode; children?: ReactNode }) {
  return (
    <header className="ln-band">
      <div className="ln-band-main">
        <small className="ln-eyebrow">{page.eyebrow}</small>
        {title ?? <h1 className="ln-title">{page.title}</h1>}
        {page.sub && <p className="ln-sub">{page.sub}</p>}
        {page.verdict && <span className={'ln-verdict ie-verdict is-' + page.verdict.tone}><b>{page.verdict.text}</b></span>}
      </div>
      {page.facts.length > 0 && (
        <dl className="ln-facts">
          {page.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
      )}
      {children}
    </header>
  );
}

/** THE TILES — a few big numbers, each of what it should be, and since last time. */
export function LeanTiles({ tiles, className }: { tiles: LeanTile[]; className?: string }) {
  return (
    <div className={'ln-tiles' + (className ? ` ${className}` : '')} role="group" aria-label="Where it stands">
      {tiles.map(t => (
        <div key={t.k} className={'ln-tile is-' + (t.tone ?? 'n') + (t.v === '—' ? ' is-none' : '')}>
          <span className="ln-k">{t.k}</span>
          <b className="ln-v">{t.v}</b>
          {t.of && <span className="ln-of">{t.of}</span>}
          {t.change && <span className={'ln-ch is-' + changeTone(t.change)}><span aria-hidden>{arrow(t.change)} </span>{t.change.text}</span>}
        </div>
      ))}
    </div>
  );
}

/** A titled panel — the trend, the picture, the table, what it means. */
export function LeanPanel({ title, children, className, aside }: { title: string; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <section className={'ln-panel' + (className ? ` ${className}` : '')}>
      <h2 className="ln-h">{title}{aside}</h2>
      {children}
    </section>
  );
}

const nice = (max: number): number => {
  if (max <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(max));
  const m = max / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
};
const short = (n: number): string => (n >= 10_000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(n)));

/** THE TREND — the headline number over the records of its kind, each bar
 *  against what it should have been (the dashed mark); this record darker. */
export function LeanTrend({ trend }: { trend: LeanTrend }) {
  const W = 360, H = 170, L = 34, B = 26, T = 12;
  const max = nice(Math.max(...trend.points.map(p => Math.max(p.v, p.target ?? 0)), 1) * 1.05);
  const n = trend.points.length, slot = (W - L - 4) / n, bw = Math.min(34, slot * 0.6);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const cx = (i: number) => L + slot * i + slot / 2;
  const marks = trend.points.map((p, i) => (p.target !== undefined ? `${cx(i)},${y(p.target)}` : '')).filter(Boolean);
  return (
    <figure className="ln-trend">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${trend.title}: ${trend.points.map(p => `${p.label} ${p.v.toLocaleString('en-GB')}${p.target !== undefined ? ` of ${p.target.toLocaleString('en-GB')}` : ''}`).join(', ')}`}>
        {[0, 0.5, 1].map(f => (
          <g key={f}>
            <line className="ln-grid-l" x1={L} x2={W} y1={y(max * f)} y2={y(max * f)} />
            <text className="ln-ax" x={L - 5} y={y(max * f) + 3}>{short(max * f)}</text>
          </g>
        ))}
        {trend.points.map((p, i) => (
          <g key={`${p.label}-${i}`}>
            <rect className={'ln-bar' + (p.now ? ' is-now' : '')} x={cx(i) - bw / 2} y={y(p.v)} width={bw} height={Math.max(1, y(0) - y(p.v))}><title>{`${p.label}: ${p.v.toLocaleString('en-GB')}`}</title></rect>
            {/* the figure inside the bar's top when it is tall enough — clear of the dashed mark above */}
            <text className={'ln-bv' + (p.now ? ' is-now' : '') + (y(0) - y(p.v) > 18 ? ' is-in' : '')} x={cx(i)} y={y(0) - y(p.v) > 18 ? y(p.v) + 11 : y(p.v) - 3}>{short(p.v)}</text>
            <text className={'ln-xl' + (p.now ? ' is-now' : '')} x={cx(i)} y={H - 8}>{p.label}</text>
          </g>
        ))}
        {marks.length > 1 && <polyline className="ln-target" points={marks.join(' ')} />}
        {trend.points.map((p, i) => (p.target !== undefined ? <line key={`t${i}`} className="ln-target-m" x1={cx(i) - bw / 2 - 3} x2={cx(i) + bw / 2 + 3} y1={y(p.target)} y2={y(p.target)} /> : null))}
      </svg>
      <figcaption className="ln-legend"><span className="ln-key is-bar" aria-hidden /> {trend.bar}{trend.mark && <><span className="ln-key is-mark" aria-hidden /> {trend.mark}</>}</figcaption>
    </figure>
  );
}

const MARK: Record<LeanTone, string> = { r: '✕', a: '!', g: '✓', n: '·' };

/** WHAT IT MEANS — the module's sentences, each marked. */
export function LeanInsights({ insights, className }: { insights: LeanInsight[]; className?: string }) {
  if (!insights.length) return null;
  return (
    <ul className={'ln-ins' + (className ? ` ${className}` : '')}>
      {insights.map(x => <li key={x.text} className={'ie-cap is-' + x.tone}><span className="ln-mark" aria-hidden>{MARK[x.tone]}</span><span>{x.text}</span></li>)}
    </ul>
  );
}

/** THE ACTION PLAN — action · owner · due, late first. */
export function LeanActions({ actions, empty, onOpen }: { actions: LeanAction[]; empty: string; onOpen?: (a: LeanAction) => void }) {
  if (!actions.length) return <p className="sub ln-plan-none">{empty}</p>;
  return (
    <div className="ln-plan" role="table" aria-label="The action plan">
      <div className="ln-pr ln-ph" role="row"><span role="columnheader">Action</span><span role="columnheader">Owner</span><span role="columnheader">Due</span></div>
      {actions.map((a, i) => {
        const inner = (
          <>
            <span role="cell" className="ln-pw"><b>{a.what}</b>{a.from ? <span className="sub"> · from {a.from}</span> : null}</span>
            <span role="cell" className="ln-po">{a.who ?? <span className="sub">nobody yet</span>}</span>
            <span role="cell" className={'ln-pd is-' + a.tone}>{a.due ?? <span className="sub">no day</span>}{a.state !== 'Open' ? <em className={'ln-ps is-' + a.tone}>{a.state}</em> : null}</span>
          </>
        );
        return onOpen && a.open
          ? <button key={i} type="button" role="row" className={'ln-pr ln-row is-' + a.tone} onClick={() => onOpen(a)} aria-label={`${a.what} — open it`}>{inner}</button>
          : <div key={i} role="row" className={'ln-pr ln-row is-' + a.tone}>{inner}</div>;
      })}
    </div>
  );
}

/** THE CLOSING LINE — the one sentence, in the navy band at the foot. */
export function LeanClosing({ closing }: { closing: { text: string; tone: LeanTone } }) {
  return <p className={'ln-close is-' + closing.tone}><span className="ln-close-mark" aria-hidden>{MARK[closing.tone]}</span><span>{closing.text}</span></p>;
}
