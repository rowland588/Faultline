/* GUIDES — Theory of Constraints: the tools that keep a line's constraint fed and its losses at the constraint (src/catalogue/guide.ts).
 * Each says, in the page's own labels and the order a person meets them, what the step means, what to do and what you get. */
import type { Guide } from '../guide';

export const TOC_GUIDES: Record<string, Guide> = {
  'FC-046': {
    intro: 'For a line where one machine stops and the next one stalls — the filler stops and the bagger starves, the bagger stops and the case packer blocks. It says how long the conveyor or table between them can cover a stop, how long it takes to come back, and which stops ran past it.',
    steps: [
      {
        step: 'Can collect after',
        means: 'How many packs, trays or bags can sit on the conveyor or accumulation table between this machine and the next one without either of them having to stop. It is the room that lets a short stop pass.',
        doThis: 'On each station of the Line capacity sheet, type what can collect after it, in that station’s own unit — worked from the conveyor’s length and the pitch of the pack, or counted when it is full. Leave it empty where nothing can collect.',
        youGet: 'The buffer the block works from. With none written down, the block only says what to write — it will not guess a buffer.',
      },
      {
        step: 'The stops',
        means: 'The stops the floor timed in Capture on each machine over the last four weeks. The block reads them; there is nothing to type here. A changeover is the whole line’s planned stop and a wait is a neighbour’s, so neither counts as that machine’s own.',
        doThis: 'Keep timing stops at the machine in Capture as you do now, naming the machine the same way as on the sheet. Five or more stops on a machine are wanted before a buffer is sized from them.',
        youGet: 'A list of each machine’s own stops with their lengths, which the buffer is tested against.',
      },
      {
        step: 'Holds',
        means: 'The minutes of the bottleneck’s work that what can collect covers: the packs that can sit there divided by how fast the bottleneck eats them. A stop shorter than this costs the bottleneck nothing.',
        doThis: 'Read it against the machine’s usual stops. If the buffer holds 6.7 minutes and the machine often stops for ten, the buffer is too small for the stops you really have.',
        youGet: 'A number of minutes per machine beside the bottleneck, and the weakest link named — the smallest cover.',
      },
      {
        step: 'Back in',
        means: 'How long the buffer takes to refill after it has been run down — the packs it holds divided by how much faster the stopped machine runs than the bottleneck. A buffer that is not back before the next stop gives less cover next time.',
        doThis: 'Compare it with how often the machine stops, which the page works out when the planned hours a week are on the sheet. If it takes longer to come back than the machine goes between stops, the buffer is never full: the fix is the margin (how much faster the machines either side run), not a bigger buffer.',
        youGet: 'Minutes to come back, and a plain sentence saying whether it is back before the next stop.',
      },
      {
        step: 'Ran past',
        means: 'How many of the logged stops were longer than what the buffer holds, so the bottleneck starved or blocked for the rest, and what that cost: the minutes, the packs not made and the pounds.',
        doThis: 'Read the count first — 4 of 10 — then the packs. Those are the stops to attack (shorter stops) or to cover (a bigger buffer). It is amber only when stops ran past the cover.',
        youGet: 'The minutes, the packs and, with a margin on the line, the pounds the bottleneck lost to stops its buffer could not cover.',
      },
      {
        step: 'Would hold',
        means: 'The buffer that would have covered the machine’s usual long stop — the stop that 9 in 10 were shorter than — worked as that length times the bottleneck’s speed. It needs five or more logged stops.',
        doThis: 'Compare it with what is written under Can collect after. If it is far bigger than the room you have, shorten the machine’s long stops instead.',
        youGet: 'A number of packs: the buffer that would cover the usual long stop, and how many more than today’s it is.',
      },
      {
        step: 'In money',
        means: 'What the starved minutes cost: a minute lost at the bottleneck is a minute of the whole line, so it is the packs not made times what a pack earns. If it can be made up later, it is not a loss.',
        doThis: 'Give the line a margin a pack in Set up the line (or the product its price and materials). Both are optional — leave them out and the page still says the packs and names the one thing missing.',
        youGet: 'The pounds of contribution lost to stops the buffer could not cover, said “if it cannot be made up”.',
      },
    ],
    watch: 'A buffer sized for the average stop is too small for the long ones — and the long ones are the ones that cost output. Size it against the longest usual stop, and check it comes back before the next one.',
  },
};
