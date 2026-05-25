import { useEffect, useState } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface SearchHit {
  id: string;
  label: string;
  sub: string;
  goto: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: Props) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const like = `%${q}%`;
      const [prospects, bookings, sponsors, shoots] = await Promise.all([
        supabase.from("artist_prospects").select("id,name,outreach_status").ilike("name", like).limit(5),
        supabase.from("crm_bookings").select("id,artist_name,status").ilike("artist_name", like).limit(5),
        supabase.from("sponsor_pipeline").select("id,brand_name,stage").ilike("brand_name", like).limit(5),
        supabase.from("shoots").select("id,artist_name,shoot_date").ilike("artist_name", like).limit(5),
      ]);
      if (cancelled) return;
      const out: SearchHit[] = [];
      (prospects.data ?? []).forEach((r) =>
        out.push({ id: r.id, label: r.name ?? "", sub: `Prospect · ${r.outreach_status}`, goto: "/admin/mike" }));
      (bookings.data ?? []).forEach((r) =>
        out.push({ id: r.id, label: r.artist_name ?? "", sub: `Booking · ${r.status}`, goto: "/admin/mike" }));
      (sponsors.data ?? []).forEach((r) =>
        out.push({ id: r.id, label: r.brand_name ?? "", sub: `Sponsor · ${r.stage}`, goto: "/admin/steven" }));
      (shoots.data ?? []).forEach((r) =>
        out.push({ id: r.id, label: r.artist_name ?? "", sub: `Shoot · ${r.shoot_date}`, goto: "/admin/jay" }));
      setHits(out);
    })();
    return () => { cancelled = true; };
  }, [q, open]);

  const jumpItems = [
    { label: "Jump → CEO Dashboard", goto: "/admin/stevie" },
    { label: "Jump → Mike", goto: "/admin/mike" },
    { label: "Jump → Steven", goto: "/admin/steven" },
    { label: "Jump → Jay", goto: "/admin/jay" },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search artists, brands, shoots…" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        {hits.length > 0 && (
          <CommandGroup heading="Results">
            {hits.map((h) => (
              <CommandItem
                key={`${h.goto}-${h.id}`}
                onSelect={() => { onOpenChange(false); navigate(h.goto); }}
              >
                <div className="flex flex-col">
                  <span>{h.label}</span>
                  <span className="text-[10px] text-white/40 uppercase tracking-widest">{h.sub}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Navigate">
          {jumpItems.map((j) => (
            <CommandItem key={j.goto} onSelect={() => { onOpenChange(false); navigate(j.goto); }}>
              {j.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
