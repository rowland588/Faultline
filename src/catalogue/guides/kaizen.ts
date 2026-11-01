/* GUIDES — the Kaizen event's Observe tools: the waste walk, the process flow chart, the spaghetti diagram and the video time study
 * (src/catalogue/guide.ts). Each says, in the page's own labels and the order a person meets them, what a step means, what to do there
 * and what you get — and nothing the page does not do. FC-021, FC-117 and FC-201 beside them: FC-117 and FC-201 are written elsewhere. */
import type { Guide } from '../guide';

export const KAIZEN_GUIDES: Record<string, Guide> = {
  'FC-005': {
    intro: 'For a walk of the line with the team — going to see, then saying which kind of waste each thing seen is, where it is and what it costs, so the list is ranked by money and not by who shouted loudest.',
    steps: [
      {
        step: 'Write the problem where you see it',
        means: 'A waste is a problem like any other on the register: a thing seen on the line that adds cost without changing the product. You do not make a second list for wastes — you write the problem, and say which kind it is.',
        doThis: 'Press Problem (or ＋ on a phone) at the machine, say what you see — “pallets wait for QA release” — take a picture if it helps, and put it on its line and machine. Do it on the walk, not afterwards from memory.',
        youGet: 'A problem on the register with its photo, its line and its machine, ready to be classed. Nothing yet says which waste it is.',
      },
      {
        step: 'Which waste is it?',
        means: 'Ohno named seven wastes and Liker added an eighth: transport, inventory, motion, waiting, over-production, over-processing, defects and unused talent. The class is for pointing at the right tool and the right cause — it is not for arguing which of two it is.',
        doThis: 'Open the problem and tap the one chip that fits best. A pallet standing for QA release is Waiting; film walked from the store is Transport; a second label check is Over-processing. If it is not a waste at all — a safety hazard, a breakdown — tap Not a waste. The page shows what the kind means and an example for food.',
        youGet: 'The problem carries its class and shows it on its row. A problem you have not classed stays “not classed yet”; one you tapped Not a waste is left out of the count.',
      },
      {
        step: 'Size it',
        means: 'A waste needs a size or it cannot be priced. Time wastes (waiting, transport, motion, over-processing) are sized in minutes a day; defects and over-production in packs thrown away a day; inventory in packs held. These are the three boxes already on the problem.',
        doThis: 'Type the minutes a day it costs the line, or the rejects a day because of it, or the packs on hold — one or more. An estimate from the walk is fine; the page will say it is an estimate. Leave a box empty if you do not know — nothing waits on it.',
        youGet: 'Under the boxes, the problem’s cost in the line’s own money: labour for the minutes, packs and contribution lost only if it stops the line, materials for rejects, and product held as money tied up.',
      },
      {
        step: 'By waste',
        means: 'The Problems page can group everything by kind. It ranks the kinds by what is lost a day, with the money in its parts — labour, packs lost, contribution, materials — never added into one number that hides which is which.',
        doThis: 'On Problems, tap By waste. Narrow it first to one line, one project or one person if you want that walk alone. Read the sentence at the top, then the rows from the biggest down.',
        youGet: 'A sentence like “7 open problems classed as waste. The biggest is Waiting: £600 labour · 39,600 packs lost · £7.9k contribution a day, most of it at Packer”, a row for each kind seen and the problems grouped under them.',
      },
      {
        step: 'Where they are',
        means: 'The same wastes by place — the machine each one is on. A place with several wastes of small size can matter as much as one big one, so the places are ranked too.',
        doThis: 'Read the line that starts “Where:”. Each machine shows how many wastes it has and what they cost a day. A problem on no machine counts as “the line”.',
        youGet: 'The places in order, biggest first — where to send the team first.',
      },
      {
        step: 'Where each one points',
        means: 'Each kind has its usual cure and the tool that measures it: waiting points to the stops Pareto and Andon calls; transport and motion to the spaghetti diagram and the process flow chart; inventory to kanban sizing. The page says if a tool is not built yet.',
        doThis: 'Read the line “… points to …” for the biggest kind and open that tool to measure it properly. The size on the problem was an estimate; the tool replaces it with a measurement.',
        youGet: 'The next tool to use, named, with its catalogue number — and a plain “not built yet” where there is none.',
      },
      {
        step: 'Put it right, and see it go',
        means: 'A waste walk that never closes anything is theatre. When a waste is put right, close the problem: it leaves the money and is counted as put right in the last four weeks.',
        doThis: 'Give the problem an owner and a day, do the fix, and close it with the proof. Come back to By waste after a week.',
        youGet: '“Last 4 weeks: 7 wastes raised, 3 put right, 4 still open” — the walk after the walk.',
      },
      {
        step: 'On paper',
        means: 'The Problems report carries the same walk, so the meeting sees what the page shows, and each problem’s report card names its waste.',
        doThis: 'Open Report ▾ on Problems and choose the Problems report. The block “The eight wastes seen” comes after the tiles. Print a card for any problem to put on the board.',
        youGet: 'A page that says the biggest waste, what each kind costs, where they are and what to use next — and the cautions: estimates are indicative, and waste is in the process, not the person.',
      },
    ],
    watch: 'Do not name a person as the waste. Waste is in the process; a walk that blames people ends the walks. And storage and inspection that the law or the HACCP plan requires are not waste to remove — they may be waste to shorten.',
  },
};
