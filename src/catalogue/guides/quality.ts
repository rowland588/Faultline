/* GUIDES — quality engineering, choosing solutions, root cause and the check logs (the discipline's tools; src/catalogue/guide.ts).
 * Written from each tool’s real page, in its own labels and in the order a person meets them (docs/METHODS.md §15). */
import type { Guide } from '../guide';

export const QUALITY_GUIDES: Record<string, Guide> = {
  'FC-124': {
    intro: 'For counting the kinds of fault found on the packs of a run — leakers, mislabels, crushed packs, foreign-matter finds — as they are seen, so “rejects” stops being one number nobody can break down. It is the tally inside the capability study’s Faults found on each item.',
    steps: [
      {
        step: 'Faults found on each item',
        means: 'The choice under “What are you measuring?” for items that can carry more than one fault: a pack can be light, open at the seal and mis-labelled all at once. Counting faults, not rejected packs, keeps all three.',
        doThis: 'Start a new capability study and pick “Faults found on each item” (“a pack inspected for seal, label, print — faults an item, by kind”). If a pack is simply good or bad, pick “Rejects out of what was made” instead.',
        youGet: 'A study that asks for the kinds of fault and the most you will accept, then takes an inspection at a time — not a list of measurements.',
      },
      {
        step: 'The kinds of fault',
        means: 'The headings of a check sheet, written before anyone counts: each fault goes under exactly one of them. Decided in advance, they make the counts of different shifts add up.',
        doThis: 'Type up to twelve kinds with a comma between, as the people at the line would name them: “Open seal, Light pack, Mis-label, Crushed, Wrong date”. Keep them from overlapping; five to twelve works, more slows the tally.',
        youGet: 'One big button for each kind on the counting pad. A kind you did not foresee can still be added while counting.',
      },
      {
        step: 'Judged against',
        means: 'The most faults an item may carry on average, and how many inspections you will take — agreed before the first, so the verdict cannot be bent to suit the count. “Opportunities an item” is how many places an item could be wrong; it matters only for a figure per million.',
        doThis: 'Type “At most how many faults per 100 items” from the specification or your own standard (2 means two faults on every hundred items) and “How many inspections”. Give the opportunities an item only if the customer asks for defects per million.',
        youGet: 'The agreed record the verdict is read against. With the opportunities typed, the page also says defects per million opportunities and a sigma level, by the 1.5-shift convention it names.',
      },
      {
        step: 'Items inspected, then a tap for each fault',
        means: 'One inspection is one batch you looked at — the packs from a reel, a tray, ten minutes of output — with the faults found in it. Counting at the line as the faults are seen gives data; counting afterwards from memory gives a story.',
        doThis: 'Type “Items inspected” (200, say). Each time you find a fault, tap its kind: the button counts up and “Add the inspection” says how many faults on how many. −1 takes one back. A kind not on the list goes in the box marked Other, then Add one. A pack with two faults is two taps. Press Add the inspection when the batch is done.',
        youGet: 'The inspection on the list as “7 on 200” with its kinds beside it, and one bar on the chart — faults an item, against the chart’s limits.',
      },
      {
        step: 'The tally and what it says',
        means: 'The sentence turns the counts into a rate and says how sure it is. Faults an item is the faults divided by the items; the page also gives the share of items carrying at least one fault, because one pack can hold several.',
        doThis: 'Read the sentence, then the tiles Items, Faults, Per 100 and Top kind. The range (“95% confident”) is said from three inspections and the chart drawn from five. The verdict is Met, Not met or Not shown yet against your maximum; until all the inspections are in it reads “3 of 10 inspections”.',
        youGet: 'The rate with its range, the verdict, and on paper “Faults by kind — the tally and its Pareto”: each kind with its count, share and cumulative share.',
      },
    ],
    watch: 'Count every fault, not every faulty pack, and count the items inspected beside them: a tally with no denominator is not a rate. If Other grows to about a tenth of the faults, read what is in it and make a new kind.',
  },
  'FC-125': {
    intro: 'For deciding which kind of fault to go after first. It is the Pareto drawn under the Faults found on each item study, from the same tally — there is no second list to type.',
    steps: [
      {
        step: 'The tally it is drawn from',
        means: 'A Pareto is only as good as the counts under it. Here the bars are the kinds you tapped during the inspections, added up across all of them.',
        doThis: 'Count the faults by kind at the line (see Defect tally at the line) over enough inspections that the order is not luck: with a few faults, the next shift can turn the ranking round.',
        youGet: 'The kinds and their counts, ready to be ranked. Faults not put under a kind are counted as Other.',
      },
      {
        step: 'Faults by kind',
        means: 'The picture: one bar for each kind, the most common first, with a line adding the shares up as you go from left to right. Where the line has climbed most of the way, the bars to its left are the vital few.',
        doThis: 'Read from the left. The first bar is the kind to start with. Look at how many bars it takes for the line to climb most of the way to the top.',
        youGet: 'The ranked bars with their counts above them and the cumulative line.',
      },
      {
        step: 'The sentence and the Top kind tile',
        means: 'Under the verdict the page says the ranking in words — “Light pack and open seal are 95% of the faults” — and the Top kind tile gives the first kind with its count and its share.',
        doThis: 'Use the sentence to open the meeting: these two kinds are where the next hour at the line goes. If only one kind has been seen, it says “Every fault so far is …”.',
        youGet: 'The kinds to take forward, with their shares, and a number to count again after the fix.',
      },
      {
        step: 'By count, not yet by money',
        means: 'The bars are by number of faults. A “By money” switch is drawn only when every kind carries a price, and the kinds are not priced on this page yet, so you will not see it.',
        doThis: 'Weigh the count against what you know of each kind: a leaker that spoils a pack costs more than a crooked label that is relabelled. Do not read the bars as pounds; for what poor quality costs, use the Cost of poor quality calculator.',
        youGet: 'A ranking by number of faults, honestly labelled as that.',
      },
      {
        step: 'On paper',
        means: 'The paper prints the same tally as a table beside the study’s sentence, so the meeting sees the ranking without the screen.',
        doThis: 'Open Report ▾ on the study and take its paper.',
        youGet: 'A page with “Faults by kind — the tally and its Pareto” — Kind, Count, Share and Cumulative — and the study’s figures.',
      },
    ],
    watch: 'The first bar is where to look, not proof of the cause. Take it to the fishbone or the five whys, then count again after the fix: the bar you went after should be shorter.',
  },
  'FC-128': {
    intro: 'For putting quality in the language of the business: what poor quality cost last week or last month, in pounds, split into the four buckets of the PAF model — prevention, appraisal, internal failure and external failure — and which part to go after first.',
    steps: [
      {
        step: 'The period',
        means: 'The week or month the costs are of. Every figure on the page must be for the same period and the same line. The name only names the sentence and the paper; the packs made and the sales let the page say the cost of a pack and the cost as a share of sales.',
        doThis: 'Type a period (“Week 42, Line 2”) and, if you have them, the packs made in the period (good packs out) and — under In money — the sales for the same period, from finance.',
        youGet: 'The sentence and the paper named for the period; with packs made, “pence of poor quality in every pack made”; with sales, the cost as a share of sales.',
      },
      {
        step: 'Prevention',
        means: 'What is spent to stop faults happening: training, process design, control-plan work, mistake-proofing, supplier assurance.',
        doThis: 'Give the hours spent (the page prices them at the wage under In money) and any other costs in pounds — courses, supplier visits, maintenance done for quality.',
        youGet: 'The Prevention tile in pounds, with its share of the cost of quality.',
      },
      {
        step: 'Appraisal',
        means: 'What is spent checking — inspection, testing, audits, calibration — whether or not a fault is found.',
        doThis: 'Give the hours checking (from the check logs and the control plan), the packs destroyed by testing (priced at a pack’s materials) and other costs — lab fees, gauges, calibration contracts.',
        youGet: 'The Appraisal tile in pounds.',
      },
      {
        step: 'Internal failure',
        means: 'What goes wrong before the product leaves the site: scrap, rework, give-away, product held or downgraded, line time lost to quality stops.',
        doThis: 'Give the packs scrapped and the packs reworked (from the capability study’s reject count by fate), the give-away in pounds for the period (from the capability study), product held or downgraded in pounds, and the line time lost to quality stops in pounds (from Lost time in money — the labour, and the contribution only if the stop was at the bottleneck).',
        youGet: 'The Internal failure tile; its biggest items head the ranked list of failures.',
      },
      {
        step: 'External failure',
        means: 'What reaches the customer: complaints handled, retailer credits and charge-backs, returns, withdrawals and recalls.',
        doThis: 'Give the customer complaints received in the period, the credits and charge-backs in pounds, and the returns, withdrawals and recalls in pounds from the incident.',
        youGet: 'The External failure tile; complaints are priced at what one costs to handle, once that is given.',
      },
      {
        step: 'In money — the unit costs',
        means: 'The prices that turn counts into pounds. All are optional: an item counted without its price is shown as counted, not priced, and named — never a figure invented.',
        doThis: 'Give one person’s cost an hour (the line’s wage with on-costs can be used in one tap), a pack’s materials, what putting a pack through again costs, and what one complaint costs to handle — the business’s own figure, which the page never fills in.',
        youGet: 'Every item priced that can be; a line saying “n items were counted but not priced, so the figures are a floor” and naming what to add.',
      },
      {
        step: 'Poor quality and the ranking',
        means: 'Poor quality is the two failure buckets together. The cost of quality is all four. The failure items are ranked by pounds so the first project is plain. A rough guide from Juran puts the cost of quality at 5 to 25% of sales; the page does not turn the figure red or green.',
        doThis: 'Read the sentence — “Poor quality cost £12,000 in the period (3.9% of sales) — give-away £4,100 of it, then rework £2,800” — then the tiles: Poor quality, the four buckets and Of sales. Open “How it is worked out” to see each item priced.',
        youGet: 'The ranked failures and a closing line that names the one to chase first. Save the figures as the before and the next period reads against it.',
      },
    ],
    watch: 'Only counted costs are in; what is not counted is not zero, it is not here. Do not cut prevention to cut the “cost of quality” — the figure to move is failure. A low total can mean good quality or poor counting: the ranking and the trend carry the meaning.',
  },
  'FC-131': {
    intro: 'For finding out what a sampling plan really protects — a goods-in check of 50 with 1 allowed, say — before you rely on it. Type the plan from your contract or procedure; the page draws how often a lot would be accepted at each true share of bad units.',
    steps: [
      {
        step: 'The plan: units taken and bad allowed',
        means: 'A plan is two numbers: how many units you take from the lot (n) and how many bad ones still let the lot through (c). Everything on the page follows from them.',
        doThis: 'Type “Units taken from each lot” and “Accept if this many are bad, or fewer” from your own copy of the contract or standard. Draw the sample at random across the whole lot — every layer, every pallet — or it is not a sample.',
        youGet: 'The rule in words: “Take 125 at random from the lot and accept it if 3 or fewer are bad.” Faultline holds no ISO 2859-1 tables; it reads the plan you type and does not design one.',
      },
      {
        step: 'Size of the lot',
        means: 'For a delivery from a steady stream, leave this blank: the chance of a bad unit is the same each time. For one lot of known size the bad units are whole ones, so the small-lot arithmetic is used.',
        doThis: 'Leave it blank for a stream; type the lot’s size only for one particular lot. It matters when you take a tenth or more of it, and the page says so.',
        youGet: 'The right sum for your lot. The page refuses a sample bigger than the lot, and warns when a small lot has so few bad units that the plan can never reject it.',
      },
      {
        step: 'The quality you want accepted, and the quality you will not',
        means: 'Two points to read the curve at. The AQL is a share bad you are happy to receive; the limiting quality is a share bad that must almost never get through. The first gives the producer’s risk, the second the consumer’s.',
        doThis: 'Type each as a percentage bad (1 for one in a hundred). Both are optional. The AQL must be a better, smaller, share than the limiting quality.',
        youGet: 'The producer’s risk — good lots turned away — and the consumer’s risk — bad lots accepted — each in words, such as “accepted 96.3 times in 100”.',
      },
      {
        step: 'The curve and the answer',
        means: 'The picture is the answer: across, the true share bad in the lot; up, how often it is accepted. Tiles give Good lots turned away, Bad lots accepted, and Accepted 95 in 100 and 10 in 100 — the share bad a lot may have and still be accepted nearly every time, and the share bad that gets through only one time in ten.',
        doThis: 'Look first at the two risks. The usual choices are a producer’s risk of 5% and a consumer’s of 10%; the page turns amber above either and its closing line says so. With no points typed it still gives the 95 and 10 in 100 shares.',
        youGet: 'The curve, the tiles, a verdict such as “Risks 3.7% and 5.4%”, and the table of acceptance at each share bad under “How it is worked out”.',
      },
      {
        step: 'What inspecting costs',
        means: 'The one cost the plan itself sets: the labour of looking at n units in every lot, accepted or not.',
        doThis: 'Time one unit at the bench and type the seconds to inspect one unit; give the cost of a person an hour or use the line’s. Both are optional.',
        youGet: 'The Inspection a lot tile: minutes and pounds a lot. If an input is missing the page says which, and everything else still stands.',
      },
    ],
    watch: 'A plan decides lots at stated risks; it does not prove a lot good or bad. The curve assumes the bad units are scattered at random and the inspectors agree on what is bad — a roll of bad film or a vague standard makes the real acceptance worse than the curve says.',
  },
  'FC-134': {
    intro: 'For telling whether customer complaints are really rising, by dividing them by what was sold and saying how sure the rate is — then ranking the kinds. It is the retailer’s view of quality, put on a like-for-like basis.',
    steps: [
      {
        step: 'Period and units sold',
        means: 'The complaints are divided by the units sold in the same period, so a busy month does not look worse than a quiet one. The units must be of the same product and period as the complaints.',
        doThis: 'Type the period (“October”) and the units sold or despatched in it — from despatch records or the retailer’s volume report.',
        youGet: 'The denominator. On fewer than 100,000 units the page warns that one complaint moves the rate by more than ten a million, so read the count and not the rate.',
      },
      {
        step: 'Complaints by kind',
        means: 'Six boxes, one for each kind: Foreign body, Packaging or seal, Taste, smell or condition, Quantity or weight, Labelling or date code, and Other. Code what the customer said, not what you think happened.',
        doThis: 'Type how many complaints of each kind arrived in the period — 0 for a kind with none; at least one of the six must be typed. A blank period is not the same as no complaints.',
        youGet: 'The total and the rate a million units with its 95% range, and the Pareto of kinds once two or more kinds have complaints.',
      },
      {
        step: 'The usual rate',
        means: 'What the periods before looked like, so the page can say whether this one falls outside the range you should expect. It is the range of ordinary ups and downs, not a target.',
        doThis: 'Type the complaints and the units sold in the periods before — the last twelve months, say, not counting this one. Give both or neither.',
        youGet: 'The Usual range tile, such as 0.08–14.6 a million; a rate above it is shown red, one below it green.',
      },
      {
        step: 'The period before',
        means: 'A direct comparison of this period with the one just gone, using an exact test of two rates. It stops one bad month being read as a trend.',
        doThis: 'Type last period’s complaints and its units sold — both or neither.',
        youGet: 'The Against before tile: “not shown different”, “shown higher” or “shown lower”, with p, the chance of a gap this big by luck if the rate were the same. The page calls a gap shown when p is under 0.05.',
      },
      {
        step: 'The answer and the kinds',
        means: 'The sentence gives the rate with its range — “12 complaints on 1.25 million units sold in October — 9.6 a million, 95% confident 5.0–16.8” — and where it sits against the usual range and the period before. The picture ranks the kinds with a cumulative line.',
        doThis: 'Read the sentence, then the tiles: A million, Complaints, Usual range, Against before, Most of them, Cost. With under twenty complaints the range is wide and the order of kinds can change next period: read the complaints one by one before reacting.',
        youGet: 'A verdict (the rate a million), the Pareto of kinds by number, and a closing line naming the kind to look at first.',
      },
      {
        step: 'In money',
        means: 'External failure, the cost of quality that reaches the customer: every complaint at one typed cost.',
        doThis: 'Type the cost of one complaint — handling, the retailer’s credit or charge-back, goodwill — from your own records. It is optional.',
        youGet: 'The cost of the period’s complaints and the cost for every million units sold. Because one cost is taken for every complaint, the Pareto is by number, never by money.',
      },
    ],
    watch: 'Complaints under-report by a factor nobody knows, and they arrive after the product was made. The rate compares like with like over time; it never says the true defect rate, and a fix shows late.',
  },
};
