/* GUIDES — the documents that teach (FC-225 the procedure; FC-223 the job breakdown; FC-224 the one-point lesson), each a document of the
 * document shape (FC-240), which carries the shared steps (naming, filling in, agreeing, the paper). These say what is their own. */
import type { Guide } from '../guide';

export const TEACH_GUIDES: Record<string, Guide> = {
  'FC-225': {
    intro: 'For a set-up, a clean or a changeover that has to be done the same way on every shift — written as short steps with a photo each, so it can be read at the machine instead of in a binder.',
    steps: [
      {
        step: 'The procedure',
        means: 'What the job is, what it is for, which machine and line it belongs to, and who keeps it right. The version and the review day say when it was last true.',
        doThis: 'Name the job as the floor does (“Changeover to the 500 g pack”), pick what it is for, name the person who keeps it, and set the day it will be read again against the machine.',
        youGet: 'A procedure with an owner and a review day — the one thing that stops it drifting from the way the work is really done.',
      },
      {
        step: 'The steps',
        means: 'One action a step, a verb first, in the order they are done. The key point — the knack that makes or breaks the step — goes in “How”, not in the step.',
        doThis: 'Press Add for each step. Mark the ones that need care (safety, quality, food safety, allergen) and give the seconds if you know them.',
        youGet: 'The numbered steps, how many need care, and a total time when every step has its seconds. More than twelve steps is said, because that is a binder, not a page at the machine.',
      },
      {
        step: 'The photos',
        means: 'The picture is the instruction. A photo belongs to a step by the number its caption starts with.',
        doThis: 'Take or choose a photo for each step and start its caption with the step number — “3 — guide at 2 mm”. Photograph the steps that need care first.',
        youGet: 'How many steps have a photo, the steps that have none, and the care steps still without a picture.',
      },
      {
        step: 'Agree it',
        means: 'The line manager puts a name and a day on it. After that it is locked, so what is on the wall is what was approved.',
        doThis: 'Read it against the machine with someone who does the job; when the status says Ready to agree, the line manager agrees it. Reopen it — do not overtype it — when the machine or the pack changes.',
        youGet: 'The status Agreed, with who and when, on the page and on the paper.',
      },
    ],
    watch: 'A procedure is only as good as the last time someone checked it against the machine. If nobody has read it since the machine changed, it is a record of how the job used to be done.',
  },
  'FC-223': {
    intro: 'For teaching a job so that everyone does it the same way, right and safely — by taking it apart first, then teaching it one step at a time and signing people off only after they have done it.',
    steps: [
      {
        step: 'The job',
        means: 'Which task is taught, the standard it is taught to, who teaches it and who a learner goes to afterwards. The breakdown teaches the standard; it is not the standard.',
        doThis: 'Name the task as the floor does, say why it needs teaching (the stop, reject or injury a badly done job causes), and name the instructor — someone who does it well.',
        youGet: 'A job with an instructor and a reason, the page the learners are signed off on.',
      },
      {
        step: 'Important steps, key points and reasons',
        means: 'Not every motion: the five to twelve steps that advance the job. Each has one to three key points — what would make or break the step, safety first — and a reason for each, so a learner knows why, not only what.',
        doThis: 'Press Add for each step. Type its key points in one box and the reasons in the next, in the same order, separated by semicolons. Mark a step if a key point is about safety. Ask the people who do the job: what is hard, what goes wrong, what is the knack.',
        youGet: 'The breakdown sheet, a count of steps and key points, and a note against any step with no key point, too many, or a key point with no reason.',
      },
      {
        step: 'The learners — prepare, present, try out, follow up',
        means: 'Put the learner at ease and say the job; show one step at a time, then again with the key points, then with the reasons; let them do it silently, then say the steps, the key points and the reasons back; then put them on their own with someone to go to. The try-out is the proof.',
        doThis: 'Add each learner with the day you taught them. Mark the try-out Signed off only when they have done it right and said it back — not at the presentation — and give the day. Mark To try again if not. Mark the 30-day re-check when it is done.',
        youGet: 'How many are trained and signed off, the days from teaching to sign-off, who is to try again, and the re-checks due and overdue.',
      },
      {
        step: 'What teaching it well is worth',
        means: 'The paid time a learner takes to reach the standard, taught by the breakdown against taught by watching someone, for the people taught.',
        doThis: 'Type the hours to the standard each way, from the last people who learned it each way, and one person’s £ an hour (the line’s is offered). Optional — nothing waits on it.',
        youGet: 'The paid hours saved and what they cost, or the one input still to give.',
      },
    ],
    watch: 'Signing someone off at the presentation, before the try-out, signs off nothing — and puts an untrained person on the machine with a signature beside them.',
  },
  'FC-224': {
    intro: 'For sharing one fix, one knack or one piece of knowledge with every shift today — a page of pictures taught at the machine in ten minutes, with the proof of who has been taught.',
    steps: [
      {
        step: 'The lesson',
        means: 'One point, and the kind it is: basic knowledge (how a gauge should read), a trouble case (what went wrong, why, what to look for) or an improvement case (what we changed and what it did). If it needs three points, it is a procedure.',
        doThis: 'Give the point a title, say it in a sentence or two, say why it matters and what to check and when, and put your name and the day on it. For a trouble case, say whether the trouble has come back since.',
        youGet: 'A lesson with an author and a day. A trouble that has come back is flagged as a cause not found, not a lesson to teach again.',
      },
      {
        step: 'The pictures',
        means: 'The picture is the lesson. The right way, and for a trouble case the wrong way, so the difference can be seen from across the machine.',
        doThis: 'Photograph the right way and the wrong way at the machine, and say in the caption what to look at. Add the lines it is offered to.',
        youGet: 'The photos on the page and the paper, and a note if there is no picture.',
      },
      {
        step: 'Who should know — and has been taught',
        means: 'Everyone who needs this lesson, by shift, with the day each was taught it at the machine. The grid is the measure: a sheet pinned up and never taught teaches nobody.',
        doThis: 'Add each person with their shift, and give the day when you have taught them. Teach it at the machine, five to ten minutes.',
        youGet: 'Coverage overall and by shift, who is still to be taught, and a flag once a week has passed — that is the team leader’s action.',
      },
    ],
    watch: 'A lesson that contradicts the standard is wrong — or the standard is. Update the standard first.',
  },
};
