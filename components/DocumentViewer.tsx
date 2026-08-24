"use client";

import { useState } from "react";
import { StudyMaterial, MATERIAL_TYPES } from "@/lib/mockData";
import { X, ArrowUp, Bookmark, Flag, Download, Share2, ChevronLeft, ChevronRight, Ban } from "lucide-react";
import { clsx } from "clsx";
import { blockSource, reportMaterial, saveMaterial, unsaveMaterial, upvoteMaterial } from "@/lib/lockerData";

interface DocumentViewerProps {
  material: StudyMaterial;
  onClose: () => void;
  profileId?: string;
  onBlockSource?: (pseudonym: string) => void;
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

export function DocumentViewer({ material, onClose, profileId, onBlockSource }: DocumentViewerProps) {
  const [page, setPage] = useState(1);
  const [upvoted, setUpvoted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("current test or private key");
  const [upvotes, setUpvotes] = useState(material.upvotes);
  const [saves, setSaves] = useState(material.saves);

  const scanLines = buildScanLines(material);
  const totalPages = Math.max(1, material.pages ?? 1);
  const content = scanLines.slice((page - 1) * 8, page * 8);
  const typeInfo = MATERIAL_TYPES.find((t) => t.value === material.type);
  const images = material.imageUrls?.length ? material.imageUrls : material.imageUrl ? [material.imageUrl] : [];

  const handleUpvote = () => {
    if (upvoted) return;
    setUpvoted(true);
    setUpvotes((v) => v + 1);
    void upvoteMaterial(material.id, profileId).catch(console.warn);
  };

  const handleSave = () => {
    const next = !saved;
    setSaved(next);
    setSaves((v) => Math.max(0, v + (next ? 1 : -1)));
    void (next ? saveMaterial(material.id, profileId) : unsaveMaterial(material.id)).catch(console.warn);
  };

  const handleShare = async () => {
    const text = `${material.title}\n${material.course} · ${material.school}`;
    if (navigator.share) {
      await navigator.share({ title: material.title, text }).catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(text).catch(() => undefined);
    }
  };

  const handleDownload = () => {
    const body = [material.title, material.school, material.course, "", material.ocrText || material.preview].join("\n");
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${material.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "locker-drop"}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const submitReport = () => {
    setReported(true);
    setReportOpen(false);
    void reportMaterial(material.id, profileId, reportReason).catch(console.warn);
  };

  const handleBlockSource = () => {
    onBlockSource?.(material.pseudonym);
    void blockSource(material.pseudonym, profileId).catch(console.warn);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/72 p-3 modal-backdrop sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-white/10 bg-[#111217] shadow-2xl shadow-black/60 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-white/10 bg-white/[0.035] p-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8cc7ff]">{typeInfo?.label}</span>
            </div>
            <h2 className="line-clamp-2 text-base font-semibold leading-snug tracking-[-0.035em] text-white">{material.title}</h2>
            <p className="text-xs text-slate-500 mt-1">{material.school} · {material.course}</p>
          </div>
          <button onClick={onClose} className="flex-shrink-0 rounded-full bg-white/[0.06] p-2 text-slate-400 transition-colors hover:bg-white/[0.1] hover:text-white">
            <X size={18} />
          </button>
        </div>

        {images[page - 1] && (
          <div className="mx-4 mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[page - 1]} alt={`Submitted scan page ${page}`} className="max-h-64 w-full object-contain" />
          </div>
        )}

        <div className="mx-4 my-4 min-h-[220px] rounded-2xl border border-white/10 bg-[#f5f5f7] p-5 text-[#1d1d1f]">
          <div className="mb-3 flex justify-between font-mono text-[11px] text-black/40">
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
                    ? "font-bold text-black"
                    : "text-black/70"
                )}
              >
                {line || " "}
              </p>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-4 mb-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-white disabled:opacity-30">
            <ChevronLeft size={14} /> Prev
          </button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
              <button key={i} onClick={() => setPage(i + 1)} className={clsx("h-6 w-6 rounded-full text-[10px] font-bold transition-all", page === i + 1 ? "bg-white text-black" : "bg-white/[0.05] text-slate-500 hover:text-white")}>{i + 1}</button>
            ))}
            {totalPages > 5 && <span className="text-slate-600 text-xs self-end pb-0.5">+{totalPages - 5}</span>}
          </div>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-white disabled:opacity-30">
            Next <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          <button onClick={handleUpvote} className={clsx("flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all", upvoted ? "border-white bg-white text-black" : "border-white/10 bg-white/[0.05] text-slate-400 hover:border-white/20")}>
            <ArrowUp size={15} strokeWidth={upvoted ? 2.5 : 2} /> {upvotes}
          </button>
          <button onClick={handleSave} className={clsx("flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-medium transition-all", saved ? "border-white bg-white text-black" : "border-white/10 bg-white/[0.05] text-slate-400 hover:border-white/20")}>
            <Bookmark size={15} fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : `Save ${saves}`}
          </button>
          <button onClick={handleShare} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-slate-400 transition-all hover:border-white/20">
            <Share2 size={15} />
          </button>
          <button onClick={handleDownload} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-slate-400 transition-all hover:border-white/20">
            <Download size={15} />
          </button>
          <button onClick={handleBlockSource} className="ml-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-slate-500 transition-all hover:text-slate-300">
            <Ban size={15} /> Block source
          </button>
          <button onClick={() => setReportOpen((v) => !v)} className={clsx("rounded-full border px-3 py-2.5 text-sm transition-all", reported ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-white/10 bg-white/[0.05] text-slate-600 hover:text-slate-400")} title="Report">
            <Flag size={15} fill={reported ? "currentColor" : "none"} />
          </button>
        </div>

        {reportOpen && !reported && (
          <div className="mx-4 mb-5 rounded-2xl border border-red-400/15 bg-black/25 p-3">
            <p className="mb-2 text-xs font-medium text-red-100">Report this drop</p>
            <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#111217] px-3 py-2 text-xs text-white">
              <option value="current test or private key">Current test or private key</option>
              <option value="personal student info">Personal student info</option>
              <option value="copyright or not allowed">Copyright or not allowed</option>
              <option value="spam or abuse">Spam or abuse</option>
            </select>
            <button onClick={submitReport} className="mt-2 w-full rounded-full bg-red-400 px-4 py-2 text-xs font-semibold text-black">Send report</button>
          </div>
        )}
        {reported && <p className="px-4 pb-5 text-xs text-red-300">Reported for moderator review.</p>}
      </div>
    </div>
  );
}
