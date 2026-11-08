# The AI toolbox and the tools that link — 8 November (§1 built the same day at Rowland's go; §2 waits for his choice)

Rowland, 8 November: *"I'm a consultant that goes into factories ... it's actually only going to be a single use, or maybe a few
people using it ... This is not going to be people who are operating this on the ground floor ... when I said about enterprise was
enterprise and intelligence ... the enterprise look, the enterprise feel ... the intuitiveness of what we can now bring to the table.
Two things, AI, built in, as we know, with our walking and talking and some of the tools have really advanced AI functionalities.
Which I still believe should be in an AI tool box itself ... so it's separated, so we know that they use AI ... But then how it links
tools together after an intelligent system."*

So the app is **a consultant's instrument**, one person or a few, never a floor system — which is why planning and scheduling, the
daily boards, food safety and the product-quality entries were left out the same day (`docs/STATE.md` 0d). Two things follow, each
designed here before anything is built.

## 1. The AI toolbox — what uses AI, on a shelf of its own

**Today** the AI is in four places, each already Claude through the `assist` gateway (voice notes in a form's boxes: Gemini, `api/voice`):

| Where | What the AI does | What it never does |
|---|---|---|
| Line Talk | answers what you say on the line, asks back, makes the walk's report | a figure — every number is a formula's |
| Line Talk's toolsets | fills the process flow chart, the spaghetti diagram and the value stream from what you say | classes a step VA · NE · NV for you |
| Video study — *Name the work from the frames* | names what a person is doing in sampled frames, when you tick it | times anything — the reading is measured |
| A form's voice note | turns what you said into the box's words | — |

**The design:** Tools gets a third shelf beside *The worlds* — **AI tools** — with a card each for Line Talk (and its three toolsets),
the video study's naming and the voice note, each saying in one line what it sends, to whom (Claude, through Faultline's gateway),
and what it never does. A tool that uses AI wears a small **AI** mark wherever its name shows (its card, its band, its paper's
foot), so it is never mistaken for one of the formula tools. The ordinary tools stay as they are: no AI in a figure, ever.

## 2. The tools that link — the intelligent system

**Today** two links exist, both in Statistics (`lib/handOvers`, W2): capability says *not steady* → chart these readings; a steady
chart with limits → check capability. Each is a fixed rule, said under the answer with its reason, never starting anything itself.

**The design — three options, his choice:**

- **A · Rules only (recommended first).** The same kind of link from every tool whose finding says what the next question is —
  for example: Line capacity names the bottleneck → *time the bottleneck's stops* (loss count) or *SMED its changeover* when the
  changeover is the biggest loss; the line balance says a person is over takt → *line standard* to move work, *micro-movements* to
  study the motion; the loss count's biggest bar is a breakdown → *reliability study* on that machine; a value stream's biggest wait
  → *Line capacity*; a spaghetti diagram's longest walk → *line standard* (move the place). Each link written as a rule with its
  reason, tested, and drawn the same way under every tool's *What it says* (`ui/NextStep`). Explainable, never wrong for a reason
  nobody can see.
- **B · Rules, then the line read by Claude, in the AI toolbox.** A as above, plus one AI tool — *Read the line* — that reads every
  tool's finding on a line (their own sentences, never raw data) and says, in words, where the money is and which tool to run next,
  citing the finding behind each sentence. It says; the formulas still count. It would change the 20 October rule (*the voice and
  the camera only*), so it needs his word.
- **C · Claude chooses the links.** Not recommended: a link that cannot say its rule is a link a client cannot trust.

## 3. What is not decided

- A, B or C for the links (A is the recommendation; B on top of it if he wants the AI to read across tools).
- Whether the AI mark appears on paper as well as on screen.
- The seven *maybe* entries (labour productivity, earned hours, capacity across the factory, the allergen changeover sequence,
  hoshin kanri, the improvement programme, ideas from the floor) stay *not built* until he says.
