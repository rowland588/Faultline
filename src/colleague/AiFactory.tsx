/* A FACTORY BEING ONBOARDED, SEEN — the factory draft under Being built, and a factory document read into it (9 November,
 * docs/FACTORY-KNOWLEDGE.md F3–F5).
 *
 *   FactoryDraftBox  the client's sites › areas › lines › machines as said or read, each with how it is known (reported, or from
 *                    its document with the words it came from); what is NEW against what Faultline already holds and what is
 *                    MATCHED (never doubled); where a value differs from the recorded one, both side by side with where each came
 *                    from and the person's pick; a document older than a recorded change, or naming a machine since replaced, said
 *                    in words; a document's proposals kept or left out line by line; Make it (the write card flow) once nothing
 *                    holds it. Every button goes through the same door as the colleague's calls (add_to_factory_draft, make_record).
 *   FactoryDocSheet  a document picked — whose factory, its date — read (colleague/factorySource), kept as a factory source and its
 *                    proposals put on the draft (capabilities/factoryBuild takeDocument). */
import { useEffect, useMemo, useState } from 'react';
import { allPaceLines, listAllAssets, listWorkspaces, onDataChange } from '../db';
import type { Workspace } from '../types';
import type { Asset } from '../lib/testing';
import type { JobLine } from '../lib/lineRecords';
import { nav } from '../state/useRoute';
import { Sheet } from '../ui/Sheet';
import type { CapResult, ColleagueDraft, FactoryFact, FactoryField } from '../capabilities/types';
import { FACTORY_FIELDS, FACTORY_TOOL, factoryView, type FactoryOp, type ViewNode } from '../capabilities/factoryDraft';

const FIELD_LABEL: Record<FactoryField, string> = { kind: 'Kind', model: 'Model', serial: 'Serial', maker: 'Maker' };
const STATE_WORD: Record<ViewNode['state'], string> = { new: 'New', 'in-faultline': 'In Faultline', made: 'Made', pending: 'From a document — keep it?', out: 'Left out', replaced: 'Out of date' };
const howOf = (f: FactoryFact): string => (f.how === 'document' ? `From ${f.source?.label ?? 'a document'}` : 'Reported');

