"use client";

import { useState } from "react";
import { StudyMaterial, MATERIAL_TYPES } from "@/lib/mockData";
import { ArrowUp, Bookmark, Flag, FileText, Clock } from "lucide-react";
import { clsx } from "clsx";

interface MaterialCardProps {
  material: StudyMaterial;
  onOpen: (m: StudyMaterial) => void;
}

export function MaterialCard({ material, onOpen }: MaterialCardProps) {
  const [upvotes, setUpvotes] = useState(material.upvotes);
  const [upvoted, setUpvoted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reported, setReported] = useState(false);

  const typeInfo = MATERIAL_TYPES.find((t) => t.value === material.type);
  const vagueTimestamp = material.status === "approved" ? "this week" : "under review";

  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (upvoted) { setUpvotes((v) => v - 1); } else { setUpvotes((v) => v + 1); }
    setUpvoted(!upvoted);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved(!saved);
  };

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!reported) setReported(true);
  };

  return (
    <div
      onClick={() => onOpen(material)}
      className="bg-[#12131f] border border-[#2a2b45] rounded-2xl p-4 card-hover cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg leading-none">{typeInfo?.emoji}</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-indigo-400">
              {typeInfo?.label}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-indigo-200 transition-colors">
            {material.title}
          </h3>
        </div>
        <button
          onClick={handleSave}
          className={clsx(
            "p-1.5 rounded-lg transition-all flex-shrink-0",
            saved
              ? "text-indigo-400 bg-indigo-500/10"
              : "text-slate-600 hover:text-slate-400"
          )}
        >
          <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Meta */}
      <div className="text-xs text-slate-500 mb-3 space-y-0.5">
        <p className="truncate">{material.school} · {material.course}</p>
        {material.teacher && <p className="truncate">by {material.teacher}</p>}
      </div>

      {/* Preview */}
      <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
        {material.preview}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {material.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-[#1a1b2e] text-slate-500 font-medium border border-[#2a2b45]">
            #{tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#1a1b2e]">
        <div className="flex items-center gap-3">
          <button
            onClick={handleUpvote}
            className={clsx(
              "flex items-center gap-1 text-xs font-semibold transition-all",
              upvoted ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <ArrowUp size={13} strokeWidth={upvoted ? 2.5 : 2} />
            {upvotes}
          </button>
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <FileText size={12} />
            {material.pages}p
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Clock size={12} />
            {vagueTimestamp}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600 font-mono">Anonymous drop</span>
          <button
            onClick={handleReport}
            className={clsx(
              "transition-colors",
              reported ? "text-red-500/60" : "text-slate-700 hover:text-slate-500"
            )}
            title={reported ? "Reported" : "Report"}
          >
            <Flag size={11} fill={reported ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {reported && (
        <p className="text-[10px] text-red-400/70 mt-2">Reported for review. Thank you.</p>
      )}
    </div>
  );
}

export function MaterialCardSkeleton() {
  return (
    <div className="bg-[#12131f] border border-[#2a2b45] rounded-2xl p-4 animate-pulse">
      <div className="h-3 w-20 bg-[#2a2b45] rounded mb-3" />
      <div className="h-4 w-3/4 bg-[#2a2b45] rounded mb-2" />
      <div className="h-4 w-1/2 bg-[#2a2b45] rounded mb-4" />
      <div className="h-3 w-full bg-[#2a2b45] rounded mb-1.5" />
      <div className="h-3 w-5/6 bg-[#2a2b45] rounded mb-4" />
      <div className="flex gap-2">
        <div className="h-5 w-16 bg-[#2a2b45] rounded-md" />
        <div className="h-5 w-16 bg-[#2a2b45] rounded-md" />
      </div>
    </div>
  );
}
