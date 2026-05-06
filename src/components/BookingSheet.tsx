import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Service = "security" | "dj" | "venue" | "promoter";
type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const WEBHOOK = import.meta.env.VITE_BOOKING_WEBHOOK_URL as string | undefined;

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-transparent border-b border-border py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-foreground outline-none transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

function CommonFields({ data, set }: { data: Partial<BookingInsert>; set: (k: keyof BookingInsert, v: string) => void }) {
  return (
    <>
      <Field label="Name" required>
        <input className={inputCls} placeholder="Full name" value={data.name ?? ""} onChange={e => set("name", e.target.value)} />
      </Field>
      <Field label="Email" required>
        <input className={inputCls} type="email" placeholder="your@email.com" value={data.email ?? ""} onChange={e => set("email", e.target.value)} />
      </Field>
      <Field label="Phone">
        <input className={inputCls} type="tel" placeholder="+1 (555) 000-0000" value={data.phone ?? ""} onChange={e => set("phone", e.target.value)} />
      </Field>
      <Field label="Event Date">
        <input className={inputCls} type="date" value={data.event_date ?? ""} onChange={e => set("event_date", e.target.value)} />
      </Field>
      <Field label="Location / City">
        <input className={inputCls} placeholder="Venue or city" value={data.location ?? ""} onChange={e => set("location", e.target.value)} />
      </Field>
    </>
  );
}

function SecurityForm({ data, set }: { data: Partial<BookingInsert>; set: (k: keyof BookingInsert, v: string) => void }) {
  return (
    <div className="space-y-6">
      <CommonFields data={data} set={set} />
      <Field label="Staff Count Needed">
        <input className={inputCls} placeholder="e.g. 4 officers" value={data.staff_count ?? ""} onChange={e => set("staff_count", e.target.value)} />
      </Field>
      <Field label="Expected Attendance">
        <input className={inputCls} placeholder="e.g. 500" value={data.expected_attendance ?? ""} onChange={e => set("expected_attendance", e.target.value)} />
      </Field>
      <Field label="Indoor / Outdoor">
        <select className={selectCls} value={data.indoor_outdoor ?? ""} onChange={e => set("indoor_outdoor", e.target.value)}>
          <option value="">Select…</option>
          <option>Indoor</option>
          <option>Outdoor</option>
          <option>Both</option>
        </select>
      </Field>
      <Field label="Additional Notes">
        <textarea className={inputCls} rows={3} placeholder="Event type, special requirements…" value={data.notes ?? ""} onChange={e => set("notes", e.target.value)} />
      </Field>
    </div>
  );
}

function DjForm({ data, set }: { data: Partial<BookingInsert>; set: (k: keyof BookingInsert, v: string) => void }) {
  return (
    <div className="space-y-6">
      <CommonFields data={data} set={set} />
      <Field label="Set Length">
        <input className={inputCls} placeholder="e.g. 2 hours" value={data.set_length ?? ""} onChange={e => set("set_length", e.target.value)} />
      </Field>
      <Field label="Genre / Style">
        <input className={inputCls} placeholder="e.g. Afrobeats, Hip-Hop, House" value={data.genre ?? ""} onChange={e => set("genre", e.target.value)} />
      </Field>
      <Field label="Equipment">
        <select className={selectCls} value={data.equipment ?? ""} onChange={e => set("equipment", e.target.value)}>
          <option value="">Equipment needed?</option>
          <option>I'll provide everything</option>
          <option>Venue provides CDJs / mixer</option>
          <option>Need full setup</option>
          <option>Let's discuss</option>
        </select>
      </Field>
      <Field label="Indoor / Outdoor">
        <select className={selectCls} value={data.indoor_outdoor ?? ""} onChange={e => set("indoor_outdoor", e.target.value)}>
          <option value="">Select…</option>
          <option>Indoor</option>
          <option>Outdoor</option>
          <option>Both</option>
        </select>
      </Field>
      <Field label="Additional Notes">
        <textarea className={inputCls} rows={3} placeholder="Theme, crowd size, special requests…" value={data.notes ?? ""} onChange={e => set("notes", e.target.value)} />
      </Field>
    </div>
  );
}

function VenueForm({ data, set }: { data: Partial<BookingInsert>; set: (k: keyof BookingInsert, v: string) => void }) {
  return (
    <div className="space-y-6">
      <CommonFields data={data} set={set} />
      <Field label="Venue Capacity">
        <input className={inputCls} placeholder="e.g. 300 guests" value={data.capacity ?? ""} onChange={e => set("capacity", e.target.value)} />
      </Field>
      <Field label="Event Type">
        <input className={inputCls} placeholder="e.g. Concert, Private Party, Corporate" value={data.event_type ?? ""} onChange={e => set("event_type", e.target.value)} />
      </Field>
      <Field label="Amenities Needed">
        <textarea className={inputCls} rows={3} placeholder="Bar, stage, lighting, parking…" value={data.amenities ?? ""} onChange={e => set("amenities", e.target.value)} />
      </Field>
      <Field label="Additional Notes">
        <textarea className={inputCls} rows={3} placeholder="Any other requirements…" value={data.notes ?? ""} onChange={e => set("notes", e.target.value)} />
      </Field>
    </div>
  );
}

