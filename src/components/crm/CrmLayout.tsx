import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import pmgLogo from "@/assets/pmg-logo-clean.png";
import { supabase } from "@/integrations/supabase/client";
import CommandPalette from "./CommandPalette";
import QuickAddButton, { QuickAddEntity } from "./QuickAddButton";

interface Props {
  children: ReactNode;
  title: string;
  accent: string; // hex color
  quickAdd?: QuickAddEntity;
}

export default function CrmLayout({ children, title, accent, quickAdd }: Props) {
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        if (!quickAdd) return;
        e.preventDefault();
        setQuickAddOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [quickAdd]);

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
        <div className="flex items-center gap-4">
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
      {quickAdd && (
        <QuickAddButton
          entity={quickAdd}
          accent={accent}
          open={quickAddOpen}
          onOpenChange={setQuickAddOpen}
        />
      )}
    </div>
  );
}
