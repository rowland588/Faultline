/* THE PARTS — every page built from the same few (docs/STRUCTURE.md §7, B1).
 *
 * Before 23 October each page drew its own header, its own report buttons, its own filters and
 * rows: six header patterns, nineteen labels for paper, three ways to say where a record belongs.
 * These are the parts the structure's slices build every page from — the page header with one
 * title, one primary action, More ▾ and Report ▾; the views a thing is seen in; the filters that
 * are its counts; a section; a record's row; a state in its colour and its word; where a record
 * belongs; and the lean page's tiles (ui/Lean). They reuse the house's own classes where the house
 * already had the part (pace-head, chip-row, lt-row, ie-tone, the lean tiles), so a page moved onto
 * a part looks as it did; the parts page (screens/PartsScreen, #/parts in development) shows them
 * all, and is photographed with every other page.
 *
 * A part draws; it decides nothing. What a control may do is the page's to say (lib/access
 * can.edit, can.agree, can.remove) — a part given no action draws none. */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { LeanTiles } from './Lean';

/** The five state colours (CLAUDE.md, visual management): late or failed, waiting, under way, done, not started. */
export type Tone = 'r' | 'a' | 'w' | 'g' | 'n';

/* ------------------------------ a state ------------------------------ */

/** A STATE, in its colour and always its word — colour is never the only carrier. */
export function StateTag({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`part-tag is-${tone}`}>{children}</span>;
}

/* ------------------------------ menus ------------------------------ */

/** Opened by its button, closed by Escape, by a press outside it, or by choosing. */
function useMenu() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); button.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key, true);
    box.current?.querySelector<HTMLButtonElement>('[role=menuitem]:not(:disabled)')?.focus();
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key, true); };
  }, [open]);
  return { open, setOpen, box, button };
}

/** A PAPER the page can make — named for what it is and who it is for. */
export interface Paper {
  /** What it is: "Status report — 1 page", "Test cards". */
  label: string;
  /** Who it is for, or what it holds, in a line. */
  for?: string;
  make: () => void | Promise<void>;
  /** Nothing to put on it yet — kept in the list, greyed, its line saying why. */
  disabled?: boolean;
}

/** REPORT ▾ — every paper a page has, in one place, each named for what it is (F7: nineteen labels
 *  on thirty pages before). Says "Making…" on the one being made. */
