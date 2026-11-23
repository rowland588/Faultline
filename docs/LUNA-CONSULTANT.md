# Luna and the consultant's customers

**For consultant use** — several customers, one person, voice or chat. Rowland, 23 November: Luna must **govern customers** like an
admin: archive and start a business without sending them hunting.

## What Set up already does

Customers is **first on Set up** — add, archive (with confirm), continue from **Archived**. Every record stays; archive only hides a
customer from lists and from Luna's reads until it is continued. Proof: `scripts/acceptance/customers.mjs`.

## What Luna does the same way

| They say | Luna |
|---|---|
| Which customers? Is X archived? | `list_customers` (read, at once) |
| Archive Branston / put Cobb away | `archive_customer` — **one confirm card**, customer named in their words |
| Bring Cobb back / un-archive | `continue_customer` — card |
| Start a new business called … / I'm at a new customer today | `start_visit` — **one card** (name; site and brief if they said them) |
| Where do I archive? Manage customers | `open_page` Set up › Customers, or do the job on a card |

**Never** archive without a named customer and their yes on the card. **Never** delete data. Archiving is the **one** thing she may put
away (`docs/DIRECTION.md`, rule 3 — Rowland's exception, 21 November).

## How she should sound after

- **Archive:** customer put away, everything kept, nothing read until continued — then a short forward line (*Where are we going next?*).
- **Start visit:** client in hand, what is ready (empty Lines tab with the next step, Set up for lines). One short question if site or
  brief missing. **Hold fire / when I get back:** acknowledge, no push, say what is already ready.

Instructions: `src/tools/colleague/colleagueAssist.ts` (`ADMIN / CUSTOMER GOVERNANCE`, synced to the assist gateway). Capabilities:
`src/capabilities/visits.ts`. Proof: `scripts/acceptance/customers.mjs`, `scripts/acceptance/luna-customer-governance.mjs`,
`scripts/acceptance/luna-visits.mjs`. Workspace design: `docs/CONSULTANT-WORKSPACE.md` C2a, C6.