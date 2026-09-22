/* WHAT WE ARE WAITING ON — and, the part that matters, WHOSE IT IS.
 *
 * Five rows, one rule each, every number derived in lib/standing.ts from
 * records that already exist. Nothing here is typed twice and nothing is
 * stored: the client report prints this same table from the same call.
 *
 * NAMING THE OWNER IS THE WHOLE POINT. "4 materials late" is a confession.
 * "4 materials late, Brilopak × 2" is a document you can hand to the OEM, and
 * it is the difference between a page that makes you look behind and a page
 * that shows you are on top of it.
 *
 * An observation never shows a late count — nobody ever agreed a day for it, so
 * calling it late is what made a list of things noticed read as a list of
 * things going wrong.
 */
import { nav } from '../state/useRoute';
import type { OutstandingRow, Strand } from '../lib/standing';

/** Where each row goes when you tap it, and what the button says. */
const WHERE: Record<Strand, { go: string; to: (p: string) => string }> = {
  trials: { go: 'Testing', to: p => `/project/${p}/testing` },
  materials: { go: 'Materials', to: p => `/project/${p}/materials` },
  programs: { go: 'Programs', to: p => `/project/${p}/programs` },
  machines: { go: 'Testing', to: p => `/project/${p}/testing` },
  observations: { go: 'Decide', to: p => `/project/${p}/testing` },
  actions: { go: 'Testing', to: p => `/project/${p}/testing` },
};

const TONE: Record<Strand, string> = {
  trials: 'is-booked', materials: 'is-waiting', programs: 'is-waiting',
  machines: 'is-waiting', observations: 'is-quiet', actions: 'is-late',
};

export function Outstanding({ rows, projectId }: { rows: OutstandingRow[]; projectId: string }) {
  if (rows.length === 0) return null;

  return (
    <section className="og">
      <div className="og-head">
        <h3 className="og-h">What we&rsquo;re waiting on</h3>
        <span className="sub">and whose it is</span>
      </div>

      <div className="og-cols" role="row">
        <span />
        <span className="og-col">Open</span>
        <span className="og-col">Late</span>
        <span className="og-col is-l">Mostly whose</span>
        <span />
      </div>

      {rows.map(r => {
        const w = WHERE[r.key];
        return (
          <div key={r.key} className="og-row">
            <span className="og-what">
              <span className={'og-dot ' + TONE[r.key]} aria-hidden />
              {r.what}
            </span>
            <span className="og-n">{r.open}</span>
            <span className={'og-n' + (r.late ? ' is-late' : ' is-none')}>{r.late || '—'}</span>
            <span className="og-whose">{r.whose ?? '—'}</span>
            <span className="og-go">
              <button className="cw-link" onClick={() => nav(w.to(projectId))}>{w.go} ›</button>
            </span>
          </div>
        );
      })}

      <p className="og-foot sub">
        Worked out from the lists you already keep — nothing typed twice, and the client report
        prints this same table.
      </p>
    </section>
  );
}
