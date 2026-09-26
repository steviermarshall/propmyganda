import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CrmLayout from "@/components/crm/CrmLayout";
import { toast } from "sonner";

const ACCENT = "#FFD230";

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

  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ["contact-submissions"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("contact_submissions") as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Inquiry[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["contact-submissions"] });

  const toggleHandled = useMutation({
    mutationFn: async (row: Inquiry) => {
      const { error } = await (supabase.from("contact_submissions") as any)
        .update({ handled: !row.handled })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("contact_submissions") as any)
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
      </div>
    </CrmLayout>
  );
}
