import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, Twitter, Youtube } from "lucide-react";
import ScrollReveal from "@/components/webgl/ScrollReveal";
import SEO from "@/components/SEO";

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Propmyganda",
  image: "https://propmyganda.lovable.app/og-image-v2.jpg",
  url: "https://propmyganda.com/contact",
  email: "info@propmyganda.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Brooklyn",
    addressRegion: "NY",
    addressCountry: "US",
  },
  priceRange: "$$",
};

const Contact = () => {
  const [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") || ""), email = String(f.get("email") || "");
    const subject = String(f.get("subject") || "General"), message = String(f.get("message") || "");
    if (email) await supabase.from("newsletter_subscribers").insert({ email, source: "site", is_active: true, unsubscribed_at: null } as never);
    window.location.href = `mailto:info@propmyganda.com?subject=${encodeURIComponent(`[${subject}] ${name}`)}&body=${encodeURIComponent(`${message}\n\n— ${name} (${email})`)}`;
    setSent(true);
  }
  return (
    <div className="bg-primary text-primary-foreground min-h-screen">
      <SEO
        title="Contact PMG — Brooklyn, NY"
        description="Get in touch with PROPMYGANDA. Distribution, press, booking, and general inquiries. Based in Brooklyn, NY."
        path="/contact"
        jsonLd={localBusinessJsonLd}
      />
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
            <form className="space-y-6" onSubmit={submit}>
              <input
                type="text"
                name="name" required
                placeholder="Name"
                className="w-full bg-transparent border-b border-primary-foreground/30 py-3 text-sm placeholder:text-primary-foreground/40 focus:border-primary-foreground outline-none transition-colors"
              />
              <input
                type="email"
                name="email" required
                placeholder="Email"
                className="w-full bg-transparent border-b border-primary-foreground/30 py-3 text-sm placeholder:text-primary-foreground/40 focus:border-primary-foreground outline-none transition-colors"
              />
              <label htmlFor="contact-subject" className="sr-only">Subject</label>
              <select id="contact-subject" name="subject" aria-label="Message subject" className="w-full bg-transparent border-b border-primary-foreground/30 py-3 text-sm text-primary-foreground/40 focus:border-primary-foreground outline-none transition-colors">
                <option value="" className="bg-primary">Subject</option>
                <option value="general" className="bg-primary">General</option>
                <option value="distribution" className="bg-primary">Distribution</option>
                <option value="press" className="bg-primary">Press</option>
                <option value="booking" className="bg-primary">Booking</option>
                <option value="other" className="bg-primary">Other</option>
              </select>
              <textarea
                name="message" required
                placeholder="Message"
                rows={5}
                className="w-full bg-transparent border-b border-primary-foreground/30 py-3 text-sm placeholder:text-primary-foreground/40 focus:border-primary-foreground outline-none transition-colors resize-none"
              />
              <button
                type="submit"
                className="bg-primary-foreground text-primary px-10 py-4 text-xs tracking-[0.2em] uppercase font-bold hover:opacity-80 transition-opacity"
              >
                {sent ? "Sent — thanks" : "Send Message"}
              </button>
            </form>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
};

export default Contact;
