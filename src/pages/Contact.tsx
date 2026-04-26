import { useState } from "react";
import { Instagram, Twitter, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ScrollReveal from "@/components/webgl/ScrollReveal";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: err } = await supabase.from("contact_messages").insert({
      name:    form.name,
      email:   form.email,
      subject: form.subject || null,
      message: form.message,
    });

    if (err) setError("Something went wrong. Try again.");
    else setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <div className="bg-primary text-primary-foreground min-h-screen">
      <div className="container-content pt-32 pb-20 md:pt-40">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24">
          {/* Left */}
          <ScrollReveal className="flex flex-col justify-center" y={50}>
            <h1 className="text-5xl md:text-7xl lg:text-8xl text-heading mb-8">Get In Touch</h1>
            <div className="space-y-4 text-sm opacity-70">
              <p>Brooklyn, NY</p>
              <p>info@propmyganda.com</p>
            </div>
            <div className="flex gap-6 mt-8">
              <a href="#" className="opacity-60 hover:opacity-100 transition-opacity" aria-label="Instagram">
                <Instagram size={20} />
              </a>
              <a href="#" className="opacity-60 hover:opacity-100 transition-opacity" aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="#" className="opacity-60 hover:opacity-100 transition-opacity" aria-label="YouTube">
                <Youtube size={20} />
              </a>
            </div>
          </ScrollReveal>

          {/* Right — Form */}
          <ScrollReveal delay={0.2} y={50}>
            {submitted ? (
              <div className="border border-primary-foreground/30 p-10 text-center space-y-4">
                <p className="font-display text-5xl uppercase">Sent.</p>
                <p className="text-primary-foreground/60 text-sm">
                  We received your message and will respond shortly.
                </p>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <input
                  type="text"
                  required
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className="w-full bg-transparent border-b border-primary-foreground/30 py-3 text-sm placeholder:text-primary-foreground/40 focus:border-primary-foreground outline-none transition-colors"
                />
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className="w-full bg-transparent border-b border-primary-foreground/30 py-3 text-sm placeholder:text-primary-foreground/40 focus:border-primary-foreground outline-none transition-colors"
                />
                <select
                  value={form.subject}
                  onChange={(e) => set("subject", e.target.value)}
                  className="w-full bg-transparent border-b border-primary-foreground/30 py-3 text-sm text-primary-foreground/80 focus:border-primary-foreground outline-none transition-colors"
                >
                  <option value="" className="bg-primary">Subject</option>
                  <option value="general" className="bg-primary">General</option>
                  <option value="distribution" className="bg-primary">Distribution</option>
                  <option value="press" className="bg-primary">Press</option>
                  <option value="booking" className="bg-primary">Booking</option>
                  <option value="other" className="bg-primary">Other</option>
                </select>
                <textarea
                  required
                  placeholder="Message"
                  rows={5}
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                  className="w-full bg-transparent border-b border-primary-foreground/30 py-3 text-sm placeholder:text-primary-foreground/40 focus:border-primary-foreground outline-none transition-colors resize-none"
                />
                {error && <p className="text-red-300 text-xs">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary-foreground text-primary px-10 py-4 text-xs tracking-[0.2em] uppercase font-bold hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  {submitting ? "Sending…" : "Send Message"}
                </button>
              </form>
            )}
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
};

export default Contact;
