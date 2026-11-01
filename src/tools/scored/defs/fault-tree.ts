import { uid } from '../../../lib/ids';
import { faultAnalyse, faultStart } from '../../faulttree/fault';
import type { ScoredDef } from '../types';

/* FC-152 — fault tree analysis: a top event, AND and OR gates under it, basic events with probabilities; the minimal cut sets, the exact top probability for
   independent events, the single points and the importance of each event (IEC 61025). Specification: knowledge/specs/FC-152-fault-tree.md.
   Arithmetic and words: src/tools/faulttree/fault.ts. */
const def: ScoredDef = {
  key: 'fault-tree',
  fc: 'FC-152',
  title: 'Fault tree',
  says: 'What combinations of failures cause the top event — the cut sets, the single points, and the probability of it happening',
  group: 'Risk and control',
  question: 'What combinations of failures cause the top event — and which single event or pair carries most of the risk?',
  scales: [],
  limits: [
    'Only AND and OR gates are drawn (IEC 61025 also has voting, inhibit and priority gates); the tree is an indented outline, not a diagram; common-cause failure beyond a cause marked the same event under two branches is not modelled.',
    'The probability is exact only for independent basic events, each given as a probability for the same period; the page does not estimate a basic event’s probability — it is typed.',
    'The tree is not yet raised from the 5 Whys or an 8D’s causes, and is not on the line’s page, Needs you or the control room; it is a register on the line or project.',
    'No cost is stated unless what one occurrence of the top event costs is given; the expected cost is probability × cost, a figure to weigh a control against, never a forecast.',
  ],
  noun: 'event',
  register: {
    analyse: ({ rows, ctx }) => faultAnalyse({ rows, ctx }),
    start: () => faultStart(uid),
    asks: { name: 'What is the top event this tree explains?', placeholder: 'e.g. Metal reaches a consumer in a pack', empty: 'No fault tree yet — name the failure to explain, then add the causes under it: an AND gate when all must happen, an OR gate when any one will do.', noun: 'event', newLabel: 'New fault tree' },
  },
  examples: [{
    name: 'Metal reaches a consumer in a pack — three ways in, three ways past the detector (per year)',
    rows: [
      { id: 't', name: 'Metal reaches a consumer in a pack', tree: { gate: 'AND' } },
      { id: 'a', name: 'Metal gets into the product', tree: { parent: 't', gate: 'OR' } },
      { id: 'a1', name: 'Screen mesh breaks', tree: { parent: 'a', p: 0.02 } },
      { id: 'a2', name: 'Maintenance leaves a part in the line', tree: { parent: 'a', p: 0.01 } },
      { id: 'a3', name: 'Metal in supplied material', tree: { parent: 'a', p: 0.005 } },
      { id: 'b', name: 'The metal is not removed', tree: { parent: 't', gate: 'OR' } },
      { id: 'b1', name: 'Detector sensitivity drifts and is not caught', tree: { parent: 'b', gate: 'AND' } },
      { id: 'b1a', name: 'Sensitivity drifts', tree: { parent: 'b1', p: 0.1 } },
      { id: 'b1b', name: 'Hourly test-piece check missed', tree: { parent: 'b1', p: 0.05 } },
      { id: 'b2', name: 'Reject mechanism fails', tree: { parent: 'b', p: 0.01 } },
      { id: 'b3', name: 'Detector bypassed during a fault', tree: { parent: 'b', p: 0.02 } },
    ],
    /* scripts/knowledge/cases-t8-3.py — the same tree by brute force over every state of the seven basic events */
    expect: { counts: { single: 0, combination: 9 }, order: [], verdict: 'Top 0.12%' },
  }],
};

export default def;
