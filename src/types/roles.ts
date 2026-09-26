// Role unions live here (NOT in the auto-generated supabase/types.ts, which is
// overwritten on every schema regeneration).
import type { Database } from "@/integrations/supabase/types";

/** Public-site dashboard roles (profiles.role enum). */
export type UserRole = Database["public"]["Enums"]["user_role"];

/** CRM staff roles (team_members.role — constraint allows 'editor' too). */
export type CrmRole = "admin" | "mike" | "steven" | "jay" | "editor";
