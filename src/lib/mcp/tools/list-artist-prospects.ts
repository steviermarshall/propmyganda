import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_artist_prospects",
  title: "List artist prospects",
  description: "List artist outreach prospects with their fit score and outreach status.",
  inputSchema: {
    outreach_status: z
      .enum(["cold", "pitched", "replied", "discovery_call", "closed", "dead"])
      .optional()
      .describe("Only return prospects in this outreach status."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 25, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ outreach_status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const take = Math.min(Math.max(limit ?? 25, 1), 100);
    let query = supabaseForUser(ctx)
      .from("artist_prospects")
      .select(
        "id, name, city, genre, spotify_monthly_listeners, ig_followers, ig_handle, fit_score, intended_lane, outreach_status, next_followup_date",
      )
      .order("fit_score", { ascending: false })
      .limit(take);
    if (outreach_status) query = query.eq("outreach_status", outreach_status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const prospects = (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      city: p.city ?? null,
      genre: p.genre ?? null,
      spotifyMonthlyListeners: p.spotify_monthly_listeners ?? null,
      igFollowers: p.ig_followers ?? null,
      igHandle: p.ig_handle ?? null,
      fitScore: p.fit_score ?? null,
      intendedLane: p.intended_lane ?? null,
      outreachStatus: p.outreach_status,
      nextFollowupDate: p.next_followup_date ?? null,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(prospects, null, 2) }],
      structuredContent: { prospects },
    };
  },
});
