/* THE EIGHT METHODS A PROJECT CAN BE (docs/METHODS.md — Rowland, 31 October: "the method equals the project",
 * "build methods first … and we simply insert the tools where required").
 *
 * A method fixes a project's sections, in order. Each section lists the catalogue tools that fit it by default (by
 * their FC number — the catalogue is the one list of tools, src/catalogue); any other tool can be added to any
 * section by the person. 6M is a TOOL (the fishbone, the five whys, the countermeasure board), never a method here.
 *
 * Fixed in code and chosen by a person: not a method builder, and nothing here is written by an assistant
 * (docs/DIRECTION.md, 20 October). A ninth method is one more entry.
 *
 * This is the data only (slice M1). The project's `method` field is M2; New project and the sections page, M3. Nothing
 * reads this yet but its test, which holds it true to the catalogue and to docs/METHODS.md. */

export type MethodKey = 'pdca' | 'dmaic' | 'eight-d' | 'a3' | 'stage-gate' | 'kaizen-event' | 'kata' | 'toc';

export interface MethodSection {
  /** Its name on screen and paper. */
  name: string;
  /** What happens in it, in a sentence. */
  what: string;
  /** The catalogue tools that fit it by default, by id ("FC-146"), in the order a person reaches for them. */
  tools: readonly string[];
  /** A word on how the tools are used here, where one is needed. */
  note?: string;
}

export interface ProjectMethod {
  key: MethodKey;
  name: string;
  /** The question it answers — what a person picking a method reads. */
  question: string;
  sections: readonly MethodSection[];
  /** Where its sections come from (the knowledge record carries the references and when each was checked). */
  source: string;
  /** The knowledge record behind it (knowledge/methods/<id with dots as folders>.md). */
  record: string;
}

