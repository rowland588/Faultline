/* GUIDES — the calculators (src/tools/calc; src/catalogue/guide.ts).
 * One guide for the hub, written once for every calculator: they share one page, one form, one answer, one paper
 * (knowledge/specs/FC-235-calculators.md). A calculator’s own boxes are explained on its page, each with its unit and where on
 * the floor to find it. */
import type { Guide } from '../guide';

export const CALC_GUIDES: Record<string, Guide> = {
  'FC-235': {
    intro: 'For a sum you do again and again for different situations — how many kanbans, when to reorder film, what a sampling plan protects, how long product waits in a chiller. Every calculator is one page with the same parts, so this guide is written once for all of them; each calculator’s own page says what its boxes mean.',
    steps: [
      {
        step: 'Pick a calculator',
        means: 'Calculators are grouped by what they are for, each a card with what it does and how many you have saved. A calculator is a method: the same formula and the same words every time, with your figures in it.',
        doThis: 'Open Calculators from Tools and pick the card whose question is yours. On its page read the question it opens on, then press “New calculation”, or open one already saved.',
        youGet: 'The calculator’s page: what it is for, the calculations saved on it, and “New calculation”. Inside a line or a project the list is that line’s or that project’s.',
      },
      {
        step: 'Name it',
        means: 'A calculation is a saved set of figures for one situation. Naming it for the situation, and putting it on a line, is what lets you find it again and lets the line’s cost figures be offered.',
        doThis: 'In the sheet type “What is it of?” (“Film reels for the packer”) and, if you like, pick “Which line?” — or leave “No line yet — a quick session” — then press Start it.',
        youGet: 'An empty calculation on its own page, on the line you chose, or in the project you are working in.',
      },
      {
        step: 'The figures',
        means: 'The boxes on the left, each with its unit and a line saying where on the floor to find it. A box marked optional may be left blank. A starting point that is Luna’s own, not a measurement, says so: “A choice, not a measurement”.',
        doThis: 'Type each figure as you have it; the answer is worked out as you type and saved a moment after the last key. A figure that cannot be right is refused in words beside its box. One that is doubtful is flagged under “Check these” without stopping the answer.',
        youGet: 'A calculation that waits, saying what it needs (“Waiting for the figures”), until it can be worked out — then the answer.',
      },
      {
        step: 'The answer',
        means: 'Beside the figures: tiles with the numbers, one sentence that says what they mean, a picture where the method earns one, and “How it is worked out” line by line with your numbers in it. The result is worked out again from the figures each time, never stored.',
        doThis: 'Read the sentence first, then the tiles, then open how it is worked out and check it against your own arithmetic. Anything under “Check these” is a figure to look at again.',
        youGet: 'A verdict in a few words on the band, the sentence, the tiles, the working and a closing line saying where things stand.',
      },
      {
        step: 'In money — all optional',
        means: 'What the answer costs or saves, where the method has a cost. Money is one output among the calculator’s own units, never its verdict: leave any figure blank and the answer still comes, with a line saying what to add.',
        doThis: 'Open “In money — all optional”. Where the line holds a figure — the wage with on-costs, a pack’s materials, packs a minute, the margin a pack — the page offers it with one tap; where it does not, it says where to give it. Type the others from your own records.',
        youGet: 'The finding in pounds with its “because”, or a sentence naming the input still missing. No figure is invented.',
      },
      {
        step: 'What this does not say',
        means: 'Every calculator lists what it cannot tell you and when not to trust it — its assumptions, in plain words.',
        doThis: 'Read the list before you quote the answer to anyone. A sampling plan, for instance, decides lots at stated risks; it does not prove a lot good.',
        youGet: 'The limits of the answer, kept with it on the screen and on the paper.',
      },
      {
        step: 'Save as before',
        means: 'Saving the figures as they are now keeps them as a before, so that after you change one, the tiles say what moved: “2 kanbans fewer than the saved before”.',
        doThis: 'Once the answer is worked out press “Save as before”, then change a figure — a new reel size, a shorter lead time. “Save these as the new before” moves the mark on; “Clear the before” takes it off.',
        youGet: 'A before → after: the saved sentence, the figures that changed, and the movement on every tile. One before is kept; a second change reads against it until you save another.',
      },
      {
        step: 'What if…',
        means: 'A trial that costs nothing: change one figure and see the answer and the money move, without touching the record.',
        doThis: 'Under “What if…” pick a figure, type or choose another for it and read the table of Now, If and Change. Press “Make it so” to put it into the figures, or Clear to leave it.',
        youGet: 'The answer as it would be, beside the answer now. Nothing is kept until you press Make it so.',
      },
      {
        step: 'On paper and on the line',
        means: 'The paper is made from the same result as the screen, so the two cannot disagree: the verdict, the tiles, what it says, the picture, the figures put in and where each came from, the working, the money, the saved before and what it does not say.',
        doThis: 'Open Report ▾ on the calculation and take its paper; on a list take the paper marked “every one shown”. The Action plan on the page lists what has been raised from the calculation.',
        youGet: 'A paper to show the meeting, and the calculation listed on its line and in the line report. A client can read it and take its paper but cannot change the figures.',
      },
    ],
    watch: 'A saved calculation is read again by its calculator as it stands now: if a calculator is improved later, what an old calculation says can change — its figures never do. The answer is only as good as the figures: count, time or read them from a record, do not guess them.',
  },
};
