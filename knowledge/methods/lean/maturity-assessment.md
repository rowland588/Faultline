---
id: lean.maturity-assessment
name: Lean and operational-excellence maturity assessment
aka: [lean assessment, maturity model, Shingo model, lean audit, operational excellence assessment, OpEx assessment]
discipline: lean
kind: emerging
evidence: practice
depth: full
checked: 2026-10-25 — researched again (FC-018), by web-search excerpts only (this container cannot fetch pages: shingo.org, lean.org and nist.gov are refused). Confirmed in excerpts - the Shingo Model's ten guiding principles in three dimensions (a fourth, results, in some sources) described openly by the Shingo Institute at Utah State University, its Challenge assessment scored out of 1,000 points by examiners, its Insight self-assessment; MIT's LESAT version 1.0 (2001) and 2.0 (2012) with 54 practices and five capability levels, hosted on MIT's DSpace under a notice granting use and unlimited copies with other rights reserved; the Baldrige Excellence Framework with a free sample and a free Excellence Builder for manufacturers; Toyota Kata's free materials on the author's sites. NOT found - the Shingo Institute's, LEI's or MIT's licence wording for reuse inside software, and the text of any criterion. Not read - any model document. The scoring and agreement arithmetic below is generic (from knowledge); the licensing of any named model is unsettled and is in `knowledge/GAPS.md`
needs: []
next: [projects.ci-programme]
alternatives: []
related: [lean.five-s, visual.daily-management, msa.attribute-agreement]
---
# Lean and operational-excellence maturity assessment

## Purpose and principle
A structured judgement of how far an operation's practices and
behaviours have come — daily management, problem solving, standard
work, visual management, leader behaviours, and more — against a
model's levels (typically five, from "not started" to "a way of life"),
with evidence for each, so that a site or a group chooses what to
develop next and sees whether it is moving year on year. Every model is
somebody's: the Shingo Institute's is built on guiding principles and
behaviours rather than tools; groups and consultancies have their own
with their own dimensions. The arithmetic is simple and the judgements
are the hard part: two assessors must see the same evidence the same
way, or the score is theirs rather than the site's.

## Questions it answers
- Where is this site strong and weak, by dimension, against the
  model's levels?
- Has it moved since the last assessment?
- Do two assessors agree (is the score reliable)?
- What is the next level's evidence in each weak dimension — the
  development plan?

## Inputs and minimum conditions
- A chosen model with its dimensions, its level descriptions and the
  evidence each level needs — and the right to use it.
- Trained assessors (two or more), a day on the floor and in the
  records, the evidence noted against each criterion.
- The previous assessment for the trend.

## Procedure and calculation
- Each dimension scored at the level whose evidence is fully met (not
  partly); the mean across dimensions is a summary only — the profile
  by dimension is the result.
- Assessor agreement: the share of dimensions scored exactly alike by
  two assessors, and within one level; under about 70% exact, the
  descriptors or the training need work before the score is reported
  (`msa.attribute-agreement` for the full method with κ).
- The trend: each dimension against the previous assessment; a rise
  that two assessors agree on is a move.
- The development plan: for each weak dimension, the next level's
  evidence as actions with owners (`projects.ci-programme`).
- The tools' own numbers (the loss count, the capability, the audits)
  are the evidence for several dimensions; a high maturity score with
  poor numbers is a model problem.

**Worked case** (`cases-lean.py`): five dimensions, two assessors.
Daily management 2 and 2; problem solving 3 and 2; standard work 2 and
3; visual management 3 and 3; leader behaviours 2 and 2. Exact
agreement on 3 of 5 (60%) — below the 70% that would let the score
stand; the two disagreements are reconciled on the evidence before the
profile is reported. Mean level 2.4 of 5; the profile says daily
management and leader behaviours are the development plan.

## Assumptions, limits and misuse
- Models differ and are often proprietary; a group's model may be used
  only within the group, and the Shingo model's assessment is the
  Institute's. Licensing is unverified here (`knowledge/GAPS.md`).
