/* WHAT WE ARE WAITING ON — and, the part that matters, WHOSE IT IS.
 *
 * Five rows, one rule each, every number derived in lib/standing.ts from
 * records that already exist. Nothing here is typed twice and nothing is
 * stored: the client report prints this same table from the same call.
 *
 * NAMING THE OWNER IS THE WHOLE POINT. "4 materials late" is a confession.
 * "4 materials late, Brillopak × 2" is a document you can hand to the OEM, and
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
  install: { go: 'Install', to: p => `/project/${p}/install` },
  setup: { go: 'Set up', to: p => `/project/${p}/set-up` },
  tests: { go: 'Commission', to: p => `/project/${p}/testing` },
  handover: { go: 'Hand over', to: p => `/project/${p}/handover` },
  fixes: { go: 'Fixes', to: p => `/project/${p}/fixes` },
  materials: { go: 'Materials', to: p => `/project/${p}/materials` },
  /* Programs are set up inside Set up, on a stage-gate job. */
  programs: { go: 'Set up', to: p => `/project/${p}/set-up` },
  /* The machines live on Install. */
  machines: { go: 'Install', to: p => `/project/${p}/install` },
  observations: { go: 'Decide', to: p => `/project/${p}/testing` },
};

const TONE: Record<Strand, string> = {
  install: 'is-booked', setup: 'is-booked', handover: 'is-booked', tests: 'is-booked', fixes: 'is-late', materials: 'is-waiting', programs: 'is-waiting',
  machines: 'is-waiting', observations: 'is-quiet',
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
        /* THE WHOLE ROW IS THE WAY IN. Only the "Install ›" at its end was a
           button — 15px tall on a phone — and the row it ends read as the
           thing to press and did nothing. */
        return (
          <button type="button" key={r.key} className="og-row" onClick={() => nav(w.to(projectId))}>
            <span className="og-what">
              <span className={'og-dot ' + TONE[r.key]} aria-hidden />
              {r.what}
            </span>
            <span className="og-n">{r.open}</span>
            <span className={'og-n' + (r.late ? ' is-late' : ' is-none')}>{r.late || '—'}</span>
            <span className="og-whose">{r.whose ?? '—'}</span>
            <span className="og-go"><span className="cw-link">{w.go} ›</span></span>
          </button>
        );
      })}

      <p className="og-foot sub">
        Worked out from the lists you already keep — nothing typed twice, and the client report
        prints this same table.
      </p>
    </section>
  );
}
