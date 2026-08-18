"use client";

import { Search, Sparkles, X } from "lucide-react";
import { MATERIAL_TYPES, MaterialType } from "@/lib/mockData";
import { clsx } from "clsx";

interface SearchFilterProps {
  school: string;
  onSchoolChange: (s: string) => void;
  course: string;
  onCourseChange: (c: string) => void;
  type: string;
  onTypeChange: (t: string) => void;
  query: string;
  onQueryChange: (q: string) => void;
}

export function SearchFilter({
  type, onTypeChange,
  query, onQueryChange,
}: SearchFilterProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
          <Sparkles size={13} className="text-cyan-300" />
          <span>Search assignments, quizzes, worksheets, and past exams</span>
        </div>
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search class, teacher, unit, topic..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="w-full rounded-full border border-white/10 bg-white/[0.07] py-4 pl-11 pr-11 text-[15px] text-white outline-none placeholder:text-white/32 focus:border-[#2997ff]/45"
          />
          {query && (
            <button onClick={() => onQueryChange("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="-mx-5 overflow-x-auto px-5 no-scrollbar">
        <div className="flex gap-2 whitespace-nowrap">
          <Chip label="All" active={type === "all"} onClick={() => onTypeChange("all")} />
          {MATERIAL_TYPES.map((t) => (
            <Chip key={t.value} label={t.label} active={type === t.value} onClick={() => onTypeChange(t.value as MaterialType)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-full px-4 py-2.5 text-xs transition",
        active
          ? "bg-white text-black"
          : "border border-white/10 bg-white/[0.045] text-white/55"
      )}
    >
      {label}
    </button>
  );
}
