# Luna's analysis — any question of the data, answered exactly (G4)

*21 November 2026. The design for G4 of `docs/LUNA-AGENT.md`, written from the audit of that evening (§5a there). Nothing here is
built until its slice says so; each slice ships live on its own.*

## 0. Why

Rowland, 21 November: *"Luna linked to data … no more analysis, Luna knows everything. Ask her a question"* — and *"make Luna as
intelligent as possible."* The person does no analysis; so Luna's has to be able to answer what a manager actually asks, exactly.

Today a question is `{ sheet, lookups?, calcs?, filters?, groupBy?, time?, measures, order?, limit? }` over ONE sheet
(`src/lib/workbook/query.ts`), with six measures (sum, avg, min, max, distinct, count), a lookup on ONE key column, a sum worked on
each row, and four time buckets. The audit found where that stops her, each with the line of code:

| What a manager asks | What happens today | Why |
|---|---|---|
| "How much of the shortfall do the stops explain?" | A RANGE — "87–96%" — where one figure was wanted (`docs/LUNA-EVAL.md` §6, measured) | A stop is tied to what was running only by date + shift + line together; a lookup takes one key column, so the product (and its rate) cannot be brought onto each stop |
| "What is the reject rate by line?" | Two sums and a `work_out` per line — nine or ten steps, 36–41 seconds | No arithmetic on figures that have been added up: a rate is sum ÷ sum per group |
| "What share of the loss is Line 3?" / "month on month?" / "running total?" | A `work_out` each, or a share of only the groups shown | The same |
| "Downtime by shift on Line 3" | "Cannot be said" although the line's shift times are held | Time buckets stop at day, week, month, year |
| "Compare their downtime log with the stops we timed, by day and machine" | "No label in common" | Two results meet only by the text of their joined labels, and the two engines order the keys differently |
| "What is a typical stop on the Bagger?" | The average, which misleads on skewed data | No median or percentile |
| "The top three reasons on each line" | The 50 biggest overall — whole lines can be missing | One global cut, no top-N within a group, no filter on a total |
| "Do rejects move with changeovers?" | Nothing, or "appears to" | A relationship needs the model to copy figures by hand into the Analysis tool |
| Any of it over the line's own stops, trials, problems or production rows | Not possible | Lookups and row sums exist on `query_workbook` only; `query_data` — the door for ANY source — has neither, and `runTable` reads neither |
| An MES export as a CSV | Read only if it looks like a downtime log, every other column dropped | A CSV is not a table she can question |

## 1. The rules that do not move

