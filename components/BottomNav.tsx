"use client";

import { clsx } from "clsx";
import { Home, Search, Upload } from "lucide-react";

export type NavTab = "home" | "browse" | "upload" | "admin";

interface BottomNavProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

const NAV_ITEMS = [
  { id: "home" as NavTab, label: "Home", Icon: Home },
  { id: "browse" as NavTab, label: "Browse", Icon: Search },
  { id: "upload" as NavTab, label: "Drop", Icon: Upload },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass">
      <div className="flex border-t border-[#2a2b45] bg-[#12131f]/90 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={clsx(
                "flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-all duration-200",
                isActive
                  ? "text-indigo-400"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.75}
                className={clsx(
                  "transition-transform duration-200",
                  isActive && "scale-110"
                )}
              />
              <span className={clsx("text-[10px] font-medium", isActive && "font-semibold")}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
