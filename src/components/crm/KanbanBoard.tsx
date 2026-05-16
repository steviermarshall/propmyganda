import { ReactNode } from "react";
import { daysSince } from "@/lib/crm/dates";

export interface KanbanColumn {
  key: string;
  label: string;
}

export interface KanbanItem {
  id: string;
  stage: string;
  updatedAt?: string | null;
  staleStages?: string[]; // stages where >7d updated_at => stale
}

interface Props<T extends KanbanItem> {
  columns: KanbanColumn[];
  items: T[];
  onMove: (item: T, nextStage: string) => Promise<void> | void;
  renderCard: (item: T) => ReactNode;
  accent?: string;
}

export default function KanbanBoard<T extends KanbanItem>({
  columns,
  items,
  onMove,
  renderCard,
  accent = "#ffffff",
}: Props<T>) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {columns.map((col) => {
        const colItems = items.filter((i) => i.stage === col.key);
        return (
          <div key={col.key} className="min-w-[220px] flex-1 border border-white/10 bg-crm-surface/50">
            <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-white/60">{col.label}</span>
              <span className="text-[10px] text-white/40">{colItems.length}</span>
            </div>
            <div className="p-2 space-y-2 min-h-[80px]">
              {colItems.map((item) => {
                const stale =
                  item.staleStages?.includes(item.stage) &&
                  daysSince(item.updatedAt ?? null) > 7;
                return (
                  <div
                    key={item.id}
                    className={`border bg-black/60 p-2 group ${
                      stale ? "border-red-500/60" : "border-white/10"
                    }`}
                  >
                    {renderCard(item)}
                    <div className="mt-2 pt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v) onMove(item, v);
                          e.target.value = "";
                        }}
                        className="bg-black border border-white/10 text-[10px] text-white/70 px-1 py-0.5 w-full uppercase tracking-widest"
                        style={{ borderColor: `${accent}40` }}
                      >
                        <option value="">→ Move…</option>
                        {columns
                          .filter((c) => c.key !== col.key)
                          .map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.label}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