1. **Every figure is worked by the app's code.** Nothing here lets the model do arithmetic; it lets the model ASK for more in one
   question. Each extension is an optional property of the one question — never a new tool (the cold prompt grows by a property's
   words, never by a tool's — and a test holds the two question tools to their size).
2. **Nothing is double-counted by a join.** A lookup's other side is grouped by its key FIRST, so a base row is never duplicated
   and no sum can be doubled — the classic join error is impossible by construction, not by care.
3. **Not recorded is never zero**, a key not found is left blank and counted, a key that is not unique is said — never "the first
   is used" in silence.
4. **A total's rate is worked from the totals**, never as a sum or an average of the groups' rates.
5. **Evidence keeps its standing**: a figure may be multiplied or divided across sources (a rate from the product master times
   minutes from the floor), but columns of different standing — system, measured, reported — are never added together.
6. **One customer's data never reaches another**: a lookup that names another source goes through the same guard every read of
   the register goes through (`capabilities/data` resolveId — the customer in hand's, never an archived customer's).
7. **A result says how it was made** — the join and the sum in words on its paper trail — and can be asked again.
8. **Exact or refused.** A median over more values than can be held exactly is refused in words, never approximated.

## 2. The slices

Each is proved by unit tests with hand-worked cases (and the generators' own truths), then one played-gateway story; each is
measured with the real model afterwards (§3). `query_workbook` and `query_data` take the same question throughout.

| | Slice | The question gains | Proved by |
|---|---|---|---|
| **A1** | **Lookups on several keys, aggregated first** | `match` and `on` a column or a list of up to three; `take` a column or `{ op: sum · avg · min · max · count · only, column }`. `only` leaves the value blank where a key holds more than one different value, and counts those rows | The demo workbook's exact answer where a range was given (the downtime log → the product by date + shift + line → its rate → minutes × rate → one sum), asserted against the generator's truth; rows not found and keys not unique said |
| **A2** | **Time parts as columns; shift by the clock** — *built 22 November, §4* | `parts: [{ as, column, part: day · week · month · quarter · year · hour · weekday }]` — virtual columns usable in groupBy, filters and lookup keys (and a lookup's own `parts`, of its sheet). On the stops table *clock shift* and *shift day* from the line's own shift times (`lib/shifts`), said as worked out; the "cannot be said" kept only where the line has no shift times | A 00:30 stop in British Summer Time filed under the right day and hour; a night shift that wraps midnight; "downtime by shift" a figure |
| **A3** | **`derive`: arithmetic on what has been added up** | `derive: [{ as, op, a, b? }]`, worked on every group AND on the totals, before the cut: ratio, difference, product; share (of the total over ALL matched rows); change and pct_change on the group before, in the order asked; running and running_share; rank. Appended to each group's values and the totals, named in `measures` — so charts, reports, joins and the figure check read it with no change | Hand-worked cases; the reject rate by line said with NO `work_out` step |
| **A4** | **One engine for every source, and a lookup that reaches another source** — *built 23 November, §4* | `runTable` given the same lookups, calcs, parts and derive; `query_data`'s check and schema carry them; a lookup may name `source` in place of `sheet` | A workbook's downtime by day joined to the stops timed on the line; another customer's file refused; an archived customer's refused; adding columns of different standing refused in words |
| **A5** | **Results joined by their keys, never on a cut list** | One key order in both engines (*done 22 November, with A6: the time bucket is the last key in both*); `join_results` by the results' own groupBy names; weeks compared by their end date; the full group list kept for the code (the model still shown 25); a side that was cut asked again uncut | A 90-day join with nothing "only in" one side; the share of a cut result (already fixed 21 November in the figure check) |
| **A6** | **`having` and `top` within a group** — *built 22 November, §4* | `having: [{ of, op, value }]` on groups after the measures and derive are worked; `top: { n }` with two things grouped by — the n largest of the second within each value of the first, the rest brought together (from the rows) into an *(k others)* group | Three lines by reason, top 2 each: every line present, others adding back to each line's whole |
| **A7** | **Median, percentiles and spread — exact or refused** | Measures median, p10, p25, p75, p90, stdev; values held per group up to a stated cap, refused beyond it | Hand-sorted cases; the cap |
| **A8** | **A relationship through the Analysis tool's own code, fed by a result** | `run_analysis` takes `resultId` with the positions of x and y: the pairs are the kept result's groups, read by code — the model never types a number. Said at the grain of the result ("by day, 31 days"), never as cause | Its output equal to the Analysis tool's own on the same pairs typed by hand |
| **A9** | **A result that can always be asked again, and a CSV as a table** | The names a question makes itself known to `missingFields` (so `refresh_report` re-runs a joined result); the paper trail says the join and the sum in words; any CSV or TSV read through the workbook reader as one sheet | `refresh_report` over a result with a lookup; a paper read back with the join sentence; a CSV given the first look its xlsx twin gets |

**Order.** A1 and A3 first — they remove the two measured failures (the range; the ten-step answer). A2 and A5 next (shift, and
the file-against-floor comparison). A4 makes all of it true of every source. A6–A9 after.

**What the instructions say.** One line a slice at most, in the tool's own description; the longer "how to ask" is returned only in
a refusal's `why`, when a question is malformed. A test holds the two question schemas to a ceiling (`capabilities.test.ts`) that
moves only with a sentence saying what Luna can then ask for — as it did for A3 (§4).

## 3. How it is measured

**Measured on 22 November, 15:45 UTC (assist v62): the `analysis` exam 6 of 6 turns, 31 of 31 marks, 13 asks** — a share, a
rate, a weekday, the top two of each line, the days over a limit and a change on the month before, each asked by the real Luna
in ONE question of the workbook, unprompted, every figure the app's (`docs/LUNA-AGENT.md` §6). Not yet exercised by the real
model: a lookup on several keys, two results joined, `having` on a running share, the stops' clock shift.

With the real model, when the test allowance allows (`scripts/eval/luna-real.mjs`): a set of questions with known truths on the
generators' workbooks — joins by date, shift and line; rates; shares; month on month — scored exact, over five runs, with the
rounds, `work_out` calls, seconds and cost of each answer recorded beside the 21 November baseline (nine to ten `work_out` steps,
36–41 seconds, a range where a figure was wanted).

**The suite is written (22 November): `--suite analysis`** (`src/colleague/exam/analysis.ts`, on Luna's exam page) — six turns on
the workbook exam's production log: a share for each line, a rate from two totals, a day of the week, the top two reasons on each
line, how many days were over a limit, a change on the month before. Its key is worked by plain loops over the rows the workbook
was written from; `analysisExam.test.ts` proves the app's own engine gives the same figures, each in ONE question, and that each
turn's marks pass a careful answer and fail a sloppy one. Each turn is also marked on how it was worked — asked in the question
itself, never a `work_out` a group. The exact join of A1 is measured by the job exam and the investigation, on the demonstration
workbook (91.3%).

## 4. What each slice has done

### A3 — `derive`: a rate, a share, a change, a running total and a rank in the question itself (22 November)

**What changed for the person.** "What is the reject rate by line?", "what share of the loss is Line 3?", "how does this month
compare with last?", "which reasons make up 80% of it?" are each ONE step of the app's code where they were two sums and a
`work_out` a group (nine or ten steps and about forty seconds, measured 21 November) — and the arithmetic between the steps is no
longer strung together by the model at all.

**How.** `lib/workbook/derive` (pure): a question's `derive` is up to four of `{ as, op, a, b? }` — `ratio`, `difference`,
`product`, `share`, `change`, `pct_change`, `running`, `running_share`, `rank` — each worked from a measure (by position or name) or
from an earlier derived figure. Both engines (`lib/workbook/query` over a workbook's rows, `lib/data/table` over the app's own
records) check it before a row is read, then work it on EVERY group and on the totals, before the groups are cut to the ones shown:
those that do not depend on the order first (so the groups may be ordered by one), then those worked along the order. The derived
figures follow the measures in every group's values and in the totals, are named in `measures`, and the result keeps what each is
(`derived`) — so a chart, a report, a join and a kept result read them with no change. Asked through `query_workbook` and
`query_data`, the same property in both (`capabilities/schemas` DERIVE).

**The rules it keeps, each held by a test.** A total's rate is worked from the totals (100 ÷ 3,500 = 2.86%, never the three lines'
rates averaged, 3.17%, or added). A share is of the total over every matched row — cut to the biggest group, its share is still of
all of them. Not recorded is never zero: a figure with nothing recorded behind it, and a division by nothing, are not recorded. A
share, a running total and a running share are of something added up or counted — an average has none, and is refused in words. The
groups cannot be ordered by a figure worked from the order itself. The result's notes say how each was made.

**Said, drawn and checked as what it is.** A share and a change are said as percentages and a rate with enough figures to quote
(`derivedSaid` — the result's sentence, the table beside her). The answer's figure check (`colleague/figureCheck`) and the report's
(`lib/data/outputs`) take a derived figure as the app's own, with the percentage it is said as where it is a fraction of one, and
lend NO share of a derived column (a share of shares is nobody's figure). On the way the report's check was given the rule the
answer's check got on 21 November: a result that shows fewer groups than it has lends no share of the ones it shows; and
`query_workbook`'s result now says how many groups it has in all, so that rule can see it.

**What it cost.** The two question tools grew by 726 and 782 characters (about 380 tokens in all, sent with every ask from the
cache — a few thousandths of a penny an ask); `capabilities.test.ts` now holds each to its size, a ceiling that moves only with a
sentence saying what Luna can ask for that she could not. Her instructions gained one sentence: a figure for each group of a
question is asked for in the question, never a `work_out` a group.

**Proved** by `derive.test.ts` (19 — every figure worked by hand in the comment beside it), `shapes.test.ts` (the workbook engine on
a generated log, against the generator's totals and sums asked separately), `data.test.ts` through the capability (said as
percentages; every figure of the answer the app's with no `work_out`; a wrong share still found out), `figureCheck.test.ts` and
`lib/data` `data.test.ts` (the two checks). **Not measured:** whether the real model reaches for `derive` unprompted, and what it
takes off the rate questions' steps and seconds — the first thing to run when the test allowance is back (§3).

### A1 — a lookup on several keys, the other sheet brought together by its key first (22 November)

**What changed for the person.** "How much of Line 3's shortfall do its stops explain?" is ONE question and ONE figure — on the
demonstration workbook **91.3%**, the generator's own, where the real model had said "87–96%" (measured 21 November) because a stop
could not be tied to the product that was running.

**How.** A lookup's `match` and `on` are one column or up to three TOGETHER (`lib/workbook/query` Lookup, LOOKUP_KEYS) — a stop is
tied to a shift's production by its date, shift and line. And its `take` is a column as before, or `{ op, column }`: the other
sheet's rows are BROUGHT TOGETHER for each key first — `sum`, `avg`, `min`, `max`, `count`, or `only` (the one value a key holds) —
so however many of its rows share a key, a row of the sheet being asked is matched to exactly one value: **no join can double a
row, by construction** (rule 2). A key that holds more than one different value under `only` brings nothing back and is counted in
the notes — never "the first is used" in silence (rule 3); a plain `take` keeps the old behaviour and its old note. A looked-up
value may itself be a key of the next lookup (each stop → the product that was running → that product's rate).

**Proved** on the demonstration workbook, whose generator now keeps the exact figure as it chooses each stop
(`make-demo-workbook.mjs`: `stopPacksByLine`, `stopPacks`, `line3Explained` — the workbook's own bytes unchanged):
`variance.test.ts` — the shortfall explained, to the generator's figure and checked as the app's own in her answer with no
`work_out`; the same packs both ways round (the log summed onto each shift; each stop given its shift's product by `only`); every
stop's minutes and every stop counted adding back to the log's own totals, with the 176 shifts never doubled by the 451 stops; a
key that is not one (a line's product, when each line ran two) left blank and said; and what cannot be asked refused in words.

**What it cost.** 533 characters on `query_workbook` (the ceiling moved, with this sentence, in `capabilities.test.ts`).

**Not measured.** Whether the real model finds the
three keys by itself is not known: the workbook's map says which single columns connect two sheets, not which columns TOGETHER tie
a row of one to a row of the other — if she does not reach for it, that is what the map must learn to say.

### A2 — a part of a date as a column; the shift by the clock; the day in the person's own zone (22 November)

**What changed for the person.** "Are Mondays worse?", "which hour of the day do we lose most?", "how did each quarter go?" are
each one question. "Downtime by shift on Line 3" is a figure wherever the line has its shift times — it was "cannot be said"
whenever the stops had no shift said on them. And a stop is tied to what was made **on its day** even when the log holds a start
*time* and the other sheet a *day*.

**How.** `lib/workbook/parts` (pure): a question's `parts` is up to four of `{ as, column, part }` — a date column's `day`, `week`,
`month`, `quarter`, `year`, `hour` or `weekday` — and each is then A COLUMN OF THAT QUESTION by its `as` name: grouped by, filtered
on, counted, or a key a lookup is matched by. Both engines work it on every row before anything else (`lib/workbook/query` — a
column of its own beside the looked-up values and the row sums; `lib/data/table` — one more field of the table). A lookup may carry
`parts` of ITS sheet too, for `on` to name: each day's stop minutes are brought onto what was made by `on: ['stop day', 'Line']`
where *stop day* is the day of the log's start time. A day of the week is put in the order of the week, never of the alphabet
(`cmpGroupKeys`), in both engines.

**The shift by the clock** (`lib/data/datasets` stopsDataset, `lib/shifts` shiftAndDay). Where the line has shift times, the stops
table holds two more fields, worked for every stop from when it began: **clock shift** — the shift whose hours it began in — and
**shift day** — the day that shift began, so a stop at 00:30 in Nights 22:00–06:00 belongs to the night before and no night is
split across two days. Both are said as WORKED OUT, with the line's shift times, in the field itself and in what the table says of
itself; `shift` still holds only what a person said. A line with no shift times has neither, and is told so — the one place
"cannot be said" is kept.

**The rules it keeps, each held by a test.** A row with no date has no part: it is in a group of its own (*(blank)*, *(not
recorded)*), counted in the notes, never put with another. **An hour is never taken from days** — a date column whose every date
is at midnight is refused in words (and the stops table is told it holds `hour` itself), never answered "hour 0". A part of
something that is not a date, and a name already a column, are refused before a row is read. A name the question makes itself is
the question's own — never "a field the source does not hold" (`missingFields`).

**Three things put right on the way, each found by reading the code the slice touched.**
- **The day a moment fell on is the person's own day.** Luna's tables wrote it as the UTC day (`toISOString().slice(0, 10)`) — the
  mistake `lib/weeks` isoDay exists to end, made again when these tables were written. A due date is kept as *local* midnight, so
  all through British Summer Time every due date — and every stop in the first hour of the day — would have been said **a day
  early**, while the stop's `hour` beside it was local. Fixed in the stops, readings, problems and production tables, an imported
  table's dates, the card that says a due date is changing, the history of a machine, and the exam's own week
  (`parts.test.ts` runs in a British clock, in July, on purpose).
- **The groups in the order asked for.** The app's own tables ignored `desc` on an order by the group — "newest first" came back
  oldest first. Both engines now order the same way.
- **Two values asked for are two things.** A filter on Tuesday OR Wednesday was noted as "2 spellings, taken together — say if they
  are not the same thing". The note is now made for each value asked for, only where ONE value took more than one spelling.

**What it cost.** With A6 below, 1,436 characters on `query_workbook` and 1,301 on `query_data` (the ceilings moved, with the
sentence saying what she can now ask, in `capabilities.test.ts`); one sentence of her instructions for the three together, and one
saying what a stop's shift is.

**Proved** by `lib/workbook/__tests__/parts.test.ts` (a small workbook written as Excel writes one — a log with start times beside
a sheet of days — every figure worked by hand in the comment at its head: by weekday, hour, quarter, month, week and day; filtered
on; two parts together; the lookup both ways round, 120 of the log's 135 minutes with none counted twice; the hour refused),
`lib/data/__tests__/parts.test.ts` (the stops table in a British summer: day and hour by the clock on the wall, the clock shift and
shift day of seven stops round a night that wraps midnight, Days 37 · Lates 8 · Nights 55 of 100 minutes; a due date on the 10th
said as the 10th), `capabilities/__tests__/data.test.ts` (through `query_data`: cannot be said, then a figure once the line has its
times), and `conversational-data.mjs` step 6b in the browser. **Not done:** a workbook's own shift by the clock (its shift column is
its own). **Not measured:** whether the real model reaches for `parts` and `clock shift`
unprompted.

### A4 — one engine for every source; a lookup that reaches another source (23 November)

**What changed for the person.** A downtime log and the line's stops timed are asked in one question — logged minutes by day with
timed minutes brought from the stops register — through `query_data` or `query_workbook`, the same figures from the same code.
Another customer's source in a lookup is refused with the same words as any other read; an archived customer's is refused.

**How.** `lib/workbook/question.ts` holds one check for both question tools (lookups, calcs, parts, derive, having, top).
`lib/data/lookup.ts` and `lib/data/table.ts` give `runTable` lookups and calcs: a lookup names `source` (another register source) or
`sheet` (another sheet of the same workbook); the other side is brought together by its key first (`lookupMapOf`); when a measure
sums a value brought that way, each match key is counted once per group so a coarser `groupBy` cannot double it (rule 2 — both
engines). `query_workbook` passes optional lookup sides into `runQuery`; `capabilities/data` `resolveLookupSides` resolves each
named source through `readOutOfHand` and `resolveId`, materialises a workbook sheet when needed, and hands the map to `runTable` or
`workbooks().query`. Rule 5: `+` and `−` across system and floor figures are refused in words; `*` and `/` are allowed.

**What it cost.** `query_data` grew by lookups and calcs on its schema (the ceiling in `capabilities.test.ts` moved, with this
sentence); one line on its description and the gateway copy from `sync-assist.mjs`.

**Proved** by `lib/data/__tests__/lookup.test.ts` (hand-worked log and stops — both engines, 70 logged and 35 timed; calcs; system
vs floor refused; a key that is not one left blank) and the existing customer guard tests in `capabilities.test.ts` on every
`resolveId` read. **Not measured:** whether the real model reaches for a cross-source lookup unprompted.

### A6 — the top few WITHIN each group, and a condition on a group's figure (22 November)

**What changed for the person.** "The top three reasons on each line" comes back with EVERY line, each with its three biggest
reasons and the rest of that line brought together — where one cut gave the fifty biggest pairs overall, with whole lines missing
and nothing to say so. "Which lines lost more than an hour?" — and *how many did* — is asked in the question, never read off a
list by eye.

**How.** `lib/workbook/groups` (pure), used by both engines:
- **`top: { n }`**, with exactly two things grouped by: within each value of the first, the n largest of the second (by the
  measure the question is ordered by — the smallest when it asks ascending), and the rest of that value brought together as one
  group named for how many they are — *(3 others)*. The others are worked **from the rows**, by bringing the engines' own running
  sums together, never from the groups' figures — so their average, lowest, highest and distinct count are exact, and a rate or a
  share asked for with `derive` is worked for them like any group (a rank is of the groups as they were, and they have none). The
  values of the first are put in order of their own whole; a cut is by whole blocks, never part of one (`limit` counts the first
  thing grouped by).
- **`having`**, up to three conditions on a measure or a derived figure, by position or name: only the groups that meet them are
  shown. The totals stay those of **every matched row**, the groups that did not meet it are counted in the notes, and the result
  says it shows fewer groups than there are — so the figure check lends no share of the ones shown (15 of the 27 shown is not
  "56%"; 15 of the 30 in all is 50%).
- **Said so that it is read.** A result asked with `top` is said block by block — each value of the first on one line with its
  top few and its others (`blocksSaid`) — in `query_data`'s sentence and `query_workbook`'s table: Luna reads every line's top
  three, where the first dozen rows would have been the first three lines.
- **One order of the keys in both engines.** The app's own tables put a time bucket FIRST and a workbook put it last; "the top
  three months for each line" would have meant two different things. The time is the last key in both now.

**Refused in words, each by a test:** `top` without exactly two things grouped by; `top` with `having` (ask one or the other);
`top` with a change or a running total (they follow the order of the groups, and with `top` the groups are in blocks); a
condition that names no figure of the question.

**Proved** by `lib/workbook/__tests__/groups.test.ts` (eleven stops on three lines, every figure worked by hand in the comment at
its head: each line adding back to its whole, the others' average and distinct count from the rows, the smallest, the lines by
name, the cut by whole lines; conditions on a measure and on a derived share, two together, a running total of the groups shown;
the same asked of a workbook, to the same figures) and `capabilities/__tests__/data.test.ts` through `query_data` (said block by
block; a wrong share of a `having` result found out). **Not measured:** whether the real model reaches for them unprompted.

### A5 — two results joined by their keys, never on a cut list (22 November)

**What changed for the person.** "Compare their downtime log with the stops we timed, by day" — two results side by side — now
meets on every day both hold. It used to come back with the days past the fiftieth said to be "only in" one side, and with
"no label in common" whenever the two had been grouped by the same things in a different order.

**How.** `capabilities/dig` join_results: a side that shows fewer groups than it has is **asked again of its source for every
group** before the two are joined (the same question, the engines' own limit — `LIMIT_MAX`, 5,000 — in place of Luna's fifty); one
that cannot be asked again as it stands (itself a join or a change, a `having`, a `top`) is joined as it is, and the join SAYS it
shows fewer groups than it has, so a label "only in" the other side is never taken as missing. `lib/data/join`: two results
grouped by the same two or three things are matched with the second's keys read in **whichever order matches the first's labels**
— said when that is not its own order. And the two engines put their keys in one order (A6). The "only in" lists name the first
forty and count the rest.

**Proved** by `capabilities/__tests__/dig.test.ts`: *Jam · Bagger* meets *Bagger · Jam*, three of three, and says how; sixty-five
days against sixty-five days — each asked for fifty — every one matched, 65 against 130, nothing "only in" either. **Not done:**
weeks compared by their end date (a workbook's own week names against the app's ISO weeks still do not meet); a join's labels
matched through the sources' groupBy NAMES rather than their values.

### The review of 22 November — A2, A6 and A5 read by a second engineer before they shipped

Thirteen findings, each with the line of code and a concrete input; none refuted; all put right, each kept as a test
(`groups.test.ts` *found by the review*, `join.test.ts`, `dig.test.ts`, `data.test.ts`, `lib/data` `parts.test.ts`):

| | What was wrong | What a person would have seen | What is done |
|---|---|---|---|
| 1 | **A condition on a figure worked along the order kept no group** — it was looked at before that figure was worked | "The reasons that make up 80% of it": none, and *0 of 5* | Conditions on a running share, a running total or a change are looked at after the groups are in order and that figure is worked; the others before |
| 2 | **A refreshed report joined its two sides on the kept lists** | *"Moved: Year on year 65, 130 → 50, 100"* when nothing had changed | The join is made again from each side in full (`wholeResult`), as it was made the first time |
| 3 | **Asking a side again read a line's records with no customer check** | Another customer's stops read again while a different one was in hand | `askSource` — every question the app's own code asks again — refuses another customer's, or an archived customer's, records (`capabilities/hand`) |
| 4 | **A kept variance (or any result that is not a plain question) asked again crashed** | *"could not be done just now"* on a join, and on refreshing any report with a variance in it | `askSource` hands back, in words, a question it cannot ask again |
| 5 | **A workbook's dates brought in as a downtime table were read on the wrong clock** | A cell at 23:30 on the 3rd filed on the 4th all summer | A cell's own wall clock is kept as the local clock when it is brought in |
| 6 | **The second result's keys could be turned round on a guess** — by which order matched more labels | Routes *from · to* joined to routes *to · from* as the same thing | By the keys' NAMES where they are the same names in another order; by what they hold only where the names differ and, read as written, nothing meets |
| 7 | **A pair the person gave stopped applying once the second was read in another order** | Both labels "only in" one side, and the note that pairs were used still added | The pair is found as the second result shows its label |
| 8 | **Two top results joined their "(k others)" as one label** | Three reasons of one week against three different ones of the next, as like for like | The others are left out of a join, and it says so |
| 9 | **The largest "by" a date** — a first or last day is words, so every group ranked equal | *"the 1 largest"* over groups picked by the order of the rows | Refused in words (a condition on one too); and the app's own tables now say the first or last of a date as its day, not a count of milliseconds |
| 10 | **`op: add` with the sections given together was refused** | *"A section to add needs its kind and heading"* | It means those sections |
| 11 | **A result asked with a condition was captioned "the first 2 of 3 groups"** | — | *2 of 3 groups — only those with …* |
| 12 | **The exam's week was six days long east of UTC+12** | (not the UK) | The week is stepped on the day's own letters |
| 13 | **A figure worked from a rank was wrong on the others** | (unlikely to be asked) | A rank, and anything worked from one, is not recorded for a group made afterwards |

And two things the review noted that are choices, written down: a side asked again is the data **as it is now** (the other, if it
was whole, stays as kept — said nowhere yet); and a side that asked for its top few (fewer than the usual twenty-five) is joined as
it was asked — "the top ten against the top ten" stays ten.

*(The other slices: filled in as each ships.)*
