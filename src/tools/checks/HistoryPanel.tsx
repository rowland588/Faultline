/* THE HISTORY AND THE TREND (knowledge/specs/FC-236-check-logs.md §7) — was each check done when it was due, what
 * failed and what each failure held, a value's readings against its limits, a checklist's audits and the findings
 * that came back, the tags; then every result, newest first, any of which can be struck and put back.
 * Everything is read from figures.ts, the module the paper reads. */
import { nav } from '../../state/useRoute';
import type { Can } from '../../lib/access';
import type { ToolStudy } from '../../lib/study';
import { plural } from '../../lib/format';
import { offerUndo } from '../../ui/Undo';
import { LeanPanel } from '../../ui/Lean';
import type { LogDef } from './def';
import { freqWords, valueSays, verdictOf, when, MIN } from './checks';
import { checkRow, type LogFigures } from './figures';
import { failureLine, resultWords } from './says';
import { strikeResult } from './store';
import { ScorePic, ValuePic } from './Pics';

const pct0 = (n: number | undefined) => (n === undefined ? '—' : `${Math.round(n)}%`);

export function HistoryPanel({ s, def, f, can }: { s: ToolStudy; def: LogDef; f: LogFigures; can: Can }) {
  const log = s.agreed!.log!;
  const checks = log.checks.filter(c => !c.removed);
  const byId = new Map(log.checks.map(c => [c.id, c]));
  const results = [...(s.facts.results ?? [])].sort((a, b) => b.at - a.at).slice(0, 200);
  const days = Math.round((f.period.to - f.period.from) / (24 * 60 * MIN));
  return (
    <div className="lg-history" data-tab="history">
      <LeanPanel title={`Checks done on time — the last ${days} days`} className="lg-panel">
        {checks.length === 0 ? <p className="sub">Nothing is on the list.</p> : (
          <div className="lg-tblw">
            <table className="lg-tbl" aria-label="Compliance by check">
              <thead><tr><th scope="col">Check</th><th scope="col">How often</th><th scope="col">Due</th><th scope="col">On time</th><th scope="col">Missed</th><th scope="col">Done</th><th scope="col">Longest gap</th></tr></thead>
              <tbody>
                {checks.map(c => {
                  const k = checkRow(s, c, f);
                  const done = (s.facts.results ?? []).filter(r => !r.struck && r.checkId === c.id && r.at >= f.period.from).length;
                  return (
                    <tr key={c.id} data-check-row={c.id}>
                      <th scope="row">{c.name}{c.where ? <span className="sub"> · {c.where}</span> : null}</th>
                      <td>{freqWords(c.when)}</td>
                      <td>{k.expected || '—'}</td>
                      <td>{k.expected ? `${k.onTime} (${pct0(k.pct)})` : '—'}</td>
                      <td className={k.missed ? 'ie-tone is-r' : ''}>{k.missed || (k.expected ? '0' : '—')}</td>
                      <td>{done}</td>
                      <td>{k.longestGapMin !== undefined && k.expected ? `${k.longestGapMin >= 120 ? `${Math.round(k.longestGapMin / 60)} h` : `${k.longestGapMin} min`}` : '—'}</td>
                    </tr>
                  );
                })}
                <tr className="lg-tot"><th scope="row">All checks</th><td /><td>{f.comp.expected || '—'}</td><td>{f.comp.expected ? `${f.comp.onTime} (${pct0(f.comp.pct)})` : '—'}</td><td className={f.comp.missed ? 'ie-tone is-r' : ''}>{f.comp.missed}</td><td>{f.results}</td><td /></tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="sub lg-rule">A check every interval is due an interval after the last one was done; it is on time if done within a quarter of the interval (at least 5 minutes, at most 12 hours) of that, and missed after. Done earlier counts, and the next follows from it. Checks done when something happens are counted, not scheduled.</p>
      </LeanPanel>

      {f.values.some(v => v.trend.n > 0) && (
        <LeanPanel title="Readings against their limits" className="lg-panel">
          {f.values.filter(v => v.trend.n > 0).map(({ check, trend }) => (
            <div key={check.id} className="lg-val" data-value={check.id}>
              <h3 className="lg-h3">{check.name}{check.where ? <span className="sub"> · {check.where}</span> : null}</h3>
              <p className={'ie-tone is-' + (trend.nearing ? 'a' : 'n')}>{valueSays(check, trend)}.</p>
              <ValuePic check={check} trend={trend} label={`${check.name}: ${valueSays(check, trend) ?? ''}`} />
            </div>
          ))}
        </LeanPanel>
      )}

      {f.scored.some(x => x.audits.length) && (
        <LeanPanel title="Audits, in order" className="lg-panel">
          {f.scored.filter(x => x.audits.length).map(sc => (
            <div key={sc.check.id} className="lg-aud" data-audit-series={sc.check.id}>
              <h3 className="lg-h3">{sc.check.name}{sc.check.where ? <span className="sub"> · {sc.check.where}</span> : null}</h3>
              <ScorePic series={sc} />
              {sc.latest && (
                <>
                  <p className="lg-aud-l"><b>{pct0(sc.latest.figures.pct)}</b> — {sc.latest.figures.points} of {sc.latest.figures.max} on {when(sc.latest.result.at, f.now)}{sc.latest.result.by ? ` by ${sc.latest.result.by}` : ''}.{sc.falling ? ` Fallen ${sc.falls} audits running.` : ''}</p>
                  {sc.latest.figures.groups.length > 0 && (
                    <table className="lg-tbl" aria-label={`${sc.check.name} by heading`}>
                      <thead><tr><th scope="col">Heading</th><th scope="col">Score</th><th scope="col">Share</th></tr></thead>
                      <tbody>{sc.latest.figures.groups.map(g => <tr key={g.name} className={sc.weakest?.name === g.name ? 'is-weak' : ''}><th scope="row">{g.name}{sc.weakest?.name === g.name ? <em className="lg-again"> weakest</em> : null}</th><td>{g.points} of {g.max}</td><td>{pct0(g.pct)}</td></tr>)}</tbody>
                    </table>
                  )}
                  {sc.latest.findings.length > 0 && (
                    <ul className="lg-finds" aria-label="Findings">
                      {sc.latest.result.answers?.filter(a => sc.latest!.findings.includes(a.id)).map(a => (
                        <li key={a.id}><b>{a.group ? `${a.group} — ` : ''}{a.name}</b> <i className="sub">scored {a.level}</i>{sc.latest!.repeats.includes(a.id) && <em className="lg-again"> came back</em>}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          ))}
        </LeanPanel>
      )}

      {f.tags && f.tags.raised > 0 && (
        <LeanPanel title="Abnormality tags" className="lg-panel">
          <p>{plural(f.tags.raised, 'tag')} raised: {f.tags.open} open{f.tags.over7 ? `, ${f.tags.over7} older than a week` : ''}{f.tags.over14 ? `, ${f.tags.over14} older than a fortnight` : ''}; {f.tags.closed} closed.</p>
          <ul className="lg-finds">
            {(s.facts.tags ?? []).filter(t => !t.struck).sort((a, b) => b.at - a.at).map(t => (
              <li key={t.id} data-tag={t.id}><b>{t.colour === 'red' ? 'Red' : 'White'}</b> — {byId.get(t.checkId)?.name ?? 'a check'}: {t.what} <i className="sub">{when(t.at, f.now)}{t.by ? ` · ${t.by}` : ''}</i>{t.problemId && <> <button type="button" className="linkish" onClick={() => nav(`/snags?open=${t.problemId}`)}>its problem</button></>}</li>
            ))}
          </ul>
          {f.tags.repeats.map(r => <p key={r.checkId} className="ie-tone is-a">{r.name} has been tagged {r.n} times in the last 28 days — the fix may be a wipe and the source still there.</p>)}
        </LeanPanel>
      )}

      <LeanPanel title="Failures and what each held" className="lg-panel">
        {f.failures.length === 0 ? <p className="sub" data-none-failed>Nothing has failed{f.clean ? '' : ' yet'}.</p> : (
          <ul className="lg-fails" aria-label="Failures">
            {f.failures.map(r => (
              <li key={r.f.result.id} className="lg-fail-li" data-failure={r.f.result.id}>
                <p className="ie-tone is-r"><b>{failureLine(r, f.now)}</b></p>
                {r.problemId ? <p className="sub">Problem raised on the register — <button type="button" className="linkish" onClick={() => nav(`/snags?open=${r.problemId}`)}>open it</button>.</p>
                  : r.f.continues ? <p className="sub">The re-check failed again; its problem is the one above.</p> : <p className="sub">No problem was raised{s.workspaceId ? '' : ' — the log is on no line'}.</p>}
              </li>
            ))}
          </ul>
        )}
      </LeanPanel>

      <LeanPanel title="Every result" className="lg-panel" aside={<span className="sub"> {f.results} standing{f.struck ? `, ${f.struck} struck` : ''}</span>}>
        {results.length === 0 ? <p className="sub" data-none-yet>Nothing has been done yet — the first round is on the Round tab.</p> : (
          <ul className="lg-results" aria-label="Every result">
            {results.map(r => {
              const c = byId.get(r.checkId);
              const v = c ? verdictOf(c, r, def) : 'info';
              return (
                <li key={r.id} className={'lg-res' + (r.struck ? ' is-struck' : '')} data-result={r.id}>
                  <span className="lg-res-t">{when(r.at, f.now)}</span>
                  <span className="lg-res-w"><b>{c?.name ?? 'A check taken off'}</b> <span className={'ie-tone is-' + (v === 'bad' ? 'r' : v === 'good' ? 'g' : 'n')}>{resultWords(c, r, def)}</span>{r.by ? <span className="sub"> · {r.by}</span> : null}{r.note ? <span className="sub"> · {r.note}</span> : null}</span>
                  {can.edit && (
                    r.struck
                      ? <button type="button" className="linkish" aria-label={`Put back — ${c?.name ?? 'result'}`} onClick={() => void strikeResult(s.id, r.id, false)}>Put back</button>
                      : <button type="button" className="linkish" aria-label={`Strike — ${c?.name ?? 'result'} ${resultWords(c, r, def)}`} onClick={() => { void strikeResult(s.id, r.id, true); offerUndo('Result struck', async () => { await strikeResult(s.id, r.id, false); }); }}>Strike</button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {(s.facts.results ?? []).length >= 1500 && <p className="sub ie-tone is-a">This log holds {(s.facts.results ?? []).length.toLocaleString('en-GB')} results — start a fresh one; this stays as the record.</p>}
      </LeanPanel>
    </div>
  );
}
