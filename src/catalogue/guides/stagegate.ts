/* GUIDES — the stage gate's tools (docs/METHODS.md §7; src/catalogue/guide.ts).
 * Each says, in the page's own labels and in the order a person meets them, what a step means, what to do there and what comes out of it —
 * and nothing the page does not do. */
import type { Guide } from '../guide';

export const STAGEGATE_GUIDES: Record<string, Guide> = {
  'FC-215': {
    intro: 'For a new line with several machines coming and many steps to do: it shows which late delivery or step would push the handover back, and which ones have days to spare. Open it from a stage-gate project and it reads the project’s own plan.',
    steps: [
      {
        step: 'This project’s plan',
        means: 'The plan the project already holds, worked as a chain: each machine arrives on its due date, then its steps follow, each lasting the days it is booked for. Nothing is typed again.',
        doThis: 'Check that every machine has a due date and every step has a day booked. A step with no day is listed under “Left out of the chain” — book it on the Timeline and it joins.',
        youGet: 'Earliest finish, in days from today and as a date — the soonest everything can be done if each step starts the moment it may.',
      },
      {
        step: 'Waits for',
        means: 'What has to be finished before a step can start. The page starts from the dates — a step waits for the steps booked just before it on its machine — and tells you which waits are only its proposal.',
        doThis: 'Where the real order is different — line trials need both machines, a rigger is shared — press Waits for on the step and tick what it truly waits for. Only the owner can; the team and the client read it. Keep the plan’s order for every step stores the proposal as agreed.',
        youGet: 'The owner’s word on each step, kept with the project. A circle of waits is refused in words before it is saved.',
      },
      {
        step: 'Against handover',
        means: 'The handover date the project agreed, set against the earliest finish the chain of waits allows. Days in hand means room; days short means the date cannot be met however hard everyone works.',
        doThis: 'Read this tile and the sentence under the tiles first. If days are short, either the date or the chain has to change — look at which machine decides it.',
        youGet: 'Days in hand or days short, and the machine whose chain decides the handover.',
      },
      {
        step: 'Machine by machine',
        means: 'Each machine’s chain is either critical — a day lost on it is a day later at the handover — or has float, the days it can slip before the handover moves. Near critical means float so small that one more slip makes it critical.',
        doThis: 'Chase the critical machine’s steps first. A machine with float can wait; one within a couple of days of critical is worth watching. Change the near-critical limit to suit the plan.',
        youGet: 'A row per machine, the plan drawn as bars (dark for critical, a dashed tail for float), and the steps left with their days and float.',
      },
      {
        step: 'If a step is late',
        means: 'A what-if on one step: if it takes longer than booked, does the handover move? A step with float absorbs the slip; a critical step passes all of it on.',
        doThis: 'Choose a step and type how many days late it is. Try the delivery your OEM is nervous about.',
        youGet: 'A sentence saying how many days the handover moves — or that it does not — and what that slip costs.',
      },
      {
        step: 'A day late costs',
        means: 'A day lost on the critical path is a day the project’s lines are not making product. It is priced from the lines’ speed, shifts and margin a pack on the Factory page — the same figure the Timeline’s money tile uses.',
        doThis: 'If it says what is missing — a speed, the shifts, a margin — give it on the Factory’s Lines page. Nothing else waits on it.',
        youGet: 'A cost for a day, and for the slip you are trying, or the name of the one thing still needed.',
      },
      {
        step: 'New calculation',
        means: 'The same arithmetic on a network you type: up to 16 tasks, each a letter with its days and the letters it waits for. It is for trying a different plan before it is booked.',
        doThis: 'Press New calculation, name it, and type the tasks. Save the figures as the before, change them, and the next answer reads as a before and after.',
        youGet: 'The critical path, each task’s float, and a paper of the what-if.',
      },
    ],
    watch: 'A wait left out makes a step look free, and a wait that is not real makes it look critical. The chain is only as true as what each step is said to wait for — check them with the people doing the work, and look again as steps finish.',
  },
  'FC-222': {
    intro: 'For the question a shift manager dreads: if one person is off, can we still run the machine? It shows who can do each important task, at what level, and the places where only one person can.',
    steps: [
      {
        step: 'Cover wanted',
        means: 'How many people you want able to do each task alone on every shift — one running it, one to cover, one on leave or in training. It starts at 3, which is common practice, not a rule.',
        doThis: 'Keep 3, or type the number you really want. A task that needs a different number takes its own in the task’s “wanted” box.',
        youGet: 'The line every task and shift is measured against: below it is a gap, and exactly one person where more are wanted is a single point of cover.',
      },
      {
        step: 'Tasks across the top',
        means: 'The few jobs that matter — a machine’s set-up, a CCP check, a clean that the auditor asks about. Not every job on the line: a matrix of everything hides the ones that stop production.',
        doThis: 'Name each task in the headings. Give “matters” a number from 1 to 5 for the ones that would hurt most, so their training comes first.',
        youGet: 'The columns of the matrix, and the order the training will be listed in.',
      },
      {
        step: 'People and their shifts',
        means: 'Everyone who might run these tasks, with the shift each works. The shift matters: cover added up across days and nights hides the night when only one person can do the job.',
        doThis: 'Type each name and their shift as it is said on site — Days, Nights. Leave the shift empty only if the line runs one shift, and the page will say cover is counted across everyone.',
        youGet: 'The rows of the matrix, and cover counted shift by shift.',
      },
      {
        step: 'A level in each cell',
        means: 'How far each person can do each task: learning, can do it with help, can do it alone to the standard (U), or can teach it (O). Only U and O count as cover — someone still learning cannot be left on their own.',
        doThis: 'Choose a level for each person on each task. Mark it only when the person who taught them agrees; “can do” said by the person themselves is a guess. Leave a cell not marked if they have not been trained.',
        youGet: 'The matrix, with each person’s count of tasks they can do alone.',
      },
      {
        step: 'Cover and single points',
        means: 'Under each task, the number of people at U or O on each shift against the number wanted. A single point is a task one person holds on a shift: when they are off, the line cannot run it.',
        doThis: 'Read the sentence and the tiles first — single points, nobody, how many cells are at the cover wanted, tasks nobody can teach. Red is a task and shift where nobody can run it alone.',
        youGet: 'A verdict in words: how many single points, which tasks and which shifts, and who holds them.',
      },
      {
        step: 'Training to do first',
        means: 'The gaps put in order: the tasks that matter most first, then the ones furthest below the cover wanted. A task with cover but nobody who can teach it cannot grow its cover until someone is trained to teach.',
        doThis: 'Take the top rows of the list to the team meeting and agree who trains whom, by when. Put each on the project’s actions.',
        youGet: 'A ranked list of who to train on what, with how many more people each task needs.',
      },
      {
        step: 'What a shift not making costs',
        means: 'A single point is a shift the line cannot run when that person is off. This prices it with what a shift of the line not making costs — typed, or taken from the line’s speed, shifts and margin.',
        doThis: 'Press the line’s figure, or type your own. Leave it blank if you do not know; the page names what is missing and carries on.',
        youGet: 'The cost of a shift at risk. There is no yearly figure — how often people are off is not known here, so none is guessed.',
      },
    ],
    watch: 'This is read for the gaps, not for the people. A matrix that embarrasses people empties itself — and a level nobody has re-checked in a year is only a guess.',
  },
};
