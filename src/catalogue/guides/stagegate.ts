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
};
