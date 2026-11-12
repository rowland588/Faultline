# What the AI service costs, and how it is kept sustainable

Rowland, 12 November: *"I've set a monthly budget of approximately £20 … I want to understand whether we can deliver substantially more
AI usage for that budget … Do not make Luna unintelligent simply to save money. The objective is to use intelligence efficiently …
Faultline should be designed so that increasing intelligence and usage do not automatically mean proportionally increasing API costs."*
The audit was given to him the same day and he said *"I agree proceed"*. This page is its record and the plan's state.

## 1. How it works (read from `supabase/functions/assist/index.ts`)

| Feature | Model | $ a million tokens, in / out |
|---|---|---|
| Luna (task `colleague`) | Claude Opus 5.5, effort low | 4 / 20 (cache reads 0.20) |
| Line Talk, the Story's chapter, brief and factory-document reading | Claude Sonnet 5.5 | 2 / 10 (cache reads 0.10) |
| Video labelling, the brief split into asks | Claude Haiku 5.5 | 0.10 / 0.50 |

One Luna request carries: the 112 capability definitions (about 32,000 tokens, estimated from 120,000 characters), her rules (about
12,400), the whole conversation (up to 600 turns), a focus block of up to about 3,000 tokens (threads, notebook, files, who the person
is, who is in the room), and — within one answer — the results of the earlier rounds. Measured: about 58,000 input tokens a request.
One question is about three requests (10 November: 4 questions, 13 requests, $0.99, 6 minutes): each capability Luna uses is run on the
device and the whole request is sent again. The phone does the listening and the speaking; a spoken turn is the same request with a
note that the person is listening. Nothing calls the AI service in the background.

## 2. Where the money goes (estimates from those sizes, at Anthropic's prices)

A steady request is about 4.5c: the cached rules, tools and history read at a twentieth (about 1.0c), the focus block and round results
sent uncached (about 1.6c), the output with its thinking (about 1.8c). The first request after the cache has lapsed pays to write the
whole prefix again — about 25c at five minutes' keeping. For a person who walks, talks, thinks and asks again, that cold start was the
largest single cost. History is cached and small: summarising it would save almost nothing today.

## 3. What is done (12 November)

- **The price of a cache read corrected** (`tools/video/gatewayUsage` CACHE_READ): a twentieth on Opus 5.5 and Sonnet 5.5, not a tenth.
  The budget bar had overstated Luna's spend by about 1c a request.
- **The cache kept for an hour** (`ASSIST_COLLEAGUE_CACHE_TTL`, default `1h`; `5m` puts it back): the rules, tools and history are
  written once an hour at double the input price, where each pause over five minutes used to write them again at a quarter more.
  Worse only for a single burst with no pause (about 13c more on its one cold start).
- **Every request recorded in its parts** (`supabase/ASSIST_USAGE_DETAIL.sql`): cache reads, five-minute and one-hour writes, the
  conversation, the customer in hand, spoken or not, the round, the time taken, and the gateway's switches. The gateway falls back to
  the old row until the columns exist, so the function and the file can go live in either order.
- **Answered in code, no request at all**: the first look at a workbook, stops said aloud while timing, "show that as a graph", and
  the chart of a trend (`lib/workbook/firstLook`, `colleague/fastPath`, `colleague/autoChart`).

## 4. What is next, each proved on the real-model exam before it is kept (`docs/LUNA-EVAL.md`)

1. **Tools loaded on demand** (`ASSIST_COLLEAGUE_TOOLS=search`, built 11 November, never run against the exam): the fixed part falls
   from about 45,000 tokens to about 19,000. Kept only if no exam turn is lost.
2. **The round results and the stable part of the focus block inside the cache** — a change to the shape of the request.
3. **A router in code, three tiers**: greetings, introductions and simple retrieval to Haiku 5.5; data questions to Sonnet 5.5;
   investigation, diagnosis and reports stay on Opus 5.5. Decided by rules on the turn, never by another AI request; anything the rules
   do not recognise goes to the capable model, and an unsure cheap answer is asked again there.
4. **Fewer rounds**: capabilities that answer a whole question in one step.
5. **A second API key for testing**, so the exam's runs are not counted against the product's allowance.

## 5. What £20 buys (taken as $25) — estimates but for the first row

| | Before 12 November | With §3 | With §4 as well |
|---|---|---|---|
| Luna requests | about 280–330 (measured 7.6–9c each) | about 500 | — |
| Ordinary questions | 140–165 | about 250 | about 400 |
| 20-minute voice conversations | about 9 | about 14 | about 24 |
| Boardroom workbook sessions | about 25 (measured $0.99 each) | about 35 | about 50 |

No real 20-minute voice conversation has been measured; the voice rows assume a turn every 40 seconds and 1.8 requests a turn.
