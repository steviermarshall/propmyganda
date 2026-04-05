import { Link } from "react-router-dom";
import { Instagram, Twitter, Youtube } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container-content py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <h3 className="text-2xl font-black tracking-widest uppercase mb-4">PMG</h3>
            <p className="text-xs tracking-[0.15em] uppercase opacity-60 leading-relaxed">
              100% Independent • Content • Distribution • Culture
            </p>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-6 opacity-40">Company</h4>
            <ul className="space-y-3">
              {["About", "Contact", "Careers"].map((item) => (
                <li key={item}>
                  <Link to="/contact" className="text-sm opacity-70 hover:opacity-100 transition-opacity">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-6 opacity-40">Services</h4>
            <ul className="space-y-3">
              {["Distribution", "Content", "Publishing"].map((item) => (
                <li key={item}>
                  <Link to="/distribution" className="text-sm opacity-70 hover:opacity-100 transition-opacity">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-6 opacity-40">Legal</h4>
            <ul className="space-y-3">
              {["Privacy Policy", "Terms of Service"].map((item) => (
                <li key={item}>
                  <span className="text-sm opacity-70 cursor-pointer hover:opacity-100 transition-opacity">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs opacity-40">© 2026 Propmyganda</p>
          <div className="flex items-center gap-6">
            <a href="#" className="opacity-60 hover:opacity-100 transition-opacity" aria-label="Instagram">
              <Instagram size={18} />
            </a>
            <a href="#" className="opacity-60 hover:opacity-100 transition-opacity" aria-label="Twitter">
              <Twitter size={18} />
            </a>
            <a href="#" className="opacity-60 hover:opacity-100 transition-opacity" aria-label="YouTube">
              <Youtube size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
