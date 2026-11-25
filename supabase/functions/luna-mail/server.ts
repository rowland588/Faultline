import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { deliver, type DeliveryStore, type Mail, type Reservation } from "./resend.ts";

export const config = () => ({
  apiKey: Deno.env.get("RESEND_API_KEY"),
  from: Deno.env.get("RESEND_FROM_EMAIL") || "Luna <luna@faultline.opexelevate.co.uk>",
});
export async function isMailOwner(db: SupabaseClient, id: string): Promise<boolean> {
  const { data, error } = await db.from("profiles").select("is_super").eq("id", id).maybeSingle();
  if (error) throw new Error("Could not check email access.");
  return data?.is_super === true;
}
export function sendOwnerMail(db: SupabaseClient, owner: string, key: string, mail: Mail) {
  const table = "luna_mail_deliveries";
  const store: DeliveryStore = {
    async reserve(key, owner, payload) {
      const { error } = await db.from(table).upsert({ delivery_key: key, owner_id: owner, payload }, { onConflict: "delivery_key", ignoreDuplicates: true });
      if (error) throw new Error("Could not record the email request.");
      const { data, error: readError } = await db.from(table).select("created_at,payload,provider_id").eq("delivery_key", key).eq("owner_id", owner).single();
      if (readError || !data) throw new Error("Could not recover the email request.");
      return data as Reservation;
    },
    async accept(key, id) {
      const { error } = await db.from(table).update({ provider_id: id, accepted_at: new Date().toISOString(), payload: null }).eq("delivery_key", key).eq("owner_id", owner);
      if (error) throw new Error("Check Resend for acceptance. Retrying this confirmation uses the same delivery ID.");
    },
  };
  return deliver(store, owner, key, mail, config());
}
