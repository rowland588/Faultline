/* FAULTLINE'S LIBRARY — the methods the app comes with, as definitions
 * (the vision slice, docs/PLATFORM-STATUS.md).
 *
 * Rowland, 18 October: "I absolutely want a template library. However,
 * templates must become reusable, versioned methodology definitions, not
 * simply fixed screens." So each entry here is a definition like any a
 * person writes — the same validator, the same runtime, the same paper —
 * built from the app's own capabilities: its tools (lib/flow/components) and
 * measures with a before and an after. Taking one puts a copy in the
 * person's own library, where it is theirs to change, approve, adapt and
 * version; nothing here is run directly, and a person's method is as much a
 * method as one of these.
 *
 * The manufacturing knowledge is the app's: SMED to single-digit minutes
 * (Shingo, docs/CAPACITY.md), a running line's loss counted at the
 * bottleneck's speed (docs/OPEX.md, the six moves), capability at Cpk 1.33,
 * a line balanced against takt. A number the app cannot know — a line's
 * own target, its speed — is left for the person, never invented. */
import { FLOW_SCHEMA, type FlowDefinition, type FlowStepDef } from './definition';
import { appStageGate } from './templates';

export interface LibraryEntry {
  id: string;
  name: string;
  purpose: string;
  kind: FlowDefinition['kind'];
  /** Words a person might use for it — matched when they describe the work. */
  words: string[];
  /** The app's tools it uses, by name — said on its card. */
  uses: string[];
  build: () => FlowDefinition;
}

const every = { id: 'every-step', type: 'stepsDone', policy: 'block' } as const;

