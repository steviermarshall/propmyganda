import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import pmgLogo from "@/assets/pmg-logo-clean.png";
import { supabase } from "@/integrations/supabase/client";
import CommandPalette from "./CommandPalette";
import QuickAddButton, { QuickAddEntity } from "./QuickAddButton";
import BookingSheet from "@/components/BookingSheet";

interface Props {
  children: ReactNode;
  title: string;
  accent: string; // hex color
  quickAdd?: QuickAddEntity;
  /** When provided, overrides the default QuickAddButton modal with a custom click handler. */
  onQuickAddClick?: () => void;
}

export default function CrmLayout({ children, title, accent, quickAdd, onQuickAddClick }: Props) {
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [freeArtistOpen, setFreeArtistOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        if (onQuickAddClick) { e.preventDefault(); onQuickAddClick(); return; }
        if (!quickAdd) return;
        e.preventDefault();
        setQuickAddOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [quickAdd, onQuickAddClick]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/auth/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-crm-bg text-white font-mono">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-30 bg-crm-bg/95 backdrop-blur">
        <div className="flex items-center gap-4">
          <img src={pmgLogo} alt="PMG" className="h-6 w-auto" />
          <span
            className="text-xs tracking-[0.3em] uppercase font-bold"
            style={{ color: accent }}
          >
            {title}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFreeArtistOpen(true)}
            title="Schedule a complimentary artist shoot"
            className="text-[10px] uppercase tracking-widest font-bold border border-white/20 hover:border-white/60 px-3 py-1.5 text-white/80 hover:text-white transition-colors"
          >
            + Artist Shoot
          </button>
          <button
            onClick={() => setPaletteOpen(true)}
            className="text-[10px] text-white/30 hover:text-white/70 uppercase tracking-widest border border-white/10 px-2 py-1"
          >
            ⌘K
          </button>
          <button
            onClick={handleSignOut}
            className="text-xs text-white/30 hover:text-white/70 transition-colors uppercase tracking-widest"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="px-6 py-8 space-y-8 max-w-[1600px] mx-auto">{children}</main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      {onQuickAddClick ? (
        <button
          onClick={onQuickAddClick}
          title="Quick add (⌘N)"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full text-3xl font-bold text-black flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          style={{ backgroundColor: accent }}
        >
          +
        </button>
      ) : quickAdd ? (
        <QuickAddButton
          entity={quickAdd}
          accent={accent}
          open={quickAddOpen}
          onOpenChange={setQuickAddOpen}
        />
      ) : null}
      <BookingSheet
        open={freeArtistOpen}
        onOpenChange={setFreeArtistOpen}
        initialService="artist"
        free
        servicesAllowed={["artist"]}
      />
    </div>
  );
}
