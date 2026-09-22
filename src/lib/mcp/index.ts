import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listBookingsTool from "./tools/list-bookings";
import listShootsTool from "./tools/list-shoots";
import listDeliverablesTool from "./tools/list-deliverables";
import listArtistProspectsTool from "./tools/list-artist-prospects";
import updateBookingStatusTool from "./tools/update-booking-status";

const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "trwnqtgywfsalvismioi";

export default defineMcp({
  name: "propmyganda-brand-launch",
  title: "Propmyganda Brand Launch",
  version: "0.1.0",
  instructions:
    "Tools for the Propmyganda CRM. Read bookings, shoots, deliverables, and artist prospects, and move a booking through the pipeline. Every call acts as the signed-in PMG staff member.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listBookingsTool,
    listShootsTool,
    listDeliverablesTool,
    listArtistProspectsTool,
    updateBookingStatusTool,
  ],
});
