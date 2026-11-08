// COPIED FROM src/capabilities by scripts/sync-assist.mjs — edit the source, then run it.
// The capabilities as Claude's tool definitions — what AI Mode's colleague may ask the app to do.
// SELF-CONTAINED on purpose: no imports, so the `assist` gateway can copy this file under Deno and refuse,
// server-side, any call whose name is not here or whose input does not fit its schema. The registry
// (src/capabilities/registry.ts) carries the same names and kinds; its test holds the two together.

export type CapabilityKind = 'read' | 'write' | 'local';

export interface CapabilitySchema {
  name: string;
  kind: CapabilityKind;
  description: string;
  input_schema: Record<string, unknown>;
}

const HOW_KNOWN_SAID = ['observed', 'reported', 'measured', 'calculated', 'hypothesised', 'unknown'];

const str = (description: string, maxLength = 400) => ({ type: 'string', description, maxLength });
const obj = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});

export const CAPABILITY_SCHEMAS: CapabilitySchema[] = [
  // ── Reads: run at once ───────────────────────────────────────────────────────
  {
    name: 'find',
    kind: 'read',
    description: 'Find lines, machines, projects, problems and tools by words, the way the app\'s search does. Use it to turn a name the person said into a record id before anything else.',
    input_schema: obj({ words: str('What to look for, e.g. "line 3 wrapper"', 120), client: str('Only this client\'s lines', 120) }, ['words']),
  },
  {
    name: 'line_state',
    kind: 'read',
    description: 'A production line as it stands: its machines in flow order, its open problems (priority, owner, due, late), its programs to prove, each tool\'s latest finding in the tool\'s own sentence, and the line\'s facts (shifts, crew, rate).',
    input_schema: obj({ lineId: str('The line\'s id (from find)', 80) }, ['lineId']),
  },
  {
    name: 'list_problems',
    kind: 'read',
    description: 'Problems on the register, filtered by line, machine or project and by open, late or critical, with the register\'s own sentence.',
    input_schema: obj({
      lineId: str('Only this line', 80),
      machine: str('Only this machine (its name)', 120),
      projectId: str('Only this project', 80),
      which: { type: 'string', enum: ['open', 'late', 'critical', 'all'], description: 'Which problems; open by default' },
    }),
  },
  {
    name: 'overdue_actions',
    kind: 'read',
    description: 'What is late and what is due in the next days, by person and by line or project — the Actions page\'s own rows.',
    input_schema: obj({
      lineId: str('Only this line', 80),
      projectId: str('Only this project', 80),
      who: str('Only this person\'s', 120),
      days: { type: 'integer', minimum: 1, maximum: 60, description: 'How many days ahead counts as due soon; 7 by default' },
    }),
  },
  {
    name: 'project_state',
    kind: 'read',
    description: 'A project: its method, where it is on its journey, what needs attention and its tools\' findings.',
    input_schema: obj({ projectId: str('The project\'s id (from find)', 80) }, ['projectId']),
  },
  {
    name: 'story_state',
    kind: 'read',
    description: 'The client\'s story so far: the four figures (found, biggest loss, being fixed, proved), what has happened since the last update, and the client\'s brief with each of its asks and the evidence against it (found, being done, proved, still to show — the tool that would show it).',
    input_schema: obj({}),
  },
  {
    name: 'list_calculators',
    kind: 'read',
    description: 'The calculators the app has, each with its key, title and the inputs it needs (name, label, unit). Use before run_calculator.',
    input_schema: obj({ words: str('Only calculators whose title or purpose holds these words', 120) }),
  },
  {
    name: 'run_calculator',
    kind: 'read',
    description: 'Run one of the app\'s calculators on figures the person gave, and return its own sentence, tiles and money. The only way to work out a figure — never calculate one yourself. Missing inputs are named back.',
    input_schema: obj({
      key: str('The calculator\'s key (from list_calculators)', 80),
      inputs: { type: 'object', description: 'Input name → value, as list_calculators names them', additionalProperties: { type: ['number', 'string'] } },
    }, ['key', 'inputs']),
  },
  {
    name: 'tool_records',
    kind: 'read',
    description: 'The tool records (studies, logs, calculations) on a line or in a project, each with what it found in the tool\'s own sentence.',
    input_schema: obj({ lineId: str('The line\'s id', 80), projectId: str('The project\'s id', 80) }),
  },
  // ── Local: change only the conversation or the device, no confirmation ───────
  {
    name: 'recall',
    kind: 'read',
    description: 'Look back through the person\'s earlier conversations — AI Mode\'s (each subject, the notes with how each was known, what the person said) and Line Talk\'s — for these words, the best match first and the newest first among equals, each with its day and conversation. Use it whenever the person refers back ("what did we say about the wrapper", "last week you said", "remind me what we found"), before answering from memory. Only the conversations about this client\'s lines come back.',
    input_schema: obj({
      words: str('What to look for, e.g. "wrapper film splice"', 120),
      limit: { type: 'integer', minimum: 1, maximum: 20, description: 'How many to bring back; 8 by default' },
    }, ['words']),
  },
  {
    name: 'set_focus',
    kind: 'local',
    description: 'Make a subject the current thread of the conversation (an existing thread with the same scope or title, else a new one); the one that was current is parked. Use whenever the subject changes.',
    input_schema: obj({
      title: str('The thread\'s title in a few words, e.g. "Line 3 lost output"', 120),
      scope: obj({
        lineId: str('A line', 80),
        projectId: str('A project', 80),
        problemId: str('A problem', 80),
        storyId: str('A story', 80),
      }),
    }, ['title']),
  },
  {
    name: 'park_focus',
    kind: 'local',
    description: 'Park the current thread of the conversation, to come back to later.',
    input_schema: obj({}),
  },
  {
    name: 'record_observation',
    kind: 'local',
    description: 'Note something on the current thread, saying how it is known. Never "verified" — only a person says that.',
    input_schema: obj({
      text: str('What was seen, said or measured', 1000),
      how: { type: 'string', enum: HOW_KNOWN_SAID, description: 'How it is known' },
      threadId: str('A thread other than the current one', 80),
    }, ['text', 'how']),
  },
  {
    name: 'start_timer',
    kind: 'local',
    description: 'Start a timer on the person\'s device, e.g. to come back to a line after a run.',
    input_schema: obj({
      minutes: { type: 'integer', minimum: 1, maximum: 240, description: 'Minutes from now' },
      label: str('What it is for', 120),
    }, ['minutes', 'label']),
  },
  {
    name: 'open_page',
    kind: 'local',
    description: 'Offer a page of the app to open (an href from a ref, starting "/").',
    input_schema: obj({ href: str('The page, e.g. "/lines/abc"', 300) }, ['href']),
  },
  // ── Writes: shown as a card, run only when the person confirms ───────────────
  {
    name: 'raise_problem',
    kind: 'write',
    description: 'Raise a problem on a line, the way the app\'s Problem form does, saying how it is known.',
    input_schema: obj({
      lineId: str('The line\'s id', 80),
      words: str('What the problem is, in the floor\'s words', 1000),
      machine: str('The machine\'s name, if it is on one', 120),
      priority: { type: 'string', enum: ['low', 'high', 'critical'], description: 'How serious' },
      how: { type: 'string', enum: HOW_KNOWN_SAID, description: 'How it is known' },
      projectId: str('A project it belongs to', 80),
      owner: str('Who has it', 120),
      due: str('By when, YYYY-MM-DD', 10),
    }, ['lineId', 'words', 'priority', 'how']),
  },
  {
    name: 'update_problem',
    kind: 'write',
    description: 'Change a problem\'s owner, due day, priority, where it stands, or its latest word.',
    input_schema: obj({
      problemId: str('The problem\'s id', 80),
      owner: str('Who has it', 120),
      due: str('By when, YYYY-MM-DD', 10),
      priority: { type: 'string', enum: ['low', 'high', 'critical'] },
      status: { type: 'string', enum: ['todo', 'doing', 'done'], description: 'Open, under way or closed' },
      latest: str('The latest word on it', 1000),
    }, ['problemId']),
  },
  {
    name: 'start_project',
    kind: 'write',
    description: 'Start a project on one or more lines with one of the app\'s eight methods.',
    input_schema: obj({
      name: str('The project\'s name', 120),
      method: { type: 'string', enum: ['pdca', 'dmaic', 'eight-d', 'a3', 'stage-gate', 'kaizen-event', 'kata', 'toc'], description: 'The method' },
      lineIds: { type: 'array', items: { type: 'string', maxLength: 80 }, minItems: 1, maxItems: 8, description: 'The lines it is on' },
    }, ['name', 'method', 'lineIds']),
  },
  {
    name: 'save_calculation',
    kind: 'write',
    description: 'Keep a calculator\'s figures as a record, so it shows in the app with its sentence and paper.',
    input_schema: obj({
      key: str('The calculator\'s key', 80),
      inputs: { type: 'object', additionalProperties: { type: ['number', 'string'] } },
      lineId: str('The line it is on', 80),
      projectId: str('The project it is in', 80),
      name: str('A name for it', 120),
    }, ['key', 'inputs']),
  },
  {
    name: 'remember_preference',
    kind: 'write',
    description: 'Keep something about how the person works in their How I work, so every later conversation is told it — the words they use ("I call the checkweigher the CW"), how they like to work, how they like a report, or anything they want always remembered. Use it when they say "remember …" or tell you something they would want kept; quote their own words. They see a card and decide.',
    input_schema: obj({
      text: str('What to remember, in the person\'s own words', 300),
      about: { type: 'string', enum: ['words', 'methods', 'reports', 'always'], description: 'words = the words they use; methods = how they like to work; reports = how they like a report; always = anything else (the default)' },
    }, ['text']),
  },
  {
    name: 'add_photo_to_problem',
    kind: 'write',
    description: 'Attach a photo from the conversation to a problem.',
    input_schema: obj({
      problemId: str('The problem\'s id', 80),
      photoKey: str('The photo\'s key on the device', 120),
    }, ['problemId', 'photoKey']),
  },
  // ── The factory knowledge (docs/FACTORY-KNOWLEDGE.md F2): reads, run at once ──
  {
    name: 'factory_map',
    kind: 'read',
    description: 'The client\'s factory as Faultline holds it: sites, areas, lines and each line\'s machines, each machine with its kind, model and serial and how each is known (confirmed, reported, from a document, inferred, recorded, unknown). Only the client of the line or project in hand; with none, every client whose lines the person can see, each its own group.',
    input_schema: obj({
      lineId: str('The line the conversation is on', 80),
      projectId: str('The project the conversation is on', 80),
      client: str('A client by name, when no line or project is in hand', 120),
    }),
  },
  {
    name: 'resolve',
    kind: 'read',
    description: 'Turn what the person called something ("the scales", "the mixer", "Line 2", "line two", "packaging") into the lines, machines, areas or sites it could mean, from the client\'s factory map: match one (use it), several (ask which, naming them) or none (it is not known in Faultline — offer to add it, never assume it exists). Use before acting on any machine, line, area or process the person names.',
    input_schema: obj({
      words: str('Exactly what the person called it', 200),
      lineId: str('The line the conversation is on — narrows first', 80),
      projectId: str('The project the conversation is on — narrows first', 80),
      client: str('A client by name, when no line or project is in hand', 120),
    }, ['words']),
  },
];
