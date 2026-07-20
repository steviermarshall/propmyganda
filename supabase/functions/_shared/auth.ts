// Caller authentication + authorization for CRM edge functions.
//
// These functions hold the service-role key, so they MUST verify who is
// calling before doing any work. `supabase.functions.invoke` from the
// browser forwards the signed-in user's JWT in the Authorization header;
// we validate it against auth, then confirm the user maps to a
// team_members row (optionally with a specific role).

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  // Lock this down to your production origin(s) once known.
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ALLOW_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export interface Caller {
  userId: string;
  email: string | null;
  teamMemberId: string;
  role: string;
}

/**
 * Verify the request's bearer token and resolve the caller's team_members row.
 *
 * @param req            Incoming request (reads the Authorization header).
 * @param serviceClient  Service-role client used to look up team_members.
 * @param allowedRoles   If provided, caller.role must be in this list.
 * @returns The caller, or a ready-to-return 401/403 Response on failure.
 */
export async function requireTeamMember(
  req: Request,
  serviceClient: SupabaseClient,
  allowedRoles?: string[],
): Promise<Caller | Response> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return jsonResponse({ error: "Missing Authorization header" }, 401);

  // Validate the JWT with a request-scoped anon client (never the service key).
  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData?.user) {
    return jsonResponse({ error: "Invalid or expired session" }, 401);
  }
  const user = userData.user;

  // Resolve the CRM identity via the service client (bypasses RLS for the lookup).
  const { data: member } = await serviceClient
    .from("team_members")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!member) {
    return jsonResponse({ error: "Not a CRM team member" }, 403);
  }

  if (allowedRoles && !allowedRoles.includes(member.role)) {
    return jsonResponse({ error: "Insufficient role" }, 403);
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    teamMemberId: member.id,
    role: member.role,
  };
}
