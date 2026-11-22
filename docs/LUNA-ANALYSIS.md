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
   question. Each extension is an optional property of the one question — never a new tool (the cold prompt must not grow).
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
| **A2** | **Time parts as columns; shift by the clock** | `parts: [{ as, column, part: day · week · month · quarter · year · hour · weekday }]` — virtual columns usable in groupBy, filters and lookup keys. On the stops table a field *shift (by the clock)* from the line's own shift times (`lib/shifts`), said as worked out; the "cannot be said" kept only where the line has no shift times | A 00:30 stop in British Summer Time filed under the right day and hour; a night shift that wraps midnight; "downtime by shift" a figure |
| **A3** | **`derive`: arithmetic on what has been added up** | `derive: [{ as, op, a, b? }]`, worked on every group AND on the totals, before the cut: ratio, difference, product; share (of the total over ALL matched rows); change and pct_change on the group before, in the order asked; running and running_share; rank. Appended to each group's values and the totals, named in `measures` — so charts, reports, joins and the figure check read it with no change | Hand-worked cases; the reject rate by line said with NO `work_out` step |
| **A4** | **One engine for every source, and a lookup that reaches another source** | `runTable` given the same lookups, calcs, parts and derive; `query_data`'s check and schema carry them; a lookup may name `source` in place of `sheet` | A workbook's downtime by day joined to the stops timed on the line; another customer's file refused; an archived customer's refused; adding columns of different standing refused in words |
| **A5** | **Results joined by their keys, never on a cut list** | One key order in both engines; `join_results` by the results' own groupBy names; weeks compared by their end date; the full group list kept for the code (the model still shown 25); a side that was cut asked again uncut | A 90-day join with nothing "only in" one side; the share of a cut result (already fixed 21 November in the figure check) |
| **A6** | **`having` and `top` within a group** | `having: [{ measure, op, value }]` on groups after aggregation and derive; `top: { per, n }` with two groupBy fields — the n largest of the second within each value of the first, the rest summed into an *others* row whose count is said | 12 lines × 30 reasons, top 3 each: every line present, others adding back to each line's total |
| **A7** | **Median, percentiles and spread — exact or refused** | Measures median, p10, p25, p75, p90, stdev; values held per group up to a stated cap, refused beyond it | Hand-sorted cases; the cap |
| **A8** | **A relationship through the Analysis tool's own code, fed by a result** | `run_analysis` takes `resultId` with the positions of x and y: the pairs are the kept result's groups, read by code — the model never types a number. Said at the grain of the result ("by day, 31 days"), never as cause | Its output equal to the Analysis tool's own on the same pairs typed by hand |
| **A9** | **A result that can always be asked again, and a CSV as a table** | The names a question makes itself known to `missingFields` (so `refresh_report` re-runs a joined result); the paper trail says the join and the sum in words; any CSV or TSV read through the workbook reader as one sheet | `refresh_report` over a result with a lookup; a paper read back with the join sentence; a CSV given the first look its xlsx twin gets |

**Order.** A1 and A3 first — they remove the two measured failures (the range; the ten-step answer). A2 and A5 next (shift, and
the file-against-floor comparison). A4 makes all of it true of every source. A6–A9 after.

**What the instructions say.** One line a slice at most, in the tool's own description; the longer "how to ask" is returned only in
a refusal's `why`, when a question is malformed. A test holds the two question schemas to no more characters than today's.

## 3. How it is measured

With the real model, when the test allowance allows (`scripts/eval/luna-real.mjs`): a set of questions with known truths on the
generators' workbooks — joins by date, shift and line; rates; shares; month on month — scored exact, over five runs, with the
rounds, `work_out` calls, seconds and cost of each answer recorded beside the 21 November baseline (nine to ten `work_out` steps,
36–41 seconds, a range where a figure was wanted).

## 4. What each slice has done

*(Filled in as each ships.)*
