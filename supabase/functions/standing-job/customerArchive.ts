import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const key = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

interface StoryStamp { client: string | null; stamp: number | null }

/** All live story anchors must be stamped before a customer is archived, as on the device. */
export async function archivedMailCustomers(db: SupabaseClient, ownerId: string): Promise<(client: string) => boolean> {
  const archived = new Map<string, boolean>();
  const size = 500;
  for (let start = 0; ; start += size) {
    const { data, error } = await db.from("studies").select("client:agreed->story->>client,stamp:agreed->story->archivedAt")
      .eq("owner_id", ownerId).eq("tool", "story").is("deleted_at", null).order("id")
      .range(start, start + size - 1);
    if (error || !data) throw new Error("Could not check the customer's archive status.");
    for (const row of data as StoryStamp[]) {
      if (!row.client) continue;
      const client = key(row.client);
      archived.set(client, (archived.get(client) ?? true) && typeof row.stamp === "number");
    }
    if (data.length < size) break;
  }
  return client => archived.get(key(client)) === true;
}
