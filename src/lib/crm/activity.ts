import { supabase } from "@/integrations/supabase/client";

type EntityType =
  | "crm_booking" | "artist_prospect" | "distro_artist" | "royalty_payment"
  | "sponsor_pipeline" | "store_order" | "shoot" | "deliverable"
  | "media_agency_project" | "article" | "newsletter_send";

type Action =
  | "created" | "updated" | "status_changed" | "closed"
  | "contacted" | "pitched" | "assigned" | "deleted";

export async function logActivity(
  teamMemberId: string | null | undefined,
  entityType: EntityType,
  entityId: string,
  action: Action,
  payload: Record<string, unknown> = {}
): Promise<void> {
  if (!teamMemberId) return;
  try {
    await (supabase.from("activity_log") as any).insert({
      team_member_id: teamMemberId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      payload,
    });
  } catch {
    // best-effort; do not break the UI on logging failure
  }
}
