import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Prefer env vars so dev/staging can point at a non-production project.
// The hardcoded values are the production defaults (the publishable key is
// safe to ship — access is governed by RLS), used when env is not provided.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://trwnqtgywfsalvismioi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "sb_publishable_xlw7vV9SYkSP3odres8gnA_BkOAYxk6";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