export const LIBRARY: readonly LibraryEntry[] = [
  {
    id: 'stage-gate', name: 'Stage gate', kind: 'stagegate',
    purpose: 'New equipment taken through its gates — installed, set up, commissioned against what was agreed, handed over.',
    words: ['new', 'equipment', 'machine', 'install', 'installation', 'commission', 'commissioning', 'handover', 'oem', 'supplier', 'fit', 'project'],
    uses: [],
    build: () => ({ ...appStageGate(), purpose: 'New equipment taken through its gates — installed, set up, commissioned against what was agreed, handed over.' }),
  },
  {
    id: 'changeover-reduction', name: 'Changeover reduction (SMED)', kind: 'improvement',
    purpose: 'A changeover cut towards single-digit minutes by Shingo’s stages — recorded, separated, converted, streamlined, standardised — and proved by timing it again.',
    words: ['changeover', 'change over', 'smed', 'setup time', 'set-up', 'format change', 'product change', 'downtime', 'shingo', 'quick'],
    uses: ['SMED'],
    build: (): FlowDefinition => ({
      schema: FLOW_SCHEMA, name: 'Changeover reduction (SMED)', kind: 'improvement',
      purpose: 'A changeover cut towards single-digit minutes by Shingo’s stages — recorded, separated, converted, streamlined, standardised — and proved by timing it again.',
      roles: [{ key: 'lead', name: 'Line lead', side: 'site' }, { key: 'fitter', name: 'Fitter', side: 'site' }, { key: 'crew', name: 'Changeover crew', side: 'site' }],
      stages: [
        {
          key: 'record', name: 'Record it as it is', purpose: 'Last good pack to first good pack, the run-up and the adjustments included.',
          steps: [{ key: 'time-now', title: 'Time the changeover as it is', per: 'line', answer: 'measure', role: 'lead', component: { tool: 'changeover' }, dueDays: 7, help: 'Film it or time it element by element with SMED, with who does each.' }],
          gate: { conditions: [every] },
        },
        {
          key: 'separate', name: 'Separate and convert', purpose: 'Internal work told from external; external work moved outside the stop.',
          steps: [
            { key: 'mark-sides', title: 'Mark each element internal or external', per: 'line', answer: 'done', role: 'lead', after: ['time-now'] },
            { key: 'move-external', title: 'Move the external work outside the stop', per: 'line', answer: 'done', role: 'crew', after: ['mark-sides'], help: 'Fetching parts, tools and film before the line stops; cleaning after it runs.' },
            { key: 'kit', title: 'Changeover kit and shadow board ready', per: 'line', answer: 'done', role: 'fitter', evidence: { photos: 1 } },
          ],
          gate: { conditions: [every] },
        },
        {
          key: 'streamline', name: 'Streamline and standardise', purpose: 'What is left made shorter, then written down and trained.',
          steps: [
            { key: 'streamline', title: 'Streamline the internal elements', per: 'line', answer: 'done', role: 'fitter', help: 'Quick-release fixings, set positions, parallel work by two people.' },
            { key: 'standard', title: 'The changeover standard written', per: 'line', answer: 'paperwork', role: 'lead', evidence: { files: 1 } },
            { key: 'trained', title: 'Crew trained on the standard', per: 'line', answer: 'signoff', role: 'lead', after: ['standard'] },
          ],
          gate: { conditions: [every] },
        },
        {
          key: 'prove', name: 'Prove it', purpose: 'Timed again on the same line, against single-digit minutes.',
          steps: [
            { key: 'time-again', title: 'Time it again', per: 'line', answer: 'measure', role: 'lead', component: { tool: 'changeover' }, after: ['trained'] },
            { key: 'hold', title: 'Time a changeover two weeks on', per: 'line', answer: 'measure', role: 'lead', component: { tool: 'changeover' }, after: ['time-again'], help: 'It holds when the third timing is as good as the second.' },
          ],
          gate: { conditions: [every, { id: 'target', type: 'measureMet', policy: 'warn', measure: 'changeover_minutes' }] },
        },
      ],
      measures: [{
        key: 'changeover_minutes', name: 'Changeover minutes', unit: 'min', better: 'lower', target: 9,
        from: [{ step: 'time-now', field: 'changeover_minutes' }, { step: 'time-again', field: 'changeover_minutes' }, { step: 'hold', field: 'changeover_minutes' }],
      }],
    }),
  },
  {
    id: 'line-performance', name: 'Line performance — find the cause, prove the fix', kind: 'investigation',
    purpose: 'A running line made to perform better: the loss counted, the problem chosen, the cause found with the five whys, a countermeasure made, proved on the same count and held.',
    words: ['performance', 'output', 'losses', 'loss', 'stops', 'downtime', 'root cause', 'cause', '6m', 'fishbone', 'why', 'improve', 'efficiency', 'target', 'packs', 'shift'],
    uses: ['A shift’s losses'],
    build: (): FlowDefinition => ({
      schema: FLOW_SCHEMA, name: 'Line performance — find the cause, prove the fix', kind: 'investigation',
      purpose: 'A running line made to perform better: the loss counted, the problem chosen, the cause found with the five whys, a countermeasure made, proved on the same count and held.',
      roles: [{ key: 'lead', name: 'Line lead', side: 'site' }, { key: 'eng', name: 'Engineer', side: 'site' }, { key: 'manager', name: 'Production manager', side: 'site' }],
      stages: [
        {
          key: 'gap', name: 'The gap', purpose: 'Where a shift’s time goes, counted at the bottleneck’s speed.',
          steps: [{ key: 'count', title: 'Count a shift’s losses', per: 'line', answer: 'measure', role: 'lead', component: { tool: 'losses' }, dueDays: 7 }],
          gate: { conditions: [every] },
        },
        {
          key: 'problem', name: 'The problem', purpose: 'The biggest loss, said as a problem in one sentence.',
          steps: [{
            key: 'problem', title: 'Say the problem', per: 'line', answer: 'form', role: 'lead', after: ['count'],
            fields: [
              { key: 'biggest_loss', label: 'The biggest loss', type: 'text', required: true },
              { key: 'problem', label: 'The problem, in a sentence', type: 'text', required: true },
            ],
          }],
          gate: { conditions: [every] },
        },
        {
          key: 'cause', name: 'The cause', purpose: 'The causes on the six bones, the main one drilled with the five whys.',
          steps: [{
            key: 'whys', title: 'The five whys on the main cause', per: 'line', answer: 'form', role: 'eng',
            fields: [
              { key: 'bone', label: 'On which bone', type: 'choice', options: ['People', 'Machine', 'Method', 'Material', 'Measurement', 'Environment'], required: true },
              { key: 'how_known', label: 'How it is known', type: 'choice', options: ['Measured', 'Counted', 'Observed', 'Reported'], required: true },
              { key: 'why_1', label: 'Why 1', type: 'text', required: true },
              { key: 'why_2', label: 'Why 2', type: 'text', required: true },
              { key: 'why_3', label: 'Why 3', type: 'text' },
              { key: 'why_4', label: 'Why 4', type: 'text' },
              { key: 'why_5', label: 'Why 5', type: 'text' },
            ],
          }],
          gate: { conditions: [every] },
        },
        {
          key: 'fix', name: 'The countermeasure', purpose: 'What will be done, by whom, by when — then done.',
          steps: [
            { key: 'agreed', title: 'Countermeasure agreed', per: 'line', answer: 'form', role: 'manager', fields: [{ key: 'what', label: 'What will be done', type: 'text', required: true }, { key: 'who', label: 'Who', type: 'person', required: true }, { key: 'by', label: 'By', type: 'date', required: true }] },
            { key: 'done', title: 'Countermeasure done', per: 'line', answer: 'done', role: 'eng', evidence: { photos: 1 }, after: ['agreed'] },
          ],
          gate: { conditions: [every] },
        },
        {
          key: 'prove', name: 'Prove and hold', purpose: 'The same count again, then again two weeks on.',
          steps: [
            { key: 'recount', title: 'Count a shift’s losses again', per: 'line', answer: 'measure', role: 'lead', component: { tool: 'losses' }, after: ['done'] },
            { key: 'hold', title: 'Count again two weeks on', per: 'line', answer: 'measure', role: 'lead', component: { tool: 'losses' }, after: ['recount'] },
            { key: 'standard', title: 'The countermeasure in the line’s standard', per: 'line', answer: 'signoff', role: 'manager' },
          ],
          gate: { conditions: [every] },
        },
      ],
      measures: [
        { key: 'lost_minutes', name: 'Lost minutes a shift', unit: 'min', better: 'lower', from: [{ step: 'count', field: 'lost_minutes' }, { step: 'recount', field: 'lost_minutes' }, { step: 'hold', field: 'lost_minutes' }] },
        { key: 'packs_made', name: 'Packs made a shift', unit: 'packs', better: 'higher', from: [{ step: 'count', field: 'packs_made' }, { step: 'recount', field: 'packs_made' }, { step: 'hold', field: 'packs_made' }] },
      ],
    }),
  },
  {
    id: 'product-trial', name: 'New product trial', kind: 'stagegate',
    purpose: 'A new product proved on a line — prepared, run at its speed, its weight held within limits, signed off before it is made for sale.',
    words: ['new product', 'npd', 'npi', 'trial', 'launch', 'recipe', 'pack', 'format', 'sku', 'customer', 'approval'],
    uses: ['Capability study'],
    build: (): FlowDefinition => ({
      schema: FLOW_SCHEMA, name: 'New product trial', kind: 'stagegate',
      purpose: 'A new product proved on a line — prepared, run at its speed, its weight held within limits, signed off before it is made for sale.',
      roles: [{ key: 'tech', name: 'Technologist', side: 'site' }, { key: 'lead', name: 'Line lead', side: 'site' }, { key: 'quality', name: 'Quality', side: 'site' }],
      stages: [
        {
          key: 'prepare', name: 'Prepare', purpose: 'The specification agreed and the line made ready for it.',
          steps: [
            { key: 'spec', title: 'Specification agreed', per: 'line', answer: 'paperwork', role: 'tech', evidence: { files: 1 } },
            { key: 'materials', title: 'Materials on site', per: 'line', answer: 'check', role: 'lead' },
            { key: 'parts', title: 'Change parts fitted', per: 'machine', answer: 'done', role: 'lead' },
          ],
          gate: { conditions: [every] },
        },
        {
          key: 'trial', name: 'Trial', purpose: 'Run at its speed, and its weight read against its limits.',
          steps: [
            {
              key: 'run', title: 'Trial run', per: 'line', answer: 'measure', role: 'lead', after: ['parts'],
              fields: [
                { key: 'rate', label: 'Rate', type: 'reading', unit: 'packs/min', required: true },
                { key: 'minutes', label: 'Minutes run', type: 'reading', unit: 'min', required: true },
                { key: 'rejects', label: 'Rejects', type: 'reading', unit: 'packs' },
              ],
            },
            { key: 'capability', title: 'Weight capability', per: 'line', answer: 'measure', role: 'quality', component: { tool: 'capability' } },
          ],
          gate: { conditions: [every, { id: 'cpk', type: 'measureMet', policy: 'block', measure: 'cpk' }] },
        },
        {
          key: 'decide', name: 'Decide', purpose: 'Signed off for sale.',
          steps: [
            { key: 'quality', title: 'Quality sign-off', per: 'line', answer: 'signoff', role: 'quality' },
            { key: 'customer', title: 'Customer approval', per: 'line', answer: 'paperwork', role: 'tech', evidence: { files: 1 } },
          ],
          gate: { conditions: [every, { id: 'problems', type: 'noOpenProblems', policy: 'block', priority: 'high' }] },
        },
      ],
      measures: [
        { key: 'cpk', name: 'Weight Cpk', better: 'higher', target: 1.33, from: [{ step: 'capability', field: 'cpk' }] },
        { key: 'rate', name: 'Trial rate', unit: 'packs/min', better: 'higher', from: [{ step: 'run', field: 'rate' }] },
      ],
    }),
  },
  {
    id: 'line-rebalance', name: 'Rebalance the people on a line', kind: 'improvement',
    purpose: 'People’s work timed against takt, moved so nobody is over and fewer wait, and timed again.',
    words: ['balance', 'rebalance', 'people', 'labour', 'crew', 'takt', 'headcount', 'yamazumi', 'operators', 'staffing', 'video', 'footage', 'filmed', 'recording'],
    uses: ['Line balance', 'Work sampling'],
    build: (): FlowDefinition => ({
      schema: FLOW_SCHEMA, name: 'Rebalance the people on a line', kind: 'improvement',
      purpose: 'People’s work timed against takt, moved so nobody is over and fewer wait, and timed again.',
      roles: [{ key: 'lead', name: 'Line lead', side: 'site' }, { key: 'ie', name: 'Industrial engineer', side: 'site' }],
      stages: [
        {
          key: 'see', name: 'See it as it is', purpose: 'The work timed person by person; what people are doing sampled.',
          steps: [
            { key: 'balance-now', title: 'Time the line balance', per: 'line', answer: 'measure', role: 'ie', component: { tool: 'balance' } },
            { key: 'sample', title: 'Sample what people are doing', per: 'line', answer: 'measure', role: 'ie', component: { tool: 'sampling' } },
          ],
          gate: { conditions: [every] },
        },
        {
          key: 'move', name: 'Move the work', purpose: 'Elements moved off the person over takt; the new balance agreed with the crew.',
          steps: [
            { key: 'plan', title: 'The new balance agreed with the crew', per: 'line', answer: 'signoff', role: 'lead' },
            { key: 'moved', title: 'Work moved and the standard updated', per: 'line', answer: 'done', role: 'lead', after: ['plan'] },
          ],
          gate: { conditions: [every] },
        },
        {
          key: 'prove', name: 'Prove it', purpose: 'Timed again against the same takt.',
          steps: [{ key: 'balance-again', title: 'Time the line balance again', per: 'line', answer: 'measure', role: 'ie', component: { tool: 'balance' }, after: ['moved'] }],
          gate: { conditions: [every, { id: 'eff', type: 'measureMet', policy: 'warn', measure: 'balance_efficiency' }] },
        },
      ],
      measures: [
        { key: 'balance_efficiency', name: 'Balance efficiency', unit: '%', better: 'higher', target: 85, from: [{ step: 'balance-now', field: 'balance_efficiency' }, { step: 'balance-again', field: 'balance_efficiency' }] },
        { key: 'people_needed', name: 'People needed', unit: 'people', better: 'lower', from: [{ step: 'balance-now', field: 'people_needed' }, { step: 'balance-again', field: 'people_needed' }] },
      ],
    }),
  },
  {
    id: 'line-rate', name: 'Bring a line to its rate', kind: 'improvement',
    purpose: 'What each station can make worked out, the bottleneck found, walked and raised, and the rate and labour a pack worked out again on the same capacity.',
    words: ['rate', 'speed', 'capacity', 'bottleneck', 'throughput', 'output', 'constraint', 'faster', 'cost per pack', 'labour cost', 'packs a minute'],
    uses: ['Line capacity'],
    build: (): FlowDefinition => ({
      schema: FLOW_SCHEMA, name: 'Bring a line to its rate', kind: 'improvement',
      purpose: 'What each station can make worked out, the bottleneck found, walked and raised, and the rate and labour a pack worked out again on the same capacity.',
      roles: [{ key: 'lead', name: 'Line lead', side: 'site' }, { key: 'ie', name: 'Industrial engineer', side: 'site' }, { key: 'eng', name: 'Engineer', side: 'site' }],
      stages: [
        {
          key: 'see', name: 'See it as it is', purpose: 'Every station’s speed in its own unit, the bottleneck once stops count, and what a pack costs because of it.',
          steps: [
            { key: 'capacity-now', title: 'Line capacity as it is', per: 'line', answer: 'measure', role: 'ie', component: { tool: 'capacity' }, help: 'Machines at their plate speed, people at their timed cycle; the target the line has to make.' },
            { key: 'walk', title: 'Walk the bottleneck', per: 'line', answer: 'done', role: 'lead', after: ['capacity-now'], help: 'Stand at it for a shift: is it the speed, the stops, or what reaches it?' },
          ],
          gate: { conditions: [every] },
        },
        {
          key: 'raise', name: 'Raise the bottleneck', purpose: 'Its speed, its stops or its people — whichever the walk found — and the standard changed to hold it.',
          steps: [
            { key: 'raise-it', title: 'Raise the bottleneck', per: 'line', answer: 'done', role: 'eng', help: 'Line capacity’s way to the target says who is added where; a speed or a stop fixed is said on its station.' },
            { key: 'standard', title: 'The line standard updated', per: 'line', answer: 'paperwork', role: 'lead', after: ['raise-it'], evidence: { files: 1 } },
          ],
          gate: { conditions: [every] },
        },
        {
          key: 'prove', name: 'Prove it', purpose: 'The same capacity worked out again with the bottleneck raised.',
          steps: [{ key: 'capacity-again', title: 'Line capacity with the bottleneck raised', per: 'line', answer: 'measure', role: 'ie', component: { tool: 'capacity' }, after: ['standard'] }],
          gate: { conditions: [every] },
        },
      ],
      measures: [
        { key: 'line_rate', name: 'Line rate', unit: 'a minute', better: 'higher', from: [{ step: 'capacity-now', field: 'line_rate' }, { step: 'capacity-again', field: 'line_rate' }] },
        { key: 'labour_per_pack', name: 'Labour a pack', unit: 'pence', better: 'lower', from: [{ step: 'capacity-now', field: 'labour_per_pack' }, { step: 'capacity-again', field: 'labour_per_pack' }] },
      ],
    }),
  },
  /* A TOOL MADE FROM BLOCKS (lib/flow/analysis) — no screen of its own was
     written for it: a log of every reject, worked out as a Pareto, a trend
     and a figure a day, then the same log again to prove the countermeasure */
  {
    id: 'rejects-log', name: 'Rejects, logged and halved', kind: 'improvement',
    purpose: 'Every reject logged with its reason for a week, the biggest reason found by its Pareto, a countermeasure made, and the same log kept again to prove it on the rejects a day.',
    words: ['reject', 'rejects', 'scrap', 'waste', 'giveaway', 'defect', 'defects', 'quality', 'log', 'tally', 'record every', 'track', 'pareto', 'seal', 'label'],
    uses: [],
    build: (): FlowDefinition => {
      const columns = [
        { key: 'reason', label: 'Reason', type: 'choice' as const, options: ['Seal', 'Label', 'Weight', 'Damaged', 'Foreign body', 'Other'], required: true },
        { key: 'rejects', label: 'Rejects', type: 'number' as const, unit: 'packs', required: true },
        { key: 'shift', label: 'Shift', type: 'choice' as const, options: ['Early', 'Late', 'Night'] },
      ];
      /* what a reject pack costs, typed once by the person — and what the rejects cost a day, worked out */
      const costOfAPack = { key: 'cost_of_a_pack', label: 'What a reject pack costs', type: 'number' as const, unit: '£' };
      const costADay = { key: 'cost_a_day', label: 'What rejects cost a day', block: 'calc' as const, formula: 'rejects_a_day * cost_of_a_pack', unit: '£' };
      return {
        schema: FLOW_SCHEMA, name: 'Rejects, logged and halved', kind: 'improvement',
        purpose: 'Every reject logged with its reason for a week, the biggest reason found by its Pareto, a countermeasure made, and the same log kept again to prove it on the rejects a day.',
        roles: [{ key: 'op', name: 'Operator', side: 'site' }, { key: 'lead', name: 'Line lead', side: 'site' }, { key: 'quality', name: 'Quality', side: 'site' }],
        stages: [
          {
            key: 'log', name: 'Log the rejects', purpose: 'Every reject with its reason, as it happens, for a week.',
            steps: [{
              key: 'log-before', title: 'Log every reject for a week', per: 'line', answer: 'log', role: 'op', minEntries: 10, columns, fields: [costOfAPack],
              analyses: [
                { key: 'rejects_a_day', label: 'Rejects a day', block: 'perDay', of: 'rejects' },
                { key: 'biggest_reason', label: 'Biggest reason', block: 'pareto', by: 'reason', of: 'rejects' },
                { key: 'by_day', label: 'Rejects by day', block: 'trend', of: 'rejects' },
                { key: 'by_shift', label: 'Rejects by shift', block: 'pareto', by: 'shift', of: 'rejects' },
                costADay,
              ],
              help: 'One entry for each reject or batch of rejects, with its reason. Strike a mistype — never delete it.',
            }],
            gate: { conditions: [every] },
          },
          {
            key: 'cause', name: 'The cause', purpose: 'The biggest reason, drilled to its cause.',
            steps: [{
              key: 'why', title: 'Why the biggest reason happens', per: 'line', answer: 'form', role: 'lead', after: ['log-before'],
              fields: [
                { key: 'reason', label: 'The biggest reason, from the Pareto', type: 'text', required: true },
                { key: 'why_1', label: 'Why 1', type: 'text', required: true },
                { key: 'why_2', label: 'Why 2', type: 'text', required: true },
                { key: 'why_3', label: 'Why 3', type: 'text' },
              ],
            }],
            gate: { conditions: [every] },
          },
          {
            key: 'fix', name: 'The countermeasure', purpose: 'What will be done about it, done, and signed by Quality.',
            steps: [
              { key: 'done', title: 'Countermeasure done', per: 'line', answer: 'done', role: 'lead', evidence: { photos: 1 }, after: ['why'] },
              { key: 'quality', title: 'Quality agrees it', per: 'line', answer: 'signoff', role: 'quality', after: ['done'] },
            ],
            gate: { conditions: [every] },
          },
          {
            key: 'prove', name: 'Prove it', purpose: 'The same log kept again for a week.',
            steps: [{
              key: 'log-after', title: 'Log every reject again for a week', per: 'line', answer: 'log', role: 'op', minEntries: 10, columns, after: ['quality'], fields: [costOfAPack],
              analyses: [
                { key: 'rejects_a_day', label: 'Rejects a day', block: 'perDay', of: 'rejects' },
                { key: 'biggest_reason', label: 'Biggest reason', block: 'pareto', by: 'reason', of: 'rejects' },
                costADay,
              ],
            }],
            gate: { conditions: [every] },
          },
        ],
        measures: [
          { key: 'rejects_a_day', name: 'Rejects a day', unit: 'packs', better: 'lower', from: [{ step: 'log-before', field: 'rejects_a_day' }, { step: 'log-after', field: 'rejects_a_day' }] },
          /* everything derives a cost (CLAUDE.md): the rate typed by the person, never a figure invented */
          { key: 'cost_a_day', name: 'What rejects cost a day', unit: '£', better: 'lower', from: [{ step: 'log-before', field: 'cost_a_day' }, { step: 'log-after', field: 'cost_a_day' }] },
        ],
      };
    },
  },
  /* SHORT STOPS, TIMED AS THEY ARE CLEARED — the stops too short for the
     loss count to name one by one, each timed by the operator who clears it
     (a timed box: Start when it stops, Stop when it runs — Lap when the next
     follows at once), with what stopped it. What they add up to a day, the
     cause that takes the most time (the Pareto, by time, not by count), how
     long they run (the histogram) and what they cost a day at the line's own
     rate, typed once. The biggest cause fixed and the same timing kept again
     proves it. Measured by people, not by sensors (CLAUDE.md). */
  {
    id: 'short-stops', name: 'Short stops, timed as they are cleared', kind: 'improvement',
    purpose: 'Every short stop timed by the operator who clears it, with what stopped it; the cause that takes the most time fixed, and the same timing kept again to prove it in time and money a day.',
    words: ['short stop', 'short stops', 'micro stop', 'micro stops', 'minor stop', 'minor stops', 'jam', 'jams', 'stoppage', 'stoppages', 'stops', 'cleared', 'timed', 'time', 'stopwatch', 'how long', 'downtime'],
    uses: [],
    build: (): FlowDefinition => {
      const columns = [
        { key: 'stopped_by', label: 'What stopped it', type: 'choice' as const, options: ['Jam', 'Film or label', 'Product out of place', 'Sensor', 'Waiting for material', 'Other'], required: true },
        { key: 'time_to_clear', label: 'Time to clear', type: 'timer' as const, unit: 's', required: true },
        { key: 'machine', label: 'Machine', type: 'text' as const },
      ];
      /* what a minute of the line stopped costs, typed once by the person — never invented */
      const costOfAMinute = { key: 'cost_of_a_minute', label: 'What a minute stopped costs', type: 'number' as const, unit: '£' };
      const read = (more = true) => [
        { key: 'stops_a_day', label: 'Stops a day', block: 'perDay' as const },
        { key: 'lost_a_day', label: 'Time lost a day', block: 'perDay' as const, of: 'time_to_clear' },
        { key: 'biggest_cause', label: 'The cause that takes the most time', block: 'pareto' as const, by: 'stopped_by', of: 'time_to_clear' },
        ...(more ? [
          { key: 'average_stop', label: 'An average stop', block: 'mean' as const, of: 'time_to_clear' },
          { key: 'how_long', label: 'How long the stops run', block: 'histogram' as const, of: 'time_to_clear' },
        ] : []),
        { key: 'cost_a_day', label: 'What the stops cost a day', block: 'calc' as const, formula: 'lost_a_day / 60 * cost_of_a_minute', unit: '£' },
      ];
      return {
        schema: FLOW_SCHEMA, name: 'Short stops, timed as they are cleared', kind: 'improvement',
        purpose: 'Every short stop timed by the operator who clears it, with what stopped it; the cause that takes the most time fixed, and the same timing kept again to prove it in time and money a day.',
        roles: [{ key: 'op', name: 'Operator', side: 'site' }, { key: 'lead', name: 'Line lead', side: 'site' }],
        stages: [
          {
            key: 'time', name: 'Time the stops', purpose: 'Every short stop, timed from the moment it stops to the moment it runs.',
            steps: [{
              key: 'time-before', title: 'Time every short stop for a few shifts', per: 'line', answer: 'log', role: 'op', minEntries: 20, columns, fields: [costOfAMinute], analyses: read(),
              help: 'Start when the machine stops, Stop when it runs again, then say what stopped it. When the next stop follows at once, Lap adds this one and times the next.',
            }],
            gate: { conditions: [every] },
          },
          {
            key: 'cause', name: 'The cause', purpose: 'The cause that takes the most time, drilled to why.',
            steps: [{
              key: 'why', title: 'Why the biggest cause happens', per: 'line', answer: 'form', role: 'lead', after: ['time-before'],
              fields: [
                { key: 'cause', label: 'The cause, from the Pareto', type: 'text', required: true },
                { key: 'why_1', label: 'Why 1', type: 'text', required: true },
                { key: 'why_2', label: 'Why 2', type: 'text', required: true },
                { key: 'why_3', label: 'Why 3', type: 'text' },
              ],
            }],
            gate: { conditions: [every] },
          },
          {
            key: 'fix', name: 'The countermeasure', purpose: 'What will be done about it, done.',
            steps: [{ key: 'done', title: 'Countermeasure done', per: 'line', answer: 'done', role: 'lead', evidence: { photos: 1 }, after: ['why'] }],
            gate: { conditions: [every] },
          },
          {
            key: 'prove', name: 'Prove it', purpose: 'The same stops timed again.',
            steps: [{ key: 'time-after', title: 'Time every short stop again', per: 'line', answer: 'log', role: 'op', minEntries: 20, columns, fields: [costOfAMinute], after: ['done'], analyses: read(false) }],
            gate: { conditions: [every] },
          },
        ],
        measures: [
          { key: 'lost_a_day', name: 'Time lost a day', unit: 's a day', better: 'lower', from: [{ step: 'time-before', field: 'lost_a_day' }, { step: 'time-after', field: 'lost_a_day' }] },
          /* everything derives a cost (CLAUDE.md): the rate typed by the person, never a figure invented */
          { key: 'cost_a_day', name: 'What the stops cost a day', unit: '£', better: 'lower', from: [{ step: 'time-before', field: 'cost_a_day' }, { step: 'time-after', field: 'cost_a_day' }] },
        ],
      };
    },
  },
  /* BREAKDOWNS, READ FOR WHEN THE NEXT ONE COMES — reliability (TPM's
     planned maintenance), made of blocks: every failure logged with the hours
     run since the last, which fail most (the Pareto), and the Weibull fit of
     the times between — the mean time between failures and whether failures
     come early, at random or from wear — so a service is planned on what was
     found, and the same log proves it. The capability was written from its
     brief (lib/flow/needs): the block and its tests, and nothing else. */
  {
    id: 'breakdowns', name: 'Breakdowns, read for when the next one comes', kind: 'improvement',
    purpose: 'Every breakdown logged with the hours run since the last; which fail most, and how long it runs between failures — early, random or wear — read from a Weibull fit; a service planned on that, and the same log kept again to prove the time between grew.',
    words: ['breakdown', 'breakdowns', 'failure', 'failures', 'fails', 'reliability', 'mtbf', 'mean time between', 'weibull', 'wear', 'worn', 'maintenance', 'planned maintenance', 'tpm', 'service', 'next jam', 'how often'],
    uses: [],
    build: (): FlowDefinition => {
      const columns = [
        { key: 'failed', label: 'What failed', type: 'choice' as const, options: ['Jam', 'Film break', 'Sealer', 'Labeller', 'Drive or motor', 'Other'], required: true },
        { key: 'hours', label: 'Hours run since the last', type: 'number' as const, unit: 'h', required: true },
        { key: 'done', label: 'What was done', type: 'text' as const },
      ];
      const reads = [
        { key: 'between', label: 'Time between failures', block: 'reliability' as const, of: 'hours' },
        { key: 'most', label: 'What fails most', block: 'pareto' as const, by: 'failed' },
        { key: 'failures', label: 'Failures', block: 'count' as const },
      ];
      return {
        schema: FLOW_SCHEMA, name: 'Breakdowns, read for when the next one comes', kind: 'improvement',
        purpose: 'Every breakdown logged with the hours run since the last; which fail most, and how long it runs between failures — early, random or wear — read from a Weibull fit; a service planned on that, and the same log kept again to prove the time between grew.',
        roles: [{ key: 'op', name: 'Operator', side: 'site' }, { key: 'eng', name: 'Engineer', side: 'site' }],
        stages: [
          {
            key: 'log', name: 'Log the breakdowns', purpose: 'Every failure, with the hours it ran since the last.',
            steps: [{
              key: 'log-before', title: 'Log every breakdown', per: 'line', answer: 'log', role: 'op', minEntries: 10, columns, analyses: reads,
              help: 'One entry for each breakdown: what failed and the hours run since the one before (from the hour meter or the shift log). Strike a mistype — never delete it.',
            }],
            gate: { conditions: [every] },
          },
          {
            key: 'plan', name: 'Plan the service', purpose: 'What the fit says, made a plan — before the mean time between if it is wear, the cause found if it is random or early.',
            steps: [
              {
                key: 'decide', title: 'What the fit says, and the plan', per: 'line', answer: 'form', role: 'eng', after: ['log-before'],
                fields: [
                  { key: 'reading', label: 'What the fit says (early, random or wear)', type: 'choice', options: ['Early — how it is started', 'Random — find the cause', 'Wear — service before it fails'], required: true },
                  { key: 'interval', label: 'The service interval planned', type: 'number', unit: 'h' },
                  { key: 'cause', label: 'The cause, where it is early or random', type: 'text' },
                ],
                help: 'Read the shape on the log: wear (above 1.2) — set the service interval before the mean time between; random (around 1) — a service will not stop them, find the cause; early (below 0.9) — look at how it is started after a stop or a change.',
              },
              { key: 'done', title: 'The plan in place', per: 'line', answer: 'done', role: 'eng', evidence: { photos: 1 }, after: ['decide'] },
            ],
            gate: { conditions: [every] },
          },
          {
            key: 'prove', name: 'Prove it', purpose: 'The same log kept again.',
            steps: [{ key: 'log-after', title: 'Log every breakdown again', per: 'line', answer: 'log', role: 'op', minEntries: 10, columns, after: ['done'], analyses: reads }],
            gate: { conditions: [every] },
          },
        ],
        measures: [{ key: 'between', name: 'Time between failures', unit: 'h', better: 'higher', from: [{ step: 'log-before', field: 'between' }, { step: 'log-after', field: 'between' }] }],
      };
    },
  },
  /* A PROCESS HELD IN CONTROL — statistical process control, a tool no screen
     of Faultline's was written for, made of blocks written once (the control
     chart, the spread, the relationship, the histogram): readings in the
     order taken, read against limits set by their own variation; each
     signal's cause found and removed; logged again until there is none. No
     specification limit is invented: the chart needs none, and Cpk is added
     by giving the reading its at least and at most when adapting it. */
  {
    id: 'held-in-control', name: 'A process held in control', kind: 'improvement',
    purpose: 'Readings logged in the order they are taken and read on a control chart against limits set by their own variation; every signal’s cause found and removed; then logged again until the process holds with no signals.',
    words: ['control chart', 'spc', 'statistical process control', 'in control', 'out of control', 'variation', 'varies', 'drift', 'drifting', 'stable', 'unstable', 'fill weight', 'weight', 'seal strength', 'temperature', 'reading', 'readings', 'shewhart'],
    uses: [],
    build: (): FlowDefinition => {
      const columns = [
        { key: 'reading', label: 'Reading', type: 'reading' as const, required: true },
        { key: 'speed', label: 'Line speed', type: 'number' as const, unit: 'ppm' },
        { key: 'shift', label: 'Shift', type: 'choice' as const, options: ['Early', 'Late', 'Night'] },
        { key: 'note', label: 'What was happening', type: 'text' as const },
      ];
      /* a decision on what is found: a cause looked for only when the chart signalled */
      const signalled: FlowStepDef['onlyIf'] = { step: 'log-before', field: 'signals', op: '>', value: 0 };
      const read = (more: FlowStepDef['analyses'] = []): FlowStepDef['analyses'] => [
        { key: 'signals', label: 'Signals', block: 'control', of: 'reading' },
        { key: 'average', label: 'Average', block: 'mean', of: 'reading' },
        { key: 'spread', label: 'Spread', block: 'sd', of: 'reading' },
        ...(more ?? []),
      ];
      return {
        schema: FLOW_SCHEMA, name: 'A process held in control', kind: 'improvement',
        purpose: 'Readings logged in the order they are taken and read on a control chart against limits set by their own variation; every signal’s cause found and removed; then logged again until the process holds with no signals.',
        roles: [{ key: 'op', name: 'Operator', side: 'site' }, { key: 'lead', name: 'Line lead', side: 'site' }, { key: 'quality', name: 'Quality', side: 'site' }],
        stages: [
          {
            key: 'read', name: 'Read it as it runs', purpose: 'Twenty readings or more, in the order taken, with what was happening.',
            steps: [{
              key: 'log-before', title: 'Log the readings as they are taken', per: 'line', answer: 'log', role: 'op', minEntries: 20, columns,
              analyses: read([
                { key: 'shape', label: 'The shape of the readings', block: 'histogram', of: 'reading' },
                { key: 'with_speed', label: 'The reading and line speed', block: 'relation', of: 'reading', against: 'speed' },
              ]),
              help: 'One entry a reading, in the order it was taken, with the line speed and anything happening at the time. Strike a mistype — never delete it.',
            }],
            gate: { conditions: [every] },
          },
          {
            key: 'cause', name: 'The cause of each signal', purpose: 'What changed when the chart signalled, found and removed — needed only when it signalled.',
            steps: [
              {
                key: 'why', title: 'What changed at each signal', per: 'line', answer: 'form', role: 'lead', after: ['log-before'], onlyIf: signalled,
                fields: [
                  { key: 'signals_seen', label: 'The signals, from the chart', type: 'text', required: true },
                  { key: 'changed', label: 'What changed then', type: 'text', required: true },
                  { key: 'cause', label: 'The cause', type: 'text', required: true },
                ],
              },
              { key: 'removed', title: 'The cause removed', per: 'line', answer: 'done', role: 'lead', evidence: { photos: 1 }, after: ['why'], onlyIf: signalled },
              { key: 'quality', title: 'Quality agrees it', per: 'line', answer: 'signoff', role: 'quality', after: ['removed'], onlyIf: signalled },
            ],
            gate: { conditions: [every] },
          },
          {
            key: 'hold', name: 'Prove it holds', purpose: 'Twenty readings again, with no signal.',
            steps: [{ key: 'log-after', title: 'Log the readings again', per: 'line', answer: 'log', role: 'op', minEntries: 20, columns, after: ['quality'], analyses: read() }],
            gate: { conditions: [every, { id: 'no-signals', type: 'fieldMeets', policy: 'block', step: 'log-after', field: 'signals', op: '=', value: 0, label: 'No signals on the chart' }] },
          },
        ],
        measures: [
          { key: 'signals', name: 'Signals', unit: 'signals', better: 'lower', target: 0, from: [{ step: 'log-before', field: 'signals' }, { step: 'log-after', field: 'signals' }] },
          { key: 'spread', name: 'Spread', better: 'lower', from: [{ step: 'log-before', field: 'spread' }, { step: 'log-after', field: 'spread' }] },
        ],
      };
    },
  },
];

