# Email from Luna

The owner can ask Luna by voice or text to send a written message, a chart or a conversation report. Luna resolves a name with **find_person** using People and the current customer’s records. Ambiguous matches need an address. The confirmation card shows the recipient, sender, subject and content. A chart includes its SVG. A conversation report includes its sections in the email body. Each send has its own confirmation, including during an approved job.

**Recurring email.** Ask “Every Monday at 08:30, email the line and problem briefing to jane@example.com” with the customer selected. A dictated recurring message sends the confirmed text. A briefing reads the customer’s current synced lines and open problems when it runs. Luna → Schedules shows the recipient and London time, with edit, pause and remove. Adding a recipient to an existing daily or weekly briefing is optional. The schedule is saved online before Luna confirms it. Supabase runs it with the app closed, within the five-minute tick while the service is available.

**Providers.** Claude still runs Luna. The owner’s one-off emails use Resend when its key is configured. The existing delegated Microsoft Graph route remains available for one-off email when Resend is unconfigured or unavailable to that account. Recurring mail uses Resend. A failed or ambiguous provider submission is never retried through another provider. Resend acceptance means the provider accepted the request. Confirm final delivery or a bounce in Resend.

## Production setup

1. In Resend, select the sending domain **faultline.opexelevate.co.uk**. Copy its complete DKIM TXT and two outbound CNAME records into the **opexelevate.co.uk** zone at **IONOS**. Use the names and values verbatim as IONOS expects relative to the zone. Select **Verify** in Resend after publication. Receiving can stay off.
2. In Supabase project **eqdigvzbljofxznqtfia** → **Edge Functions → Secrets**, set **RESEND_API_KEY** to a sending-only key for the verified domain. The default From is **Luna &lt;luna@faultline.opexelevate.co.uk&gt;**. Override with **RESEND_FROM_EMAIL** for another verified sender. Vercel serves the frontend. No sending credential belongs in its browser build.
3. After verifying the domain, confirm a message to an address you own and check its delivery event. Then enable customer schedules individually.

The authenticated luna-mail function checks the signed-in owner. The scheduled sender requires the protected cron key and rechecks the owner. The server freezes each first attempt and uses the same Resend idempotency key for retries. After acceptance the ledger retains only metadata. An unresolved attempt near the provider's 24-hour key expiry needs manual review.
