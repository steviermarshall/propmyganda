import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_shoots",
  title: "List shoots",
  description: "List scheduled production shoots, optionally within a date range or by status.",
  inputSchema: {
    from: z.string().optional().describe("Earliest shoot date, as YYYY-MM-DD."),
    to: z.string().optional().describe("Latest shoot date, as YYYY-MM-DD."),
    status: z
      .enum(["scheduled", "filming", "edit", "review", "delivered"])
      .optional()
      .describe("Only return shoots in this status."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 25, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const take = Math.min(Math.max(limit ?? 25, 1), 100);
    let query = supabaseForUser(ctx)
      .from("shoots")
      .select("id, artist_name, shoot_date, shoot_window, shoot_type, location, status, shooter, notes")
      .order("shoot_date", { ascending: true })
      .limit(take);
    if (from) query = query.gte("shoot_date", from);
    if (to) query = query.lte("shoot_date", to);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const shoots = (data ?? []).map((s) => ({
      id: s.id,
      artistName: s.artist_name,
      shootDate: s.shoot_date,
      shootWindow: s.shoot_window ?? null,
      shootType: s.shoot_type,
      location: s.location ?? null,
      status: s.status,
      shooter: s.shooter ?? null,
      notes: s.notes ?? null,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(shoots, null, 2) }],
      structuredContent: { shoots },
    };
  },
});