- **What is open, and what that does and does not allow (25 October
  2026, from excerpts).** *Shingo Model:* the ten principles are described
  freely by the Institute (Respect Every Individual, Lead with Humility;
  Seek Perfection, Embrace Scientific Thinking, Focus on Process, Assure
  Quality at the Source, Improve Flow and Pull; Think Systemically, Create
  Constancy of Purpose, Create Value for the Customer — wording varies a
  little between sources). Describing them is not the Institute's
  assessment: that is examiners rating behaviours of people at every level,
  a 1,000-point scheme with bands (Bronze · Silver · Prize), and the
  *Shingo Model* name and its Insight survey are the Institute's. *LESAT
  (MIT/LAI, 2001; 2012):* free to download and copy under MIT's notice
  (other rights reserved), 54 practices (version 1.0) each with indicators
  and five capability levels; usable as a self-assessment and a good
  structural example, but its descriptors are MIT's text, and it is an
  aerospace-enterprise instrument. *Baldrige (NIST):* a U.S. government
  framework, with a free sample and a free *Excellence Builder* for
  manufacturers; the full Manufacturing edition is sold; scores process
  (approach, deployment, learning, integration) and results separately.
  *Toyota Kata (Rother):* not a maturity model; it is the Improvement and
  Coaching Kata, with free practice materials, and is the route to the
  *next* step rather than a scale. *LEI's Lean Transformation Framework:* five
  questions (purpose, process, capability, management system, basic
  thinking) taught in paid courses; no free instrument was found. Each of
  these can be *read* freely; none was found to allow its criteria to be
  bundled into a product without permission, and permission was not asked.
- A maturity score can mislead when its criteria are rated by one person,
  or when it is read as a ranking; the app says how many assessors rated
  and how often they agreed, and never ranks two sites.
- Scores are judgements; without two assessors and their agreement the
  number is one person's opinion.
- A maturity score as a target produces assessment theatre; the
  numbers on the floor are the target, the maturity is how they are
  achieved.
- Comparing sites on different models, or on one model with different
  assessors, compares the assessors.
- An assessment a year is a photograph; the daily management system is
  the film.

## Reading the result
"Daily management level 2 of 5, problem solving 3, standard work 2,
visual management 3, leader behaviours 2 — assessors agreed on three of
five; the plan is daily management and leaders' routines." Money: none
of its own; its value is where it points the programme whose tools carry
the money (`knowledge/MONEY.md`).

## When not to use it — and instead
For a line's numbers, use the tools themselves. The programme the
assessment feeds → `projects.ci-programme`. Workplace order →
`lean.five-s`. The daily routine → `visual.daily-management`.

## In food and FMCG manufacturing
Group-wide manufacturing excellence programmes assessing each site
yearly; a site's own self-assessment before a group's; the development
plan in the site's hoshin.

