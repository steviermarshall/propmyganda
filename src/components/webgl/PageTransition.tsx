import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import pmgLogo from "@/assets/pmg-logo-clean.png";

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [phase, setPhase] = useState<"idle" | "cover" | "reveal">("idle");
  const [displayChildren, setDisplayChildren] = useState(children);

  useEffect(() => {
    if (phase === "idle" && children !== displayChildren) {
      // Route changed — start transition
      setPhase("cover");
    }
  }, [children, displayChildren, phase]);

  useEffect(() => {
    if (phase === "cover") {
      const t = setTimeout(() => {
        setDisplayChildren(children);
        window.scrollTo(0, 0);
        setPhase("reveal");
      }, 600);
      return () => clearTimeout(t);
    }
    if (phase === "reveal") {
      const t = setTimeout(() => setPhase("idle"), 600);
      return () => clearTimeout(t);
    }
  }, [phase, children]);

  // On first mount, just show children
  useEffect(() => {
    setDisplayChildren(children);
  }, []); // eslint-disable-line

  return (
    <>
      {displayChildren}

      {/* Overlay */}
      <div
        className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center bg-black"
        style={{
          clipPath:
            phase === "cover"
              ? "inset(0 0 0 0)"
              : phase === "reveal"
              ? "inset(0 0 100% 0)"
              : "inset(100% 0 0 0)",
          transition:
            phase === "idle"
              ? "none"
              : "clip-path 0.6s cubic-bezier(0.76, 0, 0.24, 1)",
        }}
      >
        <img
          src={pmgLogo}
          alt=""
          className="h-10 md:h-14 w-auto"
          style={{
            opacity: phase === "cover" ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        />
      </div>
    </>
  );
};

export default PageTransition;
