/* PROBLEMS, AND THE WAY THROUGH THEM — the directory's first door
 * (knowledge/README.md). A person on the floor does not ask for "binomial
 * capability"; they say "we're rejecting too many". Each route starts from
 * the floor's words and asks the questions a good engineer would, in order,
 * with the catalogue entries that answer each and when each applies. Not a
 * sequence to follow every time: the right step depends on the question, the
 * evidence there is, and the process. */
import type { ProblemRoute } from './types';

export const PROBLEMS: ProblemRoute[] = [
  {
    id: 'rejects', title: 'We’re rejecting too many', words: ['rejects', 'defects', 'scrap', 'waste', 'reject rate', 'failures', 'bad packs'],
    steps: [
      { ask: 'What share is rejected, and how sure is that figure?', ids: ['FC-098', 'FC-104'], when: 'Count rejects out of what was made, run by run.' },
      { ask: 'Which kinds of reject make most of it?', ids: ['FC-124', 'FC-125'], when: 'Tally each reject by type, then rank them.' },
      { ask: 'Is the reject rate steady, or did some runs reject far more than chance?', ids: ['FC-088'] },
      { ask: 'Can we trust the check that rejects?', ids: ['FC-119', 'FC-121', 'FC-164'], when: 'A checkweigher or detector rejects by measurement; people reject by eye.' },
      { ask: 'If the reject is decided by a measurement (weight, seal strength), does the measurement meet its limits?', ids: ['FC-094', 'FC-095', 'FC-097'], when: 'Measure the characteristic itself — it tells more from fewer packs than counting rejects.' },
      { ask: 'Where does it happen — lane, shift, product, head?', ids: ['FC-153', 'FC-108', 'FC-126'] },
      { ask: 'Why?', ids: ['FC-146', 'FC-149', 'FC-111'], when: 'The 6M for causes with evidence; is/is not for a sudden spike; an experiment to prove a setting.' },
      { ask: 'Did the fix work, and is it holding?', ids: ['FC-105', 'FC-133'] },
      { ask: 'What do the rejects cost?', ids: ['FC-189', 'FC-128'] },
    ],
  },
  {
    id: 'slow', title: 'The line won’t make its target', words: ['too slow', 'output', 'target', 'capacity', 'bottleneck', 'not making rate', 'behind'],
    steps: [
      { ask: 'What can the line make, and which station holds it?', ids: ['FC-034', 'FC-031'] },
      { ask: 'Is the bottleneck on paper the one holding it on the floor?', ids: ['FC-037'] },
      { ask: 'Where did today’s time go at the bottleneck?', ids: ['FC-049', 'FC-052'] },
      { ask: 'Which losses sit on the constraint — and which are a mirage?', ids: ['FC-038', 'FC-039'] },
      { ask: 'If people hold it, is their work balanced against takt?', ids: ['FC-032', 'FC-019', 'FC-022'] },
      { ask: 'What would it take to reach the target?', ids: ['FC-036'] },
    ],
  },
  {
    id: 'changeovers', title: 'Changeovers take too long', words: ['changeover', 'set up', 'downtime between products', 'cleandown'],
    steps: [
      { ask: 'How long is it, element by element, and what does it cost?', ids: ['FC-068'] },
      { ask: 'Is the order of products costing extra changeovers?', ids: ['FC-070'] },
      { ask: 'Is release after the changeover adding time?', ids: ['FC-071'] },
      { ask: 'Is it a cleandown?', ids: ['FC-072', 'FC-171'] },
      { ask: 'Now shorter — can we change more often and hold less?', ids: ['FC-069', 'FC-011', 'FC-182'] },
    ],
  },
  {
    id: 'giveaway', title: 'We’re giving product away', words: ['giveaway', 'overweight', 'overfill', 'heavy packs', 'target weight'],
    steps: [
      { ask: 'How much, and what is it worth?', ids: ['FC-094', 'FC-156'], when: 'Weigh a sample across the run.' },
      { ask: 'How low can the target go and stay legal at this spread?', ids: ['FC-157', 'FC-162'] },
      { ask: 'Are the readings bell-shaped and steady?', ids: ['FC-097', 'FC-091'] },
      { ask: 'On a combination weigher, which heads or feeds make it?', ids: ['FC-158', 'FC-107'] },
      { ask: 'Can the scale be trusted?', ids: ['FC-119'] },
    ],
  },
  {
    id: 'shortweight', title: 'Packs failing weight checks', words: ['short weight', 'underweight', 'e mark', 'weights and measures', 'TNE'],
    steps: [
      { ask: 'Does the batch pass the packers’ three rules?', ids: ['FC-162'] },
      { ask: 'Would it keep passing (the spread against T1)?', ids: ['FC-094', 'FC-097'] },
      { ask: 'Is the checkweigher right at speed?', ids: ['FC-164', 'FC-119'] },
      { ask: 'Would it pass the inspector’s reference test?', ids: ['FC-232'] },
    ],
  },
  {
    id: 'stops', title: 'A machine keeps stopping', words: ['breakdowns', 'stops', 'jams', 'downtime', 'unreliable', 'micro stops'],
    steps: [
      { ask: 'How often does it stop, and is it getting better or worse?', ids: ['FC-058', 'FC-055'] },
      { ask: 'Which stops cost the most, and are they chronic?', ids: ['FC-051', 'FC-052', 'FC-054', 'FC-053'] },
      { ask: 'How long does each take to clear?', ids: ['FC-059', 'FC-015'] },
      { ask: 'Is it on the constraint?', ids: ['FC-038'] },
      { ask: 'Why?', ids: ['FC-146'] },
      { ask: 'Is a part wearing out?', ids: ['FC-060', 'FC-062', 'FC-234'] },
    ],
  },
  {
    id: 'people', title: 'People can’t keep up, or stand waiting', words: ['labour', 'staffing', 'people', 'operators', 'idle', 'overloaded'],
    steps: [
      { ask: 'Is each person’s work balanced against takt?', ids: ['FC-032', 'FC-008'] },
      { ask: 'How long should each task take?', ids: ['FC-019', 'FC-021'] },
      { ask: 'What are people doing across the shift?', ids: ['FC-022'] },
      { ask: 'How many people does each station need?', ids: ['FC-031', 'FC-184'] },
      { ask: 'What does it cost a pack?', ids: ['FC-187', 'FC-188'] },
      { ask: 'Is anyone at risk from the work?', ids: ['FC-207', 'FC-208', 'FC-209'] },
    ],
  },
  {
    id: 'newline', title: 'We’re commissioning a new machine or line', words: ['commissioning', 'new line', 'new machine', 'installation', 'OEM', 'handover'],
    steps: [
      { ask: 'Where is it, gate by gate, and who owes what?', ids: ['FC-073', 'FC-081'] },
      { ask: 'Did it do what was agreed?', ids: ['FC-074', 'FC-075', 'FC-076'] },
      { ask: 'Does it hold its rate, and its tolerance?', ids: ['FC-083', 'FC-084'] },
      { ask: 'Is it getting more reliable as fixes go in?', ids: ['FC-058', 'FC-061'] },
      { ask: 'When will it hand over, and run at rate?', ids: ['FC-078', 'FC-077'] },
      { ask: 'Is production ready to take it?', ids: ['FC-082', 'FC-080', 'FC-178'] },
    ],
  },
  {
    id: 'seals', title: 'Seal failures and leakers', words: ['leakers', 'seal', 'leaks', 'blown packs', 'MAP'],
    steps: [
      { ask: 'Is the seal strong enough, consistently?', ids: ['FC-165', 'FC-095'] },
      { ask: 'How many leakers, from which lane or jaw?', ids: ['FC-098', 'FC-108', 'FC-126'] },
      { ask: 'Is the gas flush right?', ids: ['FC-167'] },
      { ask: 'Which settings drive it?', ids: ['FC-111', 'FC-110'] },
      { ask: 'Did the re-test prove the fix?', ids: ['FC-100'] },
    ],
  },
  {
    id: 'complaints', title: 'Customer complaints are rising', words: ['complaints', 'customer', 'foreign body', 'retailer'],
    steps: [
      { ask: 'Is the rate rising per million sold, and which type?', ids: ['FC-134'] },
      { ask: 'What is the cause, and what did we contain?', ids: ['FC-150', 'FC-146'] },
      { ask: 'What does it cost?', ids: ['FC-128'] },
    ],
  },
  {
    id: 'cost', title: 'Our cost a pack is too high', words: ['cost per pack', 'margin', 'labour cost', 'expensive'],
    steps: [
      { ask: 'What does a pack cost in labour, and why?', ids: ['FC-187', 'FC-188'] },
      { ask: 'What do our losses cost?', ids: ['FC-049', 'FC-189'] },
      { ask: 'What do changeovers cost?', ids: ['FC-068'] },
      { ask: 'What do give-away and rejects cost?', ids: ['FC-156', 'FC-098', 'FC-128'] },
      { ask: 'Where is material lost?', ids: ['FC-159', 'FC-160'] },
    ],
  },
  {
    id: 'measurement', title: 'We don’t trust the measurement', words: ['gauge', 'scale', 'measurement', 'disagree', 'calibration', 'probe'],
    steps: [
      { ask: 'Is the gauge fit for the tolerance?', ids: ['FC-119'] },
      { ask: 'Do people get the same answer?', ids: ['FC-118', 'FC-121'] },
      { ask: 'Is it calibrated and checked?', ids: ['FC-122', 'FC-120'] },
    ],
  },
  {
    id: 'drift', title: 'The process seems to drift', words: ['drift', 'unstable', 'variation', 'creeping', 'SPC'],
    steps: [
      { ask: 'Is it steady, or did it change — when?', ids: ['FC-086', 'FC-090'] },
      { ask: 'A small, slow creep?', ids: ['FC-091'] },
      { ask: 'Many products on one machine?', ids: ['FC-093'] },
    ],
  },
  {
    id: 'losttime', title: 'We can’t say where the shift went', words: ['lost time', 'efficiency', 'OEE', 'downtime', 'shift output'],
    steps: [
      { ask: 'Where did the shift’s time go, in minutes, packs and pounds?', ids: ['FC-049'] },
      { ask: 'Which stops, in order?', ids: ['FC-051', 'FC-052'] },
      { ask: 'Short stops and slow running?', ids: ['FC-055', 'FC-056'] },
    ],
  },
  {
    id: 'yield', title: 'We’re losing raw material', words: ['yield', 'material loss', 'trim', 'mass balance', 'food waste'],
    steps: [
      { ask: 'Where is material lost, stage by stage?', ids: ['FC-159'] },
      { ask: 'Are we over standard usage?', ids: ['FC-160'] },
      { ask: 'How much food is wasted, and why?', ids: ['FC-161'] },
    ],
  },
  {
    id: 'allergens', title: 'Allergen and hygiene changeovers worry us', words: ['allergen', 'hygiene', 'clean', 'swab'],
    steps: [
      { ask: 'Is each allergen clean validated and verified?', ids: ['FC-171', 'FC-172'] },
      { ask: 'Is the order of products right?', ids: ['FC-070'] },
      { ask: 'Can the clean be shortened safely?', ids: ['FC-072'] },
    ],
    caveat: 'Faultline improves the changeover; the site’s food-safety system remains the record of truth.',
  },
  {
    id: 'week', title: 'Will next week’s orders fit?', words: ['orders', 'plan', 'schedule', 'demand', 'capacity'],
    steps: [
      { ask: 'Will the week fit, and by how much?', ids: ['FC-040'] },
      { ask: 'Which products first if it does not?', ids: ['FC-042'] },
      { ask: 'Across all the lines?', ids: ['FC-048'] },
    ],
  },
  {
    id: 'handling', title: 'People are lifting or straining', words: ['manual handling', 'lifting', 'strain', 'injury', 'ergonomics'],
    steps: [
      { ask: 'Is the lift a risk?', ids: ['FC-207', 'FC-208'] },
      { ask: 'Is the repetitive work a risk?', ids: ['FC-209', 'FC-210'] },
    ],
    caveat: 'These are screens for a trained assessor, never a full risk assessment.',
  },
  {
    id: 'proof', title: 'Did our fix work?', words: ['did it work', 'proof', 'before and after', 'improvement'],
    steps: [
      { ask: 'Did the number move more than chance makes?', ids: ['FC-105', 'FC-201'] },
      { ask: 'Did a pass/fail re-test prove anything?', ids: ['FC-100'] },
      { ask: 'Is it holding, and will it?', ids: ['FC-146', 'FC-133'] },
      { ask: 'Can it go to the other lines?', ids: ['FC-155'] },
    ],
  },
  {
    id: 'leadtime', title: 'Product waits too long between steps', words: ['lead time', 'WIP', 'waiting', 'queue', 'shelf life'],
    steps: [
      { ask: 'Where does the time go from intake to despatch?', ids: ['FC-001'] },
      { ask: 'How long does product sit in each buffer?', ids: ['FC-044'] },
      { ask: 'Why do queues grow?', ids: ['FC-045'] },
    ],
  },
  {
    id: 'cover', title: 'One absence stops a line', words: ['skills', 'cover', 'training', 'absence'],
    steps: [
      { ask: 'Who can run what?', ids: ['FC-222'] },
      { ask: 'How do we teach it properly?', ids: ['FC-223', 'FC-224'] },
      { ask: 'How many heads per shift?', ids: ['FC-184'] },
    ],
  },
  {
    id: 'control', title: 'Am I in control of everything going on?', words: ['overview', 'control', 'status', 'late', 'actions'],
    steps: [
      { ask: 'Across every project and line?', ids: ['FC-193', 'FC-195'] },
      { ask: 'Who owes what by when?', ids: ['FC-194', 'FC-154'] },
      { ask: 'Today, hour by hour?', ids: ['FC-196', 'FC-198'] },
    ],
  },
];