## References
- [practice] Shingo Institute (Utah State University), *The Shingo Model* — guiding principles, cultural enablers, continuous improvement, enterprise alignment (and results); https://shingo.org/shingo-model/ , https://shingo.org/cultural-enablers/ , the booklet linked from shingo.org (a webflow upload, v14.7), the Challenge https://inst.shingo.org/challenge/ ; the principles, dimensions and the 1,000-point scoring seen in search excerpts and secondary pages, 25 Oct 2026; the Institute's copyright and trademark terms not seen.
- [practice] Lean Advancement Initiative (MIT), *Lean Enterprise Self-Assessment Tool (LESAT)*, version 1.0 (August 2001) and facilitator's guide, https://dspace.mit.edu/bitstream/handle/1721.1/81904/PRD_LESAT_Fac._Guide_2001.pdf ; version 2.0 (February 2012), https://dspace.mit.edu/server/api/core/bitstreams/b19b2e12-5a17-4dfa-9804-d2a2988447ed/content — free; structure (54 practices, five levels) and the copyright notice (use and unlimited copies, other rights reserved) seen in excerpts only.
- [guidance] NIST, *Baldrige Excellence Framework* and *Baldrige Excellence Builder*, https://www.nist.gov/baldrige/publications/baldrige-excellence-framework and https://www.nist.gov/baldrige/baldrige-faqs-baldrige-excellence-framework-and-criteria — process and results scoring dimensions seen in excerpts; the manufacturing edition is sold; a free Builder exists; copyright status of the Builder not confirmed.
- [practice] Rother, M., *Toyota Kata* (McGraw-Hill, 2009) and *The Toyota Kata Practice Guide* (2018); free materials at http://www-personal.umich.edu/~mrother/Supporting_Materials.html — a routine of improvement, not a maturity scale; excerpts only.
- [practice] Lean Enterprise Institute, Lean Transformation Framework, https://www.lean.org/the-lean-post/articles/the-lean-transformation-framework/ — five questions; paid courses; excerpts only.
- [textbook] Liker, J.K. and Convis, G.L. (2012), *The Toyota Way to Lean Leadership*, McGraw-Hill — leadership behaviours as the measure (from knowledge).
- [practice] Various group and consultancy models (proprietary; not cited).

## In Faultline
**Researched 25 October 2026 (FC-018). Verdict: CAN BE BUILT, narrowly, as a
frame the person fills in, with no model bundled; not before Rowland says
go (and `docs/DIRECTION.md`: deep, not wide, and the entry's value is low).**
The answer to "which model, with what right to use it" is: none is
bundled. The arithmetic of a maturity assessment (a level per criterion,
evidence beside it, two assessors' agreement, a profile, the trend, a
development plan) belongs to nobody; the criteria and their level
descriptors belong to whoever wrote them. So the tool holds *a person's
own list* and never ships one.

**The minimal honest build (a "maturity assessment" mode of the
improvement programme, whose actions it feeds):**
- *Inputs:* the model's name, owner, edition and a note of the right to use
  it ("our group's own", "Shingo self-study, not an assessment", "MIT LESAT
  v2, free to copy", "ours"), typed by the person; the list of dimensions
  and criteria typed or pasted by them, each with the scale (default 1 to
  5, or their own), the number of assessors, and the *evidence* for each
  level chosen as text, a photo, or a link to a record in the app (the loss
  count, the audit, the register) — evidence beside every score, none
  scored without it; the date of the assessment; the earlier one.
- *Calculations:* the level per criterion held at the lower of two
  assessors until reconciled (a Faultline choice, said on the paper); the profile by dimension (not a mean as the headline);
  exact and within-one-level agreement between two assessors, with Cohen's
  κ when there are enough criteria (`msa.attribute-agreement`); the change
  since the last assessment of the same model and edition (refused across
  different models or editions); the gap to a target level the person sets.
- *Outputs:* the profile and its trend, the criteria whose assessors
  disagreed, the lowest criteria as the development plan written to the
  actions (owner · day), and a paper carrying the model's name, owner,
  edition and right-to-use note.
- *Verdict ideas:* "scores stand" only when agreement reaches the level the
  person set (default about 70% exact, from the generic rule above, to be
  confirmed as a choice of Faultline's, not a model's); "a high score with
  poor measured results" if the same period's loss count or reject rate has
  worsened (a prompt to question the model, never a verdict on the site).
- *Must not claim:* to be the Shingo assessment, the Shingo Model, a
  Baldrige or LESAT assessment, or "a Shingo score"; that two sites' scores
  compare; that a high score means a good site; any criterion text as
  Faultline's. No built-in model, and no AI scoring: the evidence and the
  levels are people's.
- *Why it is low-value to rush:* it does not read the floor's numbers except
  as optional evidence, so it risks being the "gimmick" `CLAUDE.md` names (a
  field nobody is asked to fill in); a first user is Rowland's group, if it
  has a model of its own to load. Ask which model, and whether it may be
  used, before specifying.
