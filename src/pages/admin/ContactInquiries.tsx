import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import CrmLayout from "@/components/crm/CrmLayout";
import { toast } from "sonner";

const ACCENT = "#FFD230";
// These tables are newer than the generated types; use the untyped client for them.
const db = supabase as unknown as SupabaseClient;

interface AgentConversation {
  id: string; created_at: string; updated_at: string; visitor_name: string | null; email: string | null; instagram: string | null; spotify: string | null;
  intent: string | null; qualified: boolean | null; notes: string | null; stage: string; notified_at: string | null; turns: number; transcript: string;
}

interface Inquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  handled: boolean;
  created_at: string;
}

export default function ContactInquiries() {
  const qc = useQueryClient();
  const [openChat, setOpenChat] = useState<string | null>(null);

  // The agent's conversations; the table is newer than the generated types.
  const { data: chats = [] } = useQuery({
    queryKey: ["agent-conversations"],
    queryFn: async () => {
      const { data, error } = await db.from("agent_conversations")
        .select("id,created_at,updated_at,visitor_name,email,instagram,spotify,intent,qualified,notes,stage,notified_at,turns,transcript")
        .order("updated_at", { ascending: false }).limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []) as AgentConversation[];
    },
  });

  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ["contact-submissions"],
    queryFn: async () => {
      const { data, error } = await db.from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Inquiry[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["contact-submissions"] });

  const toggleHandled = useMutation({
    mutationFn: async (row: Inquiry) => {
      const { error } = await db.from("contact_submissions")
        .update({ handled: !row.handled })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("contact_submissions")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const unread = inquiries.filter((i) => !i.handled).length;

  return (
    <CrmLayout title="Contact Inbox" accent={ACCENT}>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Contact Inbox</h1>
          <p className="text-xs uppercase tracking-widest opacity-60">
            {unread} new · {inquiries.length} total
          </p>
        </div>
        <p className="text-xs opacity-50 mb-8">
          Messages from the website contact form, newest first. Addressed to workwithpmg@gmail.com.
        </p>

        {isLoading ? (
          <p className="text-sm opacity-50">Loading…</p>
        ) : inquiries.length === 0 ? (
          <div className="border border-dashed border-white/15 p-10 text-center">
            <p className="text-sm opacity-60">No messages yet.</p>
            <p className="text-xs opacity-40 mt-2">
              Everything submitted through propmyganda.com/contact lands here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {inquiries.map((i) => (
              <li
                key={i.id}
                className={`border p-4 ${i.handled ? "border-white/10 opacity-50" : "border-white/25"}`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                  <span
                    className="inline-block w-2 h-2"
                    style={{ background: i.handled ? "#555" : ACCENT }}
                    aria-hidden
                  />
                  <span className="text-xs uppercase tracking-widest opacity-70">{i.subject}</span>
                  <span className="text-sm font-semibold">{i.name}</span>
                  <a href={`mailto:${i.email}`} className="text-xs underline opacity-60 hover:opacity-100">
                    {i.email}
                  </a>
                  <span className="text-xs opacity-40 ml-auto">
                    {new Date(i.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap opacity-90">{i.message}</p>
                <div className="flex gap-3 mt-3">
                  <button
                    type="button"
                    onClick={() => toggleHandled.mutate(i)}
                    className="text-xs uppercase tracking-widest border border-white/20 px-3 py-1.5 hover:border-white/60"
                  >
                    {i.handled ? "Mark unread" : "Mark handled"}
                  </button>
                  <a
                    href={`mailto:${i.email}?subject=${encodeURIComponent(`Re: ${i.subject}`)}`}
                    className="text-xs uppercase tracking-widest border border-white/20 px-3 py-1.5 hover:border-white/60"
                  >
                    Reply
                  </a>
                  <button
                    type="button"
                    onClick={() => remove.mutate(i.id)}
                    className="text-xs uppercase tracking-widest border border-red-500/40 text-red-400 px-3 py-1.5 hover:border-red-500 ml-auto"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-14 flex items-baseline justify-between mb-2">
          <h2 className="text-xl font-bold tracking-tight">Agent conversations</h2>
          <p className="text-xs uppercase tracking-widest opacity-60">{chats.filter((c) => c.stage === "handed_off").length} handed off · {chats.length} total</p>
        </div>
        <p className="text-xs opacity-50 mb-6">
          What the front-desk agent on /contact talked about. "Handed off" means money came up: the team was emailed and the visitor was told to DM Instagram with the word propworld.
        </p>
        {chats.length === 0 ? (
          <p className="text-sm opacity-50">No conversations yet.</p>
        ) : (
          <ul className="space-y-2">
            {chats.map((c) => (
              <li key={c.id} className={`border p-3 ${c.stage === "handed_off" ? "border-white/40" : "border-white/15"}`}>
                <button type="button" onClick={() => setOpenChat(openChat === c.id ? null : c.id)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left">
                  <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5" style={{ background: c.stage === "handed_off" ? ACCENT : "rgba(255,255,255,0.15)", color: c.stage === "handed_off" ? "#000" : "#fff" }}>{c.stage.replace("_", " ")}</span>
                  <span className="text-sm font-semibold">{c.visitor_name ?? (c.instagram ? `@${c.instagram}` : "Visitor")}</span>
                  {c.email && <span className="text-xs opacity-60">{c.email}</span>}
                  {c.intent && <span className="text-[10px] uppercase tracking-widest opacity-70">{c.intent}{c.qualified === null ? "" : c.qualified ? " · meets the bar" : " · under the bar"}</span>}
                  <span className="text-xs opacity-40 ml-auto">{c.turns} turns · {new Date(c.updated_at).toLocaleString()}</span>
                </button>
                {openChat === c.id && (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    {c.notes && <p className="mb-2 text-xs opacity-70">Notes: {c.notes}</p>}
                    <pre className="whitespace-pre-wrap font-sans text-sm opacity-90">{c.transcript || "(no text yet)"}</pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </CrmLayout>
  );
}