function PromoterForm({ data, set }: { data: Partial<BookingInsert>; set: (k: keyof BookingInsert, v: string) => void }) {
  return (
    <div className="space-y-6">
      <CommonFields data={data} set={set} />
      <Field label="Expected Attendance">
        <input className={inputCls} placeholder="e.g. 200–500" value={data.expected_attendance ?? ""} onChange={e => set("expected_attendance", e.target.value)} />
      </Field>
      <Field label="Budget Range">
        <select className={selectCls} value={data.budget_range ?? ""} onChange={e => set("budget_range", e.target.value)}>
          <option value="">Select a range…</option>
          <option>Under $1,000</option>
          <option>$1,000 – $5,000</option>
          <option>$5,000 – $15,000</option>
          <option>$15,000 – $50,000</option>
          <option>$50,000+</option>
          <option>Let's discuss</option>
        </select>
      </Field>
      <Field label="Event Type">
        <input className={inputCls} placeholder="e.g. Club night, Festival, Brand event" value={data.event_type ?? ""} onChange={e => set("event_type", e.target.value)} />
      </Field>
      <Field label="Marketing Goals">
        <textarea className={inputCls} rows={3} placeholder="Sell-out crowd, brand awareness, artist launch…" value={data.marketing_goals ?? ""} onChange={e => set("marketing_goals", e.target.value)} />
      </Field>
      <Field label="Additional Notes">
        <textarea className={inputCls} rows={3} placeholder="Vision, timeline, anything else…" value={data.notes ?? ""} onChange={e => set("notes", e.target.value)} />
      </Field>
    </div>
  );
}

export default function BookingSheet({ open, onOpenChange }: Props) {
  const [service, setService] = useState<Service>("dj");
  const [data, setData] = useState<Partial<BookingInsert>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const set = (k: keyof BookingInsert, v: string) => setData(prev => ({ ...prev, [k]: v }));

  const reset = () => { setData({}); setStatus("idle"); };

  const submit = async () => {
    if (!data.name?.trim() || !data.email?.trim()) return;
    setStatus("loading");
    try {
      const payload = { ...data, service, name: data.name!, email: data.email! } as BookingInsert;

      const { error } = await supabase.from("bookings").insert(payload as never);
      if (error) throw error;

      if (WEBHOOK) {
        await fetch(WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => {});
      }

      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-black uppercase tracking-tight">Book / Hire</SheetTitle>
          <p className="text-xs text-muted-foreground tracking-wide">Select a service and fill in the details — we'll be in touch.</p>
        </SheetHeader>

        {status === "success" ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <p className="text-2xl font-black uppercase">Request Sent</p>
            <p className="text-sm text-muted-foreground">We'll reach out within 24–48 hours.</p>
            <button onClick={reset} className="mt-4 text-xs tracking-[0.2em] uppercase border border-border px-6 py-3 hover:border-foreground transition-colors">
              Submit Another
            </button>
          </div>
        ) : (
          <>
            <Tabs value={service} onValueChange={v => { setService(v as Service); setData(prev => ({ name: prev.name, email: prev.email, phone: prev.phone })); }}>
              <TabsList className="w-full mb-8 grid grid-cols-4 h-auto p-0 bg-transparent border border-border rounded-none">
                {(["security","dj","venue","promoter"] as Service[]).map(s => (
                  <TabsTrigger
                    key={s}
                    value={s}
                    className="rounded-none text-[10px] tracking-[0.15em] uppercase py-2.5 data-[state=active]:bg-foreground data-[state=active]:text-background"
                  >
                    {s}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="security"><SecurityForm data={data} set={set} /></TabsContent>
              <TabsContent value="dj"><DjForm data={data} set={set} /></TabsContent>
              <TabsContent value="venue"><VenueForm data={data} set={set} /></TabsContent>
              <TabsContent value="promoter"><PromoterForm data={data} set={set} /></TabsContent>
            </Tabs>

            {status === "error" && (
              <p className="mt-4 text-xs text-red-400">Something went wrong — please try again.</p>
            )}

            <button
              onClick={submit}
              disabled={status === "loading" || !data.name?.trim() || !data.email?.trim()}
              className="mt-8 w-full bg-foreground text-background py-4 text-xs tracking-[0.2em] uppercase font-bold hover:opacity-80 transition-opacity disabled:opacity-40"
            >
              {status === "loading" ? "Sending…" : "Send Request"}
            </button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
