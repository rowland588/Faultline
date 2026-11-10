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

const HOW_KNOWN_SAID = ['observed', 'reported', 'measured', 'imported', 'calculated', 'estimated', 'hypothesised', 'unknown'];

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
  // ── The factory walk (10 November, docs/FACTORY-WALK.md): where the person is, and the photos taken on the way ──
  {
    name: 'set_position',
    kind: 'local',
    description: 'Say where the person IS on the factory floor — when they say "I\'m at line 3 now", "walking into Dispatch", "at the bagger". A line by its id (from resolve or find), a machine on it by name, or a department or area in their words (or its id). Where they are is NOT what they are talking about: it never changes the subject — the current thread stays, and the open threads whose place is here come back for you to offer (switch only if the person wants). Photos taken after it are stamped with this place. Never set it from a guess or from what a photo seems to show.',
    input_schema: obj({
      lineId: str('The line\'s id', 80),
      machine: str('A machine on that line, by name', 120),
      departmentId: str('A department\'s id', 80),
      area: str('The department or area in the person\'s words, when no id', 120),
      site: str('Its site', 120),
      said: str('What the person said, word for word', 300),
    }),
  },
  {
    name: 'walk_state',
    kind: 'read',
    description: 'The walk so far: where the person is now, the stops in order with the photos taken at each, the photos taken before any place was said, and which photos are filed to what. Use it before suggesting where a photo belongs.',
    input_schema: obj({}),
  },
  {
    name: 'file_photo',
    kind: 'write',
    description: 'File one photo from this conversation to a line, a machine on a line, a department, a problem or a project — the same photograph linked, never copied; it stays on the walk too and shows on that record\'s page. Only when the person has said what it belongs to, or confirms your suggestion; where it was taken is not what it shows, so never file from the stamp alone and never guess an uncertain relationship — ask, or leave it on the walk. Say what the photo shows only in the person\'s words. The person sees a card and decides.',
    input_schema: obj({
      photoKey: str('The photo\'s key (from the photos listed)', 120),
      to: { type: 'string', enum: ['line', 'machine', 'department', 'problem', 'project'] },
      lineId: str('The line (for line or machine)', 80),
      machine: str('The machine on that line, by its name in Faultline', 120),
      departmentId: str('The department', 80),
      problemId: str('The problem', 80),
      projectId: str('The project', 80),
      why: str('Why it belongs there, in the person\'s words', 300),
    }, ['photoKey', 'to']),
  },
  {
    name: 'add_department',
    kind: 'write',
    description: 'Record a department of the factory (Dispatch, Goods in, Despatch, Stores…) as a record of its own, even with no lines, machines or equipment in it yet — nothing is made under it. Use it when the person names a department Faultline does not hold and wants it kept. Found, never doubled, when it is already there. The person sees a card and decides.',
    input_schema: obj({
      area: str('Its name, as the floor says it', 120),
      site: str('Its site', 120),
      client: str('Its client', 120),
    }, ['area']),
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
  // ── Understanding the app, the person's aim and where the work belongs (9 November, docs/AI-CONTEXT.md) ──────
  {
    name: 'describe_faultline',
    kind: 'read',
    description: 'What Faultline is now, read from the app itself: its kinds of record and how they relate (a problem is on a line and maybe a machine and a project; a tool record may be on a line, in a project, on a machine, or standalone; an area is words on its lines …), the capabilities THIS person can use here (with why when one is not open to them), the tools with what each needs and gives, and the eight methods. Use it when unsure whether Faultline can do something or where a record belongs — never claim a capability that is not listed as available.',
    input_schema: obj({ about: { type: 'string', enum: ['records', 'capabilities', 'tools', 'methods', 'all'], description: 'Which part; all by default' }, name: str('Only the ones whose name has these words', 80) }),
  },
  {
    name: 'plan_work',
    kind: 'read',
    description: 'When the person says what they want to do ("I want to carry out an observation analysis", "analyse the changeover on the packer", "a downtime analysis"): the kind of work it is, the tools that do it, what the conversation already knows (line, machine, project, standalone or talk), what already exists (records of those tools on the line, the line\'s projects, drafts in hand, open problems that sound the same), and the ONE question to ask next — or none. Ask only that question, in your own words; never a list.',
    input_schema: obj({ words: str('What they want to do, in their words', 300), lineId: str('The line, when known', 80), projectId: str('The project, when known', 80), machine: str('The machine, when known', 120) }, ['words']),
  },
  {
    name: 'resolve_record',
    kind: 'read',
    description: 'Work out which record the person means — an area ("the packing hall"), a line, a machine, a project ("the Line 4 improvement project", "the existing project"), a problem, or a tool record / investigation ("the changeover study", "the investigation we did yesterday") — from this conversation\'s own subjects first ("that line", "the previous investigation"), then by name, only within the client in hand. Returns one (use it), several (ask which, naming them) or none (say it is not known — never guess, never make a second one).',
    input_schema: obj({ words: str('Their words, exactly', 200), kind: { type: 'string', enum: ['area', 'line', 'machine', 'project', 'problem', 'study'], description: 'The kind of record, when they said it' }, lineId: str('The line in hand', 80), projectId: str('The project in hand', 80) }, ['words']),
  },
  {
    name: 'update_context',
    kind: 'local',
    description: 'Keep the current subject\'s context as the conversation settles it: what the person is trying to do (objective); whether it is just talk (learning, a what-if, a test — nothing to keep), standalone work (kept on its line, in no project — they said so, so do not ask again) or in a project; the line, project or machine — a CORRECTION ("no, Line 3", "not that project") moves the drafts not yet made with it; the record the work is in; a decision, an assumption, or a question still open and later its answer. Only what was said or settled — never a guess.',
    input_schema: obj({
      objective: str('What they are trying to do, in their words', 300),
      mode: { type: 'string', enum: ['talk', 'standalone', 'project'], description: 'talk = nothing to keep; standalone = in no project; project = in the project given' },
      lineId: str('The line (from resolve or resolve_record)', 80), projectId: str('The project (from resolve_record)', 80), machine: str('The machine, by its name on the line', 120),
      studyId: str('The tool record the work is in', 80), problemId: str('The problem it is about', 80),
      decision: str('A decision made', 300), assumption: str('An assumption being made', 300), question: str('A question still open', 300),
      answered: obj({ question: str('The question', 300), answer: str('Its answer', 300) }, ['question', 'answer']),
    }),
  },
  {
    name: 'link_to_project',
    kind: 'write',
    description: 'Put an existing tool record or problem into a project — the person sees a card and confirms. Only a project on the same line; a record is in one project at a time (moving it out of another is said on the card). Use when they ask to connect work to a project, after resolve_record has found both.',
    input_schema: obj({ projectId: str('The project', 80), studyId: str('The tool record', 80), problemId: str('The problem', 80) }, ['projectId']),
  },

  // ── Operating the application through the tool connectors (10 November, docs/AI-OPERATING.md) ──────────────────
  {
    name: 'tool_guide',
    kind: 'read',
    description: 'Every tool Faultline has and what you can do with each through its connector: describe (what it is for, needs, gives), fill (a draft, a diagram said aloud, or readings), capture (a live measurement — the events it takes), read (its records’ own findings and data), report (its own paper). Also the six kinds of work, said apart: report · fill · measure · calculate · analyse · investigate. Filter by key, by the kind of work, or by the person’s words. Use it to pick HOW to do what the person wants before you act.',
    input_schema: obj({
      key: str('One tool’s key', 60),
      words: str('The person’s words for the work', 200),
      intent: { type: 'string', enum: ['report', 'fill', 'measure', 'calculate', 'analyse', 'investigate'], description: 'Only the tools for this kind of work' },
    }),
  },
  {
    name: 'read_record',
    kind: 'read',
    description: 'One record (a study, a log, a calculation, a document, a map) read as its own tool reads it: its sentence (the tool’s own finding, every figure the tool’s), where it sits, its readings (up to 150, as recorded) and notes, and how its paper is made. Use before saying anything about what a record found, or to analyse its data.',
    input_schema: obj({ studyId: str('The record’s id (from tool_records or resolve_record)', 80) }, ['studyId']),
  },
  {
    name: 'run_analysis',
    kind: 'read',
    description: 'The Analysis tool’s own statistics, run in code on figures the person gave or on a record’s readings (studyId), answered in its own sentence with its checks and what it does not claim. question: sure (how sure is the mean — values), change (did it change — before and after), paired (do two ways agree — first and second in the same order, within = the difference that does not matter), groups (do groups differ — two to eight named groups), relate (does y move with x — pairs). Never work a statistic out yourself; quote this.',
    input_schema: obj({
      question: { type: 'string', enum: ['sure', 'change', 'paired', 'groups', 'relate'] },
      name: str('What is measured, e.g. "Fill weight"', 120),
      unit: str('Its unit, e.g. "g"', 20),
      confidence: { type: 'number', enum: [0.9, 0.95, 0.99] },
      better: { type: 'string', enum: ['lower', 'higher', 'either'] },
      values: { type: 'array', maxItems: 2000, items: { type: 'number' }, description: 'sure: the readings as given' },
      before: { type: 'array', maxItems: 2000, items: { type: 'number' } },
      after: { type: 'array', maxItems: 2000, items: { type: 'number' } },
      first: { type: 'array', maxItems: 2000, items: { type: 'number' } },
      second: { type: 'array', maxItems: 2000, items: { type: 'number' } },
      within: { type: 'number', minimum: 0 },
      groups: { type: 'array', minItems: 2, maxItems: 8, items: obj({ name: str('The group', 60), values: { type: 'array', maxItems: 2000, items: { type: 'number' } } }, ['name', 'values']) },
      pairs: { type: 'array', maxItems: 2000, items: obj({ x: { type: 'number' }, y: { type: 'number' } }, ['x', 'y']) },
      driver: str('What x is, e.g. "Line speed"', 60),
      studyId: str('A record whose readings are analysed', 80),
    }, ['question', 'name']),
  },
  {
    name: 'show_work',
    kind: 'local',
    description: 'Open the real page of a record, a line, a project or any page of the app in the work pane beside the conversation, so the person sees the actual study, not a summary. Use it whenever you start, fill or read something they should watch.',
    input_schema: obj({ studyId: str('A record', 80), lineId: str('A line', 80), projectId: str('A project', 80), href: str('A page of the app, starting "/"', 300) }),
  },
  {
    name: 'make_report',
    kind: 'local',
    description: 'Make a report with the app’s own report code from the real records — opened beside the conversation, made on arrival and kept under its Report ▾ › Saved copies. what: record (one tool’s own paper — studyId), project (the project report: every tool used in it, each in its own words, attention, who owes what), client (the project’s client report), six-m (a 6M project’s report), line (the line report: the newest record of every tool on the line), line-package (the line’s full package: every tool’s paper behind a cover and contents), area (an area’s report — area, site), story (the Story’s newest chapter). Never write a report’s figures yourself.',
    input_schema: obj({
      what: { type: 'string', enum: ['record', 'project', 'client', 'six-m', 'line', 'line-package', 'area', 'story'] },
      studyId: str('The record', 80), projectId: str('The project', 80), lineId: str('The line', 80), site: str('The site', 120), area: str('The area', 120),
    }, ['what']),
  },
  {
    name: 'write_document',
    kind: 'write',
    description: 'Keep a document written from the conversation (a line-walk report, a summary for a manager or client, an engineering report, a punch list) — Line Talk’s own document, kept as a Line Talk record with its page (to edit) and its PDF. The person sees a card and confirms. Built as every Faultline report: status first (ok · watch · problem with one line), then "What is not as it should be", "What we are doing about it" (who, by when — only as said), "Where we are"; each point with its basis (observed · record · interpretation) and state. Every figure only as said or as a capability gave it — never calculated. Photos only by their labels (P1, P2) from this conversation.',
    input_schema: obj({
      document: {
        ...obj({
          title: str('The title — what it is about, the line, the day', 200),
          kind: { type: 'string', enum: ['line-walk', 'summary', 'engineering', 'punch-list', 'other'] },
          status: obj({ state: { type: 'string', enum: ['ok', 'watch', 'problem'] }, line: str('At most twelve words', 200) }, ['state', 'line']),
          sections: { type: 'array', minItems: 1, maxItems: 40, items: { type: 'object', description: '{ heading, icon (one emoji), text, points: [{ text, basis: observed | record | interpretation, state: "" | ok | watch | problem | action, owner, due }], photos: [{ photo: "P1", caption }] }' } },
        }, ['title', 'kind', 'sections']),
        description: 'The document: its title, kind, status and sections',
      },
      lineId: str('The line it is about', 80),
      projectId: str('The project it belongs to', 80),
    }, ['document']),
  },
  {
    name: 'draw_diagram',
    kind: 'write',
    description: 'Make (or update, with studyId) a diagram the person has said aloud as its tool’s own record — the person sees a card and confirms; then the tool works out every figure and its page is shown. set flow: a process flow chart — capture { title, steps: [{ what, kind: operation | transport | inspection | delay | storage, time, timeUnit: seconds | minutes | hours | "", dist, distUnit: metres | feet | yards | kilometres | "" }] } (only a transport has a distance). set spag: a spaghetti diagram — capture { title, walkers: [{ label (a role, never a name), steps: [{ place, dist, distUnit }] }] } (the first place has no distance). set vs: a value stream — capture { title, supplier, customer, demandPerDay, steps: [{ name, kind: operation | move | check | wait | store, who: [roles], where, cycle, cycleUnit, wait, waitUnit, value: adds | needed | waste | "" (only if the person classed it), batch }] }. Every time and distance only as said, with its unit as said (null when not said) — Faultline converts; never add, convert or estimate.',
    input_schema: obj({
      set: { type: 'string', enum: ['flow', 'spag', 'vs'] },
      capture: { type: 'object', description: 'The diagram as said — its shape is given above for each set' },
      lineId: str('The line', 80), projectId: str('The project', 80), studyId: str('A diagram already made, to update', 80),
    }, ['set', 'capture']),
  },
  {
    name: 'add_readings',
    kind: 'write',
    description: 'Add readings the person has said or measured to a capability study, a control chart or an analysis — each exactly as said (values as numbers; for a pass-or-fail study, ok as true for good, false for failed; or readings, each with its own boxes — made and rejected for a run, arm for a before / after or a group, with for a pair, xs for drivers, group for an X̄ subgroup); arm for a before / after analysis. The person sees a card and confirms; the tool then works out what they mean, and its page is shown.',
    input_schema: obj({
      studyId: str('The record', 80),
      values: { type: 'array', maxItems: 500, items: { type: 'number' } },
      ok: { type: 'array', maxItems: 500, items: { type: 'boolean' } },
      arm: str('before / after, for an analysis', 40),
      note: str('A note on the first reading', 300),
      readings: { type: 'array', maxItems: 500, description: 'Each reading as its boxes: value; ok (pass or fail); made and rejected (a run); inspected and faults; arm (before/after, or a group’s name); with (a paired second way); xs (drivers); group (an X̄ subgroup); product; head (a weigher’s); note', items: obj({
        value: { type: 'number' }, ok: { type: 'boolean' }, made: { type: 'number' }, rejected: { type: 'number' }, inspected: { type: 'number' }, faults: { type: 'number' },
        arm: str('before / after, or a group', 60), with: { type: 'number' }, xs: { type: 'array', maxItems: 5, items: { type: 'number' } }, group: { type: 'number' }, product: str('The product', 120), head: { type: 'number' }, note: str('A note', 300),
      }) },
    }, ['studyId']),
  },
  {
    name: 'start_measurement',
    kind: 'write',
    description: 'Start a LIVE measurement with a tool’s own capture — the person confirms ONCE; from then on capture_event records each event as it is said, with no card, until end_measurement. tool stops: Stops timed on a line (lineId) — stopped (machine, reason), running, count. tool reliability: a machine watched (studyId to carry on, or machine and the things counted, e.g. ["stop", "failure"]) — event (count, reason), running, pause, resume. tool sampling: work sampling (studyId, or who and activities) — moment (people: [{ who, activity }]). tool changeover: SMED timed (studyId, or from / to products) — begin (the last good piece), element (the element just finished, by name; who; side), finish (the first good piece). tool workstops: stops across workstations (studyId, or workstations by name) — stopped (workstation), running (workstation). tool balance: an operation timed on the Line balance’s stopwatch (studyId, or lineId and product) — start (who, name), lap, next (name, who if it changes), interrupted, stop. tool valuestream: the value stream walked with the map’s stopwatch (studyId, or lineId) — begin; step (name; who, where, kind operation · move · check, value adds · needed · waste ONLY when said — never judge it); finish (name of the last step). The tool’s page is shown beside the conversation and fills as events are captured.',
    input_schema: obj({
      tool: { type: 'string', enum: ['stops', 'reliability', 'sampling', 'changeover', 'workstops', 'balance', 'valuestream'] },
      lineId: str('The line', 80), studyId: str('A record of that tool to carry on', 80), machine: str('The machine', 120), name: str('A name for it', 120),
      counts: { type: 'array', maxItems: 6, items: { type: 'string', maxLength: 60 } },
      who: { type: 'array', maxItems: 12, items: { type: 'string', maxLength: 60 } },
      activities: { type: 'array', maxItems: 10, items: { type: 'string', maxLength: 60 } },
      from: str('Changed from (product)', 120), to: str('Changed to (product)', 120),
      workstations: { type: 'array', maxItems: 30, items: { type: 'string', maxLength: 80 } },
      product: str('The product whose work is timed (balance)', 120),
    }, ['tool']),
  },
  {
    name: 'capture_event',
    kind: 'local',
    description: 'Record one event of the running measurement, as the tool’s own capture screen records a tap — stamped at the moment the person said it. Only the events start_measurement listed for its tool, with what each needs, only what was said (a reason, a machine, a name in their words). If something needed was not said, ask — never guess.',
    input_schema: obj({
      event: str('The event, e.g. "stopped", "running", "element", "moment"', 40),
      machine: str('The machine', 120), reason: str('Why, in their words', 160), count: str('What was counted, e.g. "stop"', 60),
      who: str('Who', 60), activity: str('What they were doing', 60),
      people: { type: 'array', maxItems: 12, items: obj({ who: str('Who', 60), activity: str('What they were doing', 60) }, ['who', 'activity']) },
      name: str('The element just finished, in their words', 160), side: { type: 'string', enum: ['internal', 'external'] },
      workstation: str('The workstation, by name or number', 80), note: str('A note', 300),
      where: str('Where the step is done (valuestream)', 120), kind: { type: 'string', enum: ['operation', 'move', 'check'] }, value: { type: 'string', enum: ['adds', 'needed', 'waste'], description: 'VA (adds) · NE (needed) · NV (waste), only when said' },
    }, ['event']),
  },
  {
    name: 'undo_capture',
    kind: 'local',
    description: 'Take back the last captured event of the running measurement (or one by eventId) the way the tool’s own Undo does — struck, or its time taken off — when the person says "undo that", "scrap that", "that didn’t happen".',
    input_schema: obj({ eventId: str('An event from measurement_state; the last when left out', 80) }),
  },
  {
    name: 'correct_capture',
    kind: 'local',
    description: 'Put a captured event right — "that was the filler, not the wrapper", "it was a film break" — taken back and written again as said, at the moment it first happened. as: the event with the right values (only what changes is needed).',
    input_schema: obj({
      eventId: str('The event; the last when left out', 80),
      as: obj({
        event: str('The event', 40), machine: str('The machine', 120), reason: str('Why', 160), count: str('What was counted', 60), who: str('Who', 60), activity: str('What they were doing', 60),
        name: str('The element', 160), side: { type: 'string', enum: ['internal', 'external'] }, workstation: str('The workstation', 80), note: str('A note', 300),
        where: str('Where', 120), kind: { type: 'string', enum: ['operation', 'move', 'check'] }, value: { type: 'string', enum: ['adds', 'needed', 'waste'] },
      }, ['event']),
    }, ['as']),
  },
  {
    name: 'end_measurement',
    kind: 'local',
    description: 'End the running measurement — its clock stopped — and say what it captured and what the tool now says. Use when the person says they are done, "stop measuring", "that’s the end of the changeover".',
    input_schema: obj({}),
  },
  {
    name: 'measurement_state',
    kind: 'read',
    description: 'The measurement of this conversation — running or ended, every event captured with its time (struck ones said so), and the events its tool takes. Use for "what have you got so far", "read me back the stops", and before undoing one that is not the last.',
    input_schema: obj({}),
  },
  {
    name: 'plan_investigation',
    kind: 'read',
    description: 'When the person wants to investigate a problem with several tools: a method (theirs, the project’s, or one that fits) with its sections in order, the tools of each section, how each is used (fill · measure · analyse · calculate · report) and what already exists on the line or in the project — ending in the project report that brings every finding together. Offer it in a sentence or two; never start a project or a tool without their yes.',
    input_schema: obj({
      words: str('What is being investigated, in their words', 300),
      method: { type: 'string', enum: ['pdca', 'dmaic', 'eight-d', 'a3', 'stage-gate', 'kaizen-event', 'kata', 'toc'] },
      lineId: str('The line', 80), projectId: str('The project', 80),
    }, ['words']),
  },

  // ── Filling every tool from the conversation (10 November, docs/AI-OPERATING.md §2) ───────────────────────────────
  {
    name: 'start_study',
    kind: 'write',
    description: 'Start a new record of a tool, as its own New makes it, and show its page: capability (setup: kind limits | packers | ticks | rejects | faults | rate; unit, nominal, lower, upper, count, allowFail, maxShare — only limits that were agreed), chart (setup: measures, kind xmr | xbar | precontrol, unit, target, lower, upper, subgroup), analysis (setup: question sure | change | paired | groups | relate, measures, unit, groups (names), driver), losses (the shift just run on the line), holds (a register of product on hold; setup: authority, carryPct), register (key: criticality | impact-effort | pugh | fmea | control-plan | fault-tree | skills | readiness | hygienic-design | rsm — its rows start empty), board (maintenance measures), balance (a product’s Line balance — product), capacity (a product’s Line capacity — product; setup.targetPerMin), standard (a product’s line standard — its board of who stands where). The person confirms once; after that, filling it needs no card.',
    input_schema: obj({
      tool: { type: 'string', enum: ['capability', 'chart', 'analysis', 'losses', 'holds', 'register', 'board', 'balance', 'capacity', 'standard'] },
      lineId: str('The line', 80), projectId: str('The project', 80), name: str('Its name', 120), machine: str('The machine', 120), product: str('The product', 120), key: str('A register’s key', 60),
      setup: { type: 'object', description: 'Its setup, as given above for the tool' },
    }, ['tool']),
  },
  {
    name: 'count_shift',
    kind: 'write',
    description: 'Put what was counted on a loss count (studyId): made (good packs out), rejects, plannedMin with plannedWhy (only when the planned minutes differ, with why), ratePerMin (typed). The loss count works out the losses from the line’s stops.',
    input_schema: obj({ studyId: str('The loss count', 80), made: { type: 'number', minimum: 0 }, rejects: { type: 'number', minimum: 0 }, plannedMin: { type: 'number', minimum: 0 }, plannedWhy: str('Why the planned minutes differ', 300), ratePerMin: { type: 'number', minimum: 0 } }, ['studyId']),
  },
  {
    name: 'fill_register',
    kind: 'write',
    description: 'Put rows into a scored register (studyId), or change a row named again: criticality (production, safety, quality, repair, likelihood 1–5; ccp, standby), impact and effort (impact, effort 1–5; worthGbp, hours, spendGbp), Pugh (criteria with weight; datum; each option’s scores by criterion NAME −1 · 0 · +1; cost), skills matrix (criteria = tasks with need; each person’s scores by task NAME 0–4; shift; settings.target), readiness / hygienic design (group, source, evidence, owner, due YYYY-MM-DD, status, note, severity, stopper), FMEA (fmea: step, effect, cause, prevention, detection, s, o, d 1–10, action, owner, due, done, reason, evidence, after, ap, cost, haccp), control plan (plan: step, spec, method, sample, n, everyMin, minutes, owner, record, reaction, kind product | process, event, haccp), fault tree (tree: under (the gate’s name), gate AND | OR, p 0–1, sameAs), response surface (run: response, by the run’s name). settings: rate, target, dayCost, speed, packCost, shiftMin, costToDate, margin, carryPct, eventCost; the maintenance board’s reactiveHours. Every value as said.',
    input_schema: obj({
      studyId: str('The register', 80),
      rows: { type: 'array', maxItems: 60, items: { type: 'object', description: 'name and its boxes, as above' } },
      criteria: { type: 'array', maxItems: 30, items: obj({ name: str('The criterion or task', 120), weight: { type: 'number', minimum: 1, maximum: 5 }, need: { type: 'number', minimum: 0 } }, ['name']) },
      datum: str('What the options are set against', 120), period: str('A fault tree’s period, e.g. "a year"', 60),
      settings: { type: 'object', description: 'Named figures, as above', additionalProperties: { type: 'number' } },
    }, ['studyId']),
  },
  {
    name: 'raise_hold',
    kind: 'write',
    description: 'Put product on hold on a line’s register of product on hold (studyId): product, qty and unit (packs, cases, trays, pallets, kg), reason; lot, where, owner (who decides), decideBy (YYYY-MM-DD), costEach (£ a unit to this point), lifeDays. Numbered as the register numbers it.',
    input_schema: obj({ studyId: str('The register', 80), product: str('The product', 160), qty: { type: 'number', exclusiveMinimum: 0 }, unit: { type: 'string', enum: ['packs', 'cases', 'trays', 'pallets', 'kg'] }, reason: str('Why it is held', 400),
      lot: str('The lot', 80), where: str('Where it is', 120), owner: str('Who decides', 80), decideBy: str('By when, YYYY-MM-DD', 10), costEach: { type: 'number', minimum: 0 }, lifeDays: { type: 'number', minimum: 0 } }, ['studyId', 'product', 'qty', 'unit', 'reason']),
  },
  {
    name: 'decide_hold',
    kind: 'write',
    description: 'Decide a hold’s fate (hold: H-001 or its product): release (with grounds — what shows it is safe), concession, rework, regrade, destroy — all of what is still held, or qty of it; extra (£ in all for the price lost, the rework or the disposal).',
    input_schema: obj({ studyId: str('The register', 80), hold: str('The hold', 120), disposition: { type: 'string', enum: ['release', 'concession', 'rework', 'regrade', 'destroy'] }, qty: { type: 'number', exclusiveMinimum: 0 }, grounds: str('The grounds', 400), extra: { type: 'number', minimum: 0 } }, ['studyId', 'hold', 'disposition']),
  },
  {
    name: 'record_check',
    kind: 'write',
    description: 'Record a check of a check log done (studyId, the check by its name): pass, a value (its reading) or a count — judged by the check’s own limit, a reading outside it recorded as a failure — or fail; a failure raises its problem on the register as the round does (made: the packs since the last good check, when said). A scored audit is done on its page.',
    input_schema: obj({ studyId: str('The log', 80), check: str('The check, by its name', 160), outcome: { type: 'string', enum: ['pass', 'fail', 'value', 'count'] }, value: { type: 'number' }, count: { type: 'number', minimum: 0 }, note: str('A note', 400), made: { type: 'number', minimum: 0 } }, ['studyId', 'check', 'outcome']),
  },
  {
    name: 'time_elements',
    kind: 'write',
    description: 'Put the people’s work on a Line balance (studyId): each element — who (a role, never a name), what it is, and its time: laps as timed (seconds) or sec typed; kind work | walk | wait. An element named again gets its laps added. taktSec when agreed by hand. The Line balance works out each person’s load against the takt.',
    input_schema: obj({ studyId: str('The Line balance', 80), taktSec: { type: 'number', exclusiveMinimum: 0 },
      elements: { type: 'array', maxItems: 60, items: obj({ who: str('Who', 60), name: str('The element', 160), sec: { type: 'number', exclusiveMinimum: 0 }, laps: { type: 'array', maxItems: 100, items: { type: 'number', exclusiveMinimum: 0 } }, kind: { type: 'string', enum: ['work', 'walk', 'wait'] } }, ['who', 'name']) } }, ['studyId']),
  },
  {
    name: 'set_capacity',
    kind: 'write',
    description: 'Set a product’s Line capacity (standardId, from start_study): the target a minute, and its stations in flow order — each name, kind machine | people, unit (what it counts in), contains (how many of the station before make one of this one’s), and its speed as said: rate with ratePer sec | min | hour, or cycleSec with perCycle. A station named again is changed. Line capacity works out the bottleneck and what the line can make.',
    input_schema: obj({ standardId: str('The product’s Line capacity', 80), targetPerMin: { type: 'number', minimum: 0 },
      stations: { type: 'array', maxItems: 40, items: obj({ name: str('The station', 80), kind: { type: 'string', enum: ['machine', 'people'] }, unit: str('Its unit', 40), contains: { type: 'number', exclusiveMinimum: 0 }, rate: { type: 'number', minimum: 0 }, ratePer: { type: 'string', enum: ['sec', 'min', 'hour'] }, cycleSec: { type: 'number', exclusiveMinimum: 0 }, perCycle: { type: 'number', exclusiveMinimum: 0 } }, ['name']) } }, ['standardId']),
  },
  {
    name: 'fishbone_state',
    kind: 'read',
    description: 'The 6M problems on a line (or a project on it) with their causes on the six bones — each cause’s words, bone, how it is known, where it stands (suspected · confirmed · ruled out) and what its check found. Gives each problem’s caseId for add_cause.',
    input_schema: obj({ lineId: str('The line', 80), projectId: str('The project', 80) }),
  },
  {
    name: 'add_cause',
    kind: 'write',
    description: 'Put a cause on a 6M problem’s fishbone (caseId): its bone m (people · machine · method · material · measurement · environment), its words, how it is known (measured · counted · observed · reported), likely and explains (the team’s rating), the check that would confirm it (what, who, by) — suspected until checked. Or change a cause named (cause): its status (confirmed only with what its check found, or ruled_out), its rating, its check.',
    input_schema: obj({ caseId: str('The 6M problem', 80), cause: str('An existing cause, by its words', 200), m: { type: 'string', enum: ['people', 'machine', 'method', 'material', 'measurement', 'environment'] }, text: str('The cause, as said', 400),
      grade: { type: 'string', enum: ['measured', 'counted', 'observed', 'reported'] }, status: { type: 'string', enum: ['suspected', 'confirmed', 'ruled_out'] }, likely: { type: 'string', enum: ['unlikely', 'possible', 'likely'] }, explains: { type: 'string', enum: ['little', 'some', 'most'] },
      found: str('What the check found', 400), check: obj({ what: str('What would confirm it', 300), who: str('Who checks', 80), by: str('By when, YYYY-MM-DD', 10) }) }, ['caseId']),
  },
  {
    name: 'add_journey_step',
    kind: 'write',
    description: 'Add a step to a problem’s journey of improvement (problemId): what was done, and what came of it — as on the problem’s own page.',
    input_schema: obj({ problemId: str('The problem', 80), did: str('What was done', 400), result: str('What came of it', 400) }, ['problemId', 'did']),
  },
  {
    name: 'place_people',
    kind: 'write',
    description: 'Put the people on a product’s line standard (standardId): each by their label (a role or number, never a name), what they do (task), labels (Overburdened, Product issue, Extra labour or the person’s own), bottleneck. New people go in a row on the board for the person to drag to where they stand; one named again is changed.',
    input_schema: obj({ standardId: str('The line standard', 80), people: { type: 'array', minItems: 1, maxItems: 30, items: obj({ label: str('Op 1, the team leader', 40), task: str('What they do', 200), labels: { type: 'array', maxItems: 6, items: { type: 'string', maxLength: 24 } }, bottleneck: { type: 'boolean' } }, ['label']) } }, ['standardId', 'people']),
  },
  {
    name: 'answer_method',
    kind: 'write',
    description: 'Write the answers to a project’s method questions — its method sheet, section by section (DMAIC’s charter and phases, PDCA’s plan, an 8D’s disciplines, an A3’s blocks …), each by its question id or words, the answer as the person said or agreed it. project_state names the method; the questions are on the project’s page.',
    input_schema: obj({ projectId: str('The project', 80), answers: { type: 'array', minItems: 1, maxItems: 30, items: obj({ field: str('The question — its id or its words', 120), text: str('The answer, as said', 4000) }, ['field', 'text']) } }, ['projectId', 'answers']),
  },
  // ── The task-led application (10 November, docs/AI-TASK.md) ──────────────────────────────────────────────────────────
  {
    name: 'understand_task',
    kind: 'read',
    description: 'When the person says what they are doing, what they have seen, what they want to investigate or achieve — "I think we\u2019re losing too much production time on this line", "rejects are up on the sealer" — read the task on its line: what Faultline already holds that bears on it (each tool\u2019s own finding, the stops of the last four weeks, the open problems and what they cost, the 6M work), what is old and what is missing, and the ONE next step with why, in the order the method takes it. Recommend that step in a sentence; never offer a menu of tools. Run it before choosing any tool for a task.',
    input_schema: obj({ words: str('What they are doing or want, in their words', 400), lineId: str('The line, when known', 80), machine: str('The machine, when said', 120) }, ['words']),
  },
  {
    name: 'keep_task',
    kind: 'local',
    description: 'Keep the task on the current subject once the person agrees to work on it: goal (their words), lineId, task (the kind understand_task named), steps (the tools in order, by key — understand_task\u2019s route when left out). Its progress is then read from the records as they are made; parking the subject parks the task.',
    input_schema: obj({ goal: str('The task, in their words', 300), lineId: str('The line', 80), task: str('The kind of task, from understand_task', 40), steps: { type: 'array', maxItems: 8, items: { type: 'string', maxLength: 40 } } }, ['goal']),
  },
  {
    name: 'task_state',
    kind: 'read',
    description: 'Where the kept task stands, read from the real records: each step known \u00b7 old \u00b7 not done, what each found in its tool\u2019s own words, which were done since the task began, and the next step. Use when they ask where they are, after a step is done, and when they come back to the task.',
    input_schema: obj({}),
  },
  // ── Tool intelligence (10 November, docs/AI-TOOL-INTELLIGENCE.md) ─────────────────────────────────────────────────────
  {
    name: 'tool_intel',
    kind: 'read',
    description: 'What a tool does and cannot do, when to use it and what instead, what it needs, how much is enough, how each input can be got (and which ways are not possible yet), and each OPERATION’s level: 1 by conversation, 2 by conversation with evidence, 3 with the person on the page (what they must do, and the hand-over words), 4 not supported (why, and the manual way). Read it before choosing how to get evidence, and before telling the person what you can or cannot do with a tool.',
    input_schema: obj({ tool: str('The tool’s key (stops, capability, spaghetti, linestandard …)', 40) }, ['tool']),
  },
  {
    name: 'assess_evidence',
    kind: 'read',
    description: 'For a tool on a line: what Faultline already holds (its records and their age, or the stops and how sure they are), what it still needs, whether that is enough, and the best way to get the rest. Run it before asking the person for any figure — never ask for figures to be typed where the records or a live measurement can give them.',
    input_schema: obj({ tool: str('The tool’s key', 40), lineId: str('The line', 80) }, ['tool']),
  },
  {
    name: 'pareto',
    kind: 'read',
    description: 'Rank where the time goes from every source there is, each KEPT APART by how it is known and never added together: the line’s stops timed by stopwatch (measured), typed after the fact (reported), tapped as instants (counted — how often, no minutes), a downtime file read in code (importId — imported), and figures the person said in this conversation (reported: each reason with minutes and/or stops, exactly as said, never estimated). Says which source leads and by what (time lost, or only how often), the share and the vital few, each line’s own leader when several, the period and how it moved, how sure (thin, fair, solid) and what would make it enough, frequency without duration and duration without frequency, and any figures that do not agree. With nothing to rank it says so and how to get it. Never draw a Pareto from the problem as said.',
    input_schema: obj({
      lineId: str('The line', 80), lineIds: { type: 'array', maxItems: 8, items: { type: 'string', maxLength: 80 }, description: 'Several lines, each kept as its own' },
      days: { type: 'integer', minimum: 1, maximum: 365, description: 'Days back; 28 by default' }, from: str('From, YYYY-MM-DD', 10), to: str('To, YYYY-MM-DD', 10),
      importId: str('A downtime file read in this conversation (import_table)', 80),
      reported: { type: 'array', maxItems: 40, description: 'Figures the person SAID, as said', items: obj({ category: str('The reason, in their words', 80), minutes: { type: 'number', minimum: 0, description: 'Minutes lost, when said' }, stops: { type: 'integer', minimum: 0, description: 'How many times, when said' } }, ['category']) },
    }),
  },
  {
    name: 'import_table',
    kind: 'read',
    description: 'The downtime files attached in this conversation and read in code — each with its id, the columns found (reason, minutes, count, line, date), the rows read and the rows left out with why. Use pareto with its importId to rank it.',
    input_schema: obj({ importId: str('One file read', 80) }),
  },
  {
    name: 'hand_over',
    kind: 'local',
    description: 'A level-3 operation (tool_intel) only the person can do — drawing, dragging, placing on the page, filming, looking at footage, measuring a distance, checking on the floor: opens the page beside the conversation, keeps the step on the subject, and returns exactly what they are to do. Say it plainly — you cannot press buttons, draw or select on the screen — and what happens when they are done.',
    input_schema: obj({ tool: str('The tool’s key', 40), op: str('The operation’s id from tool_intel', 40), studyId: str('The record, when the page is a record’s', 80), lineId: str('The line', 80) }, ['tool', 'op']),
  },
  {
    name: 'handover_state',
    kind: 'read',
    description: 'Whether the step handed over has been done — read from the record (changed since it was handed over), never assumed. done: clear once it has moved and you have read it.',
    input_schema: obj({ done: { type: 'string', enum: ['keep', 'clear'] } }),
  },
  // ── Workbooks attached in the conversation, read on the device (10 November, docs/WORKBOOKS.md) ────────────────────────────────────
  {
    name: 'workbook_profile',
    kind: 'read',
    description: 'What an Excel workbook attached in this conversation holds — read on the person’s device, never sent to you: its sheets (hidden ones said), the header row found on each and what is above it, every column with its type (number, text, date, yes/no, mixed), blanks, words in number columns, errors, formulas and those with no value saved by Excel (Faultline never recalculates Excel), repeated rows, the same name written more than one way, hidden columns, tables, defined names, the columns that link sheets, and what is in the file but NOT read (pivot tables, external links, connections, a data model, macros, charts). Run it first, before any question of the workbook. With sheet, that one sheet in full.',
    input_schema: obj({ workbookId: str('The workbook (from the threads); the newest when left out', 80), sheet: str('One sheet in full, by name', 120) }),
  },
  {
    name: 'query_workbook',
    kind: 'read',
    description: 'Ask the workbook a question, worked by Faultline’s code over EVERY row of a sheet (never a sample, never by you): filters, up to three columns to group by, a date column grouped by day, week, month or year, and measures — sum, avg, min, max, count (of rows, or of a column’s filled cells) and distinct. Answers with each group’s figures, the totals, a source cell for each group, the cells it could not use (a word in a column being added up — counted and named), and notes (formulas, two spellings matched by a filter). Quote its figures exactly with what they are of; every figure about the workbook comes from here. Text filters ignore case and stray spaces, and say when that matched more than one spelling.',
    input_schema: obj({
      workbookId: str('The workbook; the newest when left out', 80),
      sheet: str('The sheet, by name', 120),
      filters: { type: 'array', maxItems: 8, items: obj({ column: str('The column, by its header (or letter)', 120), op: { type: 'string', enum: ['eq', 'ne', 'in', 'gt', 'gte', 'lt', 'lte', 'between', 'contains', 'blank', 'notblank'] }, value: { type: ['string', 'number'] }, values: { type: 'array', maxItems: 50, items: { type: ['string', 'number'] } }, from: { type: ['string', 'number'], description: 'between: from (a date as YYYY-MM-DD)' }, to: { type: ['string', 'number'], description: 'between: to' } }, ['column', 'op']) },
      groupBy: { type: 'array', maxItems: 3, items: { type: 'string', maxLength: 120 } },
      time: obj({ column: str('A date column', 120), by: { type: 'string', enum: ['day', 'week', 'month', 'year'] } }, ['column', 'by']),
      measures: { type: 'array', minItems: 1, maxItems: 6, items: obj({ op: { type: 'string', enum: ['sum', 'avg', 'min', 'max', 'count', 'distinct'] }, column: str('The column (count may have none: rows)', 120) }, ['op']) },
      order: obj({ by: { anyOf: [{ type: 'string', enum: ['group'] }, { type: 'integer', minimum: 0, maximum: 5 }], description: '"group", or a measure’s position (0 for the first)' }, desc: { type: 'boolean' } }, ['by']),
      limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Groups shown; 25 by default' },
    }, ['sheet', 'measures']),
  },
  {
    name: 'workbook_rows',
    kind: 'read',
    description: 'The source rows behind a finding — the rows of a sheet that match the filters, each cell with its reference (Downtime!E1204), so the person can find them in Excel. Use it when they ask to see the data behind a figure, or to check what a column holds before saying what it means.',
    input_schema: obj({
      workbookId: str('The workbook; the newest when left out', 80),
      sheet: str('The sheet, by name', 120),
      filters: { type: 'array', maxItems: 8, items: obj({ column: str('The column', 120), op: { type: 'string', enum: ['eq', 'ne', 'in', 'gt', 'gte', 'lt', 'lte', 'between', 'contains', 'blank', 'notblank'] }, value: { type: ['string', 'number'] }, values: { type: 'array', maxItems: 50, items: { type: ['string', 'number'] } }, from: { type: ['string', 'number'] }, to: { type: ['string', 'number'] } }, ['column', 'op']) },
      columns: { type: 'array', maxItems: 12, items: { type: 'string', maxLength: 120 } },
      limit: { type: 'integer', minimum: 1, maximum: 20 },
    }, ['sheet']),
  },
];
