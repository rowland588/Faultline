import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { isMailOwner, sendOwnerMail } from "../luna-mail/server.ts";

interface Schedule {
  id: string; owner_id: string; client: string;
  scope: { email?: { to: string; message?: string; subject?: string } } | null;
}
export async function sendBriefing(db: SupabaseClient, job: Schedule, period: string) {
  const recipient = job.scope?.email;
  if (!recipient?.to || !job.client.trim() || !await isMailOwner(db, job.owner_id)) throw new Error("Luna email is available to the schedule owner only.");
  let body = recipient.message;
  if (!body) {
    const { data, error } = await db.rpc("luna_mail_line_briefing", { p_owner: job.owner_id, p_client: job.client });
    if (error || typeof data !== "string" || !data.trim()) throw new Error("Could not read the customer's synced lines and open problems.");
    body = "Synced line and problem briefing for " + job.client + " · " + period + "\n\n" + data;
  }
  return sendOwnerMail(db, job.owner_id, "schedule/" + job.owner_id + "/" + job.id + "/" + period, {
    to: recipient.to, subject: recipient.subject || ("Luna briefing — " + job.client).slice(0, 200), body,
  });
}
