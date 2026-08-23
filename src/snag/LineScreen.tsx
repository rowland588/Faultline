/* THE LINE — the workspace shown as the place it is. One machine fills the
 * screen (its latest still); swipe left and you step to the next machine in
 * LINE ORDER — the workspace's asset list, the order the machines stand on the
 * floor (Settings ‹ › sets it). Footage decorates the spine, the spine never
 * depends on the footage: a machine never marked on a walk still appears, as a
 * grey gap that asks to be filmed.
 *
 * STAGE 2 — the layers. The portrait is the canvas ALL the data renders onto,
 * one lens at a time (the calm rule):
 *   Faults — the pins, exactly as pinned
 *   £      — the machine's weekly loss as heat ON the metal; worst glows hardest
 *   Actions — who's carrying what, where it physically is
 *   Proof  — the case being worked here, or the receipt of the one that held
 * Every layer derives live from data other screens already trust (weeklyLoss,
 * studyResult, the snag store) — no new objects, no stored numbers.
 *
 * The three-jobs rule that keeps the camera world legible:
 *   the hub files walks · THE LINE is where you stand and look · the asset
 *   page is the workbench. So this screen is READ-ONLY: tap the machine and
 *   you land on its asset page to zoom, pin, and close; Back returns here. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { nav } from '../state/useRoute';
import { useWorkspace } from '../state/WorkspaceProvider';
import { listSnagAssets, snagsForWorkspace, listCases } from '../db';
import { useSyncedAt } from '../cloud/session';
import { useBlobUrl } from './useBlobUrl';
import { fmtRelative, fmtDurationWords } from '../lib/format';
import { hasCost, costPerMs, fmtGBP } from '../lib/cost';
import { weeklyLoss } from '../lib/stats';
import { applyDrill } from '../engine/drill';
import { studyResult, provenWin } from '../lib/proof';
import { dueWord } from './TimeStrip';
import { SNAG_STATUS_META, isOverdue, type Snag, type SnagAsset } from './types';
import type { Case } from '../types';

const STALE_MS = 7 * 24 * 3600_000; // an old photo is a claim about the past

type Layer = 'faults' | 'cost' | 'actions' | 'proof';

interface Stop {
  name: string;
  asset?: SnagAsset;    // the latest marked still carrying this name
  pins: Snag[];         // pinned snags on that still
  open: number;
  msWeek: number | null; // avg weekly loss of this machine (full weeks only)
  actions: Snag[];      // open work aimed here: open pins + board actions
  openCase?: Case;      // a case scoped to this machine, still being worked
  win?: { c: Case; savedMsWeek: number; slipping: boolean }; // the proven receipt (+ is it holding?)
}

function MachineSlide({ stop, wsId, layer, heat, money }: {
  stop: Stop; wsId: string; layer: Layer; heat: number; money: (ms: number) => string;
}) {
  const still = useBlobUrl(stop.asset?.stillKey);
  const stale = !!stop.asset && Date.now() - stop.asset.createdAt > STALE_MS;
  const openCase = (e: React.MouseEvent, id: string) => { e.stopPropagation(); nav(`/w/${wsId}/case/${id}`); };

  const overlays = (
    <>
      {layer === 'faults' && stop.pins.map((s, i) => (s.xPct != null && s.yPct != null) && (
        <span key={s.id} className="line-pin" style={{ left: `${s.xPct}%`, top: `${s.yPct}%`, background: SNAG_STATUS_META[s.status].color }}>{i + 1}</span>
      ))}
      {layer === 'cost' && (
        <>
          {heat > 0 && <span className="line-heat" style={{ opacity: heat }} aria-hidden />}
          <span className={'line-cost-tag' + (heat >= 0.75 ? ' worst' : '')}>
            {stop.msWeek != null && stop.msWeek > 0 ? <><b>{money(stop.msWeek)}</b><span>/wk lost here</span></> : <span>no measured loss</span>}
          </span>
        </>
      )}
      {layer === 'actions' && (
        <span className="line-actions">
          {stop.actions.length === 0 ? <span className="la-none">no open actions here</span> : stop.actions.slice(0, 3).map(a => (
            <span key={a.id} className={'la-row' + (isOverdue(a) ? ' over' : '')}>
              ⚑ {a.problem}{a.owner ? <b> — {a.owner}</b> : ''}{dueWord(a) ? ` · ${dueWord(a)}` : ''}
            </span>
          ))}
          {stop.actions.length > 3 && <span className="la-more">+ {stop.actions.length - 3} more on the snag list</span>}
        </span>
      )}
      {layer === 'proof' && (
        <span className="line-proof">
          {stop.win && (
            <span className="lp-badge lp-win" role="button" tabIndex={0} onClick={e => openCase(e, stop.win!.c.id)}>
              {stop.win.slipping ? '⚠' : '✓'} {money(stop.win.savedMsWeek)}/wk proven{stop.win.slipping ? ' · slipping' : ''} — {stop.win.c.title} ›
            </span>
          )}
          {stop.openCase && (
            <span className="lp-badge lp-live" role="button" tabIndex={0} onClick={e => openCase(e, stop.openCase!.id)}>
              📌 being worked — {stop.openCase.title} ›
            </span>
          )}
          {!stop.win && !stop.openCase && <span className="la-none">no case on this machine</span>}
        </span>
      )}
    </>
  );

  if (!stop.asset) {
    return (
      <div className="line-slide">
        <div className="line-frame line-gap">
          <span className="line-gap-ic" aria-hidden>▦</span>
          <b>{stop.name}</b>
          <span className="sub">Not filmed yet — mark it on your next walk</span>
          {overlays}
        </div>
      </div>
    );
  }
  return (
    <div className="line-slide">
      <div className="line-frame" role="button" tabIndex={0}
        onClick={() => nav(`/w/${wsId}/asset/${stop.asset!.id}`)}
        onKeyDown={e => { if (e.key === 'Enter') nav(`/w/${wsId}/asset/${stop.asset!.id}`); }}
        aria-label={`${stop.name} — open its page to zoom and pin`}>
        {still && <img className="line-still" src={still} alt={stop.name} />}
        {overlays}
        <span className="line-name-tag">
          <b>{stop.name}</b>
          <span className={'line-stamp' + (stale ? ' stale' : '')}>
            filmed {fmtRelative(stop.asset.createdAt)}{stop.open > 0 ? ` · ${stop.open} open` : ' · clear'}
          </span>
        </span>
      </div>
    </div>
  );
}

export function LineScreen({ wsId }: { wsId: string }) {
  const { workspace, observations } = useWorkspace();
  const [assets, setAssets] = useState<SnagAsset[]>([]);
  const [snags, setSnags] = useState<Snag[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [layer, setLayer] = useState<Layer>('faults');
  const syncedAt = useSyncedAt();
  useEffect(() => {
    void listSnagAssets(wsId).then(setAssets);
    void snagsForWorkspace(wsId).then(setSnags);
    void listCases(wsId).then(setCases);
  }, [wsId, syncedAt]);

  const costable = hasCost(workspace);
  const factor = costPerMs(workspace);
  const money = (ms: number) => (costable ? fmtGBP(ms * factor) : fmtDurationWords(ms));

  // The spine: the workspace's machines, in line order. Footage joins by name
  // (marking picks from the same list, so the join holds by construction).
  const stops: Stop[] = useMemo(() => {
    const live = observations.filter(o => o.deletedAt == null);
    const latestByName = new Map<string, SnagAsset>();
    for (const a of assets) {
      const cur = latestByName.get(a.name);
      if (!cur || a.createdAt > cur.createdAt) latestByName.set(a.name, a);
    }
    const names = [...workspace.assets, ...[...latestByName.keys()].filter(n => !workspace.assets.includes(n))];
    return names.map(name => {
      const asset = latestByName.get(name);
      const pins = asset ? snags.filter(s => s.assetId === asset.id).sort((a, b) => a.raisedAt - b.raisedAt) : [];
      // £ heat: this machine's average weekly loss over its last full weeks
      const mine = live.filter(o => o.asset === name);
      const full = weeklyLoss(mine, workspace, 6).filter(w => !w.current).slice(-4);
      const msWeek = full.length ? full.reduce((a, w) => a + w.ms, 0) / full.length : null;
      // open work physically aimed here: open pins + board actions targeting the machine
      const actions = [
        ...pins.filter(s => s.status !== 'closed'),
        ...snags.filter(s => !s.assetId && s.targetAsset === name && s.status !== 'closed'),
      ];
      // proof: cases whose saved scope names this machine
      const scoped = cases.filter(c => c.path.some(st => st.dimension === 'asset' && st.value === name));
      const openCase = scoped.find(c => c.status === 'open' && !c.study?.closedAt);
      const win = scoped
        .map(c => (c.study?.closedAt ? { c, r: studyResult(c, applyDrill(observations, wsId, c.path)) } : null))
        .find(x => x && x.r && provenWin(x.r));
      return {
        name, asset, pins, open: pins.filter(s => s.status !== 'closed').length,
        msWeek, actions, openCase,
        win: win ? { c: win.c, savedMsWeek: win.r!.savedMsWeek!, slipping: !!win.r!.sinceCall?.slipping } : undefined,
      };
    });
  }, [workspace, observations, assets, snags, cases, wsId]);

  const maxWk = Math.max(1, ...stops.map(s => s.msWeek ?? 0));

  const strip = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const onScroll = () => {
    const el = strip.current;
    if (el) setAt(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };
  const jump = (i: number) => {
    const el = strip.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  if (stops.length === 0) {
    return (
      <div className="wrap">
        <div className="subhead">
          <button className="btn btn-ghost" onClick={() => nav(`/w/${wsId}/snags`)}>‹ Snags</button>
        </div>
        <p className="sub" style={{ marginTop: 16 }}>No machines yet — add them in Settings, or film a walk and mark them.</p>
      </div>
    );
  }

  return (
    <div className="wrap line-wrap">
      {/* the tab's landing (owner cut, Aug 2026): the Line IS the eyes' front
          door — ONE action (film), and the filing lives in the back room */}
      <div className="subhead">
        <button className="btn" onClick={() => nav(`/w/${wsId}/snags?manage=1`)}>🎥 Film a walk</button>
        <span className="subhead-title">The line</span>
        <div style={{ flex: 1 }} />
        <span className="sub line-count">{at + 1} / {stops.length}</span>
      </div>

      {/* the lenses — same pressable-legend language as the Pareto's chips */}
      <div className="pk-picker line-layers" role="group" aria-label="Choose what the line shows">
        <button type="button" className={'pk-pick' + (layer === 'faults' ? ' on' : '')} onClick={() => setLayer('faults')}>📍 Faults</button>
        <button type="button" className={'pk-pick' + (layer === 'cost' ? ' on' : '')} onClick={() => setLayer('cost')}>{costable ? '£ heat' : '⏱ heat'}</button>
        <button type="button" className={'pk-pick' + (layer === 'actions' ? ' on' : '')} onClick={() => setLayer('actions')}>⚑ Actions</button>
        <button type="button" className={'pk-pick' + (layer === 'proof' ? ' on' : '')} onClick={() => setLayer('proof')}>✓ Proof</button>
      </div>

      <div className="line-strip" ref={strip} onScroll={onScroll}>
        {stops.map(s => (
          <MachineSlide key={s.name} stop={s} wsId={wsId} layer={layer} money={money}
            heat={s.msWeek ? Math.max(0.18, s.msWeek / maxWk) : 0} />
        ))}
      </div>

      {/* the rail: the whole line at a glance — a dot per machine. On the £
          lens the dots size with the money, so the worst reads from the rail. */}
      <div className="line-rail" role="tablist" aria-label="Machines on the line">
        {stops.map((s, i) => (
          <button key={s.name} role="tab" aria-selected={i === at} title={s.name}
            className={'line-dot' + (i === at ? ' on' : '') + (layer !== 'cost' && s.open > 0 ? ' hot' : '') + (!s.asset ? ' gap' : '')}
            style={layer === 'cost' && s.msWeek ? { transform: `scale(${1 + 1.1 * (s.msWeek / maxWk)})`, background: 'var(--danger)', opacity: 0.35 + 0.65 * (s.msWeek / maxWk) } : undefined}
            onClick={() => jump(i)} />
        ))}
      </div>
      <p className="sub line-hint">
        {layer === 'cost' ? 'The worst machines glow hardest — sized from measured loss'
          : layer === 'actions' ? 'Open work, where it physically is'
          : layer === 'proof' ? 'Cases and receipts, machine by machine'
          : 'Swipe along the line · tap the machine to zoom & pin'}
      </p>
      <div className="next-row line-links">
        <button className="linkish" onClick={() => nav(`/w/${wsId}/snaglist`)}>⚑ Snag list ›</button>
        <button className="linkish" onClick={() => nav(`/w/${wsId}/snags?manage=1`)}>Manage walks ›</button>
      </div>
    </div>
  );
}
