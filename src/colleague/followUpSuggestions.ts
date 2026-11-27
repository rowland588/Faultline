/* Suggestions when the gateway omits its follow-up line — same voice as COLLEAGUE_SYSTEM FOLLOW-UPS, never invented figures. */

const READ_NEXT: Record<string, readonly string[]> = {
  list_problems: ['Which is the worst?', 'Who has them?', 'Raise one as an action'],
  line_state: ['What should we tackle first?', 'Show open problems', 'Walk the worst machine'],
  overdue_actions: ['Who is late?', 'What is blocking them?'],
  find: ['Open that line', 'What is open there?'],
  resolve: ['Use that record', 'What should we look at next?'],
  resolve_record: ['Open it', 'What does it show now?'],
  run_analysis: ['Put that in a report', 'Show that as a graph'],
  query_data: ['Break it down by line', 'What changed week on week?'],
  query_workbook: ['Which month moved most?', 'Compare to last month'],
  explain_change: ['What caused the biggest shift?', 'Show the stops behind it'],
  explain_variance: ['What sheet explains the gap?', 'Walk the biggest mover'],
  findings: ['What should we verify on the floor?', 'Raise that as a problem'],
  work_out: ['Put that in the report', 'What would you measure to check it?'],
  build_report: ['Download the PDF', 'Email this to the site manager'],
  make_procedure_from_source: ['Make this an SOP', 'Slides', 'HTML'],
  factory_source: ['Make this an SOP', 'Work instruction', 'Training'],
  machine_document: ['Make this an SOP', 'Work instruction', 'Training'],
  plan_job: ['Carry on with the plan', 'What is blocking step one?'],
  read_record: ['What does that mean for the line?', 'Compare with last time'],
};

const DEFAULT = ['What should we do next?', 'Put that in a report', 'Show me a graph'] as const;

export function followUpSuggestions(ran: ReadonlySet<string>, gateway: readonly string[], personAsked: string): string[] {
  if (gateway.length) return [...gateway].slice(0, 3);
  const keys = [...ran].reverse();
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (s: string) => {
    const t = s.trim();
    if (!t || seen.has(t.toLowerCase())) return;
    seen.add(t.toLowerCase());
    out.push(t);
  };
  for (const k of keys) for (const s of READ_NEXT[k] ?? []) { add(s); if (out.length >= 3) return out; }
  if (/report|pdf|send|email/i.test(personAsked)) DEFAULT.forEach(s => add(s));
  else for (const s of DEFAULT) { add(s); if (out.length >= 3) break; }
  return out.slice(0, 3);
}