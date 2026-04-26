import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import pmgLogo from "@/assets/pmg-logo-clean.png";
import { useAuth } from "@/hooks/use-auth";

const navLinks = [
  { label: "Home",         path: "/" },
  { label: "Artists",      path: "/artists" },
  { label: "Events",       path: "/events" },
  { label: "Distribution", path: "/distribution" },
  { label: "Publication",  path: "/publication" },
  { label: "Store",        path: "/store" },
  { label: "Propworld",    path: "/propworld" },
  { label: "Contact",      path: "/contact" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { session } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const isHome = location.pathname === "/";

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-primary" : "bg-transparent"
        }`}
      >
        <div className="container-content flex items-center justify-between h-16 md:h-20">
          {isHome ? (
            <span aria-hidden className="w-6" />
          ) : (
            <Link to="/" className="flex items-center" aria-label="PMG home">
              <img src={pmgLogo} alt="PMG" className="h-6 md:h-8 w-auto" />
            </Link>
          )}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-primary" : "bg-transparent"
        }`}
      >
        <div className="container-content flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center" aria-label="PMG home">
            <img src={pmgLogo} alt="PMG" className="h-6 md:h-8 w-auto" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-xs tracking-[0.2em] uppercase font-medium transition-opacity hover:opacity-60 ${
                  location.pathname === link.path
                    ? "text-primary-foreground opacity-100"
                    : "text-primary-foreground opacity-80"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Dashboard / Login link */}
          <Link
            to={session ? "/dashboard" : "/auth/login"}
            className="hidden md:block text-[10px] tracking-[0.2em] uppercase font-bold border border-primary-foreground/40 px-4 py-2 hover:bg-primary-foreground hover:text-primary transition-colors text-primary-foreground"
          >
            {session ? "Dashboard" : "Staff"}
          </Link>

          {/* Mobile Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-primary-foreground z-50"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-primary flex flex-col items-center justify-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="text-primary-foreground text-3xl md:text-5xl font-bold uppercase tracking-widest hover:opacity-60 transition-opacity"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
};

export default Navbar;
