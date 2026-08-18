"use client";

import { useState } from "react";
import { StudyMaterial, MATERIAL_TYPES } from "@/lib/mockData";
import { X, ArrowUp, Bookmark, Flag, Download, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

interface DocumentViewerProps {
  material: StudyMaterial;
  onClose: () => void;
}

function buildScanLines(material: StudyMaterial) {
  const text = material.ocrText || material.preview;
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return [
    material.title,
    `${material.course}${material.teacher ? ` · ${material.teacher}` : ""}`,
    "",
    ...(lines.length ? lines : ["No scan text preview is available for this drop yet."]),
  ];
}

export function DocumentViewer({ material, onClose }: DocumentViewerProps) {
  const [page, setPage] = useState(1);
  const [upvoted, setUpvoted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reported, setReported] = useState(false);
  const [upvotes, setUpvotes] = useState(material.upvotes);

  const scanLines = buildScanLines(material);
  const totalPages = Math.max(1, material.pages ?? 1);
  const content = scanLines.slice((page - 1) * 8, page * 8);
  const typeInfo = MATERIAL_TYPES.find((t) => t.value === material.type);
  const images = material.imageUrls?.length ? material.imageUrls : material.imageUrl ? [material.imageUrl] : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center modal-backdrop bg-black/70 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#12131f] border border-[#2a2b45] rounded-3xl overflow-hidden animate-slide-up shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-[#2a2b45]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{typeInfo?.emoji}</span>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-indigo-400">{typeInfo?.label}</span>
            </div>
            <h2 className="text-sm font-bold text-white leading-snug line-clamp-2">{material.title}</h2>
            <p className="text-xs text-slate-500 mt-1">{material.school} · {material.course}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#2a2b45] transition-colors text-slate-400 hover:text-white flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {images[page - 1] && (
          <div className="mx-4 mt-4 overflow-hidden rounded-2xl border border-[#2a2b45] bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[page - 1]} alt={`Submitted scan page ${page}`} className="max-h-64 w-full object-contain" />
          </div>
        )}

        {/* Page viewer */}
        <div className="bg-[#0e0f1a] mx-4 my-4 rounded-2xl border border-[#2a2b45] min-h-[220px] p-5">
          <div className="text-[11px] text-slate-600 mb-3 flex justify-between font-mono">
            <span>PAGE {page} OF {totalPages}</span>
            <span>Anonymous drop</span>
          </div>
          <div className="space-y-1.5">
            {content.map((line, i) => (
              <p
                key={i}
                className={clsx(
                  "text-sm leading-relaxed",
                  line === "" ? "h-2" : "",
                  line.startsWith("Unit") || (line.endsWith(":") && !line.startsWith("•") && !line.startsWith(" "))
                    ? "font-bold text-white"
                    : "text-slate-300"
                )}
              >
                {line || " "}
              </p>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 mb-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1b2e] text-xs text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={clsx(
                  "w-6 h-6 rounded-md text-[10px] font-bold transition-all",
                  page === i + 1 ? "bg-indigo-600 text-white" : "bg-[#1a1b2e] text-slate-500 hover:text-white"
                )}
              >
                {i + 1}
              </button>
            ))}
            {totalPages > 5 && <span className="text-slate-600 text-xs self-end pb-0.5">+{totalPages - 5}</span>}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1b2e] text-xs text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-4 pb-5">
          <button
            onClick={() => { setUpvoted(!upvoted); setUpvotes((v) => upvoted ? v - 1 : v + 1); }}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all",
              upvoted
                ? "bg-indigo-500/15 border-indigo-500 text-indigo-300"
                : "bg-[#1a1b2e] border-[#2a2b45] text-slate-400 hover:border-slate-500"
            )}
          >
            <ArrowUp size={15} strokeWidth={upvoted ? 2.5 : 2} /> {upvotes}
          </button>
          <button
            onClick={() => setSaved(!saved)}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
              saved
                ? "bg-indigo-500/15 border-indigo-500 text-indigo-300"
                : "bg-[#1a1b2e] border-[#2a2b45] text-slate-400 hover:border-slate-500"
            )}
          >
            <Bookmark size={15} fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : "Save"}
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm border border-[#2a2b45] bg-[#1a1b2e] text-slate-400 hover:border-slate-500 transition-all">
            <Share2 size={15} />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm border border-[#2a2b45] bg-[#1a1b2e] text-slate-400 hover:border-slate-500 transition-all ml-auto">
            <Download size={15} />
          </button>
          <button
            onClick={() => setReported(true)}
            className={clsx(
              "px-3 py-2.5 rounded-xl text-sm border transition-all",
              reported
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "border-[#2a2b45] bg-[#1a1b2e] text-slate-600 hover:text-slate-400"
            )}
            title="Report"
          >
            <Flag size={15} fill={reported ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </div>
  );
}