export function ReportMenu({ papers, label = 'Report' }: { papers: Paper[]; label?: string }) {
  const m = useMenu();
  const id = useId();
  const [making, setMaking] = useState<string | null>(null);
  if (!papers.length) return null;
  const make = async (p: Paper) => {
    setMaking(p.label);
    try { await p.make(); } finally { setMaking(null); m.setOpen(false); }
  };
  return (
    <div className="part-menu" ref={m.box}>
      <button ref={m.button} type="button" className="btn part-menu-b" aria-haspopup="menu" aria-expanded={m.open} aria-controls={id} onClick={() => m.setOpen(o => !o)}>
        {making ? 'Making…' : label}<Icon name="chevronDown" size={14} />
      </button>
      {m.open && (
        <div className="part-menu-list" role="menu" id={id} aria-label={label}>
          {papers.map(p => (
            <button key={p.label} type="button" role="menuitem" className="part-menu-i" disabled={!!making || p.disabled} onClick={() => void make(p)}>
              <b>{making === p.label ? 'Making…' : p.label}</b>
              {p.for && <span>{p.for}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Something the page can do that is not its one primary action. */
export interface MoreItem {
  label: string;
  run: () => void;
  /** Deleting or putting away — drawn apart, in red words. */
  danger?: boolean;
  disabled?: boolean;
}

/** MORE ▾ — the page's other actions, so the header holds one primary and never a row of seven. */
export function MoreMenu({ items, label = 'More' }: { items: MoreItem[]; label?: string }) {
  const m = useMenu();
  const id = useId();
  if (!items.length) return null;
  return (
    <div className="part-menu" ref={m.box}>
      <button ref={m.button} type="button" className="btn part-menu-b" aria-haspopup="menu" aria-expanded={m.open} aria-controls={id} onClick={() => m.setOpen(o => !o)}>
        {label}<Icon name="chevronDown" size={14} />
      </button>
      {m.open && (
        <div className="part-menu-list" role="menu" id={id} aria-label={label}>
          {items.map(x => (
            <button key={x.label} type="button" role="menuitem" className={'part-menu-i' + (x.danger ? ' is-danger' : '')} disabled={x.disabled}
              onClick={() => { m.setOpen(false); x.run(); }}>
              <b>{x.label}</b>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ the page header ------------------------------ */

export interface PageHeaderProps {
  /** What kind of page it is, above the title: "6M · on Line 7", "SMED". */
  eyebrow?: ReactNode;
  /** The one title. */
  title: ReactNode;
  /** Its state beside the title, in its colour and its word. */
  state?: { tone: Tone; word: string };
  /** What it says — the lean page's verdict, one sentence. */
  says?: ReactNode;
  /** The one thing to do now. */
  primary?: { label: string; run: () => void; disabled?: boolean; icon?: IconName; className?: string };
  /** Every paper the page has. */
  papers?: Paper[];
  /** Its other actions. */
  more?: MoreItem[];
  /** Under the sentence: where it belongs, a line of counts. */
  children?: ReactNode;
}

/** THE PAGE HEADER — the same on every page: one title, its state, what it says, one primary
 *  action, More ▾ and Report ▾ (docs/STRUCTURE.md §5.5). */
export function PageHeader({ eyebrow, title, state, says, primary, papers = [], more = [], children }: PageHeaderProps) {
  return (
    <header className="pace-head part-head">
      <div className="pace-head-main">
        {eyebrow && <p className="pace-eyebrow">{eyebrow}</p>}
        <h1 className="pace-title">{title}{state && <> <StateTag tone={state.tone}>{state.word}</StateTag></>}</h1>
        {says && <p className="pace-lede">{says}</p>}
        {children}
      </div>
      {(primary || papers.length > 0 || more.length > 0) && (
        <div className="pace-head-actions">
          <MoreMenu items={more} />
          <ReportMenu papers={papers} />
          {primary && <button type="button" className={'btn btn-primary' + (primary.className ? ` ${primary.className}` : '')} disabled={primary.disabled} onClick={primary.run}>{primary.icon && <Icon name={primary.icon} size="1.05em" />}{primary.label}</button>}
        </div>
      )}
    </header>
  );
}

/* ------------------------------ views and filters ------------------------------ */

export interface View { key: string; label: string; count?: number }

/** VIEWS — one thing seen several ways (the plan's tabs, a list by tool or latest first). */
export function ViewTabs({ views, value, onChange, label }: { views: View[]; value: string; onChange: (key: string) => void; label: string }) {
  return (
    <div className="part-views" role="tablist" aria-label={label}>
      {views.map(v => (
        <button key={v.key} type="button" role="tab" aria-selected={v.key === value} className={'part-view' + (v.key === value ? ' on' : '')} onClick={() => onChange(v.key)}>
          {v.label}{v.count !== undefined && <span className="part-view-n">{v.count}</span>}
        </button>
      ))}
    </div>
  );
}

export interface Filter { key: string; label: string; count?: number; tone?: Tone }

/** FILTERS THAT ARE THE COUNTS — "4 late" is the filter for the late, never a second row saying
 *  the same words (CLAUDE.md, simplicity 1). A count carries colour only when it is abnormal. */
export function FilterBar({ filters, value, onChange, label, children }: { filters: Filter[]; value: string; onChange: (key: string) => void; label: string; children?: ReactNode }) {
  return (
    <div className="part-filters">
      <div className="chip-row" role="group" aria-label={label}>
        {filters.map(f => (
          <button key={f.key} type="button" className={'chip' + (f.key === value ? ' on' : '')} aria-pressed={f.key === value} onClick={() => onChange(f.key)}>
            {f.count !== undefined && <b className={f.tone && f.count ? `ie-tone is-${f.tone}` : undefined}>{f.count}</b>}{f.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------ sections and rows ------------------------------ */

/** A SECTION — a heading, how many, and one way on. */
export function Section({ title, count, action, children, label }: { title: string; count?: ReactNode; action?: { label: string; run: () => void }; children: ReactNode; label?: string }) {
  return (
    <section className="part-sec" aria-label={label ?? title}>
      <div className="part-sec-h">
        <h2>{title}</h2>
        {count !== undefined && <span className="sub">{count}</span>}
        {action && <button type="button" className="cw-link" onClick={action.run}>{action.label}</button>}
      </div>
      {children}
    </section>
  );
}

/** A RECORD'S ROW — what it is, what it says in its colour, where it is; the row opens it. */
export function RecordRow({ what, says, tone, where, onOpen, aside }: { what: ReactNode; says?: ReactNode; tone?: Tone; where?: ReactNode; onOpen: () => void; aside?: ReactNode }) {
  return (
    <li className="lt-li part-row">
      <button type="button" className="lt-row" onClick={onOpen}>
        <b className="lt-what">{what}</b>
        {says && <span className={'lt-says' + (tone ? ` ie-tone is-${tone}` : '')}>{says}</span>}
        {where && <span className="lt-where">{where}</span>}
      </button>
      {aside}
    </li>
  );
}

/** Rows, as a list. */
export function RecordRows({ children, label }: { children: ReactNode; label?: string }) {
  return <ul className="lt-rows" aria-label={label}>{children}</ul>;
}

/* ------------------------------ where it belongs ------------------------------ */

/** WHERE A RECORD BELONGS, said once — its line and its project, each a way to it, and Change
 *  when this person may move it (F8: said three ways before). */
export function BelongsTo({ line, project, onChange }: {
  line?: { name: string; open?: () => void };
  project?: { name: string; open?: () => void };
  onChange?: () => void;
}) {
  const part = (pre: string, x?: { name: string; open?: () => void }) => x && (
    <>{pre} {x.open ? <button type="button" className="linkish part-belongs-a" onClick={x.open}>{x.name}</button> : <b>{x.name}</b>}</>
  );
  return (
    <p className="part-belongs">
      {line || project ? <>{part('On', line)}{line && project && ' · '}{part(line ? 'in' : 'In', project)}</> : <>On no line or project</>}
      {onChange && <> · <button type="button" className="linkish part-belongs-c" onClick={onChange}>Change</button></>}
    </p>
  );
}

/** THE TILES — the lean page's few counted figures, each of what it should be (ui/Lean). */
export const Tiles = LeanTiles;
