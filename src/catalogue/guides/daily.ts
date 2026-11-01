/* GUIDES — the tiered daily meeting (FC-198), a document of the document shape (FC-240), which carries the shared steps. */
import type { Guide } from '../guide';

export const DAILY_GUIDES: Record<string, Guide> = {
  'FC-198': {
    intro: 'For the ten-minute meeting at the start of a shift, standing at the board: what went wrong yesterday, who is fixing it by when, and what has to go up a tier.',
    steps: [
      {
        step: 'The meeting',
        means: 'Which tier it is — the line’s, the area’s or the site’s — the day, and who led it. A tiered meeting is short and standing; one that runs long has become a report.',
        doThis: 'Pick the tier, give the day, name the person who led it and who was there, and say how long it ran.',
        youGet: 'A meeting with a leader and a day, the page the rest hangs on.',
      },
      {
        step: 'Yesterday, by letter',
        means: 'Safety, quality, delivery, cost and people, each on target or off — red or green, with the word beside the colour. Where there is a number, the actual is set against its target so a green that is really a red is caught.',
        doThis: 'Add a row for each letter. Say what happened in a few words and, where you have it, type the actual and the target and whether the target is at least or at most. Take the figures from yesterday’s records — the loss count, the count of packs, the register.',
        youGet: 'The letters read, the reds named, and a note against any colour that contradicts its figures.',
      },
      {
        step: 'The actions raised',
        means: 'Every red gets an action, or the reason there is none. An action has one name and one day, or it is nobody’s.',
        doThis: 'Add a row for each action: the letter it is for, what, who and by when. For a red with nothing to do — a planned stop — add a row that is the reason there is none. Type how many actions closed since the last meeting and how many are still open.',
        youGet: 'The reds answered, of the reds — and a note naming any red with no action or reason, and any action with no name or day.',
      },
      {
        step: 'Escalated to the tier above',
        means: 'What this tier cannot fix goes up the same morning, and the tier above answers the same day. An escalation with no reply teaches the floor not to bother.',
        doThis: 'Add what went up and the day. When the tier above answers, mark it answered with the day and what they said.',
        youGet: 'What went up, what is still waiting, and a note once an escalation has waited a day.',
      },
      {
        step: 'Close the meeting',
        means: 'The leader puts a name and a day on the meeting. It is then locked, so the record of what was agreed cannot quietly change.',
        doThis: 'When every red has an answer and the actions have names and days, the leader closes it.',
        youGet: 'The status Closed with who and when, on the page and the paper — the day’s update, ready to send up.',
      },
    ],
    watch: 'A meeting that reads yesterday’s numbers and raises no actions is a report. The test is the actions with a name and a day, not the colours on the board.',
  },
};
