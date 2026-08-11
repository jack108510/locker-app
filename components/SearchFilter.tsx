"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { SCHOOLS, MATERIAL_TYPES, MaterialType } from "@/lib/mockData";
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
  school, onSchoolChange,
  course, onCourseChange,
  type, onTypeChange,
  query, onQueryChange,
}: SearchFilterProps) {
  const [showFilters, setShowFilters] = useState(false);

  const selectedSchoolObj = SCHOOLS.find((s) => s.name === school);
  const courses = selectedSchoolObj?.courses ?? [];
  const activeFilterCount = [
    school !== "all", course !== "all", type !== "all"
  ].filter(Boolean).length;

  const clearAll = () => {
    onSchoolChange("all");
    onCourseChange("all");
    onTypeChange("all");
    onQueryChange("");
  };

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search materials…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#1a1b2e] border border-[#2a2b45] rounded-xl text-sm text-white placeholder-slate-500 focus:border-indigo-500 transition-colors"
          />
          {query && (
            <button onClick={() => onQueryChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
            showFilters || activeFilterCount > 0
              ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
              : "border-[#2a2b45] bg-[#1a1b2e] text-slate-400 hover:text-white"
          )}
        >
          <SlidersHorizontal size={15} />
          {activeFilterCount > 0 && (
            <span className="bg-indigo-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter chips */}
      {showFilters && (
        <div className="space-y-3 animate-slide-up">
          {/* School */}
          <div>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-2 font-semibold">School</p>
            <div className="flex flex-wrap gap-2">
              <Chip label="All" active={school === "all"} onClick={() => { onSchoolChange("all"); onCourseChange("all"); }} />
              {SCHOOLS.map((s) => (
                <Chip key={s.id} label={s.name.replace(" High School", " HS")} active={school === s.name} onClick={() => { onSchoolChange(s.name); onCourseChange("all"); }} />
              ))}
            </div>
          </div>

          {/* Course */}
          {courses.length > 0 && (
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-2 font-semibold">Course</p>
              <div className="flex flex-wrap gap-2">
                <Chip label="All courses" active={course === "all"} onClick={() => onCourseChange("all")} />
                {courses.map((c) => (
                  <Chip key={c} label={c} active={course === c} onClick={() => onCourseChange(c)} />
                ))}
              </div>
            </div>
          )}

          {/* Type */}
          <div>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-2 font-semibold">Material type</p>
            <div className="flex flex-wrap gap-2">
              <Chip label="All types" active={type === "all"} onClick={() => onTypeChange("all")} />
              {MATERIAL_TYPES.map((t) => (
                <Chip key={t.value} label={`${t.emoji} ${t.label}`} active={type === t.value} onClick={() => onTypeChange(t.value as MaterialType)} />
              ))}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="text-xs text-slate-500 hover:text-indigo-400 flex items-center gap-1 transition-colors">
              <X size={12} /> Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
        active
          ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
          : "bg-[#1a1b2e] border-[#2a2b45] text-slate-400 hover:border-slate-500 hover:text-slate-300"
      )}
    >
      {label}
    </button>
  );
}
