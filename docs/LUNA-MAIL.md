# Luna can send this email — 24 November 2026

Rowland, 24 November 2026: after talking with Luna (an Excel uploaded, a graph made) he wants to say **“send this email to John”**. Luna may ask who John is, then **send the email** (connector).

This is that first slice. Nothing here invents a figure. Nothing is sent until the person confirms on a card.

## 1. What “send this to John” means

| Word | What the app does |
|---|---|
| **this** | The latest **chart** in this conversation, else the latest **report**, else the person names one (`chartId` / `reportId`). The body is those artifacts’ own words and figures — already in the app, already checked. A covering line (`note`) may sit above them; it is not a place for new numbers. |
| **John** | People in the app (the business’s People) and owners on the **customer in hand’s** problems and actions. One match with an address: that address, confirmed on the card. Several: ask which. None, or a name with no address: ask **once** who they are and for the address. An address the person typed is used as typed — still confirmed. Never guessed. Never another customer’s people. |
| **send** | Microsoft Graph **Mail.Send** (delegated), same Entra app as SharePoint and OneDrive (X1). A **write**: shown as a card (`send_email`), sent only on **Do it**. Not now sends nothing. |

## 2. The connector

The same Microsoft 365 registration Luna already uses for files (`src/lib/microsoft`, Data connections › Connect to Microsoft). **One extra delegated permission: `Mail.Send`.** It sends from the signed-in person’s own mailbox (`POST /me/sendMail`). It does not read the inbox or the calendar. It does not write, move or delete files.

| On this device | What Luna does |
|---|---|
| Signed in with `Mail.Send` (Outlook connected) | The card sends through Graph. |
| Signed in for files only, or not signed in | The card still shows what would be sent. On **Do it**, nothing is sent: *Outlook is not connected — Connect Outlook on Data connections.* Luna opens that page (`open_page` `#/factory/data?ms=1&mail=1`). |
| Entra app has no `Mail.Send` yet | Sign-in for Outlook fails in words pointing at the Entra step. Tick **Mail.Send** (Microsoft Graph › Delegated) and grant admin consent, or re-run the Cloud Shell line (`public/microsoft-setup.sh`) — it now includes `Mail.Send`. |

The Application (client) ID cannot be invented from the repo. Rowland (or the tenant’s IT) ticks **Mail.Send** on the existing Faultline registration.

## 3. The capabilities

| Name | Kind | What it does |
|---|---|---|
| `find_person` | read | Who “John” is, among People and the customer in hand’s owners. Several or none said so. Never another customer. |
| `draft_email` | read | Assembles **this** from the conversation and the recipient. Says the subject, the body (from the artifact), the attachment (the chart as SVG). Does not send. Says when Outlook is not connected. |
| `send_email` | write | Needs a recipient address (`to`). Card first. Builds the body from the artifact in code. Sends through Graph only on confirm. Refused without `to`. A client (read-only) cannot send. |

A figure in the email is the chart’s or the report’s — the same series and sections the conversation already holds. Luna does not write numbers into the body.

## 4. Where a person finds it

- **Ask Luna:** “send this email to John”, “email this chart to …”.
- **Data connections** (`#/factory/data`): **Connect Outlook** on the Files cards; Connect to Microsoft (`#/factory/data?ms=1`) is its own page — **Mail.Send** in the Entra permissions.
- **Everything**, typing “send email” or “outlook” → Data connections.

## 5. What this slice does not do

- Read mail, a calendar, or a contacts directory in Microsoft 365 (People in Faultline, not Graph contacts).
- Send without a card, on a schedule, or to a list.
- Attach a PDF of the report (the report’s own sections are the body; the chart is an SVG). A PDF attach is a later slice.
- A second AI provider or a server-side mail key — Claude through `assist` only; the send is Graph as the signed-in person.

## 6. Proof

- `src/lib/mail/__tests__/mail.test.ts` — who “John” is; what “this” attaches; no figure invented.
- `src/lib/microsoft/__tests__/mail.test.ts` — Graph `sendMail` as played; missing token said as Connect Outlook.
- `src/capabilities/__tests__/mail.test.ts` and `capabilities.test.ts` — confirm; refuse without recipient; a client cannot send; customer in hand.
- `scripts/acceptance/luna-mail.mjs` — Data connections (Mail.Send, Connect Outlook); a card; Not now sends nothing; Do it posts to Graph played by the script; no live tenant.
