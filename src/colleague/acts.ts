/* CONVERSATION ACTS — what a person can say to Luna that the app does itself (24 November 2026).
 *
 * Rowland: "make a report, she does; send the report, she does; let’s track that; remind me tomorrow, she does."
 * Parsed here, in code, so the well-formed phrasing never waits on a gateway round. Anything else still goes to Luna.
 *
 * Luna product only (`#/ai`). Reports and summaries are hers. Reminders stay on this device and on her page — never a
 * Faultline action, never a catalogue tool, never the G6 overnight job loop. Pure: no browser, no storage. */

import { addDays } from '../lib/weeks';
import { chartNow, findingOf, seriesOf, type Chart, type ConvReport, type DataResult, type ReportSection } from '../lib/data/outputs';

export type ConversationAct =
  | { kind: 'remind'; when: string; what: string }
  | { kind: 'report' }
  | { kind: 'send'; to: string }
  | { kind: 'workspace'; name?: string };

const EMAIL = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const clip = (s: string, n = 200) => s.replace(/[.!?]+$/, '').trim().slice(0, n);
const whatOf = (s?: string) => clip(s || '') || 'what we were talking about';

function nextNamedDay(today: string, name: string): string {
  const want = DAYS.indexOf(name.toLowerCase() as typeof DAYS[number]);
  const have = new Date(`${today}T12:00:00`).getDay();
  const add = ((want - have + 7) % 7) || 7;
  return addDays(today, add);
}

/** The whole of what was said, as a conversation act — or null, so Luna answers as before. A short timer
 *  ("remind me in twenty minutes") is start_timer, not a reminder for a day. */
export function conversationAct(text: string, today: string): ConversationAct | null {
  const s = text.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
  if (!s) return null;

  const send = /^(?:please\s+)?(?:send|email)(?:\s+(?:this|the|that))?(?:\s+(?:report|chart|graph|email|pack|it))?\s+(?:to|:)\s*/i.exec(s);
  if (send) {
    const rest = s.slice(send[0].length);
    const m = EMAIL.exec(rest);
    if (m && /^(?:please)?[.!?]*$/i.test(rest.slice(m[0].length).trim())) return { kind: 'send', to: m[1].toLowerCase() };
  }

  if (/^(?:please\s+)?remind\s+me\s+/i.test(s)) {
    const rest = s.replace(/^(?:please\s+)?remind\s+me\s+/i, '');
    if (/\bin\s+\d+\s*(?:minutes?|mins?|hours?|hrs?)\b/i.test(rest)) return null;
    const tom = /^(?:tomorrow)(?:\s+(?:to|about)\s+(.+))?$/i.exec(rest);
    if (tom) return { kind: 'remind', when: addDays(today, 1), what: whatOf(tom[1]) };
    const inDays = /^in\s+(\d+)\s+days?(?:\s+(?:to|about)\s+(.+))?$/i.exec(rest);
    if (inDays) {
      const n = Number(inDays[1]);
      if (n >= 1 && n <= 90) return { kind: 'remind', when: addDays(today, n), what: whatOf(inDays[2]) };
    }
    const week = /^next\s+week(?:\s+(?:to|about)\s+(.+))?$/i.exec(rest);
    if (week) return { kind: 'remind', when: addDays(today, 7), what: whatOf(week[1]) };
    const named = /^(?:on\s+|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:to|about)\s+(.+))?$/i.exec(rest);
    if (named) return { kind: 'remind', when: nextNamedDay(today, named[1]), what: whatOf(named[2]) };
    const iso = /^(?:on\s+)?(\d{4}-\d{2}-\d{2})(?:\s+(?:to|about)\s+(.+))?$/i.exec(rest);
    if (iso) return { kind: 'remind', when: iso[1], what: whatOf(iso[2]) };
    return null;
  }

  if (
    /^(?:please\s+)?(?:make(?:\s+me)?(?:\s+a)?|put(?:\s+(?:that|this|it))?(?:\s+in(?:to)?)?|write(?:\s+(?:that|this|it))?(?:\s+up)?)\s+(?:a\s+|this\s+|that\s+)?report(?:\s+(?:of|from)\s+(?:that|this|it))?$/i.test(s)
    || /^(?:please\s+)?put\s+(?:that|this|it)\s+in(?:to)?\s+a\s+report$/i.test(s)
    || /^(?:please\s+)?make\s+(?:me\s+)?(?:a\s+)?report$/i.test(s)
    || /^(?:please\s+)?write\s+(?:that|this|it)\s+up(?:\s+as\s+a\s+report)?$/i.test(s)
    || /^a report$/i.test(s)
  ) return { kind: 'report' };

  const intoWorkspace = /^(?:please\s+)?(?:move|put)\s+(?:that|this|it|this\s+chat)(?:\s+and\s+(?:its|the)\s+files)?\s+in(?:to)?\s+(?:a\s+)?workspace(?:\s+(?:called|named)\s+(.+))?$/i.exec(s);
  if (intoWorkspace) {
    const name = intoWorkspace[1]?.trim().replace(/[.!?]+$/, '').slice(0, 80);
    return name ? { kind: 'workspace', name } : { kind: 'workspace' };
  }

  return null;
}

/** A report from the latest chart in the conversation, else the latest result — every figure already the app’s. */
export function reportInputOf(o: { charts: Chart[]; results: DataResult[]; reports?: ConvReport[] }): { title: string; sections: Partial<ReportSection>[] } | null {
  const chart = [...o.charts].sort((a, b) => b.at - a.at)[0];
  const result = [...o.results].sort((a, b) => b.at - a.at)[0];
  if (chart) {
    const spec = chartNow(chart);
    const sections: Partial<ReportSection>[] = [{ kind: 'chart', heading: spec.title || 'The chart', chartId: chart.id }];
    const series = seriesOf(spec, new Map(o.results.map(r => [r.id, r])));
    if (!('why' in series)) {
      const finding = series.finding ?? findingOf(spec, series)?.text;
      if (finding) sections.push({ kind: 'finding', heading: 'What it shows', text: finding, evidence: [spec.resultId] });
    }
    return { title: spec.title || 'This conversation', sections };
  }
  if (result) {
    return { title: result.title || 'This conversation', sections: [{ kind: 'table', heading: result.title || 'The figures', resultId: result.id }] };
  }
  return null;
}