type Existing = { lines: Workspace[]; assets: Asset[]; jobLines: JobLine[] };
function useExisting(): Existing | null {
  const [ex, setEx] = useState<Existing | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => void Promise.all([listWorkspaces(), listAllAssets(), allPaceLines()]).then(([lines, assets, jobLines]) => { if (live) setEx({ lines, assets, jobLines }); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, []);
  return ex;
}

const opOf = (x: ViewNode, op: FactoryOp['op'], more: Partial<FactoryOp> = {}): FactoryOp => ({ op, level: x.node.level, name: x.node.name.value, id: x.node.id, ...more });

function Node({ x, busy, doAct }: { x: ViewNode; busy: boolean; doAct: (items: FactoryOp[]) => void }) {
  return (
  <li className={`ai-fd-n is-${x.node.level}`} data-fd-node={x.node.name.value} data-fd-level={x.node.level} data-fd-state={x.state}>
    <div className="ai-fd-row">
      <span className="ai-fd-name"><span className="ai-fd-lv">{x.node.level}</span> <b>{x.node.name.value}</b>{(x.node.name.earlier ?? []).slice(-1).map((e, i) => <s key={i} data-earlier> {e.value}</s>)}</span>
      <span className={`ai-fd-st is-${x.state}`} data-fd-st>{STATE_WORD[x.state]}{x.state === 'in-faultline' && x.match && x.match.name !== x.node.name.value ? ` as ${x.match.name}` : ''}</span>
    </div>
    <p className="ai-fd-how" data-fd-how>{howOf(x.node.name)}{x.node.name.how === 'document' && x.node.name.source?.quote ? <>: <q data-fd-quote>{x.node.name.source.quote}</q></> : x.node.name.said ? <>: <q>{x.node.name.said}</q></> : null}</p>
    {x.node.level === 'machine' && FACTORY_FIELDS.some(f => x.node.facts?.[f]) && (
      <dl className="ai-fd-facts">
        {FACTORY_FIELDS.filter(f => x.node.facts?.[f]).map(f => {
          const fv = x.node.facts?.[f] as FactoryFact;
          return <div key={f} data-fd-fact={f}><dt>{FIELD_LABEL[f]}</dt><dd>{(fv.earlier ?? []).slice(-1).map((e, i) => <s key={i} data-earlier>{e.value}</s>)}<b>{fv.value}</b> <span className="sub">{howOf(fv)}</span></dd></div>;
        })}
      </dl>
    )}
    {x.conflicts.map(k => (
      <div key={k.field} className="ai-fd-conflict" data-fd-conflict={k.field}>
        <p className="ai-fd-cl">Faultline holds <b data-recorded>{k.recorded.value}</b> <span className="sub">— {k.recorded.said}</span></p>
        <p className="ai-fd-cl">{k.offered.said.startsWith('From') ? 'The document says' : 'You said'} <b data-offered>{k.offered.value}</b> <span className="sub">— {k.offered.said}</span></p>
        {k.pick ? <p className="sub" data-fd-picked>{k.pick === 'new' ? `Taking ${k.offered.value}` : `Keeping ${k.recorded.value}`}.</p> : (
          <div className="ai-draft-acts">
            <button type="button" className="btn btn-sm" disabled={busy} data-pick="recorded" onClick={() => doAct([opOf(x, 'pick', { field: k.field, take: 'recorded' })])}>Keep {k.recorded.value}</button>
            <button type="button" className="btn btn-sm" disabled={busy} data-pick="new" onClick={() => doAct([opOf(x, 'pick', { field: k.field, take: 'new' })])}>Take {k.offered.value}</button>
          </div>
        )}
      </div>
    ))}
    {x.flags.map(f => <p key={f} className="ai-fd-flag" role="note" data-fd-flag>{f}</p>)}
    {x.state === 'pending' && (
      <div className="ai-draft-acts">
        <button type="button" className="btn btn-sm" disabled={busy} data-keep onClick={() => doAct([opOf(x, 'keep')])}>Keep</button>
        <button type="button" className="btn btn-sm" disabled={busy} data-leave onClick={() => doAct([opOf(x, 'leave_out')])}>Leave out</button>
      </div>
    )}
    {x.state === 'made' && x.node.level === 'line' && x.node.made && <button type="button" className="btn btn-sm" data-open-line onClick={() => nav(`/lines/${encodeURIComponent(x.node.made?.id ?? '')}`)}>Open {x.node.name.value} ›</button>}
    {x.children.length > 0 && <ul className="ai-fd-tree">{x.children.map(k => <Node key={k.node.id} x={k} busy={busy} doAct={doAct} />)}</ul>}
  </li>
);
}

export type MakeFlow = {
  preview: (d: ColleagueDraft) => Promise<{ ok: true; title: string; says: string } | { ok: false; why: string }>;
  run: (d: ColleagueDraft) => Promise<{ ok: true; says: string } | { ok: false; why: string }>;
};

export function FactoryDraftBox({ d, make, act, canMake }: { d: ColleagueDraft; make: MakeFlow; act: (items: FactoryOp[]) => Promise<CapResult>; canMake: boolean }) {
  const ex = useExisting();
  const v = useMemo(() => (ex ? factoryView(d, ex) : null), [d, ex]);
  const [ask, setAsk] = useState<{ says: string } | { why: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<{ text: string; bad: boolean } | null>(null);
  if (!v) return <div className="ai-draft" data-draft={d.id} data-draft-kind="factory"><p className="sub">Reading the factory…</p></div>;
  const doAct = async (items: FactoryOp[]) => {
    setBusy(true); setSaid(null);
    try {
      for (let i = 0; i < items.length; i += 60) {
        const r = await act(items.slice(i, i + 60));
        if (!r.ok) { setSaid({ text: r.why, bad: true }); return; }
      }
    } finally { setBusy(false); }
  };
  const start = async () => { setSaid(null); const p = await make.preview(d); setAsk(p.ok ? { says: p.says } : { why: p.why }); };
  const doIt = async () => {
    setBusy(true);
    try { const r = await make.run(d); setSaid(r.ok ? { text: r.says, bad: false } : { text: r.why, bad: true }); setAsk(null); } finally { setBusy(false); }
  };
  const c = v.counts;
  const pending = v.all.filter(x => x.state === 'pending');
  const unmade = v.all.some(x => x.state === 'new' || x.state === 'in-faultline');

  return (
    <div className="ai-draft ai-fd" data-draft={d.id} data-draft-kind="factory" data-draft-status={d.status}>
      <p className="ai-draft-t"><b>{d.title}</b><span className="sub">{FACTORY_TOOL} · {v.client} · {d.status === 'made' ? 'made in Faultline — anything said since is a draft' : 'a draft — nothing kept as a record yet'}</span></p>
      <p className="sub ai-fd-counts" data-fd-counts>
        {[c.newLines ? `${c.newLines} new line${c.newLines === 1 ? '' : 's'}` : '', c.newMachines ? `${c.newMachines} new machine${c.newMachines === 1 ? '' : 's'}` : '',
          c.matchedLines + c.matchedMachines ? `${c.matchedLines + c.matchedMachines} already in Faultline` : '', c.pending ? `${c.pending} waiting for your word` : '', c.made ? `${c.made} made` : ''].filter(Boolean).join(' · ') || 'Nothing said yet — say its sites, areas, lines and machines.'}
      </p>
      {v.roots.length > 0 && <ul className="ai-fd-tree" aria-label="The factory as said">{v.roots.map(x => <Node key={x.node.id} x={x} busy={busy} doAct={items => void doAct(items)} />)}</ul>}
      {v.held.length > 0 && <p className="sub" data-fd-held>Held on the draft until a line is made in them: {v.held.join(', ')}.</p>}
      {pending.length > 1 && <button type="button" className="btn btn-sm" disabled={busy} data-keep-all onClick={() => void doAct(pending.map(x => opOf(x, 'keep')))}>Keep all {pending.length} from the document</button>}
      {v.blockers.length > 0 && (
        <div className="ai-fd-block" role="group" aria-label="Before it can be made" data-fd-blockers>
          <p className="ai-ctx-h">Before it can be made</p>
          <ul>{v.blockers.map(b => <li key={b}>{b}</li>)}</ul>
        </div>
      )}
      {ask && 'says' in ask && (
        <div className="ai-card is-waiting" data-draft-card>
          <p className="ai-card-k">Faultline asks to</p>
          <p className="ai-card-p">{ask.says}</p>
          <div className="ai-card-acts">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void doIt()}>Do it</button>
            <button type="button" className="btn" onClick={() => setAsk(null)}>Not now</button>
          </div>
        </div>
      )}
      {ask && 'why' in ask && <p className="sub ai-draft-ask is-off" role="status">{ask.why}</p>}
      {said && <p className={'ai-draft-ask' + (said.bad ? ' is-off' : '')} role="status">{said.text}</p>}
      <div className="ai-draft-acts">
        {canMake && !ask && !v.blockers.length && unmade && <button type="button" className={'btn' + (d.status === 'draft' ? ' btn-primary' : '')} data-make onClick={() => void start()}>{d.status === 'made' ? 'Make what is new' : 'Make it'}</button>}
      </div>
      {!canMake && <p className="sub ai-ctx-none" data-draft-readonly>You can read this here; only somebody who may change the factory makes it.</p>}
    </div>
  );
}

/* ================================================================ a factory document read into the draft */

export interface DocPicked { file: File; client: string }

export function FactoryDocSheet({ picked, onClose, read }: {
  picked: DocPicked | null; onClose: () => void;
  read: (file: File, client: string, day: string) => Promise<{ ok: boolean; says: string }>;
}) {
  const [client, setClient] = useState('');
  const [day, setDay] = useState('');
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<{ text: string; bad: boolean } | null>(null);
  useEffect(() => { setClient(picked?.client ?? ''); setDay(''); setSaid(null); }, [picked]);
  const go = async () => {
    if (!picked || busy) return;
    setBusy(true); setSaid(null);
    try { const r = await read(picked.file, client, day); setSaid({ text: r.says, bad: !r.ok }); } finally { setBusy(false); }
  };
  const dayOk = !day || /^\d{4}-\d{2}-\d{2}$/.test(day);
  return (
    <Sheet open={!!picked} onClose={onClose} title="Read a factory document">
      <div className="ai-fdoc" data-fdoc>
        <p className="sub">{picked?.file.name} — read for the sites, areas, lines and machines it names, each with the words it came from. Nothing is kept as a record until you keep it and make it.</p>
        <label className="ai-fdoc-row"><span>Whose factory is it</span>
          <input className="input" value={client} onChange={e => setClient(e.target.value)} aria-label="Whose factory is it" placeholder="The business, e.g. Customer X Foods" /></label>
        <label className="ai-fdoc-row"><span>Its date, if it says one (YYYY-MM-DD)</span>
          <input className="input" value={day} onChange={e => setDay(e.target.value.trim())} aria-label="The document’s date" placeholder="e.g. 2026-03-01" inputMode="numeric" /></label>
        {!dayOk && <p className="sub ai-draft-ask is-off">A date is written YYYY-MM-DD.</p>}
        {said && <p className={'ai-draft-ask' + (said.bad ? ' is-off' : '')} role="status" data-fdoc-said>{said.text}</p>}
        <div className="ai-draft-acts">
          {!said || said.bad ? <button type="button" className="btn btn-primary" disabled={busy || !client.trim() || !dayOk} data-fdoc-read onClick={() => void go()}>{busy ? 'Reading…' : 'Read it'}</button>
            : <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>}
        </div>
      </div>
    </Sheet>
  );
}
