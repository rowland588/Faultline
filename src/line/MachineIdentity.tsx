/* WHAT A MACHINE IS — its kind, model and serial on its own page, each saying how it is known, and what it replaced or what
 * replaced it (8 November, docs/FACTORY-KNOWLEDGE.md F1 — Rowland: "it cannot guess which … machine … I am talking about").
 * Shown and changed where they sit: a person's change is confirmed, by them, that day (db/lineRecords setMachineIdentity), with
 * Undo; a kind only guessed from the name says so, and is never kept until a person says yes. Whoever may change the line's
 * work changes it (a project's can.edit inside a project; on the line, who may start projects — as its picture). */
import { useState } from 'react';
import type { Asset } from '../lib/testing';
import { howSaid, kindOf, KINDS } from '../lib/factoryKnowledge';
import { setMachineIdentity } from '../db/lineRecords';
import { putAsset } from '../db/testing';
import { useAccess, useCanStartProjects } from '../cloud/access';
import { useSession } from '../cloud/session';
import { myName } from '../lib/forYou';
import { offerUndo } from '../ui/Undo';
import { nav } from '../state/useRoute';

type Field = 'kind' | 'model' | 'serial';
const LABEL: Record<Field, string> = { kind: 'Kind', model: 'Model', serial: 'Serial' };
const dayOf = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

interface Props { wsId: string; name: string; record?: Asset; assets: readonly Asset[]; inProject?: string }

export function MachineIdentity(p: Props) {
  return p.inProject ? <InProject {...p} projectId={p.inProject} /> : <OnLine {...p} />;
}
function InProject(p: Props & { projectId: string }) { return <Identity {...p} may={useAccess(p.projectId).edit} />; }
function OnLine(p: Props) { return <Identity {...p} may={useCanStartProjects()} />; }

function Identity({ wsId, name, record, assets, may }: Props & { may: boolean }) {
  const { session } = useSession();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<Field, string>>({ kind: '', model: '', serial: '' });
  const [busy, setBusy] = useState(false);
  const by = myName() || session?.user.email || undefined;
  const guess = record?.kind?.trim() ? undefined : kindOf(name);
  const replacedBy = record?.replacedBy ? assets.find(a => a.id === record.replacedBy) : undefined;
  const replaces = record ? assets.filter(a => a.replacedBy === record.id && !a.deletedAt) : [];
  const pageOf = (a: Asset) => `/lines/${encodeURIComponent(a.workspaceId ?? wsId)}/machine/${encodeURIComponent(a.name.trim())}`;

  const open = () => { setDraft({ kind: record?.kind ?? '', model: record?.model ?? '', serial: record?.serial ?? '' }); setEditing(true); };
  const save = async (patch: Partial<Record<Field, string>>) => {
    if (busy) return;
    setBusy(true);
    try {
      const before = await setMachineIdentity(wsId, name, patch, by);
      offerUndo(`What the ${name} is — saved`, () => putAsset(before));
      setEditing(false);
    } finally { setBusy(false); }
  };

  return (
    <section className="pl-sec lmc-ident" aria-label="What it is">
      <div className="pl-sec-h"><h2>What it is</h2>
        {may && !editing && <button type="button" className="btn btn-ghost btn-sm" onClick={open}>Change</button>}
      </div>
      {replacedBy && (
        <p className="lmc-replaced" data-replaced-by>
          Replaced by <button type="button" className="cw-link" onClick={() => nav(pageOf(replacedBy))}>{replacedBy.name}</button>
          {record?.known?.replacedBy?.at ? ` on ${dayOf(record.known.replacedBy.at)}` : ''} — kept here as its history.
        </p>
      )}
      {replaces.map(a => (
        <p key={a.id} className="sub lmc-replaces" data-replaces>
          Replaces <button type="button" className="cw-link" onClick={() => nav(pageOf(a))}>{a.name}</button>{a.known?.replacedBy?.at ? ` (since ${dayOf(a.known.replacedBy.at)})` : ''}.
        </p>
      ))}
      {editing ? (
        <form className="lmc-ident-form" onSubmit={e => { e.preventDefault(); void save(draft); }}>
          {(['kind', 'model', 'serial'] as Field[]).map(f => (
            <label key={f} className="lmc-ident-row">
              <span>{LABEL[f]}</span>
              <input className="input" value={draft[f]} list={f === 'kind' ? 'lmc-kinds' : undefined} aria-label={`${LABEL[f]} of the ${name}`}
                placeholder={f === 'kind' ? (guess ? `e.g. ${guess.kind}` : 'e.g. checkweigher') : ''}
                onChange={e => setDraft(d => ({ ...d, [f]: e.target.value }))} />
            </label>
          ))}
          <datalist id="lmc-kinds">{KINDS.map(k => <option key={k.kind} value={k.kind} />)}</datalist>
          <div className="lmc-ident-acts">
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <dl className="lmc-ident-list">
          {(['kind', 'model', 'serial'] as Field[]).map(f => {
            const v = record?.[f]?.trim();
            return (
              <div key={f} className="lmc-ident-row" data-field={f}>
                <dt>{LABEL[f]}</dt>
                <dd>
                  {v ? <b>{v}</b> : f === 'kind' && guess ? <span>Probably a {guess.kind}</span> : <span className="sub">Not said</span>}
                  <span className="sub lmc-ident-how">
                    {v ? howSaid(record?.known, f, v) : f === 'kind' && guess ? 'Guessed from its name — not confirmed' : 'Not known'}
                  </span>
                  {!v && f === 'kind' && guess && may && (
                    <button type="button" className="cw-link" disabled={busy} onClick={() => void save({ kind: guess.kind })}>Yes, it is a {guess.kind}</button>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}