export const libraryEntry = (id: string): LibraryEntry | undefined => LIBRARY.find(e => e.id === id);

const WORD = /[a-z0-9]+/g;
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'on', 'in', 'for', 'we', 'it', 'is', 'are', 'be', 'by', 'with', 'our', 'that', 'this', 'then', 'need', 'needs', 'want', 'have', 'has', 'at', 'from', 'as', 'so', 'line', 'get']);

/** HOW CLOSE A METHOD IS TO WHAT A PERSON SAID — the words they used found in
 *  its name, what it is for and its own words; a phrase ("root cause") counts
 *  more than a word. Worked out on the device, no assistant: the library is
 *  offered whether the assistant is on or not. */
export function closeness(said: string, m: { name: string; purpose: string; words?: readonly string[] }): number {
  const text = said.toLowerCase();
  const mine = new Set((text.match(WORD) ?? []).filter(w => w.length > 2 && !STOP.has(w)));
  if (!mine.size) return 0;
  const hay = `${m.name} ${m.purpose}`.toLowerCase();
  const theirs = new Set([...(hay.match(WORD) ?? []), ...(m.words ?? []).flatMap(w => w.toLowerCase().match(WORD) ?? [])]);
  let score = 0;
  for (const w of mine) if (theirs.has(w) || [...theirs].some(t => t.length > 4 && (t.startsWith(w) || w.startsWith(t)))) score += 1;
  for (const p of m.words ?? []) if (p.includes(' ') && text.includes(p.toLowerCase())) score += 2;
  return score;
}

/** The methods closest to what was said, closest first — only those it touches. */
export function closest<T extends { name: string; purpose: string; words?: readonly string[] }>(said: string, items: readonly T[], max = 3): T[] {
  return items.map(m => ({ m, s: closeness(said, m) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, max).map(x => x.m);
}
