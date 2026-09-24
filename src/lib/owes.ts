/* WHO OWES WHAT, BY WHEN — page 3 of the client report.
 *
 * Page 1 tells the story of each thing being proved. Page 2 says where the job
 * is. Neither answers the question the meeting actually ends on: what does each
 * side have to do before we meet again. A GM reading page 1 has to collect
 * Ilapak's debts from six different strands; the OEM's project manager has to
 * find his own name in them. This is the same debts, turned the other way up —
 * one block per party, dated, late in red, each line naming what it hangs off.
 *
 * NOT A FIFTH LIST. Nothing here is stored. Every line is read off something
 * that already exists: the owed lines of the strands on page 1 (so the two
 * pages cannot disagree), the materials not in, the programs not proved, the
 * machines not running, and the observations nobody has decided on.
 *
 * WHO IS A PARTY. A supplier is anyone named as one — a machine's OEM, where a
 * material or program comes from, or who a test is done with. Anything owed by
 * a name that is not a supplier is the site's: "Dave" re-tracking the film is
 * the site's work with Dave's name on it, not a company of its own. A debt with
 * no name at all gets its own block, because "nobody" owing something is the
 * thing most worth putting in front of both sides.
 */

export type OweTone = 'late' | 'due' | 'since' | 'none';

export interface OweLine {
  /** What has to happen. */
  what: string;
  /** What it hangs off — the test, the machine, the material. */
  about: string;
  /** The site's person, when the site owes it and somebody is named. */
  person?: string;
  /** "WAS 18 Sept", "by 29 Sept", "since 21 Sept", "no date agreed". */
  when: string;
  tone: OweTone;
  /** ISO, for ordering only. */
  on?: string;
}

export interface Party {
  who: string;
  kind: 'oem' | 'site' | 'nobody';
  lines: OweLine[];
  late: number;
  /** One sentence: what is needed from them before the next report. */
  ask: string;
}

export interface Owes {
  parties: Party[];
  /** "Ilapak UK 4 · Ishida Europe 2 · the site 5 — 3 past the day" */
  says: string;
}

/** A debt before it is sorted into a party. */
export interface Debt {
  /** Who owes it, as typed. Empty is nobody. "the site" is the site. */
  who: string;
  what: string;
  about: string;
  /** ISO. The day it is due by, or — with `since` — the day it started. */
  on?: string;
  late: boolean;
  since?: boolean;
}

const SITE = 'the site';
const key = (s: string) => s.trim().toLowerCase();

/** How near "before the next report" is: a week. */
const SOON_DAYS = 7;

const addDays = (iso: string, n: number): string => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const TONE_ORDER: Record<OweTone, number> = { late: 0, due: 1, since: 2, none: 3 };

