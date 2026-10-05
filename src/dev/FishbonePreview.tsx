/* A PAGE FOR LOOKING AT THE FISHBONE AND THE CAUSE SHEET ON THEIR OWN — not
 * routed, never in the app. A browser script loads it through the dev server
 * with ?f=empty|typical|huge and ?can=owner|team|client, and drives it.
 * The fixtures are hand-made ProblemViews: an empty problem, a typical one,
 * and a huge one with long words, so the drawing is seen at its edges. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/instrument-sans/wght.css';
import '@fontsource-variable/schibsted-grotesk/wght.css';
import '../styles.css';
import { Fishbone } from '../ui/Fishbone';
import { CauseSheet } from '../ui/CauseSheet';
import { can as canOf, type Access } from '../lib/access';
import { SIXM, type Cause, type SixM, type Grade, type CauseStatus } from '../lib/sixm';
import type { Bone, ProblemView, Suggestion } from '../lib/problems';
import type { PaceAction } from '../lib/tracker';
import type { Case } from '../types';

const AT = Date.parse('2026-10-02T09:00:00Z');

const problem = (id: string, title: string): Case => ({
  id, workspaceId: 'ws1', title, path: [], baselineMsWeek: 0, status: 'open', openedAt: AT, updatedAt: AT, projectId: 'p1', lineId: 'l1',
});

let n = 0;
const cause = (m: SixM, text: string, grade: Grade = 'observed', status: CauseStatus = 'suspected', more: Partial<Cause> = {}): Cause =>
  ({ id: `c${++n}`, m, text, grade, status, whys: [], at: AT, by: 'Rowland', ...more });

const sugg = (m: SixM, text: string, more: Partial<Suggestion> = {}): Suggestion =>
  ({ key: `s-${m}-${text.slice(0, 12)}`, m, text, grade: 'measured', source: { kind: 'pareto', label: 'Bagger · Minor stop' }, ...more });

const bones = (causes: Cause[], suggestions: Suggestion[] = []): Bone[] =>
  SIXM.map(({ key }) => ({ m: key, causes: causes.filter(c => c.m === key), suggestions: suggestions.filter(s => s.m === key) }));

const action = (ref: string, what: string, owner: string, due: string, status: string, flag = '', expect?: string): PaceAction =>
  ({ uid: `a-${what.slice(0, 8)}`, ref: `a-${what.slice(0, 8)}`, priority: 3, line: 'Line 2', category: 'Material', action: what, owner, due, status, flag, causeRef: ref, expect });

function empty(): ProblemView {
  return {
    problem: problem('pEmpty', 'Line 2 rate below target'), phase: 'finding', bones: bones([]),
    measure: { label: 'Line 2 rate', unit: 'ppm', now: 92, target: 110, better: 'higher' }, actions: [], roots: [], says: '',
  };
}

function typical(): ProblemView {
  const root = cause('material', 'Splices vary between shifts', 'measured', 'confirmed', {
    root: true, source: { kind: 'pareto', label: 'Bagger · Minor stop · film', minutesWeek: 95 },
    whys: [
      { id: 'w1', text: 'Each crew splices the film its own way', grade: 'observed' },
      { id: 'w2', text: 'There is no splice standard at the bagger', grade: 'counted' },
      { id: 'w3', text: 'The standard was never written when the new film came in' },
      { id: 'w4', text: 'Nobody owns material changes on the line' },
    ],
  });
  const cs = [
    root,
    cause('material', 'New film supplier — thinner gauge since August', 'reported', 'suspected'),
    cause('machine', 'Photo-eye loses the print mark at speed', 'measured', 'confirmed', { source: { kind: 'snag', label: 'Bagger photo-eye, filmed on the walk' } }),
    cause('machine', 'Jaw temperature drifts after a stop', 'observed', 'suspected'),
    cause('machine', 'Infeed guide rail worn at the transfer', 'observed', 'ruled_out'),
    cause('people', 'Night crew one short on 3 shifts of 5', 'counted', 'confirmed', { source: { kind: 'standard', label: 'Line 2 standard — crew of 4' } }),
    cause('people', 'New starters not trained on the splice', 'reported', 'suspected'),
    cause('method', 'Changeover order not followed on nights', 'observed', 'suspected'),
  ];
  const ss = [
    sugg('machine', '18 minor stops in 4 weeks on the bagger, 11 on nights', { minutesWeek: 64, detail: '18 stops in 4 weeks, 11 on nights', guessed: true }),
    sugg('measurement', 'Four days with nothing logged — the Pareto may be short', { grade: 'counted', source: { kind: 'reading' }, detail: '4 days with no stops logged' }),
    sugg('environment', 'Hot afternoons mentioned in three notes', { grade: 'reported', source: { kind: 'observation' }, detail: '3 notes mention heat' }),
  ];
  const ref = `pTyp:${root.id}`;
  return {
    problem: problem('pTyp', 'Bagger minor stops'), phase: 'acting', bones: bones(cs, ss),
    measure: { label: 'Minor stops on the bagger', unit: 'h a week', before: 3.2, now: 2.4, target: 1.5, better: 'lower', moved: 'better' },
    actions: [
      action(ref, 'Write the splice standard and train every crew', 'Dave Moss', '10 Oct', 'To do', '', 'film splice stops 40 → 10 min a week'),
      action(ref, 'Name an owner for material changes on Line 2', 'Rowland', '1 Oct', 'To do', 'Overdue'),
      // one fix in each of the board's other states, so every tag is seen
      action(`pTyp:${cs[2].id}`, 'Fit a second photo-eye on the print mark', 'OEM', '14 Oct', 'Waiting'),
      action(`pTyp:${cs[5].id}`, 'Cover the night crew from days', 'Rowland', '28 Sep', 'Done'),
      action(`pTyp:${cs[5].id}`, 'Agree the cover rota with HR', 'Rowland', '30 Sep', 'Done'),
      action(`pTyp:${cs[7].id}`, 'Walk the changeover with nights', 'Dave Moss', '9 Oct', 'In progress'),
      action(`pTyp:${cs[1].id}`, 'Ask the film supplier for the gauge spec', 'Buyer', '', 'To do'),
    ],
    roots: [root], says: '3.2 h a week lost at the start, 41% of the line’s stops',
  };
}

function huge(): ProblemView {
  const words = [
    'The film reel core is out of round on about one reel in six from the second supplier, and the dancer arm cannot take up the slack at speed',
    'Sensor', 'Operators restart without clearing the jam fully because the guard interlock takes four minutes to reset after every opening',
    'Label applicator peels misaligned on the curved tray lid', 'CIP overruns into the first hour of the day shift',
    'Checkweigher rejects good packs after every product change', 'Condensation on the cold side drips onto the photo-eye lens',
    'Rated speed in the system is the old 120 ppm, not the 100 ppm the bagger can actually hold with this film',
  ];
  const ms: SixM[] = ['people', 'machine', 'method', 'material', 'measurement', 'environment'];
  const grades: Grade[] = ['measured', 'counted', 'observed', 'reported'];
  const sts: CauseStatus[] = ['confirmed', 'suspected', 'suspected', 'ruled_out'];
  const cs: Cause[] = [];
  for (let i = 0; i < 40; i++) {
    const m = i < 14 ? 'machine' : ms[i % 6];
    cs.push(cause(m, `${words[i % words.length]}${i > 7 ? ` (${i})` : ''}`, grades[i % 4], sts[i % 4], i % 9 === 0 ? { root: true, status: 'confirmed', whys: [{ id: `x${i}`, text: 'The operator forgot to clear it' }] } : {}));
  }
  const ss = [
    sugg('people', 'Eleven of eighteen stops on the night shift — a pattern worth a look before anything else is decided about the crew'),
    sugg('environment', 'Notes mention humidity on six days in September', { detail: '6 notes' }),
  ];
  return {
    problem: problem('pHuge', 'Bagger, wrapper and checkweigher minor stops on Line 2 across all three shifts since the new film came in'),
    phase: 'slipped', bones: bones(cs, ss),
    measure: { label: 'Minor stops', unit: 'h a week', before: 6.1, now: 7.4, target: 2, better: 'lower', moved: 'worse' },
    actions: [], roots: cs.filter(c => c.root), says: '7.4 h a week now, up from 6.1 when the countermeasures closed — it has slipped back',
  };
}

const FIX: Record<string, () => ProblemView> = { empty, typical, huge };

declare global { interface Window { __fish: string[] } }
window.__fish = [];
const log = (s: string) => { window.__fish.push(s); };

function Preview() {
  const q = new URLSearchParams(location.search);
  const [view, setView] = useState<ProblemView>(() => (FIX[q.get('f') ?? 'typical'] ?? typical)());
  const can = canOf((q.get('can') as Access) || 'owner');
  const compact = q.get('compact') === '1';
  /* ?fill=1 gives the fish the room under the heading, as the fishbone page
     does; ?fh= sets that room's height instead (to see it scroll inside). */
  const fill = q.get('fill') === '1';
  const fh = q.get('fh');
  const [open, setOpen] = useState<{ cause: Cause; draft: boolean } | null>(null);

  const save = async (c: Cause) => {
    log(`save:${c.id}:${c.m}:${c.whys.length}:${c.root ? 'root' : ''}`);
    setView(v => {
      const all = v.bones.flatMap(b => b.causes).filter(x => x.id !== c.id).concat(c);
      return { ...v, bones: v.bones.map(b => ({ ...b, causes: all.filter(x => x.m === b.m), suggestions: b.suggestions.filter(s => s.text !== c.text) })) };
    });
  };
  const remove = async (id: string) => {
    log(`remove:${id}`);
    setView(v => ({ ...v, bones: v.bones.map(b => ({ ...b, causes: b.causes.filter(x => x.id !== id) })) }));
  };

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <h1 className="h1" style={{ margin: '0 0 14px' }}>Fishbone preview</h1>
      <div style={compact ? { maxWidth: Number(q.get('cw') ?? 420) } : fill ? { height: fh ? Number(fh) : 'calc(100vh - 92px)' } : undefined}>
        <Fishbone view={view} can={can} compact={compact} fill={fill}
          onHead={q.get('head') === '0' ? undefined : () => log('head')}
          onCause={c => { log(`cause:${c.id}`); setOpen({ cause: c, draft: false }); }}
          onSuggestion={s => { log(`sugg:${s.key}`); setOpen({ cause: { id: `new-${s.key}`, m: s.m, text: s.text, grade: s.grade, status: 'suspected', source: s.source, whys: [], at: Date.now() }, draft: true }); }}
          onAdd={m => { log(`add:${m}`); setOpen({ cause: { id: `new-${m}-${Date.now()}`, m, text: '', grade: 'observed', status: 'suspected', whys: [], at: Date.now(), by: 'Rowland' }, draft: true }); }} />
      </div>
      <CauseSheet open={!!open} view={view} cause={open?.cause ?? null} draft={open?.draft} can={can}
        onSave={save} onRemove={remove}
        onAddCountermeasure={c => log(`countermeasure:${c.id}`)}
        onOpenSource={s => log(`source:${s.kind}`)}
        onClose={() => setOpen(null)} />
    </div>
  );
}

const el = document.getElementById('root') ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'root' }));
createRoot(el).render(<Preview />);