export const METHODS: readonly ProjectMethod[] = [
  {
    key: 'pdca', name: "PDCA",
    question: "How do we improve one number steadily, and prove the change held?",
    source: "Shewhart (1939) and Deming (1986; PDSA in 1993) — knowledge record `rca.pdca`",
    record: 'rca.pdca',
    sections: [
      { name: "Plan", what: "The number, the gap, the cause suspected, the change and the effect expected — written before.", tools: ['FC-154', 'FC-125', 'FC-049', 'FC-094', 'FC-146', 'FC-147', 'FC-148', 'FC-153', 'FC-144'], note: "Cause by the 6M tool (fishbone, five whys); the number from the tool that measures it." },
      { name: "Do", what: "The change made, small first; who does what by when.", tools: ['FC-194', 'FC-202', 'FC-235'], note: "Actions is the project’s own page; Calculators for the what-if before the trial." },
      { name: "Check", what: "The number again, against before and against the prediction; beyond the noise?", tools: ['FC-105', 'FC-106', 'FC-104', 'FC-086', 'FC-094'], note: "Before → after is the check." },
      { name: "Act", what: "Made the standard, written, trained, offered to the other lines — or planned again.", tools: ['FC-007', 'FC-006', 'FC-225', 'FC-155', 'FC-013', 'FC-086'], note: "Holding is a control chart on the after period." },
    ],
  },
  {
    key: 'dmaic', name: "DMAIC",
    question: "How do we cut variation or defects with data, with a review before each phase?",
    source: "ISO 13053-1:2011 (Six Sigma — DMAIC methodology) — knowledge record `sixsigma.dmaic`",
    record: 'sixsigma.dmaic',
    sections: [
      { name: "Define", what: "The problem, the customer’s requirement, scope, goal and worth.", tools: ['FC-142', 'FC-139', 'FC-140', 'FC-141', 'FC-128', 'FC-191'], note: "Charter first; SIPOC scopes; VOC → CTQ sets the limits." },
      { name: "Measure", what: "The baseline of the CTQ with its capability, and the gauge proved fit.", tools: ['FC-118', 'FC-119', 'FC-120', 'FC-124', 'FC-086', 'FC-094', 'FC-095', 'FC-098', 'FC-099', 'FC-102'], note: "Gauge R&R before any data is believed." },
      { name: "Analyse", what: "Root causes found with data.", tools: ['FC-125', 'FC-153', 'FC-146', 'FC-147', 'FC-148', 'FC-109', 'FC-110', 'FC-107', 'FC-105', 'FC-111', 'FC-149'], note: "The 6M tool lives here; stratify and test." },
      { name: "Improve", what: "The solution chosen, piloted and proved on the CTQ.", tools: ['FC-143', 'FC-144', 'FC-111', 'FC-112', 'FC-014', 'FC-068', 'FC-105', 'FC-191'], note: "Pugh and impact/effort choose; before → after proves." },
      { name: "Control", what: "The gain held: chart, control plan, standard, handover to the process owner.", tools: ['FC-086', 'FC-087', 'FC-088', 'FC-089', 'FC-090', 'FC-101', 'FC-133', 'FC-132', 'FC-007', 'FC-201'], note: "Control chart plus control plan row." },
    ],
  },
  {
    key: 'eight-d', name: "8D",
    question: "Something has gone wrong — a complaint or an incident. How do we contain it, find why, and stop it coming back?",
    source: "Ford TOPS (1987), the automotive practice (AIAG; VDA) — knowledge record `rca.eight-d` (the D0–D8 steps from knowledge, to confirm against the texts)",
    record: 'rca.eight-d',
    sections: [
      { name: "D0–D1  Symptom, emergency response, team", what: "What happened, the first response, who is on it.", tools: ['FC-154', 'FC-134', 'FC-194'] },
      { name: "D2  Describe the problem", what: "Is / is not: what, where, when, how much.", tools: ['FC-149', 'FC-124', 'FC-125', 'FC-153'], note: "Is / is not is the heart of D2." },
      { name: "D3  Contain", what: "Product held, sorted or reworked; the customer protected; checked that it works.", tools: ['FC-135', 'FC-131', 'FC-124'], note: "Nonconformance hold is the D3 tool." },
      { name: "D4  Root cause and escape point", what: "Why it happened and why it was not caught — verified on and off.", tools: ['FC-146', 'FC-147', 'FC-148', 'FC-152', 'FC-153', 'FC-107', 'FC-105', 'FC-132', 'FC-133'], note: "Escape point reads the control plan and the FMEA." },
      { name: "D5–D6  Corrective action, implemented and validated", what: "The permanent action chosen, put in, proved on the number.", tools: ['FC-143', 'FC-144', 'FC-105', 'FC-094', 'FC-086'] },
      { name: "D7  Prevent recurrence", what: "The system changed: FMEA, control plan, standard, the other lines.", tools: ['FC-132', 'FC-133', 'FC-007', 'FC-225', 'FC-014', 'FC-155'], note: "Horizontal deployment offers the fix to every line." },
      { name: "D8  Close", what: "Evidence for each discipline; the team recognised; the report sent.", tools: ['FC-150', 'FC-194'], note: "The 8D report is the paper." },
    ],
  },
  {
    key: 'a3', name: "A3",
    question: "How do we put one problem and its solution on one page, agreed with the people who must support it?",
    source: "Sobek & Smalley (2008) Understanding A3 Thinking; Shook (2008) Managing to Learn — knowledge record `rca.a3` (from knowledge, texts not re-read)",
    record: 'rca.a3',
    sections: [
      { name: "Background", what: "Why it matters: the gap in the business’s number, and what it costs.", tools: ['FC-154', 'FC-187', 'FC-189', 'FC-128'] },
      { name: "Current condition", what: "The facts drawn, with the number.", tools: ['FC-125', 'FC-001', 'FC-049', 'FC-086', 'FC-094', 'FC-124'], note: "Chart, Pareto or map — whichever shows the number." },
      { name: "Target", what: "The number wanted, by when.", tools: ['FC-201', 'FC-034', 'FC-117'] },
      { name: "Analysis", what: "The root cause, with the evidence.", tools: ['FC-146', 'FC-147', 'FC-148', 'FC-152', 'FC-153', 'FC-149'] },
      { name: "Countermeasures", what: "What, who, by when, against which cause.", tools: ['FC-194', 'FC-144', 'FC-143'] },
      { name: "Plan and follow-up", what: "The steps; then the number checked, and whether it held.", tools: ['FC-194', 'FC-105', 'FC-086', 'FC-201'], note: "The A3 paper is FC-151." },
    ],
  },
  {
    key: 'stage-gate', name: "Stage gate",
    question: "How do we take new equipment from delivery to handover, each gate passed on evidence?",
    source: "Faultline’s own, from commissioning practice (docs/STAGEGATE.md, src/lib/planModel.ts); the word “stage gate” and the gate idea from Cooper (2001), who wrote it for product development — knowledge record `commissioning.stage-gate`",
    record: 'commissioning.stage-gate',
    sections: [
      { name: "Install", what: "The machines on site, their stages and parts; what is late.", tools: ['FC-079', 'FC-215'], note: "Machines and materials; critical path is not built." },
      { name: "Set up", what: "Programs loaded, the people ready, the standards written.", tools: ['FC-075', 'FC-082', 'FC-225', 'FC-222', 'FC-223', 'FC-178'], note: "Readiness is partly built; skills and SOP are not." },
      { name: "Commission", what: "Tests against what was agreed; the run at rate; the climb; capability; the filmed walk.", tools: ['FC-074', 'FC-075', 'FC-076', 'FC-077', 'FC-083', 'FC-084', 'FC-061', 'FC-118', 'FC-164', 'FC-165', 'FC-170', 'FC-081', 'FC-085'], note: "This is the Prove loop: programs and tests on the line." },
      { name: "Hand over", what: "Sign-off, spares, maintenance, what is still owed.", tools: ['FC-080', 'FC-078', 'FC-066', 'FC-063', 'FC-062', 'FC-064', 'FC-082'], note: "The pace forecast says when." },
    ],
  },
  {
    key: 'kaizen-event', name: "Kaizen event",
    question: "How do we fix one process in a focused week, and check it a month later?",
    source: "Imai (1986) as the root; the event as practice frames it — knowledge record `lean.kaizen-event` (from knowledge)",
    record: 'lean.kaizen-event',
    sections: [
      { name: "Prepare", what: "The charter, the team, the baseline.", tools: ['FC-142', 'FC-001', 'FC-019', 'FC-051'] },
      { name: "Observe", what: "The waste seen on the floor.", tools: ['FC-005', 'FC-004', 'FC-003', 'FC-022', 'FC-021', 'FC-199'], note: "Spaghetti and flow chart are not built." },
      { name: "Improve", what: "Changes tried in the week and measured.", tools: ['FC-028', 'FC-068', 'FC-013', 'FC-014', 'FC-032', 'FC-144', 'FC-105'], note: "ECRS, SMED, 5S, line balance." },
      { name: "Standardise", what: "The new way written and the people trained.", tools: ['FC-007', 'FC-006', 'FC-225', 'FC-224', 'FC-223'] },
      { name: "Sustain", what: "Open actions to the 30-day check; the gain still holding?", tools: ['FC-194', 'FC-201', 'FC-086', 'FC-013'], note: "The 30-day check is the point of the method." },
    ],
  },
  {
    key: 'kata', name: "Improvement Kata",
    question: "How do we improve toward a goal when we do not yet know the way, a small experiment at a time?",
    source: "Rother (2009) Toyota Kata; Toyota Kata Practice Guide (2018) — knowledge record `lean.toyota-kata` (from knowledge, texts not re-read)",
    record: 'lean.toyota-kata',
    sections: [
      { name: "Understand the direction", what: "The challenge: a measurable aim months out, and why it matters.", tools: ['FC-201', 'FC-034', 'FC-154'], note: "The challenge comes from the line or the factory’s aim." },
      { name: "Grasp the current condition", what: "The process measured as it is — its pattern, not its average.", tools: ['FC-001', 'FC-019', 'FC-049', 'FC-052', 'FC-086', 'FC-094', 'FC-022', 'FC-006'], note: "Run chart and block diagram of how it runs today." },
      { name: "Establish the next target condition", what: "A described state of the process, with a date a few weeks away — not a solution.", tools: ['FC-007', 'FC-008', 'FC-006', 'FC-036', 'FC-235', 'FC-201'], note: "Standard work, takt and the line standard describe the state." },
      { name: "Experiment toward it", what: "One small step at a time, each a written prediction, a result and a lesson; the five coaching questions daily.", tools: ['FC-194', 'FC-199', 'FC-198', 'FC-105', 'FC-086', 'FC-068', 'FC-013', 'FC-202'], note: "Gemba walk and the tiered meeting are the coaching routine." },
    ],
  },
  {
    key: 'toc', name: "Theory of Constraints",
    question: "Where is the one thing that limits the whole line, and how do we get more through it?",
    source: "Goldratt & Cox (1984) The Goal; Goldratt (1990) What Is This Thing Called Theory of Constraints? — knowledge record `capacity.theory-of-constraints`",
    record: 'capacity.theory-of-constraints',
    sections: [
      { name: "Identify the constraint", what: "Which station or machine limits the output, and is it real or a mirage?", tools: ['FC-034', 'FC-037', 'FC-038', 'FC-032', 'FC-041', 'FC-040', 'FC-044', 'FC-046'], note: "The V-curve and the bottleneck walk already do this." },
      { name: "Exploit it", what: "Lose nothing at the constraint: its stops, its speed, its changeovers, its idle time.", tools: ['FC-049', 'FC-051', 'FC-052', 'FC-056', 'FC-068', 'FC-042', 'FC-039', 'FC-188'], note: "A minute lost here is lost for the whole line." },
      { name: "Subordinate the rest", what: "Everything else works to the constraint’s pace: buffers, schedule, pull.", tools: ['FC-043', 'FC-009', 'FC-179', 'FC-045', 'FC-046', 'FC-036'], note: "Drum–buffer–rope is the formal way." },
      { name: "Elevate it", what: "Only now spend: more people, more capacity, a faster machine — with the worth.", tools: ['FC-036', 'FC-031', 'FC-189', 'FC-190', 'FC-191', 'FC-039'], note: "What-ifs show the way to the target; payback shows the worth." },
      { name: "Go again", what: "The constraint has moved: find it, do not let inertia become the new constraint.", tools: ['FC-034', 'FC-086', 'FC-201', 'FC-105'], note: "Repeat the first step on the new constraint." },
    ],
  },
];

export const methodByKey = (key: string | undefined): ProjectMethod | undefined => METHODS.find(m => m.key === key);

/** Every catalogue tool a method puts in a section by default, once each, in the order of its sections. */
export const toolsOfMethod = (m: ProjectMethod): string[] => [...new Set(m.sections.flatMap(s => s.tools))];

/** The methods whose sections use a tool — "where this tool is used" (the pathway of docs/METHODS.md). */
export const methodsUsing = (toolId: string): ProjectMethod[] => METHODS.filter(m => toolsOfMethod(m).includes(toolId));