export function whoOwes(debts: Debt[], opts: {
  /** Every name that is a supplier. Case does not matter. */
  suppliers: string[];
  today: string;
  /** ISO to print, e.g. "18 Sept". */
  day: (iso: string) => string;
}): Owes {
  const suppliers = new Map<string, string>();
  for (const s of opts.suppliers) if (s.trim() && key(s) !== SITE) suppliers.set(key(s), s.trim());

  const parties = new Map<string, Party>();
  const partyOf = (who: string): { party: Party; person?: string } => {
    const k = key(who);
    const supplier = suppliers.get(k);
    const [pk, name, kind]: [string, string, Party['kind']] = !k
      ? ['\u0000nobody', 'Nobody named yet', 'nobody']
      : supplier ? [k, supplier, 'oem']
        : ['\u0000site', 'The site', 'site'];
    let p = parties.get(pk);
    if (!p) { p = { who: name, kind, lines: [], late: 0, ask: '' }; parties.set(pk, p); }
    return { party: p, person: kind === 'site' && k !== SITE ? who.trim() : undefined };
  };

  for (const raw of debts) {
    /* "Run it" in bold with the test's name in grey under it made the reader
       look underneath to find out what. The test's name leads; what is to be
       done with it goes under. */
    const d = /^(Run it|Do it)$/.test(raw.what)
      ? { ...raw, what: raw.about, about: raw.what === 'Run it' ? 'to run' : 'to do' }
      : raw;
    const { party, person } = partyOf(d.who);
    const tone: OweTone = d.late ? 'late' : d.since && d.on ? 'since' : d.on ? 'due' : 'none';
    const when = tone === 'late' ? `WAS ${opts.day(d.on ?? '')}`
      : tone === 'since' ? `since ${opts.day(d.on ?? '')}`
        : tone === 'due' ? `by ${opts.day(d.on ?? '')}`
          : 'no date agreed';
    /* The same thing owed twice under one party — a booked re-test is also the
       next step agreed off the test before it — is one line. */
    if (party.lines.some(l => l.what === d.what && l.about === d.about)) continue;
    party.lines.push({ what: d.what, about: d.about, person, when, tone, on: d.on });
    if (tone === 'late') party.late += 1;
  }

  const soon = addDays(opts.today, SOON_DAYS);
  for (const p of parties.values()) {
    p.lines.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]
      || (a.on ?? '￿').localeCompare(b.on ?? '￿')
      || a.what.localeCompare(b.what));
    p.ask = askOf(p, soon);
  }

  /* The suppliers first, whoever is furthest behind leading; then what nobody
     owns; the site last — it closes the page with what the OEM will ask the
     site about, which is the order the meeting goes in. */
  const rank = (p: Party) => (p.kind === 'oem' ? 0 : p.kind === 'nobody' ? 1 : 2);
  const list = [...parties.values()].sort((a, b) => rank(a) - rank(b)
    || b.late - a.late || b.lines.length - a.lines.length || a.who.localeCompare(b.who));

  const late = list.reduce((n, p) => n + p.late, 0);
  const says = list.length === 0
    ? 'nothing owed by anybody'
    : list.map(p => `${p.kind === 'site' ? 'the site' : p.who} ${p.lines.length}`).join(' · ')
      + (late ? ` — ${late} past the day` : ' — none of it late');
  return { parties: list, says };
}

/** What is needed from a party before the next report: a new date for what is
 *  late, a date for what has none, what falls due inside a week, and the calls
 *  the site still owes. Grouped into short sentences, because it is read aloud
 *  in the meeting — one run-on list of "run it (…) — a new date; …" was not. */
function askOf(p: Party, soon: string): string {
  const late: string[] = [], none: string[] = [], week: string[] = [], call: string[] = [];
  for (const l of p.lines) {
    const it = subject(l);
    if (l.tone === 'late') late.push(it);
    else if (l.tone === 'none') none.push(it);
    else if (l.tone === 'since') call.push(it);
    else if (l.on && l.on <= soon) week.push(`${it} (${l.when.replace(/^by /, '')})`);
  }
  const n = late.length + none.length + week.length + call.length;
  if (n === 0) return 'Nothing is needed before the next report.';
  /* At most four things named; the rest counted. */
  let room = 4;
  const take = (xs: string[]) => { const shown = xs.slice(0, Math.max(0, room)); room -= shown.length; return shown; };
  const said: string[] = [];
  const say = (lead: string, xs: string[]) => { const shown = take(xs); if (shown.length) said.push(`${lead} ${list(shown)}.`); };
  say(late.length === 1 ? 'A new date for' : 'New dates for', late);
  say('Due this week:', week);
  say('A date for', none);
  say('Still to call:', call);
  const named = 4 - Math.max(0, room);
  return `${ASK}${said.join(' ')}${n > named ? ` And ${n - named} more.` : ''}`;
}

export const ASK = 'Before the next report: ';

/* What a line is ABOUT, said as the thing wanted. "Run it" on its own means
   nothing in a sentence; the test it hangs off does. */
function subject(l: OweLine): string {
  if (l.what === 'Get it on site') return `${l.about} on site`;
  if (l.what === 'Get it running') return `${l.about} running`;
  if (/^Say whether it/.test(l.what)) return `the verdict on ${l.about}`;
  if (/^Decide on /.test(l.what)) return `${l.what.replace(/^Decide on /, '')} from ${l.about}`;
  return lower(l.what);
}

const list = (xs: string[]): string =>
  xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

/* "Say whether it passed" reads mid-sentence as "say whether it passed"; a
   machine or product name keeps its capital. Only the first letter, and only
   when the second is lower case — "PLC" stays "PLC". */
const lower = (s: string) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
