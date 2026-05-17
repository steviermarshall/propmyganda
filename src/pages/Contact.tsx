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
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <input
                type="text"
                placeholder="Name"
                className="w-full bg-transparent border-b border-primary-foreground/30 py-3 text-sm placeholder:text-primary-foreground/40 focus:border-primary-foreground outline-none transition-colors"
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full bg-transparent border-b border-primary-foreground/30 py-3 text-sm placeholder:text-primary-foreground/40 focus:border-primary-foreground outline-none transition-colors"
              />
              <label htmlFor="contact-subject" className="sr-only">Subject</label>
              <select id="contact-subject" aria-label="Message subject" className="w-full bg-transparent border-b border-primary-foreground/30 py-3 text-sm text-primary-foreground/40 focus:border-primary-foreground outline-none transition-colors">
                <option value="" className="bg-primary">Subject</option>
                <option value="general" className="bg-primary">General</option>
                <option value="distribution" className="bg-primary">Distribution</option>
                <option value="press" className="bg-primary">Press</option>
                <option value="booking" className="bg-primary">Booking</option>
                <option value="other" className="bg-primary">Other</option>
              </select>
              <textarea
                placeholder="Message"
                rows={5}
                className="w-full bg-transparent border-b border-primary-foreground/30 py-3 text-sm placeholder:text-primary-foreground/40 focus:border-primary-foreground outline-none transition-colors resize-none"
              />
              <button
                type="submit"
                className="bg-primary-foreground text-primary px-10 py-4 text-xs tracking-[0.2em] uppercase font-bold hover:opacity-80 transition-opacity"
              >
                Send Message
              </button>
            </form>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
};

export default Contact;
