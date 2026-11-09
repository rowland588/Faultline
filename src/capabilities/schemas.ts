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

const COLUMN = obj({
  name: str('A name: lower-case words joined by underscores', 40),
  label: str('Its words', 120),
  type: { type: 'string', enum: ['text', 'number', 'choice'] },
  unit: str('Its unit', 20),
  options: { type: 'array', maxItems: 30, items: { type: 'string', maxLength: 80 } },
  required: { type: 'boolean' },
}, ['label', 'type']);
const FIELD = obj({
  name: str('A name: lower-case words joined by underscores; made from the label when left out', 40),
  label: str('Its words, as the person says them', 120),
  type: { type: 'string', enum: ['text', 'number', 'choice', 'list'] },
  unit: str('Its unit, e.g. "min"', 20),
  options: { type: 'array', maxItems: 30, items: { type: 'string', maxLength: 80 }, description: 'A choice\'s options' },
  columns: { type: 'array', maxItems: 12, items: COLUMN, description: 'A list\'s columns' },
  required: { type: 'boolean', description: 'Needed before it is made' },
}, ['label', 'type']);

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
  {
    name: 'tool_catalogue',
    kind: 'read',
    description: 'The tools that can be filled by talking — SMED, the calculators, the documents, the check logs and the registers — each with its kind, key, title and what it is for. Give key (and kind) for that one tool with its fields (name, label, type, unit, required). Use it to pick the tool that fits what the person describes and to know what to ask for.',
    input_schema: obj({
      words: str('Words for what the person describes, e.g. "changeover"', 120),
      key: str('One tool\'s key, for its fields', 80),
      kind: { type: 'string', enum: ['calc', 'doc', 'check', 'scored', 'smed'], description: 'The kind of tool' },
    }),
  },
  {
    name: 'draft_state',
    kind: 'read',
    description: 'What a draft being built in this conversation holds: each field captured with its value and how it is known (and what a correction replaced), what is still missing, and a custom sheet\'s metrics as Faultline works them. With no draftId, every draft in the conversation. Use it when the person asks what has been captured or what is missing.',
    input_schema: obj({ draftId: str('The draft\'s id; every draft when left out', 80) }),
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
  {
    name: 'start_draft',
    kind: 'local',
    description: 'Start filling an existing tool from the conversation (from tool_catalogue): a draft kept on the conversation, never a record until make_record is confirmed. Its line and project default to the current thread\'s. Returns its draftId, its fields and what is missing.',
    input_schema: obj({
      kind: { type: 'string', enum: ['calc', 'doc', 'check', 'scored', 'smed'], description: 'The kind of tool' },
      key: str('The tool\'s key', 80),
      title: str('A name for this one, e.g. "Line 2A changeovers"', 120),
      lineId: str('The line it is on', 80),
      projectId: str('The project it is in', 80),
    }, ['kind', 'key']),
  },
  {
    name: 'fill_draft',
    kind: 'local',
    description: 'Put what the person said into a draft\'s fields — every value exactly as they said it, with how it is known; never a value they did not give, never a figure you worked out. A value given again for a field is a correction: it replaces the old one, which is kept beside it. Returns what was kept, corrected, refused and what is still missing.',
    input_schema: obj({
      draftId: str('The draft\'s id', 80),
      values: {
        type: 'array', minItems: 1, maxItems: 30,
        items: obj({
          field: str('The field\'s name', 80),
          value: { description: 'The value as said: a number in the field\'s unit, words, a choice\'s value — or, for a list field, one row (an object of its columns, or words for its first column) to ADD, or an array of rows to REPLACE the list', anyOf: [{ type: 'string', maxLength: 2000 }, { type: 'number' }, { type: 'object', additionalProperties: { type: ['string', 'number'] } }, { type: 'array', maxItems: 200, items: { anyOf: [{ type: 'string', maxLength: 400 }, { type: 'number' }, { type: 'object', additionalProperties: { type: ['string', 'number'] } }] } }] },
          how: { type: 'string', enum: HOW_KNOWN_SAID, description: 'How it is known' },
          said: str('The person\'s own words for it', 300),
        }, ['field', 'value', 'how']),
      },
    }, ['draftId', 'values']),
  },
  {
    name: 'adapt_draft',
    kind: 'local',
    description: 'Add fields or sections to THIS record only (the tool itself is unchanged), or leave out one of the tool\'s own optional fields. A field the tool needs is never taken off.',
    input_schema: obj({
      draftId: str('The draft\'s id', 80),
      add: {
        type: 'array', maxItems: 20,
        items: obj({ section: str('The section it goes under', 80), field: FIELD }, ['field']),
      },
      remove: { type: 'array', maxItems: 20, items: { type: 'string', maxLength: 80 }, description: 'Names of fields to take off' },
    }, ['draftId']),
  },
  {
    name: 'create_sheet',
    kind: 'local',
    description: 'When no tool fits, build a custom sheet the person described: sections of fields, and metrics Faultline works out itself — a sum, average, ratio (first ÷ second; unit "%" for a percentage), difference (first − second) or count over named fields (a list field\'s number column as "list.column"). No formulas. A draft until make_record is confirmed.',
    input_schema: obj({
      title: str('The sheet\'s title', 120),
      purpose: str('What it is for, in a sentence', 400),
      sections: {
        type: 'array', minItems: 1, maxItems: 12,
        items: obj({ title: str('The section\'s title', 120), fields: { type: 'array', minItems: 1, maxItems: 30, items: FIELD } }, ['title', 'fields']),
      },
      metrics: {
        type: 'array', maxItems: 12,
        items: obj({
          name: str('The metric\'s name', 80),
          kind: { type: 'string', enum: ['sum', 'average', 'ratio', 'difference', 'count'] },
          of: { type: 'array', minItems: 1, maxItems: 20, items: { type: 'string', maxLength: 80 }, description: 'The field names it reads, in order' },
          unit: str('Its unit, e.g. "%" or "min"', 20),
        }, ['name', 'kind', 'of']),
      },
      lineId: str('The line it is on', 80),
      projectId: str('The project it is in', 80),
    }, ['title', 'purpose', 'sections']),
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
  // ── Onboarding a factory and keeping it current (docs/FACTORY-KNOWLEDGE.md F3–F5) ──
  {
    name: 'add_to_factory_draft',
    kind: 'local',
    description: 'Note a client\'s factory as the person says it — its sites, areas, production lines and machines (each machine with its kind, model, serial and maker only when said) — into the conversation\'s factory draft, shown as Being built. The first call for a client starts the draft (give client). Ops: add (with its site, area and line names — a machine always on a line), set (a machine\'s kind, model, serial, maker), rename (to), move (to a new site, area or line), remove (from the draft only), keep or leave_out (a proposal read from a document), pick (where a value differs from what Faultline holds: field, take recorded or new). Only what was said, in their words, with said quoting them — never a site, line or machine they did not name. Run resolve first: a line or machine already in Faultline is matched, never doubled. Nothing is a record until make_record.',
    input_schema: obj({
      draftId: str('The factory draft\'s id — left out, the conversation\'s draft for the client', 80),
      client: str('The client — the business, e.g. "Customer X Foods"; needed to start a draft', 120),
      title: str('A name for the draft', 120),
      items: {
        type: 'array', minItems: 1, maxItems: 60,
        items: obj({
          op: { type: 'string', enum: ['add', 'set', 'rename', 'move', 'remove', 'keep', 'leave_out', 'pick'] },
          level: { type: 'string', enum: ['site', 'area', 'line', 'machine'] },
          name: str('Its name, exactly as said', 160),
          id: str('Its id in the draft (from draft_state), when the name is not enough', 80),
          of: str('Which one, when the name is not enough: a machine\'s line, a line\'s area, an area\'s site', 160),
          site: str('add/move: the site it is in', 160),
          area: str('add/move: the area it is in', 160),
          line: str('add/move: the line a machine is on', 160),
          to: str('rename: the new name', 160),
          kind: str('A machine: what it is, in their words (scale, bagger, metal detector…)', 120),
          model: str('A machine\'s model, as said', 120),
          serial: str('A machine\'s serial, as said', 120),
          maker: str('Who made the machine, as said', 120),
          field: { type: 'string', enum: ['kind', 'model', 'serial', 'maker', 'site', 'area'], description: 'pick: the value picked' },
          take: { type: 'string', enum: ['recorded', 'new'], description: 'pick: keep what Faultline holds, or take the new' },
          said: str('The person\'s words, as said', 300),
        }, ['op', 'level', 'name']),
      },
    }, ['items']),
  },
  {
    name: 'replace_machine',
    kind: 'write',
    description: 'Record that a machine on a line has been replaced by a new one — the person sees a card and confirms. The new machine gets its own record in the old one\'s place on the line, with what it is (only as said); the old record is kept with its history and says Replaced by the new. Resolve the old machine first; give the new one its own name (e.g. with its model). How it is known: reported by the person, today.',
    input_schema: obj({
      lineId: str('The line it is on (from resolve)', 80),
      machine: str('The machine replaced, by its name in Faultline', 160),
      name: str('The new machine\'s own name, e.g. "Bagger 2 — Ishida BX500"', 160),
      kind: str('What the new machine is, as said', 120),
      model: str('Its model, as said', 120),
      serial: str('Its serial, as said', 120),
      maker: str('Who made it, as said', 120),
      said: str('The person\'s words, as said', 300),
    }, ['lineId', 'machine', 'name']),
  },
  {
    name: 'make_record',
    kind: 'write',
    description: 'Make a draft into a real record through the app\'s own functions, once its essentials are captured — the person sees a card and confirms. On a draft already made, it updates that record with only what changed in the conversation since. On a factory draft it makes its lines (with their client, site and area) and puts its machines on them, matching what Faultline already holds — held while a document\'s proposal waits for the person\'s word or a difference is not picked. Never say it is saved until the result says so.',
    input_schema: obj({ draftId: str('The draft\'s id', 80) }, ['draftId']),
  },
];
