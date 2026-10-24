/* ALL TOGETHER — one product on its line, its three tools on one page
 * (lib/together; Rowland, 17 October: "what about option to do it all
 * together this way when appropriate we have the option").
 *
 * Read, never edited here: each part says what its tool says, and opens the
 * tool to change it. In the order the three questions are asked — where we
 * are (what the line can make, what the people's pace allows, what it
 * costs), why (the line station by station: what each makes, the
 * bottleneck, who works there and how they sit against takt), and the
 * pictures behind it (who stands where; each person's work against takt).
 * Its paper is the same page (lib/togetherPdf). */
import { useEffect, useState, type ReactNode } from 'react';
import { nav } from '../state/useRoute';
import type { Standard } from '../tools/linestandard/standard';
import { CostBlock, Legend, PersonBar, Stacks, useBalanceFor, useLine, worksFor } from '../tools/linework/WorkBalance';
import { LeanClosing, LeanTiles } from './Lean';
import { ReportMenu } from './parts';
import { togetherClosing, togetherOf, togetherTiles } from '../lib/together';

export function Together({ s, name, here, views }: { s: Standard; name: string; here: string; views?: ReactNode }) {
  const study = useBalanceFor(s.id);
  const line = useLine(s.workspaceId);
  const t = togetherOf(s, study ?? undefined, line);
  const [card, setCard] = useState<string | null | undefined>(undefined);
  const sig = JSON.stringify([s.id, s.marks, s.photoKey, s.board, s.product, study?.updatedAt ?? 0]);
  useEffect(() => {
    let live = true;
    if (!t.hasMap) { setCard(null); return; }
    void (async () => {
      try {
        const [{ cardPages }, works] = await Promise.all([import('../tools/linestandard/standardCard'), worksFor([s])]);
        const pages = await cardPages(s, name, new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), works[s.id]);
        if (live) setCard(pages[0] ?? null);
      } catch (e) { console.error('together card failed', e); if (live) setCard(null); }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `sig` is what the card draws
  }, [sig, name]);
  const lineUnit = s.capacity?.stations[0]?.unit.trim() || undefined;
  const paper = async () => {
    try { const { saveTogetherPdf } = await import('../lib/togetherPdf'); await saveTogetherPdf(s, study ?? undefined, name); }
    catch (e) { console.error('together pdf failed', e); window.alert('Sorry — the PDF could not be made. Please try again.'); }
  };
  return (
    <div className="wrap pace ls tg">
      <header className="ls-head is-band">
        <div className="ls-head-main">
          <p className="sub">All together{name ? ` · ${name}` : ''}</p>
          <h1 className="ls-product is-read">{s.product}</h1>
          <p className="sub tg-lede">Who stands where, what each person does against takt, and what the line can make — each read from its own tool, and changed there.</p>
          {(s.capacity?.stations.length ?? 0) > 0 && <span className={'ln-verdict' + (t.capacity.short ? ' is-r' : '')}><b>{t.capacity.text}</b></span>}
        </div>
        {/* its paper in Report ▾ (the tool shell, docs/STRUCTURE.md §5.5, B4) */}
        <div className="ls-head-actions">
          <ReportMenu papers={[{ label: `All together — ${s.product}`, for: 'The three tools on one page, each figure from its own tool', make: paper }]} />
        </div>
      </header>
      {views}

      {/* THE TILES (docs/LEAN-PAGE.md) — each tool's own figure, labelled by the
          tool that says it: what the line makes, against the target, labour a
          pack (Line capacity), the bottleneck person (the line balance), the
          people on the map (the line standard) */}
      <LeanTiles tiles={togetherTiles(s, study ?? undefined, line)} />

      {/* WHERE WE ARE — the three answers, the abnormal in red */}
      <div className="tg-strip" role="group" aria-label="Where it stands">
        <button type="button" className="tg-cell" onClick={() => nav(`${here}?at=balance`)}>
          <span className="tg-k">Line capacity</span><span className={'tg-v' + (t.capacity.short ? ' is-r' : '')}>{t.capacity.text}</span>
          {t.money && <span className={'tg-v tg-money' + (t.money.short ? ' is-r' : '')}>{t.money.text}</span>}
          <span className="tg-go">Open ›</span>
        </button>
        <button type="button" className="tg-cell" onClick={() => nav(`${here}?at=work`)}>
          <span className="tg-k">Line balance</span><span className={'tg-v' + (t.balance.red.length ? ' is-r' : '')}>{t.balance.red[0] ?? t.balance.text}</span><span className="tg-go">Open ›</span>
        </button>
        <button type="button" className="tg-cell" onClick={() => nav(here)}>
          <span className="tg-k">Line standard</span><span className="tg-v">{t.people}</span><span className="tg-go">Open ›</span>
        </button>
      </div>
      {t.figures && <CostBlock f={t.figures} cap={s.capacity} wsId={s.workspaceId} lineUnit={lineUnit} capHref={`${here}?at=balance`} />}

      {/* WHY — the line, station by station, with who works there */}
      <section className="tg-sec">
        <h2 className="tg-h">The line, station by station</h2>
        {t.stations.length === 0 ? <p className="sub">No stations yet — <button type="button" className="linkish" onClick={() => nav(`${here}?at=balance`)}>write the line’s stations in Line capacity ›</button></p> : (
          <ol className="tg-flow">
            {t.stations.map((x, i) => (
              <li key={x.id} className={'tg-st' + (x.limit ? ' is-limit' : '')}>
                <span className="tg-n">{i + 1}</span>
                <span className="tg-name"><b>{x.name}</b>{x.lane && <span className="sub"> · {x.lane}</span>}{x.limit && <span className="tg-bn">Bottleneck</span>}</span>
                <span className="tg-makes">{x.makes}{x.ofLimit != null && !x.limit ? <span className="sub"> · {x.ofLimit}% of the bottleneck</span> : null}</span>
                <span className="tg-people">{x.people.length
                  ? x.people.map(p => <span key={p.who} className={'tg-p' + (p.over ? ' is-r' : '')}><b>{p.who}</b> {p.says}</span>)
                  : <span className="sub">{x.kind === 'people' ? 'nobody in the line balance here' : 'machine'}</span>}</span>
              </li>
            ))}
          </ol>
        )}
        {t.loose.length > 0 && (
          <p className="tg-loose sub">At no station: {t.loose.map((p, i) => <span key={p.who} className={p.over ? 'is-r' : ''}>{i ? ' · ' : ''}<b>{p.who}</b> {p.says}</span>)}</p>
        )}
      </section>

      {/* THE PICTURES — who stands where; each person's work against takt */}
      <section className="tg-sec">
        <h2 className="tg-h">Who stands where <button type="button" className="linkish" onClick={() => nav(here)}>Open the line standard ›</button></h2>
        {card === undefined ? <p className="sub">Drawing the card…</p>
          : card ? <img className="tg-card" src={card} alt={`The line standard card for ${s.product}`} />
            : <p className="sub">No map yet — <button type="button" className="linkish" onClick={() => nav(here)}>place the people on the line standard ›</button></p>}
      </section>
      <section className="tg-sec">
        <h2 className="tg-h">What each person does, against takt <button type="button" className="linkish" onClick={() => nav(`${here}?at=work`)}>Open the line balance ›</button></h2>
        {!t.figures ? <p className="sub">No line balance yet — <button type="button" className="linkish" onClick={() => nav(`${here}?at=work`)}>time each person’s work ›</button></p> : (
          <>
            <p className={'tg-said' + (t.balance.red.length ? ' is-r' : '')}>{[...t.balance.red, t.balance.text].join(' ')}</p>
            {t.figures.taktSec && <div className="ie-pic"><Stacks f={t.figures} /></div>}
            {t.figures.taktSec && <Legend f={t.figures} />}
            <div className="tg-bars">
              {t.figures.people.map(p => (
                <div key={p.who} className="tg-bar"><span className="tg-bar-who"><b>{p.who}</b>{p.station ? <span className="sub"> at {p.station}</span> : null}</span>{p.work > 0 && <PersonBar p={p} />}</div>
              ))}
            </div>
          </>
        )}
      </section>
      <LeanClosing closing={togetherClosing(s, line)} />
    </div>
  );
}
