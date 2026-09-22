import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_booking_status",
  title: "Update booking status",
  description: "Move a CRM booking to a different pipeline status.",
  inputSchema: {
    booking_id: z.string().describe("The booking id to update."),
    status: z
      .enum(["inquiry", "quoted", "booked", "shot", "delivered", "paid", "dead"])
      .describe("The new pipeline status."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ booking_id, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("crm_bookings")
      .update({ status })
      .eq("id", booking_id)
      .select("id, artist_name, status")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return { content: [{ type: "text", text: `No booking found with id ${booking_id}` }], isError: true };
    }
    const booking = { id: data.id, artistName: data.artist_name, status: data.status };
    return {
      content: [{ type: "text", text: `${booking.artistName} is now "${booking.status}".` }],
      structuredContent: { booking },
    };
  },
});
