"use client";

import { clsx } from "clsx";
import { Home, Search, Plus, ShieldCheck } from "lucide-react";

export type NavTab = "home" | "browse" | "upload" | "admin";

interface BottomNavProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
  showAdmin?: boolean;
}

const BASE_NAV_ITEMS = [
  { id: "home" as NavTab, label: "Home", Icon: Home },
  { id: "browse" as NavTab, label: "Search", Icon: Search },
  { id: "upload" as NavTab, label: "Add", Icon: Plus },
];

export function BottomNav({ active, onChange, showAdmin = false }: BottomNavProps) {
  const navItems = showAdmin ? [...BASE_NAV_ITEMS, { id: "admin" as NavTab, label: "Mod", Icon: ShieldCheck }] : BASE_NAV_ITEMS;
  return (
    <nav className="mt-auto px-5 pb-4">
      <div className="mx-auto flex max-w-sm rounded-full border border-white/10 bg-black/72 p-1.5 shadow-2xl shadow-black/50 glass">
        {navItems.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={clsx(
                "flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-3 text-xs font-medium transition",
                isActive ? "bg-white text-black" : "text-white/45"
              )}
            >
              <Icon size={15} strokeWidth={2} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
