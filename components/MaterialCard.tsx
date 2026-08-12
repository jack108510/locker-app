"use client";

import { useState } from "react";
import { StudyMaterial, MATERIAL_TYPES } from "@/lib/mockData";
import { ArrowUp, Bookmark, Flag, Archive, Ban } from "lucide-react";
import { reportMaterial, upvoteMaterial } from "@/lib/lockerData";
import { clsx } from "clsx";

interface MaterialCardProps {
  material: StudyMaterial;
  onOpen: (m: StudyMaterial) => void;
  matchReason?: string;
  matchedTerms?: string[];
  profileId?: string;
  onBlockSource?: (pseudonym: string) => void;
}

export function MaterialCard({ material, onOpen, matchReason, matchedTerms = [], profileId, onBlockSource }: MaterialCardProps) {
  const [upvotes, setUpvotes] = useState(material.upvotes);
  const [upvoted, setUpvoted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("current test or private key");
  const typeInfo = MATERIAL_TYPES.find((t) => t.value === material.type);

  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!upvoted) void upvoteMaterial(material.id, profileId).catch(console.warn);
    setUpvoted((v) => !v);
    setUpvotes((v) => upvoted ? v - 1 : v + 1);
  };

  if (reported) {
    return (
      <article className="rounded-[1.65rem] border border-red-400/20 bg-red-400/[0.045] p-4">
        <p className="text-sm font-medium text-red-100">Reported for review</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">Locker will check this drop and remove it if it breaks the content policy.</p>
      </article>
    );
  }

  return (
    <article
      onClick={() => onOpen(material)}
      className="group cursor-pointer rounded-[1.65rem] border border-white/10 bg-white/[0.035] p-4 transition active:scale-[0.99]"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] text-slate-500"><Archive size={12} className="inline-block -mt-0.5 mr-1 text-cyan-300" />{typeInfo?.label} · {material.pages ?? 1}p</p>
          <h3 className="line-clamp-2 text-[15px] font-medium leading-6 text-white">
            {material.title}
          </h3>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setSaved((v) => !v); }}
          className={clsx("rounded-full p-2 transition", saved ? "bg-white text-black" : "bg-white/[0.04] text-slate-500")}
          aria-label="Save to locker"
        >
          <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      <p className="mb-3 line-clamp-2 text-sm leading-6 text-slate-400">{material.preview}</p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Tag>{material.course}</Tag>
        {material.teacher && <Tag>{material.teacher}</Tag>}
        {material.type === "assignment" && <Tag>assignment</Tag>}
      </div>

      {matchReason && (
        <div className="mb-5 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.045] p-3">
          <p className="text-xs leading-5 text-cyan-100">{matchReason}</p>
          {matchedTerms.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {matchedTerms.map((term) => (
                <span key={term} className="rounded-full bg-black/25 px-2 py-1 text-[10px] text-cyan-200">
                  {term}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-white/10 pt-3">
        <div className="min-w-0 text-xs text-slate-500">
          <p className="truncate">{material.course}</p>
          <p className="truncate text-slate-600">{material.school.replace(" High School", "")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUpvote}
            className={clsx("flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium", upvoted ? "bg-white text-black" : "bg-white/[0.04] text-slate-400")}
          >
            <ArrowUp size={13} /> {upvotes}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onBlockSource?.(material.pseudonym); }}
            className="rounded-full p-2 text-slate-600"
            aria-label="Block this source"
            title="Block this source"
          >
            <Ban size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setReportOpen(true); }}
            className="rounded-full p-2 text-slate-600"
            aria-label="Report"
          >
            <Flag size={13} />
          </button>
        </div>
      </div>
      {reportOpen && (
        <div onClick={(e) => e.stopPropagation()} className="mt-4 rounded-2xl border border-red-400/15 bg-black/25 p-3">
          <p className="mb-2 text-xs font-medium text-red-100">Report this drop</p>
          <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#111217] px-3 py-2 text-xs text-white">
            <option value="current test or private key">Current test or private key</option>
            <option value="personal student info">Personal student info</option>
            <option value="copyright or not allowed">Copyright or not allowed</option>
            <option value="spam or abuse">Spam or abuse</option>
          </select>
          <button
            onClick={() => { setReported(true); setReportOpen(false); void reportMaterial(material.id, profileId, reportReason).catch(console.warn); }}
            className="mt-2 w-full rounded-full bg-red-400 px-4 py-2 text-xs font-semibold text-black"
          >
            Send report
          </button>
        </div>
      )}
    </article>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[10px] font-medium text-slate-400">
      {children}
    </span>
  );
}

export function MaterialCardSkeleton() {
  return (
    <div className="rounded-[1.65rem] border border-white/10 bg-white/[0.035] p-4 animate-pulse">
      <div className="mb-3 h-3 w-20 rounded bg-white/10" />
      <div className="mb-2 h-4 w-3/4 rounded bg-white/10" />
      <div className="mb-5 h-4 w-1/2 rounded bg-white/10" />
      <div className="h-14 rounded-2xl bg-white/5" />
    </div>
  );
}
