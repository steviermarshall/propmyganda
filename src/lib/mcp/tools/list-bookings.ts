import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_bookings",
  title: "List bookings",
  description: "List PMG CRM bookings in the pipeline, optionally filtered by status.",
  inputSchema: {
    status: z
      .enum(["inquiry", "quoted", "booked", "shot", "delivered", "paid", "dead"])
      .optional()
      .describe("Only return bookings in this pipeline status."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 25, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const take = Math.min(Math.max(limit ?? 25, 1), 100);
    let query = supabaseForUser(ctx)
      .from("crm_bookings")
      .select("id, artist_name, song_or_project, package, amount_quoted, status, shoot_date, source, notes")
      .order("created_at", { ascending: false })
      .limit(take);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const bookings = (data ?? []).map((b) => ({
      id: b.id,
      artistName: b.artist_name,
      project: b.song_or_project ?? null,
      package: b.package ?? null,
      amountQuoted: b.amount_quoted ?? null,
      status: b.status,
      shootDate: b.shoot_date ?? null,
      source: b.source ?? null,
      notes: b.notes ?? null,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(bookings, null, 2) }],
      structuredContent: { bookings },
    };
  },
});
