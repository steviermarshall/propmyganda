import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_deliverables",
  title: "List deliverables",
  description: "List edit deliverables and their current status, optionally filtered by status.",
  inputSchema: {
    status: z
      .enum(["filmed", "editing", "reviewed", "uploaded", "published"])
      .optional()
      .describe("Only return deliverables in this status."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 25, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const take = Math.min(Math.max(limit ?? 25, 1), 100);
    let query = supabaseForUser(ctx)
      .from("deliverables")
      .select("id, shoot_id, format, status, platform, edited_by, filmed_at, delivered_at")
      .order("updated_at", { ascending: false })
      .limit(take);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const deliverables = (data ?? []).map((d) => ({
      id: d.id,
      shootId: d.shoot_id,
      format: d.format,
      status: d.status,
      platforms: (d.platform ?? []).map((p) => p),
      editedBy: d.edited_by ?? null,
      filmedAt: d.filmed_at ?? null,
      deliveredAt: d.delivered_at ?? null,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(deliverables, null, 2) }],
      structuredContent: { deliverables },
    };
  },
});
